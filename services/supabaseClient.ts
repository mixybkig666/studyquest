import { createClient } from '@supabase/supabase-js';

// Configuration - Verified Supabase project settings
const SUPABASE_URL = 'https://nfumkvnxjqfndnsdmsbu.supabase.co';
// Correct anon public key from Supabase Dashboard -> Settings -> API
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mdW1rdm54anFmbmRuc2Rtc2J1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NDEzNDksImV4cCI6MjA4MzMxNzM0OX0.6rFatamWjCacsqaRq6yJ9RNFClIqGAuPIkdaX-dYzFY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // Persist session in localStorage
    persistSession: true,
    // Auto refresh tokens before expiry
    autoRefreshToken: true,
    // Don't detect session in URL (we're not using OAuth redirects)
    detectSessionInUrl: false,
    // Use a stable storage key
    storageKey: 'studyquest-auth-token',
  },
});

// Helper to get image public URL (assuming R2 is hooked up via Supabase Storage or direct link)
export const getFileUrl = (path: string) => {
  // Since user provided specific R2 S3 API, in a real scenario we'd sign URLs.
  // For this MVP and the Supabase integration, we assume Supabase Storage wrappers 
  // or direct public access if configured. 
  // Returning a placeholder logic here.
  return `${SUPABASE_URL}/storage/v1/object/public/study/${path}`;
};

// Direct fetch helper - bypasses Supabase client to avoid refresh issues
export const directFetch = async (
  endpoint: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
  body?: object
): Promise<{ data: any; error: any; status: number }> => {
  const storageKey = 'studyquest-auth-token';
  const storedData = localStorage.getItem(storageKey);

  if (!storedData) {
    return { data: null, error: { message: 'No session' }, status: 401 };
  }

  let accessToken: string | null = null;
  try {
    const parsed = JSON.parse(storedData);
    accessToken = parsed.access_token;
  } catch (e) {
    return { data: null, error: { message: 'Invalid session data' }, status: 401 };
  }

  if (!accessToken) {
    return { data: null, error: { message: 'No access token' }, status: 401 };
  }

  const headers: HeadersInit = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation', // Return updated data
  };

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = response.ok ? await response.json() : null;
    const error = response.ok ? null : { message: `HTTP ${response.status}` };

    return { data, error, status: response.status };
  } catch (e: any) {
    return { data: null, error: { message: e.message }, status: 500 };
  }
};

// Direct RPC helper - for calling Supabase RPC functions
export const directRpc = async (
  functionName: string,
  params: object
): Promise<{ data: any; error: any; status: number }> => {
  const storageKey = 'studyquest-auth-token';
  const storedData = localStorage.getItem(storageKey);

  if (!storedData) {
    return { data: null, error: { message: 'No session' }, status: 401 };
  }

  let accessToken: string | null = null;
  try {
    const parsed = JSON.parse(storedData);
    accessToken = parsed.access_token;
  } catch (e) {
    return { data: null, error: { message: 'Invalid session data' }, status: 401 };
  }

  if (!accessToken) {
    return { data: null, error: { message: 'No access token' }, status: 401 };
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${functionName}`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const data = response.ok ? await response.json() : null;
    const error = response.ok ? null : { message: `HTTP ${response.status}` };

    return { data, error, status: response.status };
  } catch (e: any) {
    return { data: null, error: { message: e.message }, status: 500 };
  }
};