import { d as defineEventHandler, e as readBody, c as createError, v as getCookie, a as useServerSupabase } from '../../../_/nitro.mjs';
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

const toggleStatus_post = defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { userId, status } = body;
  if (!userId || status === void 0 || status === null) {
    throw createError({ statusCode: 400, message: "userId and status are required" });
  }
  const sessionUserId = getCookie(event, "user_session");
  const sessionRole = getCookie(event, "user_role");
  if (!sessionUserId || sessionRole !== "client") {
    throw createError({ statusCode: 403, message: "Forbidden: administrator access required" });
  }
  const client = useServerSupabase();
  const { data: adminRow } = await client.from("users").select("org_id").eq("user_id", sessionUserId).single();
  if (!(adminRow == null ? void 0 : adminRow.org_id)) {
    throw createError({ statusCode: 403, message: "Administrator has no organization" });
  }
  const { data: targetRow } = await client.from("users").select("org_id, role").eq("user_id", userId).single();
  if (!targetRow || String(targetRow.org_id) !== String(adminRow.org_id)) {
    throw createError({ statusCode: 403, message: "Forbidden: cannot modify users outside your organization" });
  }
  if (targetRow.role === "client") {
    throw createError({ statusCode: 403, message: "Cannot modify the status of an administrator account via this endpoint" });
  }
  const { data: updated, error } = await client.from("users").update({ status: Number(status) }).eq("user_id", userId).select("user_id, full_name, status").single();
  if (error) {
    throw createError({ statusCode: 500, message: error.message || "Failed to update status" });
  }
  return {
    success: true,
    message: `User ${updated.full_name} is now ${Number(status) === 1 ? "active" : "inactive"}`,
    data: updated
  };
});

export { toggleStatus_post as default };
//# sourceMappingURL=toggle-status.post.mjs.map
