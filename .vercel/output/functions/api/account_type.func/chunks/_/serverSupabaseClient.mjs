import { createServerClient, parseCookieHeader } from '@supabase/ssr';
import { s as setCookie, R as setHeader, b as useRuntimeConfig, S as getHeader } from './nitro.mjs';

async function fetchWithRetry(req, init) {
  const retries = 3;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fetch(req, init);
    } catch (error) {
      if (init?.signal?.aborted) {
        throw error;
      }
      if (attempt === retries) {
        const { headers: _headers, ...safeInit } = init ?? {};
        console.error(`Error fetching request ${req}`, error, safeInit);
        throw error;
      }
      console.warn(`Retrying fetch attempt ${attempt + 1} for request: ${req}`);
      await new Promise((resolve) => setTimeout(resolve, 100 * attempt));
    }
  }
  throw new Error("Unreachable code");
}

function setCookies(event, cookies, headers = {}) {
  const response = event.node.res;
  const headersWritable = () => !response.headersSent && !response.writableEnded;
  if (!headersWritable()) {
    return;
  }
  for (const { name, value, options } of cookies) {
    if (!headersWritable()) {
      break;
    }
    setCookie(event, name, value, options);
  }
  for (const [key, value] of Object.entries(headers)) {
    if (!headersWritable()) {
      break;
    }
    setHeader(event, key, value);
  }
}

const serverSupabaseClient = async (event) => {
  if (!event.context._supabaseClient) {
    const {
      url,
      key,
      cookiePrefix,
      cookieOptions,
      clientOptions: { auth = {}, global = {} }
    } = useRuntimeConfig(event).public.supabase;
    event.context._supabaseClient = createServerClient(url, key, {
      auth,
      cookies: {
        getAll: () => parseCookieHeader(getHeader(event, "Cookie") ?? ""),
        setAll: (cookies, headers) => setCookies(event, cookies, headers)
      },
      cookieOptions: {
        ...cookieOptions,
        name: cookiePrefix
      },
      global: {
        fetch: fetchWithRetry,
        ...global
      }
    });
  }
  return event.context._supabaseClient;
};

export { serverSupabaseClient as s };
//# sourceMappingURL=serverSupabaseClient.mjs.map
