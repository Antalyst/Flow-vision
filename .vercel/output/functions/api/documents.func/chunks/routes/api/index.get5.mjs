import { P as eventHandler, s as serverSupabaseServiceRole, c as createError } from '../../_/nitro.mjs';
import '@supabase/ssr';
import 'node:crypto';
import '@supabase/functions-js';
import '@supabase/postgrest-js';
import '@supabase/realtime-js';
import '@supabase/storage-js';
import '@supabase/auth-js';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'mysql2/promise';
import '@iconify/utils';
import 'consola';
import 'node:fs';
import 'node:path';

const index_get = eventHandler(async (event) => {
  const client = await serverSupabaseServiceRole(event);
  const { data, error } = await client.from("account_types").select("*");
  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message });
  }
  return { sensitiveData: data };
});

export { index_get as default };
//# sourceMappingURL=index.get5.mjs.map
