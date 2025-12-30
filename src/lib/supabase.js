import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yjcefmerfdvayazywvau.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqY2VmbWVyZmR2YXlhenl3dmF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2NDIyNDMsImV4cCI6MjA4MTIxODI0M30.cRlhQjq_TY6V8dlJ6Hj63NvaXruYhksHyYUrz9JGOpA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);