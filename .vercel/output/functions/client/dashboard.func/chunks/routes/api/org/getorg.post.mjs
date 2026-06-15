import { d as defineEventHandler, f as readBody, c as createError, a as useRuntimeConfig } from '../../../_/nitro.mjs';
import { createClient } from '@supabase/supabase-js';
import 'node:crypto';
import 'groq-sdk';
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
  const config = useRuntimeConfig();
  const body = await readBody(event);
  const { user_id } = body;
  const client = createClient(
    config.public.supabaseUrl,
    config.supabaseServiceKey
  );
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
