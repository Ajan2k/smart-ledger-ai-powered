import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder-url.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';

if (!process.env.SUPABASE_URL && process.env.NODE_ENV === 'production') {
  console.warn('Warning: SUPABASE_URL environment variable is missing.');
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NODE_ENV === 'production') {
  console.warn('Warning: SUPABASE_SERVICE_ROLE_KEY environment variable is missing.');
}

// Initialize Supabase Client
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
  },
});

// Compatibility stub to prevent compilation/runtime crashes in existing API files
export async function connectMongoose() {
  return Promise.resolve();
}
