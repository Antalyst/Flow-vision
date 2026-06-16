import { O as eventHandler, a as useServerSupabase, c as createError } from '../../_/nitro.mjs';
import 'node:crypto';
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
  const client = useServerSupabase();
  const { data, error } = await client.from("account_types").select("*");
  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message });
  }
  return { sensitiveData: data };
});

export { index_get as default };
//# sourceMappingURL=index.get5.mjs.map
