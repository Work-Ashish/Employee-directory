#!/usr/bin/env python
"""
Migrate EMS Pro data from Supabase PostgreSQL → HiringNow tenant DBs.

Usage:
    python scripts/migrate_ems_data.py --supabase-url <DSN> [--dry-run] [--org-slug <slug>]

Steps:
    1. Connect to Supabase (read-only)
    2. For each Organization in EMS Pro:
       a. Create Tenant in HiringNow registry DB
       b. Create tenant database + run migrations
       c. Migrate Users → User + assign Role via UserRole
       d. Migrate Departments → Department
       e. Migrate Employees → Employee + sub-profiles
    3. Generate migration report
"""

import argparse
import os
import sys
import uuid
from datetime import datetime
from pathlib import Path

# Add backend to path for Django imports
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.base")

import django
django.setup()

import psycopg2
from django.conf import settings
from django.core.management import call_command
from django.db import transaction
from django.utils.text import slugify

from apps.tenants.models import Tenant
from apps.users.models import User
from apps.employees.models import (
    Employee, EmployeeProfile, EmployeeAddress, EmployeeBanking, EmploymentType,
)
from apps.departments.models import Department
from apps.rbac.models import Role, UserRole
from config.tenant_context import set_current_tenant
from config.db_utils import create_tenant_database


# EMS Pro role → HiringNow role slug mapping
ROLE_MAP = {
    "ADMIN": "admin",
    "CEO": "ceo",
    "HR_MANAGER": "hr_manager",
    "RECRUITER": "recruiter",
    "PAYROLL_ADMIN": "payroll_admin",
    "IT_ADMIN": "admin",
    "EMPLOYEE": "employee",
}


class MigrationReport:
    def __init__(self):
        self.orgs = 0
        self.users = 0
        self.departments = 0
        self.employees = 0
        self.errors: list[str] = []
        self.warnings: list[str] = []

    def summary(self) -> str:
        lines = [
            f"\n{'='*60}",
            f"Migration Report — {datetime.now().isoformat()}",
            f"{'='*60}",
            f"Organizations migrated: {self.orgs}",
            f"Users migrated:         {self.users}",
            f"Departments migrated:   {self.departments}",
            f"Employees migrated:     {self.employees}",
            f"Errors:                 {len(self.errors)}",
            f"Warnings:               {len(self.warnings)}",
        ]
        if self.errors:
            lines.append("\nErrors:")
            for e in self.errors:
                lines.append(f"  - {e}")
        if self.warnings:
            lines.append("\nWarnings:")
            for w in self.warnings:
                lines.append(f"  - {w}")
        lines.append(f"{'='*60}\n")
        return "\n".join(lines)


def connect_supabase(dsn: str):
    """Connect to Supabase PostgreSQL (read-only)."""
    conn = psycopg2.connect(dsn)
    conn.set_session(readonly=True)
    return conn


def fetch_organizations(cursor, org_slug=None):
    """Fetch organizations from EMS Pro."""
    sql = 'SELECT id, name, "createdAt" FROM "Organization"'
    params = []
    if org_slug:
        sql += ' WHERE LOWER(name) = LOWER(%s)'
        params.append(org_slug)
    cursor.execute(sql, params)
    return cursor.fetchall()


def migrate_organization(cursor, org_row, report: MigrationReport, dry_run=False):
    """Migrate a single organization and all its data."""
    org_id, org_name, _ = org_row
    slug = slugify(org_name)[:100]
    prefix = getattr(settings, 'TENANT_DB_NAME_PREFIX', 'recruitment_db_')
    db_name = prefix + slug

    print(f"\n--- Migrating org: {org_name} (slug={slug}) ---")

    if dry_run:
        # Count records without actually migrating
        cursor.execute('SELECT COUNT(*) FROM "User" WHERE "organizationId" = %s', (org_id,))
        user_count = cursor.fetchone()[0]
        cursor.execute('SELECT COUNT(*) FROM "Department" WHERE "organizationId" = %s', (org_id,))
        dept_count = cursor.fetchone()[0]
        cursor.execute('SELECT COUNT(*) FROM "Employee" WHERE "organizationId" = %s', (org_id,))
        emp_count = cursor.fetchone()[0]
        print(f"  [DRY RUN] Would migrate: {user_count} users, {dept_count} departments, {emp_count} employees")
        report.orgs += 1
        report.users += user_count
        report.departments += dept_count
        report.employees += emp_count
        return

    # 1. Create tenant in registry
    if Tenant.objects.using('default').filter(slug=slug).exists():
        report.warnings.append(f"Tenant '{slug}' already exists — skipping creation")
        tenant = Tenant.objects.using('default').get(slug=slug)
    else:
        with transaction.atomic(using='default'):
            tenant = Tenant.objects.using('default').create(
                name=org_name,
                slug=slug,
                db_name=db_name,
            )

    # 2. Create tenant DB + migrate
    try:
        create_tenant_database(db_name)
    except Exception:
        report.warnings.append(f"Tenant DB '{db_name}' may already exist")

    if db_name not in settings.DATABASES:
        default = settings.DATABASES['default'].copy()
        default['NAME'] = db_name
        settings.DATABASES[db_name] = default

    call_command('migrate', '--database', db_name, '--run-syncdb', verbosity=0)
    set_current_tenant(tenant)

    # 3. Seed RBAC
    call_command('seed_rbac', '--tenant-slug', slug, verbosity=0)

    # 4. Migrate users
    cursor.execute(
        'SELECT id, email, name, role, "passwordHash", "createdAt" '
        'FROM "User" WHERE "organizationId" = %s',
        (org_id,)
    )
    user_map = {}  # ems_user_id → django_user
    for u_row in cursor.fetchall():
        u_id, u_email, u_name, u_role, pw_hash, _ = u_row
        names = (u_name or "").split(" ", 1)
        first_name = names[0] if names else ""
        last_name = names[1] if len(names) > 1 else ""

        try:
            if User.objects.using(db_name).filter(email=u_email).exists():
                user = User.objects.using(db_name).get(email=u_email)
            else:
                user = User(
                    email=u_email,
                    username=f"{tenant.id}_{u_email}",
                    first_name=first_name,
                    last_name=last_name,
                )
                # Adapt bcryptjs hash to Django format
                if pw_hash and pw_hash.startswith("$2"):
                    user.password = f"bcrypt${pw_hash}"
                else:
                    user.set_unusable_password()
                user.save(using=db_name)

            user_map[str(u_id)] = user

            # Assign role
            role_slug = ROLE_MAP.get(u_role, "employee")
            role = Role.objects.using(db_name).filter(slug=role_slug).first()
            if role:
                UserRole.objects.using(db_name).get_or_create(
                    user=user, role=role,
                )
            report.users += 1
        except Exception as e:
            report.errors.append(f"User {u_email}: {e}")

    # 5. Migrate departments
    cursor.execute(
        'SELECT id, name FROM "Department" WHERE "organizationId" = %s',
        (org_id,)
    )
    dept_map = {}  # ems_dept_id → django_dept
    for d_row in cursor.fetchall():
        d_id, d_name = d_row
        try:
            dept, _ = Department.objects.using(db_name).get_or_create(
                name=d_name, defaults={'color': '#6366f1'},
            )
            dept_map[str(d_id)] = dept
            report.departments += 1
        except Exception as e:
            report.errors.append(f"Department {d_name}: {e}")

    # 6. Migrate employees
    cursor.execute(
        'SELECT id, "userId", "firstName", "lastName", email, phone, '
        '"departmentId", designation, "employeeCode", status, salary, '
        '"dateOfJoining", "managerId", "createdAt" '
        'FROM "Employee" WHERE "organizationId" = %s',
        (org_id,)
    )
    emp_map = {}  # ems_emp_id → django_employee
    for e_row in cursor.fetchall():
        (e_id, e_user_id, first_name, last_name, email, phone,
         dept_id, designation, emp_code, status, salary,
         date_of_joining, manager_id, _) = e_row
        try:
            linked_user = user_map.get(str(e_user_id)) if e_user_id else None
            linked_dept = dept_map.get(str(dept_id)) if dept_id else None

            emp = Employee(
                user=linked_user,
                first_name=first_name or "",
                last_name=last_name or "",
                email=email or "",
                phone=phone or "",
                department_ref=linked_dept,
                department=linked_dept.name if linked_dept else "",
                designation=designation or "",
                employee_code=emp_code or "",
                status=(status or "active").lower(),
                salary=salary,
                date_of_joining=date_of_joining,
            )
            emp.save(using=db_name)
            emp_map[str(e_id)] = emp
            report.employees += 1
        except Exception as e:
            report.errors.append(f"Employee {email}: {e}")

    # 7. Resolve manager references (second pass)
    for ems_emp_id, emp in emp_map.items():
        cursor.execute(
            'SELECT "managerId" FROM "Employee" WHERE id = %s',
            (ems_emp_id,)
        )
        row = cursor.fetchone()
        if row and row[0]:
            manager = emp_map.get(str(row[0]))
            if manager:
                emp.reporting_to = manager
                emp.save(using=db_name, update_fields=['reporting_to'])

    # 8. Migrate sub-profiles (EmployeeProfile, EmployeeAddress, EmployeeBanking)
    for ems_emp_id, emp in emp_map.items():
        try:
            _migrate_employee_profile(cursor, ems_emp_id, emp, db_name)
            _migrate_employee_address(cursor, ems_emp_id, emp, db_name)
            _migrate_employee_banking(cursor, ems_emp_id, emp, db_name)
        except Exception as e:
            report.warnings.append(f"Sub-profile for {emp.email}: {e}")

    report.orgs += 1
    print(f"  Done: {report.users} users, {report.departments} departments, {report.employees} employees")


def _migrate_employee_profile(cursor, ems_emp_id, emp, db_name):
    cursor.execute(
        'SELECT "dateOfBirth", gender, "bloodGroup", "maritalStatus", nationality, '
        '"fatherName", "motherName", "spouseName", '
        '"emergencyContactName", "emergencyContactPhone", "emergencyContactRelation", '
        '"passportNumber", "passportExpiry", "previousCompany", "previousDesignation", '
        '"previousExperienceYears", "totalExperienceYears" '
        'FROM "EmployeeProfile" WHERE "employeeId" = %s',
        (ems_emp_id,)
    )
    row = cursor.fetchone()
    if not row:
        return
    (dob, gender, blood, marital, nationality, father, mother, spouse,
     ec_name, ec_phone, ec_rel, passport, passport_exp,
     prev_co, prev_desg, prev_exp, total_exp) = row

    EmployeeProfile.objects.using(db_name).get_or_create(
        employee=emp,
        defaults={
            'date_of_birth': dob,
            'gender': gender or "",
            'blood_group': blood or "",
            'marital_status': marital or "",
            'nationality': nationality or "",
            'father_name': father or "",
            'mother_name': mother or "",
            'spouse_name': spouse or "",
            'emergency_contact_name': ec_name or "",
            'emergency_contact_phone': ec_phone or "",
            'emergency_contact_relation': ec_rel or "",
            'passport_number': passport or "",
            'passport_expiry': passport_exp,
            'previous_company': prev_co or "",
            'previous_designation': prev_desg or "",
            'previous_experience_years': prev_exp,
            'total_experience_years': total_exp,
        }
    )


def _migrate_employee_address(cursor, ems_emp_id, emp, db_name):
    cursor.execute(
        'SELECT "contactAddress", "contactCity", "contactState", "contactPincode", "contactCountry", '
        '"permanentAddress", "permanentCity", "permanentState", "permanentPincode", "permanentCountry" '
        'FROM "EmployeeAddress" WHERE "employeeId" = %s',
        (ems_emp_id,)
    )
    row = cursor.fetchone()
    if not row:
        return
    (ca, cc, cs, cp, cco, pa, pc, ps, pp, pco) = row

    EmployeeAddress.objects.using(db_name).get_or_create(
        employee=emp,
        defaults={
            'contact_address': ca or "",
            'contact_city': cc or "",
            'contact_state': cs or "",
            'contact_pincode': cp or "",
            'contact_country': cco or "India",
            'permanent_address': pa or "",
            'permanent_city': pc or "",
            'permanent_state': ps or "",
            'permanent_pincode': pp or "",
            'permanent_country': pco or "India",
        }
    )


def _migrate_employee_banking(cursor, ems_emp_id, emp, db_name):
    cursor.execute(
        'SELECT "bankName", "bankAccountNumber", "bankBranch", "ifscCode", '
        '"pfAccountNumber", "aadhaarNumber", "panNumber" '
        'FROM "EmployeeBanking" WHERE "employeeId" = %s',
        (ems_emp_id,)
    )
    row = cursor.fetchone()
    if not row:
        return
    (bank, acct, branch, ifsc, pf, aadhaar, pan) = row

    EmployeeBanking.objects.using(db_name).get_or_create(
        employee=emp,
        defaults={
            'bank_name': bank or "",
            'bank_account_number': acct or "",
            'bank_branch': branch or "",
            'ifsc_code': ifsc or "",
            'pf_account_number': pf or "",
            'aadhaar_number': aadhaar or "",
            'pan_number': pan or "",
        }
    )


def main():
    parser = argparse.ArgumentParser(description="Migrate EMS Pro data to HiringNow")
    parser.add_argument("--supabase-url", required=True, help="Supabase PostgreSQL connection string")
    parser.add_argument("--dry-run", action="store_true", help="Count records without writing")
    parser.add_argument("--org-slug", help="Migrate only this organization (by name)")
    args = parser.parse_args()

    report = MigrationReport()
    conn = connect_supabase(args.supabase_url)
    cursor = conn.cursor()

    try:
        orgs = fetch_organizations(cursor, args.org_slug)
        print(f"Found {len(orgs)} organization(s) to migrate")

        for org_row in orgs:
            try:
                migrate_organization(cursor, org_row, report, dry_run=args.dry_run)
            except Exception as e:
                report.errors.append(f"Org {org_row[1]}: {e}")

        print(report.summary())
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    main()
