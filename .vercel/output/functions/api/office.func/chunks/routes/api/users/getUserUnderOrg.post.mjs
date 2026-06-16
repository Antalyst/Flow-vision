import { d as defineEventHandler, b as useRuntimeConfig, h as readBody, a as createError, c as createClient } from '../../../_/nitro.mjs';
import 'node:crypto';
import 'groq-sdk';
import 'tslib';
import 'iceberg-js';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'mysql2/promise';
import '@iconify/utils';
import 'consola';
import 'node:fs';
import 'node:path';

const getUserUnderOrg_post = defineEventHandler(async (event) => {
  var _a;
  try {
    const config = useRuntimeConfig();
    const body = await readBody(event);
    const org_id = (_a = body == null ? void 0 : body.org_id) != null ? _a : body == null ? void 0 : body.orgId;
    if (org_id == null || org_id === "") {
      throw createError({
        statusCode: 400,
        message: "org_id is required"
      });
    }
    const client = createClient(
      config.public.supabaseUrl,
      config.supabaseServiceKey
    );
    const { data, error } = await client.from("users").select("user_id, full_name, email, role, org_id").eq("org_id", org_id).eq("role", "employee").order("full_name", { ascending: true });
    if (error) {
      throw createError({
        statusCode: 500,
        message: error.message || "Failed to fetch employees"
      });
    }
    console.log("[Backend Data Check]:", data);
    return {
      success: true,
      data: data || []
    };
  } catch (err) {
    throw createError({
      statusCode: err.statusCode || 500,
      message: err.message || "Internal Server Error"
    });
  }
});

export { getUserUnderOrg_post as default };
//# sourceMappingURL=getUserUnderOrg.post.mjs.map
