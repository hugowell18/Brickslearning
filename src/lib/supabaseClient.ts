import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const KV_TABLE = 'kv_store_9b296f01';

let _supabase: SupabaseClient | null = null;
if (supabaseUrl && supabaseAnonKey) {
  _supabase = createClient(supabaseUrl, supabaseAnonKey);
}

type HealthResult = {
  ok: boolean;
  message: string;
};

type CacheHealth = {
  at: number;
  result: HealthResult;
};

let healthCache: CacheHealth | null = null;
const HEALTH_CACHE_TTL_MS = 10_000;

function getClient(): SupabaseClient {
  if (!_supabase) {
    throw new Error('Supabase client is not configured.');
  }
  return _supabase;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(_supabase);
}

export async function checkCloudHealth(force = false): Promise<HealthResult> {
  if (!_supabase) {
    return {
      ok: false,
      message: '云端未配置：请检查 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY。',
    };
  }

  const now = Date.now();
  if (!force && healthCache && now - healthCache.at < HEALTH_CACHE_TTL_MS) {
    return healthCache.result;
  }

  try {
    const supabase = getClient();
    const { error } = await supabase.from(KV_TABLE).select('key').limit(1);
    if (error) {
      const result = {
        ok: false,
        message: `云端连通失败：${error.message}`,
      };
      healthCache = { at: now, result };
      return result;
    }
    const result = { ok: true, message: '' };
    healthCache = { at: now, result };
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const result = {
      ok: false,
      message: `云端连通失败：${message}`,
    };
    healthCache = { at: now, result };
    return result;
  }
}

export async function getJson<T>(key: string, defaultValue: T): Promise<T> {
  const health = await checkCloudHealth();
  if (!health.ok) {
    throw new Error(health.message);
  }
  const supabase = getClient();
  const { data, error } = await supabase.from(KV_TABLE).select('value').eq('key', key).maybeSingle();
  if (error) {
    throw new Error(`读取云端数据失败(${key})：${error.message}`);
  }
  return (data?.value as T) ?? defaultValue;
}

export async function setJson<T>(key: string, value: T): Promise<void> {
  const health = await checkCloudHealth();
  if (!health.ok) {
    throw new Error(health.message);
  }
  const supabase = getClient();
  const { error } = await supabase.from(KV_TABLE).upsert({ key, value });
  if (error) {
    throw new Error(`写入云端数据失败(${key})：${error.message}`);
  }
}

export async function listJsonByPrefix<T>(prefix: string): Promise<Array<{ key: string; value: T }>> {
  const health = await checkCloudHealth();
  if (!health.ok) {
    throw new Error(health.message);
  }
  const supabase = getClient();
  const { data, error } = await supabase.from(KV_TABLE).select('key,value').like('key', `${prefix}%`).limit(5000);
  if (error) {
    throw new Error(`读取云端列表失败(${prefix})：${error.message}`);
  }
  return ((data || []) as Array<{ key: string; value: T }>) ?? [];
}

export async function setProgress(userId: string, progress: Record<string, string>) {
  await setJson(`progress:${userId}`, progress);
}

export async function getProgress(userId: string) {
  return getJson<Record<string, string>>(`progress:${userId}`, {});
}

export async function setCompletedQuestions(userId: string, questions: string[]) {
  await setJson(`completed:${userId}`, questions);
}

export async function getCompletedQuestions(userId: string) {
  return getJson<string[]>(`completed:${userId}`, []);
}

export async function setUserProfile(
  userId: string,
  profile: {
    id: string;
    email: string;
    name: string;
    role: 'student' | 'instructor' | 'admin';
  },
) {
  // Keep both legacy and new keys in sync to avoid role drift across versions.
  await Promise.all([
    setJson(`profile:${userId}`, profile),
    setJson(`db_profile:${userId}`, profile),
  ]);
}

export async function getUserProfile(userId: string) {
  type Profile = {
    id: string;
    email: string;
    name: string;
    role: 'student' | 'instructor' | 'admin';
  };

  const [legacyProfile, namespacedProfile] = await Promise.all([
    getJson<Profile | null>(`profile:${userId}`, null),
    getJson<Profile | null>(`db_profile:${userId}`, null),
  ]);

  // Prefer namespaced key if present (it is the canonical key used by newer data).
  return namespacedProfile ?? legacyProfile;
}
