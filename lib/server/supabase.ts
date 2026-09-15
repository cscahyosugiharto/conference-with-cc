import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let serviceClient: SupabaseClient | null = null;

export function supabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export function missingSupabaseMessage(): string {
  return "The database is not configured. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see README).";
}

export function getServiceClient(): SupabaseClient {
  if (!supabaseConfigured()) {
    throw new Error(missingSupabaseMessage());
  }
  if (!serviceClient) {
    serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string,
      {
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
  }
  return serviceClient;
}
