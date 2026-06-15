import { d as defineEventHandler, h as deleteCookie } from '../../../_/nitro.mjs';
import 'node:crypto';
import '@supabase/supabase-js';
import 'groq-sdk';
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
