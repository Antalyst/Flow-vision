import { d as defineEventHandler, e as readBody, a as useServerSupabase, c as createError, s as setCookie } from '../../../_/nitro.mjs';
import { compare } from 'bcrypt-ts';
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

const login_post = defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { email, password } = body;
  const supabase = useServerSupabase();
  console.log("Login attempt for email:", email);
  const { data: user, error: userError } = await supabase.from("users").select("*").eq("email", email).single();
  if (userError || !user) {
    console.error("User not found or lookup error:", userError);
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid email or password"
    });
  }
  console.log("User found, verifying password...");
  const isPasswordCorrect = await compare(password, user.password);
  console.log("Password verification result:", isPasswordCorrect);
  if (!isPasswordCorrect) {
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid email or password"
    });
  }
  const { password: _, ...userWithoutPassword } = user;
  const sessionUserId = user.user_id || user.id || "";
  setCookie(event, "user_session", sessionUserId, {
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
    sameSite: "lax"
  });
  setCookie(event, "user_role", user.role || "", {
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
    sameSite: "lax"
  });
  return {
    success: true,
    message: "Login successful",
    user: userWithoutPassword,
    token: "session_token_placeholder"
  };
});

export { login_post as default };
//# sourceMappingURL=login.post.mjs.map
