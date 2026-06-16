import { d as defineEventHandler, b as getQuery, c as createError, x as getCookie, a as useServerSupabase } from '../../../_/nitro.mjs';
import 'node:crypto';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import '@iconify/utils';
import 'consola';
import 'node:fs';
import 'node:path';

const orgMembers_get = defineEventHandler(async (event) => {
  var _a;
  const query = getQuery(event);
  const orgId = query.orgId;
  const role = (_a = query.role) != null ? _a : "all";
  if (!orgId) {
    throw createError({ statusCode: 400, message: "orgId is required" });
  }
  const sessionUserId = getCookie(event, "user_session");
  const sessionRole = getCookie(event, "user_role");
  if (!sessionUserId || sessionRole !== "client") {
    throw createError({ statusCode: 403, message: "Forbidden: administrator access required" });
  }
  const client = useServerSupabase();
  const { data: adminRow, error: adminErr } = await client.from("users").select("org_id").eq("user_id", sessionUserId).single();
  if (adminErr || !adminRow) {
    throw createError({ statusCode: 403, message: "Could not verify administrator identity" });
  }
  if (String(adminRow.org_id) !== String(orgId)) {
    throw createError({ statusCode: 403, message: "Forbidden: org_id mismatch" });
  }
  const allowedRoles = ["employee", "messenger"];
  let dbQuery = client.from("users").select("user_id, full_name, email, role, org_id, status, created_at").eq("org_id", orgId).in("role", allowedRoles).order("full_name", { ascending: true });
  if (role !== "all" && allowedRoles.includes(role)) {
    dbQuery = client.from("users").select("user_id, full_name, email, role, org_id, status, created_at").eq("org_id", orgId).eq("role", role).order("full_name", { ascending: true });
  }
  const { data, error } = await dbQuery;
  if (error) {
    throw createError({ statusCode: 500, message: error.message || "Failed to fetch members" });
  }
  return { success: true, data: data != null ? data : [] };
});

export { orgMembers_get as default };
//# sourceMappingURL=org-members.get.mjs.map
