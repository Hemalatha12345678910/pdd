import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ywmwdstkgfgvszohcsdx.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3bXdkc3RrZ2ZndnN6b2hjc2R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4NzQwMzMsImV4cCI6MjA5OTQ1MDAzM30.Uu_wIyr2MZ84v94BX0sL9JzSTvaILBh-aN-2z0vX6I8'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
