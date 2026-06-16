import { d as defineEventHandler, e as readBody, a as useServerSupabase, c as createError } from '../../../_/nitro.mjs';
import { hash } from 'bcrypt-ts';
import 'node:crypto';
import 'mysql2/promise';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import '@iconify/utils';
import 'consola';
import 'node:fs';
import 'node:path';

const register_post = defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { email, password, full_name, acctype_id, birth_date, org_code } = body;
  const client = useServerSupabase();
  if (!email || !password || !full_name || !acctype_id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing required fields"
    });
  }
  const { data: typeData, error: typeError } = await client.from("account_types").select("name").eq("acctype_id", acctype_id).single();
  if (typeError || !typeData) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid account type selected"
    });
  }
  const typeName = typeData.name;
  let role = "";
  if (typeName.toLowerCase() === "organization") {
    role = "client";
  } else if (typeName.toLowerCase() === "employee") {
    role = "employee";
  } else {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid account type selected"
    });
  }
  const today = /* @__PURE__ */ new Date();
  const bDay = new Date(birth_date);
  let age = today.getFullYear() - bDay.getFullYear();
  if (today < new Date(today.getFullYear(), bDay.getMonth(), bDay.getDate())) {
    age--;
  }
  const birthYear = bDay.getFullYear();
  try {
    let resolvedOrgId = null;
    if (role === "employee") {
      if (!org_code) {
        throw createError({ statusCode: 400, statusMessage: "Organization code is required for employees" });
      }
      const { data: orgData, error: orgError } = await client.from("org").select("org_id").eq("code", org_code).single();
      if (orgError || !orgData) {
        throw createError({ statusCode: 404, statusMessage: "Invalid organization code" });
      }
      resolvedOrgId = orgData.org_id;
    }
    const hashedPassword = await hash(password, 10);
    console.log("Inserting user into Supabase...");
    const { data: profileData, error: profileError } = await client.from("users").insert({
      email,
      full_name,
      role,
      acctype_id,
      birth_year: birthYear,
      birth_date,
      age,
      status: 1,
      password: hashedPassword,
      org_id: resolvedOrgId
    }).select().single();
    if (profileError) {
      console.error("Supabase User Insert Error:", profileError);
      throw profileError;
    }
    return {
      success: true,
      message: "Registration successful",
      user: profileData,
      token: "session_token_placeholder"
    };
  } catch (error) {
    console.error("REGISTRATION ERROR:", error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || "Error during registration"
    });
  }
});

export { register_post as default };
//# sourceMappingURL=register.post.mjs.map
