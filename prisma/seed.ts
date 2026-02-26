import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
    console.log("🌱 Seeding database...")

    // ── Organization ─────────────────────────────────────────
    const org = await prisma.organization.upsert({
        where: { domain: "emspro.com" },
        update: {},
        create: {
            name: "EMS Pro Default",
            domain: "emspro.com",
        }
    })
    const organizationId = org.id
    console.log(`✅ Organization created: ${org.name}`)

    // ── Departments ─────────────────────────────────────────
    async function upsertDept(name: string, color: string) {
        const existing = await prisma.department.findFirst({
            where: { name, organizationId }
        })
        if (existing) return existing
        return prisma.department.create({
            data: { name, color, organizationId }
        })
    }

    const engineering = await upsertDept("Engineering", "#007aff")
    const sales = await upsertDept("Sales", "#38bdf8")
    const marketing = await upsertDept("Marketing", "#ec4899")
    const finance = await upsertDept("Finance", "#f59e0b")
    const hr = await upsertDept("HR", "#10b981")

    console.log("✅ Departments seeded")

    // ── Admin User ──────────────────────────────────────────
    const hashedPassword = await bcrypt.hash("admin123", 12)

    const adminUser = await prisma.user.upsert({
        where: { email: "admin@emspro.com" },
        update: { organizationId },
        create: {
            name: "Admin User",
            email: "admin@emspro.com",
            hashedPassword,
            role: "ADMIN",
            avatar: "AU",
            organizationId
        },
    })

    console.log("✅ Admin user seeded (admin@emspro.com / admin123)")

    // ── Employees ───────────────────────────────────────────
    const employees = [
        { code: "EMP001", first: "John", last: "Doe", email: "john@emspro.com", designation: "Sr. Software Engineer", dept: engineering.id, salary: 9500 },
        { code: "EMP002", first: "Jane", last: "Smith", email: "jane@emspro.com", designation: "QA Engineer", dept: engineering.id, salary: 7000 },
        { code: "EMP003", first: "Emily", last: "Brown", email: "emily@emspro.com", designation: "HR Director", dept: hr.id, salary: 8500 },
        { code: "EMP004", first: "Michael", last: "Johnson", email: "michael@emspro.com", designation: "Sales Representative", dept: sales.id, salary: 6000 },
        { code: "EMP005", first: "Lisa", last: "Anderson", email: "lisa@emspro.com", designation: "Content Strategist", dept: marketing.id, salary: 6500 },
        { code: "EMP006", first: "David", last: "Wilson", email: "david@emspro.com", designation: "Financial Analyst", dept: finance.id, salary: 7500 },
        { code: "EMP007", first: "Sarah", last: "Davis", email: "sarah@emspro.com", designation: "CTO", dept: engineering.id, salary: 12000 },
        { code: "EMP008", first: "James", last: "Taylor", email: "james@emspro.com", designation: "DevOps Engineer", dept: engineering.id, salary: 8000 },
        { code: "EMP009", first: "Amanda", last: "Thomas", email: "amanda@emspro.com", designation: "Sales Director", dept: sales.id, salary: 9000 },
        { code: "EMP10", first: "Robert", last: "Garcia", email: "robert@emspro.com", designation: "Marketing Manager", dept: marketing.id, salary: 7000 },
    ]

    for (const emp of employees) {
        await prisma.employee.upsert({
            where: { employeeCode: emp.code },
            update: { organizationId },
            create: {
                employeeCode: emp.code,
                firstName: emp.first,
                lastName: emp.last,
                email: emp.email,
                designation: emp.designation,
                departmentId: emp.dept,
                dateOfJoining: new Date("2024-01-15"),
                salary: emp.salary,
                status: "ACTIVE",
                organizationId
            },
        })
    }

    console.log("✅ 10 Employees seeded")
    console.log("\n🎉 Database seeding complete!")
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
