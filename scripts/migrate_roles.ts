/**
 * Role Migration Script
 *
 * Remaps old Role enum values to new RBAC roles.
 * Run BEFORE changing the Prisma schema Role enum and running `prisma db push`.
 *
 * Usage:
 *   npx tsx scripts/migrate_roles.ts
 *
 * ─── Mapping (edit before running) ─────────────────────────
 *   ADMIN        → CEO
 *   HR_MANAGER   → HR
 *   PAYROLL_ADMIN→ PAYROLL
 *   RECRUITER    → EMPLOYEE   (customize below)
 *   IT_ADMIN     → EMPLOYEE   (customize below)
 *   EMPLOYEE     → EMPLOYEE   (no change)
 */

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
require("dotenv").config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error("DATABASE_URL must be set in .env");
}
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─── CUSTOMIZABLE MAPPING ──────────────────────────────────
// Change the target roles for RECRUITER and IT_ADMIN as needed.
// Valid targets: "CEO", "HR", "PAYROLL", "TEAM_LEAD", "EMPLOYEE"
const ROLE_MAP: Record<string, string> = {
    ADMIN: "CEO",
    HR_MANAGER: "HR",
    PAYROLL_ADMIN: "PAYROLL",
    RECRUITER: "EMPLOYEE",    // ← customize this
    IT_ADMIN: "EMPLOYEE",     // ← customize this
    EMPLOYEE: "EMPLOYEE",
};

async function migrateRoles() {
    console.log("╔══════════════════════════════════════╗");
    console.log("║    Role Migration Script             ║");
    console.log("╚══════════════════════════════════════╝\n");

    try {
        // Step 1: Add new enum values (idempotent)
        const newValues = ["CEO", "HR", "PAYROLL", "TEAM_LEAD"];
        for (const val of newValues) {
            try {
                await prisma.$executeRawUnsafe(
                    `ALTER TYPE "Role" ADD VALUE IF NOT EXISTS '${val}'`
                );
                console.log(`  ✓ Added enum value: ${val}`);
            } catch (e: any) {
                if (e.message?.includes("already exists")) {
                    console.log(`  · Enum value already exists: ${val}`);
                } else {
                    throw e;
                }
            }
        }

        // Step 2: Remap users
        console.log("\n── Remapping Users ──\n");

        const summary: Record<string, number> = {};

        for (const [oldRole, newRole] of Object.entries(ROLE_MAP)) {
            if (oldRole === newRole) continue;

            const result = await prisma.$executeRawUnsafe(
                `UPDATE "User" SET role = '${newRole}'::"Role" WHERE role = '${oldRole}'::"Role"`
            );

            summary[`${oldRole} → ${newRole}`] = result;

            if (result > 0) {
                console.log(`  ✓ ${oldRole} → ${newRole}: ${result} user(s) updated`);
            } else {
                console.log(`  · ${oldRole} → ${newRole}: 0 users (none found)`);
            }
        }

        // Step 3: Verify — check for any remaining old roles
        console.log("\n── Verification ──\n");

        const oldRoles = ["ADMIN", "HR_MANAGER", "PAYROLL_ADMIN", "RECRUITER", "IT_ADMIN"];
        for (const role of oldRoles) {
            const count: any[] = await prisma.$queryRawUnsafe(
                `SELECT COUNT(*) as cnt FROM "User" WHERE role = '${role}'::"Role"`
            );
            const remaining = Number(count[0]?.cnt || 0);
            if (remaining > 0) {
                console.log(`  ⚠ WARNING: ${remaining} user(s) still have role "${role}"`);
            }
        }

        // Step 4: Print final state
        console.log("\n── Final Role Distribution ──\n");

        const distribution: any[] = await prisma.$queryRawUnsafe(
            `SELECT role, COUNT(*) as cnt FROM "User" GROUP BY role ORDER BY cnt DESC`
        );
        for (const row of distribution) {
            console.log(`  ${row.role}: ${row.cnt} user(s)`);
        }

        console.log("\n✅ Migration complete.");
        console.log("   Next: Update prisma/schema.prisma Role enum and run `npx prisma db push`.\n");
    } catch (error) {
        console.error("\n❌ Migration failed:", error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

migrateRoles();
