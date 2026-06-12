import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY!;

// This app has no authentication — it talks to public tables only. Disabling
// session persistence and token auto-refresh avoids a recurring background
// timer and unnecessary AsyncStorage reads/writes on startup.
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
