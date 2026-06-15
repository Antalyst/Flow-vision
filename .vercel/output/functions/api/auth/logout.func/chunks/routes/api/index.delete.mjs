import { d as defineEventHandler, b as getQuery, c as createError } from '../../_/nitro.mjs';
import { s as serverSupabaseClient } from '../../_/serverSupabaseClient.mjs';
import 'node:crypto';
import '@supabase/supabase-js';
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
import '@supabase/ssr';

const index_delete = defineEventHandler(async (event) => {
  try {
    const client = await serverSupabaseClient(event);
    const query = getQuery(event);
    const id = query.id;
    if (!id) {
      throw createError({
        statusCode: 400,
        message: "id is required to delete an office"
      });
    }
    const { data, error } = await client.from("offices").delete().eq("id", id).select("*");
    if (error) {
      throw createError({
        statusCode: 500,
        message: error.message || "Error deleting office"
      });
    }
    return {
      success: true,
      message: "Office deleted successfully",
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
//# sourceMappingURL=index.delete.mjs.map
