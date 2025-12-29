import { createClient } from '@supabase/supabase-js'

// You need to replace these with your actual keys from the Supabase Dashboard!
// (Project Settings -> API)
const supabaseUrl = 'https://daicbivwilgayvtuqqoi.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhaWNiaXZ3aWxnYXl2dHVxcW9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3MTYzNDAsImV4cCI6MjA4MjI5MjM0MH0.oQFl87k3DYyOgv7Zq30JeyjxSZj3nUDCR6lbFdmIi44'

export const supabase = createClient(supabaseUrl, supabaseKey)