import { d as defineEventHandler, r as resolveTenant, b as getQuery, U as UUID_REGEX, c as createError, a as useServerSupabase } from '../../../_/nitro.mjs';
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

const messages_get = defineEventHandler(async (event) => {
  const { userId } = await resolveTenant(event);
  const { session_id: sessionIdRaw } = getQuery(event);
  const sessionId = typeof sessionIdRaw === "string" ? sessionIdRaw : "";
  if (!sessionId || !UUID_REGEX.test(sessionId)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'A valid "session_id" query parameter is required.'
    });
  }
  const supabase = useServerSupabase();
  const { data: ownedSession, error: ownershipError } = await supabase.from("chat_sessions").select("id").eq("id", sessionId).eq("user_id", String(userId)).maybeSingle();
  if (ownershipError) {
    console.error("Database read failed (chat_sessions):", ownershipError);
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to verify session ownership: ${ownershipError.message}`
    });
  }
  if (!ownedSession) {
    throw createError({
      statusCode: 403,
      statusMessage: "Forbidden: this chat session does not belong to the current user."
    });
  }
  const { data, error } = await supabase.from("chat_messages").select("role, content, metadata, created_at").eq("session_id", sessionId).order("created_at", { ascending: true });
  if (error) {
    console.error("Database read failed (chat_messages):", error);
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to load chat messages: ${error.message}`
    });
  }
  console.log("\u{1F4E6} Fetching history for session:", sessionId, "Found rows:", data == null ? void 0 : data.length);
  return {
    success: true,
    session_id: sessionId,
    messages: data != null ? data : []
  };
});

export { messages_get as default };
//# sourceMappingURL=messages.get.mjs.map
