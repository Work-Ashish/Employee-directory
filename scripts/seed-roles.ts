import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    const org = await prisma.organization.findFirst();
    if (!org) { console.error('No org found'); return; }
    console.log("Org:", org.id);

    const password = await bcrypt.hash('password123', 12);

    const users = [
        { name: 'HR Manager', email: 'hr@emspro.com', role: 'HR' as const },
        { name: 'Payroll Admin', email: 'payroll@emspro.com', role: 'PAYROLL' as const },
        { name: 'Team Lead', email: 'teamlead@emspro.com', role: 'TEAM_LEAD' as const },
        { name: 'Employee User', email: 'employee@emspro.com', role: 'EMPLOYEE' as const },
    ];

    for (const u of users) {
        const result = await prisma.user.upsert({
            where: { email: u.email },
            update: { role: u.role },
            create: {
                name: u.name,
                email: u.email,
                hashedPassword: password,
                role: u.role,
                organizationId: org.id,
            }
        });
        console.log(`Created: ${u.email} (${u.role}) -> ${result.id}`);
    }

    console.log("\nAll users:");
    const all = await prisma.user.findMany({ select: { email: true, role: true, name: true } });
    console.table(all);
}

main()
    .catch(e => console.error(e))
    .finally(async () => { await prisma.$disconnect(); });
