import { d as defineEventHandler, h as readBody, c as createClient, a as createError, b as useRuntimeConfig } from '../../_/nitro.mjs';
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

const index_post = defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const body = await readBody(event);
  const { name, user_id } = body;
  const client = createClient(
    config.public.supabaseUrl,
    config.supabaseServiceKey
  );
  if (!name || !user_id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Organization name and User ID are required"
    });
  }
  try {
    const generateOrgCode = () => {
      const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      let result = "";
      for (let i = 0; i < 16; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      return result;
    };
    const orgCode = generateOrgCode();
    const { data: org, error: orgError } = await client.from("org").insert({
      name,
      code: orgCode,
      user_id
    }).select().single();
    if (orgError) throw orgError;
    const { error: userError } = await client.from("users").update({ org_id: org.org_id }).eq("user_id", user_id);
    if (userError) throw userError;
    return {
      success: true,
      org_id: org.org_id,
      org_code: orgCode
    };
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message || "Internal Server Error"
    });
  }
});

export { index_post as default };
//# sourceMappingURL=index.post2.mjs.map
