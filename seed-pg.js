const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function main() {
    const dbUrl = "postgresql://postgres.awvmgzguqwbowxmakxad:Developers%40sourceone.ai@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres";
    const client = new Client({ connectionString: dbUrl });

    try {
        await client.connect();

        // 1. Create Organization
        console.log("Checking organization...");
        let orgRes = await client.query('SELECT id FROM "Organization" WHERE domain = $1', ['emspro.com']);
        let orgId;

        if (orgRes.rows.length === 0) {
            orgRes = await client.query(
                'INSERT INTO "Organization" (id, name, domain, "updatedAt") VALUES ($1, $2, $3, NOW()) RETURNING id',
                ['org_123456', 'EMS Pro Default', 'emspro.com']
            );
            orgId = orgRes.rows[0].id;
            console.log("Created Organization:", orgId);
        } else {
            orgId = orgRes.rows[0].id;
            console.log("Found Organization:", orgId);
        }

        // 2. Create User
        console.log("Checking user...");
        const email = "admin@emspro.com";
        let userRes = await client.query('SELECT id FROM "User" WHERE email = $1', [email]);

        if (userRes.rows.length === 0) {
            const hashedPassword = await bcrypt.hash("admin123", 12);
            await client.query(
                'INSERT INTO "User" (id, name, email, "hashedPassword", role, "organizationId", avatar, "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())',
                ['usr_123456', 'Admin User', email, hashedPassword, 'CEO', orgId, 'AU']
            );
            console.log("Created Admin User: " + email);
        } else {
            console.log("Admin User already exists!");
        }

    } catch (err) {
        console.error("Error inserting data:", err);
    } finally {
        await client.end();
    }
}
main();
