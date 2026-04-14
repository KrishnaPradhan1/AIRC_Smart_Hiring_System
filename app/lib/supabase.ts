import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dplgpkrcgkeirsqoxhqy.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_af0gtUAtRdnFmFxxlvYeVg_Xsrp9hK2';

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
