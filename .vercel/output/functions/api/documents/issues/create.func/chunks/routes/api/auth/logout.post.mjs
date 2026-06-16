import { d as defineEventHandler, f as deleteCookie } from '../../../_/nitro.mjs';
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

const logout_post = defineEventHandler(async (event) => {
  deleteCookie(event, "user_session");
  deleteCookie(event, "user_role");
  return {
    success: true,
    message: "Logged out successfully"
  };
});

export { logout_post as default };
//# sourceMappingURL=logout.post.mjs.map
