import { d as defineEventHandler, a as useServerSupabase, b as getQuery, c as createError } from '../../_/nitro.mjs';
import 'node:crypto';
import 'mysql2/promise';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import '@iconify/utils';
import 'consola';
import 'node:fs';
import 'node:path';

const index_get = defineEventHandler(async (event) => {
  try {
    const client = useServerSupabase();
    const query = getQuery(event);
    const org_id = query.orgId;
    if (!org_id) {
      throw createError({
        statusCode: 400,
        message: "orgId query parameter is required"
      });
    }
    const { data, error } = await client.from("offices").select("*").eq("org_id", org_id).order("created_at", { ascending: false });
    if (error) {
      throw createError({
        statusCode: 500,
        message: error.message || "Error fetching offices"
      });
    }
    return {
      success: true,
      data: data || []
    };
  } catch (error) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || "Internal Server Error"
    });
  }
});

export { index_get as default };
//# sourceMappingURL=index.get3.mjs.map
