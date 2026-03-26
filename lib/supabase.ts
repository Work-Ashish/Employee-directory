import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _supabase: SupabaseClient | null = null
let _supabaseAdmin: SupabaseClient | null = null

function getSupabaseClient(): SupabaseClient {
    if (_supabase) return _supabase
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) {
        throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY")
    }
    _supabase = createClient(url, key)
    return _supabase
}

function getSupabaseAdmin(): SupabaseClient {
    if (_supabaseAdmin) return _supabaseAdmin
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !anonKey) {
        throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY")
    }
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || (() => {
        console.warn('[supabase] SUPABASE_SERVICE_ROLE_KEY not set, admin client using anon key — RLS bypass will not work')
        return anonKey
    })()
    _supabaseAdmin = createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    })
    return _supabaseAdmin
}

export const supabase = new Proxy({} as SupabaseClient, {
    get(_, prop) { return Reflect.get(getSupabaseClient(), prop) }
})

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
    get(_, prop) { return Reflect.get(getSupabaseAdmin(), prop) }
})

export const BUCKETS = {
    AVATARS: 'avatars',
    DOCUMENTS: 'documents',
    ASSETS: 'assets',
    TRAINING: 'training',
    RECEIPTS: 'receipts',
} as const
