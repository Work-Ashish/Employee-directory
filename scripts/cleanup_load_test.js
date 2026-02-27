const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error("DATABASE_URL must be set in .env");
}
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function cleanup() {
    console.log("🧹 Starting Load Test Cleanup...");

    try {
        // Find the load test organization
        const org = await prisma.organization.findUnique({
            where: { domain: "loadtest.emspro.com" }
        });

        if (org) {
            console.log(`🗑️ Found Load Test Organization ID: ${org.id}. Deleting associated records...`);

            // Order matters for relational integrity
            const delPayroll = await prisma.payroll.deleteMany({ where: { employee: { organizationId: org.id } } });
            console.log(`✅ Deleted ${delPayroll.count} Payroll records`);

            const delLeaves = await prisma.leave.deleteMany({ where: { employee: { organizationId: org.id } } });
            console.log(`✅ Deleted ${delLeaves.count} Leave records`);

            const delAttendance = await prisma.attendance.deleteMany({ where: { employee: { organizationId: org.id } } });
            console.log(`✅ Deleted ${delAttendance.count} Attendance records`);

            const delEmployees = await prisma.employee.deleteMany({ where: { organizationId: org.id } });
            console.log(`✅ Deleted ${delEmployees.count} Employee records`);

            const delSessions = await prisma.userSession.deleteMany({ where: { user: { organizationId: org.id } } });
            console.log(`✅ Deleted ${delSessions.count} UserSession records`);

            const delUsers = await prisma.user.deleteMany({ where: { organizationId: org.id } });
            console.log(`✅ Deleted ${delUsers.count} User records`);

            const delDepts = await prisma.department.deleteMany({ where: { organizationId: org.id } });
            console.log(`✅ Deleted ${delDepts.count} Department records`);

            await prisma.organization.delete({ where: { id: org.id } });
            console.log(`✅ Deleted Organization: loadtest.emspro.com`);

        } else {
            console.log("⚠️ Load Test Organization not found. Checking for lingering employees...");

            // Fallback: Delete any employees with 'loadtest' in email
            const delFallback = await prisma.employee.deleteMany({
                where: { email: { contains: "loadtest" } }
            });
            console.log(`✅ Fallback deleted ${delFallback.count} 'loadtest' employees`);

            const delUserFallback = await prisma.user.deleteMany({
                where: { email: { contains: "loadtest" } }
            });
            console.log(`✅ Fallback deleted ${delUserFallback.count} 'loadtest' users`);
        }

        console.log("🎉 Load Test data cleanup complete!");

    } catch (error) {
        console.error("❌ Error during cleanup:", error);
    } finally {
        await prisma.$disconnect();
    }
}

cleanup();
