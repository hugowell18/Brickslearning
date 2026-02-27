import { createClient, SupabaseClient } from '@supabase/supabase-js';

// grab env vars; Vite replaces these during build, but they may be undefined locally
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let _supabase: SupabaseClient | null = null;
if (supabaseUrl && supabaseAnonKey) {
  _supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
  // do not throw here; allow the app to bundle. runtime calls will warn.
  console.warn('Supabase env variables are missing, client will be unavailable.');
}

function getClient(): SupabaseClient {
  if (!_supabase) {
    throw new Error('Supabase client not initialized; set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  }
  return _supabase;
}

/**
 * Progress is stored in the kv_store table using a key prefixed with "progress:".
 * The `value` column holds an object where each module id maps to its status string.
 */
export async function setProgress(userId: string, progress: Record<string, string>) {
  if (!_supabase) return; // no-op if env not configured
  const supabase = getClient();
  const { error } = await supabase
    .from('kv_store_9b296f01')
    .upsert({ key: `progress:${userId}`, value: progress });

  if (error) {
    console.error('Failed to set progress', error);
    throw error;
  }
}

// store a list of completed question UIDs for the user
export async function setCompletedQuestions(userId: string, questions: string[]) {
  if (!_supabase) return;
  const supabase = getClient();
  const { error } = await supabase
    .from('kv_store_9b296f01')
    .upsert({ key: `completed:${userId}`, value: questions });
  if (error) {
    console.error('Failed to set completed questions', error);
    throw error;
  }
}

export async function getCompletedQuestions(userId: string) {
  if (!_supabase) return [] as string[];
  const supabase = getClient();
  const { data, error } = await supabase
    .from('kv_store_9b296f01')
    .select('value')
    .eq('key', `completed:${userId}`)
    .maybeSingle();
  if (error) {
    console.error('Failed to get completed questions', error);
    throw error;
  }
  return (data?.value as string[]) || [];
}

export async function getProgress(userId: string) {
  if (!_supabase) return {} as Record<string, string>;
  const supabase = getClient();
  const { data, error } = await supabase
    .from('kv_store_9b296f01')
    .select('value')
    .eq('key', `progress:${userId}`)
    .maybeSingle();

  if (error) {
    console.error('Failed to get progress', error);
    throw error;
  }

  return (data?.value as Record<string, string>) || {};
}
