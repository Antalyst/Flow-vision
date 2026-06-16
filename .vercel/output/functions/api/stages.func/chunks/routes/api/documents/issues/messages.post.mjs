import { d as defineEventHandler, a as useServerSupabase, e as readBody, c as createError, q as assertIssueOrgAccess, I as ISSUE_ALLOWED_ROLES, m as broadcastIssueRealtime, n as issueRealtimeChannel } from '../../../../_/nitro.mjs';
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

const messages_post = defineEventHandler(async (event) => {
  var _a, _b, _c;
  const supabase = useServerSupabase();
  const body = await readBody(event);
  const issueId = String((_a = body == null ? void 0 : body.issue_id) != null ? _a : "").trim();
  const messageText = String((_b = body == null ? void 0 : body.message_text) != null ? _b : "").trim();
  if (!issueId) throw createError({ statusCode: 400, message: "issue_id is required." });
  if (!messageText) throw createError({ statusCode: 400, message: "message_text is required." });
  const { actor, issue } = await assertIssueOrgAccess(event, supabase, issueId);
  if (!ISSUE_ALLOWED_ROLES.includes(actor.userRole)) {
    throw createError({
      statusCode: 403,
      message: "Forbidden: only supabase or employee accounts may post issue messages."
    });
  }
  if (issue.status === "RESOLVED") {
    throw createError({
      statusCode: 422,
      message: "This issue thread is resolved. Reopen the issue before posting new messages."
    });
  }
  const { data: message, error: msgErr } = await supabase.from("document_messages").insert({
    issue_id: issueId,
    sender_id: actor.userId,
    message_text: messageText
  }).select("id, issue_id, sender_id, message_text, created_at").single();
  if (msgErr || !message) {
    throw createError({
      statusCode: 500,
      message: (_c = msgErr == null ? void 0 : msgErr.message) != null ? _c : "Failed to post message."
    });
  }
  const enriched = {
    ...message,
    sender_name: actor.fullName,
    sender_role: actor.userRole
  };
  await broadcastIssueRealtime(event, actor.orgId, issueId, "new_message", {
    type: "new_message",
    issue_id: issueId,
    message: enriched,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
  return {
    success: true,
    data: enriched,
    realtime: {
      channel: issueRealtimeChannel(actor.orgId, issueId),
      event: "new_message"
    }
  };
});

export { messages_post as default };
//# sourceMappingURL=messages.post.mjs.map
