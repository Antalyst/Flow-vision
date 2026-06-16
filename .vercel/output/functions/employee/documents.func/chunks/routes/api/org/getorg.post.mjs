import { d as defineEventHandler, b as readBody, s as serverSupabaseServiceRole, c as createError } from '../../../_/nitro.mjs';
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

const getorg_post = defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { user_id } = body;
  const client = await serverSupabaseServiceRole(event);
  if (!user_id) {
    throw createError({
      statusCode: 400,
      statusMessage: "User ID is required"
    });
  }
  try {
    const { data: org, error } = await client.from("org").select("*").eq("user_id", user_id).single();
    if (error && error.code !== "PGRST116") {
      throw error;
    }
    return org || null;
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message || "Error fetching organization"
    });
  }
});

export { getorg_post as default };
//# sourceMappingURL=getorg.post.mjs.map
