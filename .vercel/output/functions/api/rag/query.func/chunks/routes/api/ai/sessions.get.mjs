import { d as defineEventHandler, r as resolveTenant, l as listSessions } from '../../../_/nitro.mjs';
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
