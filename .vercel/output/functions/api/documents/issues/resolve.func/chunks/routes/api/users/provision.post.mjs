import { d as defineEventHandler, b as readBody, x as getCookie, c as createError, s as serverSupabaseServiceRole } from '../../../_/nitro.mjs';
import { hash } from 'bcrypt-ts';
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

const provision_post = defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { full_name, email, password, role: requestedRole } = body;
  const sessionUserId = getCookie(event, "user_session");
  const sessionRole = getCookie(event, "user_role");
  if (!sessionUserId || sessionRole !== "client") {
    throw createError({ statusCode: 403, message: "Forbidden: only org administrators can provision accounts" });
  }
  if (!(full_name == null ? void 0 : full_name.trim()) || !(email == null ? void 0 : email.trim()) || !(password == null ? void 0 : password.trim())) {
    throw createError({ statusCode: 400, message: "full_name, email, and password are required" });
  }
  if (requestedRole && requestedRole !== "messenger") {
    throw createError({ statusCode: 400, message: "Only messenger accounts can be provisioned via this endpoint" });
  }
  const client = await serverSupabaseServiceRole(event);
  const { data: adminRow, error: adminErr } = await client.from("users").select("org_id, full_name").eq("user_id", sessionUserId).single();
  if (adminErr || !(adminRow == null ? void 0 : adminRow.org_id)) {
    throw createError({ statusCode: 403, message: "Administrator has no organization assigned" });
  }
  const org_id = adminRow.org_id;
  const { data: existing } = await client.from("users").select("user_id").eq("email", email.trim().toLowerCase()).maybeSingle();
  if (existing) {
    throw createError({ statusCode: 409, message: "An account with this email address already exists" });
  }
  const hashedPassword = await hash(password, 10);
  const { data: newUser, error: insertErr } = await client.from("users").insert({
    full_name: full_name.trim(),
    email: email.trim().toLowerCase(),
    password: hashedPassword,
    role: "messenger",
    org_id,
    status: 1
  }).select("user_id, full_name, email, role, org_id, status, created_at").single();
  if (insertErr) {
    console.error("[Provision] insert error:", insertErr);
    throw createError({ statusCode: 500, message: insertErr.message || "Failed to provision account" });
  }
  return {
    success: true,
    message: `Messenger account created and bound to org_id ${org_id}`,
    data: newUser
  };
});

export { provision_post as default };
//# sourceMappingURL=provision.post.mjs.map
