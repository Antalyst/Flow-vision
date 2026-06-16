import { d as defineEventHandler, r as resolveTenant, l as listSessions } from '../../../_/nitro.mjs';
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

const sessions_get = defineEventHandler(async (event) => {
  const { userId } = await resolveTenant(event);
  const sessions = await listSessions(userId);
  return {
    success: true,
    sessions
  };
});

export { sessions_get as default };
//# sourceMappingURL=sessions.get.mjs.map
