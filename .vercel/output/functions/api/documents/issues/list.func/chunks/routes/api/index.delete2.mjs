import { d as defineEventHandler, h as serverSupabaseClient, a as getQuery, c as createError } from '../../_/nitro.mjs';
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

const index_delete = defineEventHandler(async (event) => {
  try {
    const client = await serverSupabaseClient(event);
    const query = getQuery(event);
    const stage_id = query.stage_id || query.id;
    if (!stage_id) {
      throw createError({
        statusCode: 400,
        message: "stage_id or id is required to delete a stage"
      });
    }
    const { error: stepsError } = await client.from("stage_steps").delete().eq("stage_id", stage_id);
    if (stepsError) {
      console.error("[Backend Stage Error]:", stepsError);
      throw createError({
        statusCode: 500,
        message: stepsError.message || "Error deleting stage workflow items"
      });
    }
    const { data, error } = await client.from("stages").delete().eq("stage_id", stage_id).select("*");
    if (error) {
      throw createError({
        statusCode: 500,
        message: error.message || "Error deleting stage"
      });
    }
    return {
      success: true,
      message: "Stage deleted successfully",
      data
    };
  } catch (error) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || "Internal Server Error"
    });
  }
});

export { index_delete as default };
//# sourceMappingURL=index.delete2.mjs.map
