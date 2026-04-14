import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dplgpkrcgkeirsqoxhqy.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwbGdwa3JjZ2tlaXJzcW94aHF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4OTg3NjcsImV4cCI6MjA4OTQ3NDc2N30.SgepA72GT1iyveEr_m8-7ue6ggbmjmv0N8_H94pBsc0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
