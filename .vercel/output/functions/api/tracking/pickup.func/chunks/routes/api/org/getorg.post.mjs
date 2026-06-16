import { d as defineEventHandler, e as readBody, a as useServerSupabase, c as createError } from '../../../_/nitro.mjs';
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

const getorg_post = defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { user_id } = body;
  const client = useServerSupabase();
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
