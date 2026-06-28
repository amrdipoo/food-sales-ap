// lib/supabase/browserClient.ts
import { createClient } from '@supabase/supabase-js';

// هذا العميل يستخدم localStorage تلقائياً ويعمل perfectly على ngrok والموبايل
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);