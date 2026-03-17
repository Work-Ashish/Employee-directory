import { prisma } from "../lib/prisma"
import * as dotenv from 'dotenv'

dotenv.config()

async function main() {
    console.log("Seeding database...")

    // 0. Org context
    let org = await prisma.organization.findFirst()
    if (!org) {
        org = await prisma.organization.create({ data: { name: "Seed Org", domain: "seed.com" } })
    }

    // 1. Create a Department
    const itDept = await prisma.department.findFirst({ where: { name: "Engineering", organizationId: org.id } })
        ?? await prisma.department.create({ data: { name: "Engineering", color: "#3b82f6", organizationId: org.id } })

    // 2. Create another Department
    const hrDept = await prisma.department.findFirst({ where: { name: "HR", organizationId: org.id } })
        ?? await prisma.department.create({ data: { name: "HR", color: "#ec4899", organizationId: org.id } })

    // 3. Create Employees
    const emp1 = await prisma.employee.upsert({
        where: { employeeCode: "EMP001" },
        update: {},
        create: {
            employeeCode: "EMP001",
            firstName: "John",
            lastName: "Doe",
            email: "john.doe@example.com",
            designation: "Senior Software Engineer",
            departmentId: itDept.id,
            dateOfJoining: new Date("2021-01-15"),
            salary: 120000,
            status: "ACTIVE",
            organizationId: org.id
        },
    })

    const emp2 = await prisma.employee.upsert({
        where: { employeeCode: "EMP002" },
        update: {},
        create: {
            employeeCode: "EMP002",
            firstName: "Jane",
            lastName: "Smith",
            email: "jane.smith@example.com",
            designation: "HR Manager",
            departmentId: hrDept.id,
            dateOfJoining: new Date("2020-05-10"),
            salary: 95000,
            status: "ACTIVE",
            organizationId: org.id
        },
    })

    console.log("Created employees:", emp1.firstName, emp2.firstName)
    console.log("Seed finished!")
}

main()
    .catch((e) => {
        console.error("Seed error:", e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
