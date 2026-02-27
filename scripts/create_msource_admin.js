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
        const email = "Backend@msourceone.com";
        const password = "AdminPassword2026!"; // Strong default password
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
                role: "ADMIN",
                mustChangePassword: false // So they can log right in
            },
            create: {
                email,
                name: "System Admin",
                hashedPassword,
                role: "ADMIN",
                organizationId: org.id,
                mustChangePassword: false
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
