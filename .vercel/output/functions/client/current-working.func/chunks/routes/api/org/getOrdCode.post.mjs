import { d as defineEventHandler, a as useRuntimeConfig, f as readBody, c as createError } from '../../../_/nitro.mjs';
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

const getOrdCode_post = defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig();
    const body = await readBody(event);
    const inputCode = ((body == null ? void 0 : body.code) || "").trim();
    if (!inputCode) {
      return {
        success: false,
        message: "Organization code is required"
      };
    }
    const client = createClient(
      config.public.supabaseUrl,
      config.supabaseServiceKey
    );
    const { data, error } = await client.from("org").select("org_id, code, name").eq("code", inputCode).single();
    if (error || !data) {
      return {
        success: false,
        message: "Invalid organization code"
      };
    }
    return {
      success: true,
      rows: data
    };
  } catch (error) {
    console.error("DATABASE ERROR:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error"
    });
  }
});

export { getOrdCode_post as default };
//# sourceMappingURL=getOrdCode.post.mjs.map
