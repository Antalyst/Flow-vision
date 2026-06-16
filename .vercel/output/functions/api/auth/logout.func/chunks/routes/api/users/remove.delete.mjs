import { d as defineEventHandler, b as getQuery, c as createError, v as getCookie, a as useServerSupabase } from '../../../_/nitro.mjs';
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

const remove_delete = defineEventHandler(async (event) => {
  const query = getQuery(event);
  const userId = query.userId;
  if (!userId) {
    throw createError({ statusCode: 400, message: "userId query parameter is required" });
  }
  const sessionUserId = getCookie(event, "user_session");
  const sessionRole = getCookie(event, "user_role");
  if (!sessionUserId || sessionRole !== "client") {
    throw createError({ statusCode: 403, message: "Forbidden: administrator access required" });
  }
  if (String(userId) === String(sessionUserId)) {
    throw createError({ statusCode: 400, message: "Administrators cannot remove their own account via this endpoint" });
  }
  const client = useServerSupabase();
  const { data: adminRow } = await client.from("users").select("org_id").eq("user_id", sessionUserId).single();
  if (!(adminRow == null ? void 0 : adminRow.org_id)) {
    throw createError({ statusCode: 403, message: "Administrator has no organization" });
  }
  const { data: targetRow } = await client.from("users").select("org_id, role, full_name").eq("user_id", userId).single();
  if (!targetRow || String(targetRow.org_id) !== String(adminRow.org_id)) {
    throw createError({ statusCode: 403, message: "Forbidden: cannot remove users outside your organization" });
  }
  if (targetRow.role === "client") {
    throw createError({ statusCode: 403, message: "Cannot remove an administrator account" });
  }
  const { error } = await client.from("users").delete().eq("user_id", userId);
  if (error) {
    throw createError({ statusCode: 500, message: error.message || "Failed to remove user" });
  }
  return { success: true, message: `${targetRow.full_name}'s account has been permanently removed` };
});

export { remove_delete as default };
//# sourceMappingURL=remove.delete.mjs.map
