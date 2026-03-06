require('dotenv').config()
const { PrismaClient } = require("@prisma/client")
const { PrismaPg } = require("@prisma/adapter-pg")
const { Pool } = require("pg")
const bcrypt = require("bcryptjs")

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
    console.log("🚀 Starting Load Test Data Seeding (JS Version)...")
    const startTime = Date.now()

    try {
        // 1. Create Load Test Organization
        let org = await prisma.organization.findUnique({ where: { domain: "loadtest.emspro.com" } })
        if (!org) {
            org = await prisma.organization.create({
                data: {
                    name: "Load Test Inc",
                    domain: "loadtest.emspro.com",
                }
            })
        }
        const organizationId = org.id
        console.log(`✅ Organization: ${org.name} (${organizationId})`)

        // 2. Create Departments
        const deptNames = ["Engineering", "Sales", "Marketing", "Finance", "HR", "Product", "Design", "Legal", "Operations", "Support"]
        const departments = []

        for (const name of deptNames) {
            let d = await prisma.department.findUnique({ where: { name_organizationId: { name, organizationId } } })
            if (!d) {
                d = await prisma.department.create({
                    data: { name, color: `#${Math.floor(Math.random() * 16777215).toString(16)}`, organizationId }
                })
            }
            departments.push(d)
        }
        console.log(`✅ ${departments.length} Departments ready`)

        // 3. Create Admin for Load Test
        const hashedPassword = await bcrypt.hash("loadtest123", 10)
        let admin = await prisma.user.findUnique({ where: { email: "admin@loadtest.emspro.com" } })
        if (!admin) {
            await prisma.user.create({
                data: {
                    name: "Load Test Admin",
                    email: "admin@loadtest.emspro.com",
                    hashedPassword,
                    role: "CEO",
                    organizationId
                }
            })
        }
        console.log("✅ Admin user ready (admin@loadtest.emspro.com)")

        // 4. Generate Employees
        const employeeCount = 1000
        console.log(`⏳ Generating ${employeeCount} employees. This will take a moment...`)

        const batchSize = 100
        for (let i = 0; i < employeeCount; i += batchSize) {
            const employeesData = []
            for (let j = 0; j < Math.min(batchSize, employeeCount - i); j++) {
                const index = i + j
                employeesData.push({
                    employeeCode: `LT-${1000 + index}`,
                    firstName: `Employee`,
                    lastName: `${index}`,
                    email: `emp${index}@loadtest.emspro.com`,
                    designation: "Software Engineer",
                    departmentId: departments[index % departments.length].id,
                    salary: 5000 + (index * 10),
                    dateOfJoining: new Date(2023, 0, 1),
                    organizationId,
                    status: "ACTIVE"
                })
            }
            await prisma.employee.createMany({
                data: employeesData,
                skipDuplicates: true
            })
        }
        console.log("✅ Employees generated")

        // 5. Seed Attendance for a subset of employees
        const employees = await prisma.employee.findMany({
            where: { organizationId, employeeCode: { startsWith: 'LT-' } },
            take: 200,
            select: { id: true }
        })

        if (employees.length > 0) {
            console.log(`⏳ Generating attendance for ${employees.length} employees (30 days)...`)
            const days = 30
            for (const emp of employees) {
                const attendanceBatch = []
                for (let d = 0; d < days; d++) {
                    const date = new Date()
                    date.setDate(date.getDate() - d)
                    const checkIn = new Date(date)
                    checkIn.setHours(9, 0, 0, 0)
                    const checkOut = new Date(date)
                    checkOut.setHours(18, 0, 0, 0)

                    attendanceBatch.push({
                        date: new Date(date.setHours(0, 0, 0, 0)),
                        checkIn,
                        checkOut,
                        workHours: 9,
                        status: "PRESENT",
                        employeeId: emp.id,
                        organizationId
                    })
                }
                await prisma.attendance.createMany({
                    data: attendanceBatch,
                    skipDuplicates: true
                })
            }
            console.log("✅ Attendance records seeded")
        }

        // 6. Seed Payroll for all employees
        console.log("⏳ Generating payroll for current month...")
        const allEmployees = await prisma.employee.findMany({
            where: { organizationId, employeeCode: { startsWith: 'LT-' } },
            select: { id: true, salary: true }
        })

        const payrollData = allEmployees.map(emp => ({
            month: "February 2026",
            basicSalary: emp.salary,
            allowances: 500,
            pfDeduction: emp.salary * 0.12,
            tax: emp.salary * 0.05,
            netSalary: emp.salary + 500 - (emp.salary * 0.17),
            status: "PAID",
            isFinalized: true,
            employeeId: emp.id,
            organizationId
        }))

        for (let i = 0; i < payrollData.length; i += batchSize) {
            await prisma.payroll.createMany({
                data: payrollData.slice(i, i + batchSize),
                skipDuplicates: true
            })
        }
        console.log("✅ Payroll records seeded")

        const duration = (Date.now() - startTime) / 1000
        console.log(`\n🎉 Load test seeding complete in ${duration}s!`)
    } catch (e) {
        console.error("❌ Seeding Error Captured:")
        console.error("Message:", e.message)
        console.error("Stack:", e.stack)
        process.exit(1)
    }
}

main()
    .finally(async () => {
        await prisma.$disconnect()
    })
