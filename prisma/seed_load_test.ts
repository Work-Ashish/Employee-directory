import { PrismaClient, EmployeeStatus, Role, LeaveType, LeaveStatus, PayrollStatus, AttendanceStatus } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
    console.log("🚀 Starting Load Test Data Seeding...")
    const startTime = Date.now()

    // 1. Create Load Test Organization
    const org = await prisma.organization.upsert({
        where: { domain: "loadtest.emspro.com" },
        update: {},
        create: {
            name: "Load Test Inc",
            domain: "loadtest.emspro.com",
        }
    })
    const organizationId = org.id
    console.log(`✅ Organization: ${org.name} (${organizationId})`)

    // 2. Create Departments
    const deptNames = ["Engineering", "Sales", "Marketing", "Finance", "HR", "Product", "Design", "Legal", "Operations", "Support"]
    const departments = await Promise.all(deptNames.map(name =>
        prisma.department.upsert({
            where: { name_organizationId: { name, organizationId } },
            update: {},
            create: { name, color: `#${Math.floor(Math.random() * 16777215).toString(16)}`, organizationId }
        })
    ))
    console.log(`✅ ${departments.length} Departments created`)

    // 3. Create Admin for Load Test
    const hashedPassword = await bcrypt.hash("loadtest123", 10)
    await prisma.user.upsert({
        where: { email: "admin@loadtest.emspro.com" },
        update: {},
        create: {
            name: "Load Test Admin",
            email: "admin@loadtest.emspro.com",
            hashedPassword,
            role: Role.CEO,
            organizationId
        }
    })
    console.log("✅ Admin user created (admin@loadtest.emspro.com)")

    // 4. Generate Employees
    const employeeCount = 10 // Start with small count for debug
    const batchSize = 100
    console.log(`⏳ Generating ${employeeCount} employees...`)

    try {
        const employeesData = []
        for (let j = 0; j < employeeCount; j++) {
            employeesData.push({
                employeeCode: `LT-${1000 + j}`,
                firstName: `Employee`,
                lastName: `${j}`,
                email: `emp${j}@loadtest.emspro.com`,
                designation: "Software Engineer",
                departmentId: departments[j % departments.length].id,
                salary: 5000 + (j * 10),
                dateOfJoining: new Date(2023, 0, 1),
                organizationId,
                status: EmployeeStatus.ACTIVE
            })
        }
        console.log("DEBUG: Data prepared, calling createMany...")
        const result = await prisma.employee.createMany({
            data: employeesData,
            skipDuplicates: true
        })
        console.log(`DEBUG: createMany result: ${JSON.stringify(result)}`)
    } catch (err: any) {
        console.error("❌ Error generating employees:", err.message)
        if (err.code) console.error("Error Code:", err.code)
        throw err
    }
    console.log("✅ Employees generated")

    // 5. Seed Attendance for a subset of employees (for dashboard performance)
    const employees = await prisma.employee.findMany({
        where: { organizationId },
        take: 200, // Only 200 for attendance to keep seed time reasonable but still enough for load
        select: { id: true }
    })

    console.log(`⏳ Generating attendance for ${employees.length} employees (30 days)...`)
    const days = 30
    for (const emp of employees) {
        const attendanceBatch = []
        for (let d = 0; d < days; d++) {
            const date = new Date()
            date.setDate(date.getDate() - d)

            attendanceBatch.push({
                date,
                checkIn: new Date(date.setHours(9, 0, 0)),
                checkOut: new Date(date.setHours(18, 0, 0)),
                workHours: 9,
                status: AttendanceStatus.PRESENT,
                employeeId: emp.id,
                organizationId
            })
        }
        await prisma.attendance.createMany({
            data: attendanceBatch
        })
    }
    console.log("✅ Attendance records seeded")

    // 6. Seed Payroll for all employees for one month
    console.log("⏳ Generating payroll for current month...")
    const allEmployees = await prisma.employee.findMany({
        where: { organizationId },
        select: { id: true, salary: true }
    })

    const payrollData = allEmployees.map(emp => ({
        month: "February 2026",
        basicSalary: emp.salary,
        allowances: 500,
        pfDeduction: emp.salary * 0.12,
        tax: emp.salary * 0.05,
        netSalary: emp.salary + 500 - (emp.salary * 0.17),
        status: PayrollStatus.PAID,
        isFinalized: true,
        employeeId: emp.id,
        organizationId
    }))

    for (let i = 0; i < payrollData.length; i += batchSize) {
        await prisma.payroll.createMany({
            data: payrollData.slice(i, i + batchSize)
        })
    }
    console.log("✅ Payroll records seeded")

    const duration = (Date.now() - startTime) / 1000
    console.log(`\n🎉 Load test seeding complete in ${duration}s!`)
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
