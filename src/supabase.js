import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://uipawzgimapxwpzezefi.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_1P-P2r78sN6PpVHiVZQ8EQ_S1GBCkou'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
