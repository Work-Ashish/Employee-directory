const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error("DATABASE_URL must be set in .env");
}
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function createAdmin() {
    try {
        const email = "superadmin@emspro.com";
        const password = "Super@dmin2026!";
        const hashedPassword = await bcrypt.hash(password, 10);

        // Get an organization, or create one if it doesn't exist
        let org = await prisma.organization.findFirst();
        if (!org) {
            org = await prisma.organization.create({
                data: {
                    name: "Default Organization",
                    domain: "emspro.com"
                }
            });
        }

        const admin = await prisma.user.upsert({
            where: { email },
            update: {
                hashedPassword,
                role: "CEO"
            },
            create: {
                email,
                name: "Super Admin",
                hashedPassword,
                role: "CEO",
                organizationId: org.id
            }
        });

        console.log("✅ Successfully created new admin user!");
        console.log("Email:", email);
        console.log("Password:", password);
    } catch (error) {
        console.error("❌ Error creating admin user:", error);
    } finally {
        await prisma.$disconnect();
    }
}

createAdmin();
