import { Client } from 'pg'
import * as dotenv from 'dotenv'

dotenv.config()

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL

if (!connectionString) {
    console.error('No connection string found in .env')
    process.exit(1)
}

const BUCKETS = ['avatars', 'documents', 'assets', 'training']

async function createBuckets() {
    const client = new Client({ connectionString })

    try {
        await client.connect()
        console.log('Connected to database. Attempting to create buckets...')

        for (const bucket of BUCKETS) {
            console.log(`Creating/Checking bucket: ${bucket}...`)
            try {
                // We use the storage.create_bucket function if it exists, 
                // or a simple insert. Supabase usually has the function.
                await client.query(`
          INSERT INTO storage.buckets (id, name, public) 
          VALUES ($1, $1, true) 
          ON CONFLICT (id) DO NOTHING;
        `, [bucket])

                console.log(`Bucket ${bucket} ensured.`)
            } catch (err: any) {
                console.error(`Error creating bucket ${bucket}:`, err.message)
            }
        }

        console.log('Bucket creation process complete.')
    } catch (err: any) {
        console.error('Database connection error:', err.message)
    } finally {
        await client.end()
    }
}

createBuckets()
