import { d as defineEventHandler, b as getQuery, c as createError, a as useServerSupabase } from '../../../_/nitro.mjs';
import 'node:crypto';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'sql-escaper';
import 'events';
import 'lru.min';
import 'process';
import 'net';
import 'tls';
import 'timers';
import 'stream';
import 'denque';
import 'buffer';
import 'long';
import 'iconv-lite';
import 'crypto';
import 'zlib';
import 'generate-function';
import 'url';
import 'aws-ssl-profiles';
import 'named-placeholders';
import '@iconify/utils';
import 'consola';
import 'node:fs';
import 'node:path';

const myOffices_get = defineEventHandler(async (event) => {
  const query = getQuery(event);
  const orgId = query.orgId;
  const userId = query.userId;
  if (!orgId || !userId) {
    throw createError({
      statusCode: 400,
      message: "orgId and userId query parameters are required"
    });
  }
  const client = useServerSupabase();
  const { data, error } = await client.from("offices").select("*").eq("org_id", orgId).eq("assigned_user", userId).order("created_at", { ascending: false });
  if (error) {
    throw createError({
      statusCode: 500,
      message: error.message || "Failed to fetch employee offices"
    });
  }
  return { success: true, data: data != null ? data : [] };
});

export { myOffices_get as default };
//# sourceMappingURL=my-offices.get.mjs.map
