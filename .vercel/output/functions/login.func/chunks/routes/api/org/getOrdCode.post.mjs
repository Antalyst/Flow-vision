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

const getOrdCode_post = defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const inputCode = ((body == null ? void 0 : body.code) || "").trim();
    if (!inputCode) {
      return {
        success: false,
        message: "Organization code is required"
      };
    }
    const client = useServerSupabase();
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
