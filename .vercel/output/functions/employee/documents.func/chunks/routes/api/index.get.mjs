import { d as defineEventHandler, a as useServerSupabase, c as createError } from '../../_/nitro.mjs';
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

const index_get = defineEventHandler(async (event) => {
  const client = useServerSupabase();
  try {
    const { data: accountTypes, error } = await client.from("account_types").select("*").order("name", { ascending: true });
    if (error) throw error;
    return accountTypes;
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message || "Error fetching account types"
    });
  }
});

export { index_get as default };
//# sourceMappingURL=index.get.mjs.map
