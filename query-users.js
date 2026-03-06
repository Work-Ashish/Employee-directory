const { Client } = require('pg');

async function main() {
    const dbUrl = "postgresql://postgres.awvmgzguqwbowxmakxad:Developers%40sourceone.ai@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres";
    const client = new Client({ connectionString: dbUrl });
    try {
        await client.connect();
        // Query users
        const res = await client.query('SELECT id, email, role, name FROM "User"'); // Prisma quotes table names by default with uppercase U
        console.log("Users in DB:");
        console.table(res.rows);
    } catch (err) {
        if (err.message.includes('does not exist')) {
            console.error("Table does not exist yet!");
        } else {
            console.error(err);
        }
    } finally {
        await client.end();
    }
}
main();
