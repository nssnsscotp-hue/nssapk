/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dkrobuattxhlxtvuijtg.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_we8MLkhIK9fKOgEJAYaiPw_4kmQ-yj8';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("⚠️ SUPABASE CREDENTIALS MISSING: The app is running in MOCK MODE. Data will not be saved or fetched. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your environment.");
}

// Helper to create a promise-like object that returns empty data
const mockResult = (data: any = []) => {
  const promise = Promise.resolve({ data, error: null });
  return Object.assign(promise, {
    order: () => mockResult(data),
    limit: () => mockResult(data),
    eq: () => mockResult(data),
    single: () => Promise.resolve({ data: Array.isArray(data) ? data[0] : data, error: null }),
    select: () => mockResult(data),
    insert: () => mockResult(data),
    update: () => mockResult(data),
    delete: () => mockResult(data),
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
  });
};

const mockSupabase = {
  from: () => mockResult([]),
  channel: () => ({
    on: () => ({ subscribe: () => ({}) }),
    subscribe: () => ({}),
  }),
  removeChannel: () => ({}),
  auth: {
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    signInWithPassword: () => Promise.resolve({ data: {}, error: null }),
    signInAnonymously: () => Promise.resolve({ data: { session: {} }, error: null }),
    signOut: () => Promise.resolve({ error: null }),
  }
} as any;

export const supabase = (supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('placeholder')) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : mockSupabase;
