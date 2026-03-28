import secrets
import string

from django.db import models, transaction

from common.models import BaseModel
from apps.users.models import User


# simple lookup table for employment types - will move to compliance app later
class EmploymentType(BaseModel):
    name = models.CharField(max_length=100, unique=True)  # e.g. Full Time, Contract
    code = models.SlugField(max_length=50, unique=True)   # e.g. full_time, contract

    class Meta:
        db_table = 'employment_types'
        ordering = ['name']

    def __str__(self):
        return self.name


class Employee(BaseModel):

    class Status(models.TextChoices):
        PRE_JOINING = 'pre_joining', 'Pre Joining'
        ACTIVE = 'active', 'Active'
        ON_NOTICE = 'on_notice', 'On Notice'
        ON_LEAVE = 'on_leave', 'On Leave'
        RESIGNED = 'resigned', 'Resigned'
        TERMINATED = 'terminated', 'Terminated'
        INACTIVE = 'inactive', 'Inactive'
        ARCHIVED = 'archived', 'Archived'
        EXITED = 'exited', 'Exited'

    # link to platform user account - optional, can be set after creation
    user = models.OneToOneField(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='employee_profile',
    )

    # placeholder UUIDs for Candidate and Offer - will become proper FKs
    candidate_id = models.UUIDField(null=True, blank=True, db_index=True)
    offer_id = models.UUIDField(null=True, blank=True, db_index=True)

    # auto-generated tenant-specific employee code e.g. EMP-0001
    employee_code = models.CharField(max_length=50, unique=True, blank=True)

    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField()
    phone = models.CharField(max_length=20, blank=True)

    # Department FK
    department_ref = models.ForeignKey(
        'departments.Department',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='employees',
        db_column='department_ref_id',
    )
    # Legacy text field preserved for backward compatibility
    department = models.CharField(max_length=100, blank=True)
    designation = models.CharField(max_length=200, blank=True)
    location = models.CharField(max_length=100, blank=True)

    employment_type = models.ForeignKey(
        EmploymentType,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='employees',
    )

    # reporting_to is self-referential - manager is also an Employee
    reporting_to = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='direct_reports',
    )

    # EMS Pro fields
    salary = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    date_of_joining = models.DateField(null=True, blank=True)
    address = models.TextField(blank=True)
    avatar_url = models.URLField(max_length=500, blank=True, null=True)

    start_date = models.DateField(null=True, blank=True)     # planned start date
    joined_at = models.DateTimeField(null=True, blank=True)   # actual join timestamp

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PRE_JOINING)

    class OnboardingStatus(models.TextChoices):
        PENDING = 'pending', 'Pending'
        IN_PROGRESS = 'in_progress', 'In Progress'
        COMPLETED = 'completed', 'Completed'

    onboarding_status = models.CharField(
        max_length=20,
        choices=OnboardingStatus.choices,
        default=OnboardingStatus.PENDING,
    )
    onboarding_completed_at = models.DateTimeField(null=True, blank=True)

    exit_date = models.DateField(null=True, blank=True)
    exit_reason = models.CharField(max_length=100, blank=True)

    # Soft delete support
    deleted_at = models.DateTimeField(null=True, blank=True)
    is_archived = models.BooleanField(default=False)

    class Meta:
        db_table = 'employees'
        ordering = ['first_name', 'last_name']

    def __str__(self):
        return f"{self.employee_code} - {self.first_name} {self.last_name}"

    def save(self, *args, **kwargs):
        # auto-generate employee_code on first save if not provided
        if not self.employee_code:
            with transaction.atomic():
                last = (
                    Employee.objects
                    .select_for_update()
                    .order_by('-created_at')
                    .first()
                )
                next_num = 1
                if last and last.employee_code:
                    try:
                        next_num = int(last.employee_code.split('-')[1]) + 1
                    except (IndexError, ValueError):
                        next_num = Employee.objects.count() + 1
                self.employee_code = f"EMP-{next_num:04d}"
                super().save(*args, **kwargs)
                return
        super().save(*args, **kwargs)

    @staticmethod
    def generate_temp_password(length=12):
        """Generate a cryptographically secure temporary password."""
        alphabet = string.ascii_letters + string.digits + '!@#$%'
        return ''.join(secrets.choice(alphabet) for _ in range(length))


class EmployeeProfile(BaseModel):
    """Extended employee profile - personal, emergency, previous employment details."""
    employee = models.OneToOneField(
        Employee,
        on_delete=models.CASCADE,
        related_name='profile',
    )

    # Personal
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=20, blank=True)
    blood_group = models.CharField(max_length=10, blank=True)
    marital_status = models.CharField(max_length=20, blank=True)
    nationality = models.CharField(max_length=50, blank=True)
    religion = models.CharField(max_length=50, blank=True)
    caste = models.CharField(max_length=50, blank=True)

    # Emergency contact
    emergency_contact_name = models.CharField(max_length=100, blank=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True)
    emergency_contact_relation = models.CharField(max_length=50, blank=True)

    # Family
    father_name = models.CharField(max_length=100, blank=True)
    mother_name = models.CharField(max_length=100, blank=True)
    spouse_name = models.CharField(max_length=100, blank=True)

    # Passport & visa
    passport_number = models.CharField(max_length=50, blank=True)
    passport_expiry = models.DateField(null=True, blank=True)
    visa_type = models.CharField(max_length=50, blank=True)
    visa_expiry = models.DateField(null=True, blank=True)

    # Previous employment
    previous_company = models.CharField(max_length=200, blank=True)
    previous_designation = models.CharField(max_length=200, blank=True)
    previous_experience_years = models.DecimalField(
        max_digits=4, decimal_places=1, null=True, blank=True,
    )
    total_experience_years = models.DecimalField(
        max_digits=4, decimal_places=1, null=True, blank=True,
    )

    class Meta:
        db_table = 'employee_profiles'

    def __str__(self):
        return f"Profile: {self.employee}"


class EmployeeAddress(BaseModel):
    """Contact and permanent address."""
    employee = models.OneToOneField(
        Employee,
        on_delete=models.CASCADE,
        related_name='address_info',
    )

    # Contact address
    contact_address = models.TextField(blank=True)
    contact_city = models.CharField(max_length=100, blank=True)
    contact_state = models.CharField(max_length=100, blank=True)
    contact_pincode = models.CharField(max_length=20, blank=True)
    contact_country = models.CharField(max_length=100, blank=True, default='India')

    # Permanent address
    permanent_address = models.TextField(blank=True)
    permanent_city = models.CharField(max_length=100, blank=True)
    permanent_state = models.CharField(max_length=100, blank=True)
    permanent_pincode = models.CharField(max_length=20, blank=True)
    permanent_country = models.CharField(max_length=100, blank=True, default='India')

    class Meta:
        db_table = 'employee_addresses'

    def __str__(self):
        return f"Address: {self.employee}"


class EmployeeBanking(BaseModel):
    """Bank account and statutory details."""
    employee = models.OneToOneField(
        Employee,
        on_delete=models.CASCADE,
        related_name='banking',
    )

    bank_name = models.CharField(max_length=200, blank=True)
    bank_account_number = models.CharField(max_length=50, blank=True)
    bank_branch = models.CharField(max_length=200, blank=True)
    ifsc_code = models.CharField(max_length=20, blank=True)

    # Statutory
    pf_account_number = models.CharField(max_length=50, blank=True)
    aadhaar_number = models.CharField(max_length=12, blank=True)
    pan_number = models.CharField(max_length=10, blank=True)

    class Meta:
        db_table = 'employee_banking'

    def __str__(self):
        return f"Banking: {self.employee}"


class EmployeeEducation(BaseModel):
    """Education records for an employee."""
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='educations',
    )
    degree = models.CharField(max_length=200)
    institution = models.CharField(max_length=300)
    field_of_study = models.CharField(max_length=200, blank=True)
    start_year = models.PositiveIntegerField(null=True, blank=True)
    end_year = models.PositiveIntegerField(null=True, blank=True)
    grade = models.CharField(max_length=50, blank=True)

    class Meta:
        db_table = 'employee_educations'
        ordering = ['-end_year']

    def __str__(self):
        return f"{self.degree} - {self.institution}"
