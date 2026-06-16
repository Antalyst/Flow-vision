import { d as defineEventHandler, e as getQuery, a as createError } from '../../_/nitro.mjs';
import { s as serverSupabaseClient } from '../../_/serverSupabaseClient.mjs';
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
import '../../_/index2.mjs';
import 'cookie';

const index_get = defineEventHandler(async (event) => {
  try {
    const client = await serverSupabaseClient(event);
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
