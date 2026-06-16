import { d as defineEventHandler, e as getQuery, a as createError } from '../../../_/nitro.mjs';
import { s as serverSupabaseClient } from '../../../_/serverSupabaseClient.mjs';
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
import '@supabase/ssr';

const myOffices_get = defineEventHandler(async (event) => {
  const query = getQuery(event);
  const orgId = query.orgId;
  const userId = query.userId;
  if (!orgId || !userId) {
    throw createError({
      statusCode: 400,
      message: "orgId and userId query parameters are required"
    });
  }
  const client = await serverSupabaseClient(event);
  const { data, error } = await client.from("offices").select("*").eq("org_id", orgId).eq("assigned_user", userId).order("created_at", { ascending: false });
  if (error) {
    throw createError({
      statusCode: 500,
      message: error.message || "Failed to fetch employee offices"
    });
  }
  return { success: true, data: data != null ? data : [] };
});

export { myOffices_get as default };
//# sourceMappingURL=my-offices.get.mjs.map
