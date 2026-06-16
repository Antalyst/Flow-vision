import { d as defineEventHandler, h as readBody, a as createError } from '../../_/nitro.mjs';
import { s as serverSupabaseClient } from '../../_/serverSupabaseClient.mjs';
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

const index_put = defineEventHandler(async (event) => {
  try {
    const client = await serverSupabaseClient(event);
    const body = await readBody(event);
    const { id, name, assigned_user, stage_id, code } = body;
    if (!id) {
      throw createError({
        statusCode: 400,
        message: "id is required to update an office"
      });
    }
    const updateData = {};
    if (name !== void 0) updateData.name = name;
    if (assigned_user !== void 0) updateData.assigned_user = assigned_user;
    if (stage_id !== void 0) updateData.stage_id = stage_id;
    if (code !== void 0 && (code != null ? code : "").trim()) updateData.code = code.trim();
    const { data, error } = await client.from("offices").update(updateData).eq("id", id).select("*").single();
    if (error) {
      throw createError({
        statusCode: 500,
        message: error.message || "Error updating office"
      });
    }
    return {
      success: true,
      message: "Office updated successfully",
      data
    };
  } catch (error) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || "Internal Server Error"
    });
  }
});

export { index_put as default };
//# sourceMappingURL=index.put.mjs.map
