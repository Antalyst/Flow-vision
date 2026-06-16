import { Q as eventHandler, c as createClient, a as createError, b as useRuntimeConfig } from '../../_/nitro.mjs';
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

const index_get = eventHandler(async (event) => {
  const config = useRuntimeConfig();
  const client = createClient(
    config.public.supabaseUrl,
    config.supabaseServiceKey
  );
  const { data, error } = await client.from("account_types").select("*");
  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message });
  }
  return { sensitiveData: data };
});

export { index_get as default };
//# sourceMappingURL=index.get5.mjs.map
