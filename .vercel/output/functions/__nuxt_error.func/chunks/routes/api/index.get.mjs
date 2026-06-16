import { d as defineEventHandler, s as serverSupabaseServiceRole, c as createError } from '../../_/nitro.mjs';
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

const index_get = defineEventHandler(async (event) => {
  const client = await serverSupabaseServiceRole(event);
  try {
    const { data: accountTypes, error } = await client.from("account_types").select("*").order("name", { ascending: true });
    if (error) throw error;
    return accountTypes;
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message || "Error fetching account types"
    });
  }
});

export { index_get as default };
//# sourceMappingURL=index.get.mjs.map
