import { prisma } from "./lib/prisma"

async function verifyPayrollLogic() {
    console.log("Starting Payroll Database Logic Verification...")

    try {
        // 1. Get a test employee
        const employee = await prisma.employee.findFirst()
        if (!employee) {
            console.error("❌ Error: No employees found in database. Please seed the database first.")
            return
        }
        console.log(`Using employee: ${employee.firstName} ${employee.lastName} (${employee.id})`)

        // 2. Simulate Creation (Logic in POST /api/payroll)
        console.log("\n1. Testing Payroll Creation Logic...")
        const testMonth = "March 2026"
        const payrollData = {
            month: testMonth,
            basicSalary: employee.salary,
            allowances: 5000.50,
            pfDeduction: 2000.25,
            tax: 1500.75,
            otherDed: 500.00,
            netSalary: Number((employee.salary + 5000.50 - 2000.25 - 1500.75 - 500.00).toFixed(2)),
            status: "PENDING" as const,
            employeeId: employee.id
        }

        const createdRecord = await prisma.payroll.create({
            data: payrollData,
            include: { employee: true }
        })

        if (!createdRecord || createdRecord.month !== testMonth) {
            throw new Error("Creation logic failed or data mismatch")
        }
        console.log("✅ Creation Logic Passed: Created record ID:", createdRecord.id)
        console.log(`   Net Salary: ${createdRecord.netSalary} (Expected: ${payrollData.netSalary})`)

        // 3. Simulate Retrieval (Logic in GET /api/payroll)
        console.log("\n2. Testing Retrieval Logic...")
        const records = await prisma.payroll.findMany({
            where: {
                month: testMonth,
                employeeId: employee.id
            },
            include: { employee: true }
        })

        if (records.length === 0) {
            throw new Error("Retrieval failed: No records found with filters")
        }
        console.log(`✅ Retrieval Logic Passed: Found ${records.length} matching record(s)`)

        // 4. Cleanup
        console.log("\n3. Cleaning up test record...")
        await prisma.payroll.delete({
            where: { id: createdRecord.id }
        })
        console.log("✅ Cleanup Passed")

        console.log("\n🚀 ALL PAYROLL DATABASE LOGIC VERIFIED!")

    } catch (error: any) {
        console.error("\n❌ Verification Failed:", error.message)
    } finally {
        await prisma.$disconnect()
    }
}

verifyPayrollLogic()
