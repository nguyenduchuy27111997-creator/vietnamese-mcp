import { createClient } from '@supabase/supabase-js';

// ANON KEY ONLY — safe to expose in client-side code (RLS protects data).
// NEVER put the gateway service role secret in this file.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
);
