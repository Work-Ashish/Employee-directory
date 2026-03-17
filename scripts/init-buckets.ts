import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load .env from root
dotenv.config({ path: path.join(process.cwd(), '.env') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const BUCKETS = ['avatars', 'documents', 'assets', 'training']

async function setupStorage() {
    console.log('Initializing Supabase Storage Buckets...')

    for (const bucket of BUCKETS) {
        console.log(`Checking bucket: ${bucket}...`)

        const { data: buckets, error: listError } = await supabase.storage.listBuckets()
        if (listError) {
            console.error(`Error listing buckets: ${listError.message}`)
            return
        }

        const exists = buckets.find(b => b.name === bucket)

        if (exists) {
            console.log(`Bucket ${bucket} already exists.`)
        } else {
            console.log(`Creating bucket ${bucket}...`)
            const { data, error } = await supabase.storage.createBucket(bucket, {
                public: true,
                allowedMimeTypes: bucket === 'training' ? ['video/*'] : undefined,
                fileSizeLimit: bucket === 'training' ? 100 * 1024 * 1024 : 5 * 1024 * 1024 // 100MB for video, 5MB for others
            })

            if (error) {
                console.error(`Error creating bucket ${bucket}: ${error.message}`)
                if (error.message.includes('403')) {
                    console.error('Permission denied. Please ensure SUPABASE_SERVICE_ROLE_KEY is set in your .env file.')
                }
            } else {
                console.log(`Bucket ${bucket} created successfully.`)
            }
        }
    }
}

setupStorage()
    .catch(err => {
        console.error('Unexpected error:', err)
    })
