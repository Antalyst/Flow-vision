import { d as defineEventHandler, h as readBody, a as createError, y as getCookie, c as createClient, b as useRuntimeConfig } from '../../../_/nitro.mjs';
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

const toggleStatus_post = defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
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
  const client = createClient(config.public.supabaseUrl, config.supabaseServiceKey);
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
