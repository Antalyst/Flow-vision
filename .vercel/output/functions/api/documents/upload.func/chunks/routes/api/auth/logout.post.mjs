import { d as defineEventHandler, f as deleteCookie } from '../../../_/nitro.mjs';
import '@supabase/ssr';
import 'node:crypto';
import '@supabase/functions-js';
import '@supabase/postgrest-js';
import '@supabase/realtime-js';
import '@supabase/storage-js';
import '@supabase/auth-js';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'mysql2/promise';
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
