import { d as defineEventHandler, b as getQuery, c as createError, v as assertIssueOrgAccess, q as issueRealtimeChannel } from '../../../../_/nitro.mjs';
import { s as serverSupabaseClient } from '../../../../_/serverSupabaseClient.mjs';
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
import '@supabase/ssr';

const messages_get = defineEventHandler(async (event) => {
  var _a, _b;
  const client = await serverSupabaseClient(event);
  const query = getQuery(event);
  const issueId = String((_a = query.issue_id) != null ? _a : "").trim();
  const limit = Math.min(Math.max(Number((_b = query.limit) != null ? _b : 100), 1), 500);
  const before = query.before ? String(query.before) : null;
  if (!issueId) {
    throw createError({ statusCode: 400, message: "issue_id query parameter is required." });
  }
  const { actor, issue } = await assertIssueOrgAccess(event, client, issueId);
  let msgQuery = client.from("document_messages").select("id, issue_id, sender_id, message_text, created_at").eq("issue_id", issueId).order("created_at", { ascending: true }).limit(limit);
  if (before) {
    msgQuery = msgQuery.lt("created_at", before);
  }
  const { data: messages, error: msgErr } = await msgQuery;
  if (msgErr) {
    throw createError({ statusCode: 500, message: msgErr.message });
  }
  const senderIds = [...new Set((messages != null ? messages : []).map((m) => m.sender_id).filter(Boolean))];
  let senderMap = {};
  if (senderIds.length) {
    const { data: senders } = await client.from("users").select("user_id, full_name, role").in("user_id", senderIds).eq("org_id", actor.orgId);
    senderMap = (senders != null ? senders : []).reduce(
      (acc, u) => {
        var _a2, _b2;
        acc[String(u.user_id)] = { full_name: (_a2 = u.full_name) != null ? _a2 : null, role: (_b2 = u.role) != null ? _b2 : null };
        return acc;
      },
      {}
    );
  }
  const enriched = (messages != null ? messages : []).map((m) => {
    var _a2, _b2, _c, _d;
    return {
      ...m,
      sender_name: (_b2 = (_a2 = senderMap[String(m.sender_id)]) == null ? void 0 : _a2.full_name) != null ? _b2 : null,
      sender_role: (_d = (_c = senderMap[String(m.sender_id)]) == null ? void 0 : _c.role) != null ? _d : null
    };
  });
  return {
    success: true,
    org_id: actor.orgId,
    issue: {
      id: issue.id,
      document_id: issue.document_id,
      title: issue.title,
      status: issue.status,
      reported_by_office_id: issue.reported_by_office_id,
      created_at: issue.created_at
    },
    total: enriched.length,
    data: enriched,
    realtime: {
      channel: issueRealtimeChannel(actor.orgId, issueId),
      events: ["new_message", "issue_created", "issue_resolved"]
    }
  };
});

export { messages_get as default };
//# sourceMappingURL=messages.get.mjs.map
