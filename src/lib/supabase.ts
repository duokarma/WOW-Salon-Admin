import { createClient } from '@supabase/supabase-js'

let supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://cqjnhjirqakyqndyknff.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_cB2Xrp4KJ0Pv__nwGHmjGQ_VF7pu2Y-'

if (supabaseUrl && !supabaseUrl.startsWith('http')) {
  supabaseUrl = 'https://' + supabaseUrl;
}
if (supabaseUrl && !supabaseUrl.includes('.supabase.co')) {
  supabaseUrl = supabaseUrl + '.supabase.co';
}

if (!supabaseUrl || !supabaseUrl.startsWith('http')) {
  throw new Error('Missing or invalid environment variable: VITE_SUPABASE_URL.')
}

if (!supabaseAnonKey) {
  throw new Error('Missing environment variable: VITE_SUPABASE_ANON_KEY.')
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
)