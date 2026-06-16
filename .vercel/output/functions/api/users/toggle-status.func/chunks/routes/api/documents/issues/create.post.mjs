import { d as defineEventHandler, h as serverSupabaseClient, b as readBody, c as createError, k as assertDocumentOrgAccess, I as ISSUE_ALLOWED_ROLES, m as assertReportingOfficeAccess, n as broadcastIssueRealtime, o as orgLogisticsChannel, q as issueRealtimeChannel } from '../../../../_/nitro.mjs';
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

const create_post = defineEventHandler(async (event) => {
  var _a, _b, _c, _d, _e;
  const client = await serverSupabaseClient(event);
  const body = await readBody(event);
  const documentId = String((_a = body == null ? void 0 : body.document_id) != null ? _a : "").trim();
  const reportedOfficeId = String((_b = body == null ? void 0 : body.reported_by_office_id) != null ? _b : "").trim();
  const title = String((_c = body == null ? void 0 : body.title) != null ? _c : "").trim();
  const initialMessage = String((_d = body == null ? void 0 : body.message_text) != null ? _d : "").trim();
  if (!documentId) throw createError({ statusCode: 400, message: "document_id is required." });
  if (!reportedOfficeId) throw createError({ statusCode: 400, message: "reported_by_office_id is required." });
  if (!title) throw createError({ statusCode: 400, message: "title is required." });
  const { actor, document } = await assertDocumentOrgAccess(event, client, documentId);
  if (!ISSUE_ALLOWED_ROLES.includes(actor.userRole)) {
    throw createError({
      statusCode: 403,
      message: "Forbidden: only client or employee accounts may flag document issues."
    });
  }
  const reportingOffice = await assertReportingOfficeAccess(client, actor, reportedOfficeId);
  const { data: issue, error: issueErr } = await client.from("document_issues").insert({
    document_id: documentId,
    org_id: actor.orgId,
    reported_by_office_id: reportedOfficeId,
    title,
    status: "OPEN"
  }).select("id, document_id, org_id, reported_by_office_id, title, status, created_at").single();
  if (issueErr || !issue) {
    throw createError({
      statusCode: 500,
      message: (_e = issueErr == null ? void 0 : issueErr.message) != null ? _e : "Failed to create document issue."
    });
  }
  const { data: updatedDoc, error: docUpdateErr } = await client.from("documents").update({ tracking_status: "DISCREPANCY_REPORTED" }).eq("id", documentId).eq("org_id", actor.orgId).select("id, title, tracking_status").single();
  if (docUpdateErr) {
    throw createError({
      statusCode: 500,
      message: `Issue created but failed to update document status: ${docUpdateErr.message}`
    });
  }
  const alertNotes = `\u26A0\uFE0F DISCREPANCY REPORTED \u2014 "${title}" flagged by ${reportingOffice.name}${reportingOffice.code ? ` (${reportingOffice.code})` : ""}. Document "${document.title}" requires attention before routing continues. Issue ID: ${issue.id}.`;
  const { data: trackingEvent, error: trackErr } = await client.from("document_tracking_events").insert({
    document_id: documentId,
    org_id: actor.orgId,
    status: "DISCREPANCY_REPORTED",
    step_index: null,
    office_id: null,
    office_name: reportingOffice.name,
    actor_id: actor.userId,
    actor_role: actor.userRole,
    actor_name: actor.fullName,
    notes: alertNotes
  }).select("*").single();
  if (trackErr) {
    console.warn("[issues/create] Tracking event write failed:", trackErr.message);
  }
  let openingMessage = null;
  if (initialMessage) {
    const { data: msg, error: msgErr } = await client.from("document_messages").insert({
      issue_id: issue.id,
      sender_id: actor.userId,
      message_text: initialMessage
    }).select("id, issue_id, sender_id, message_text, created_at").single();
    if (msgErr) {
      console.warn("[issues/create] Opening message failed:", msgErr.message);
    } else {
      openingMessage = {
        ...msg,
        sender_name: actor.fullName
      };
    }
  }
  const realtimePayload = {
    type: "issue_created",
    issue,
    document: updatedDoc,
    trackingEvent: trackingEvent != null ? trackingEvent : null,
    openingMessage,
    reportedOffice,
    actor: {
      user_id: actor.userId,
      full_name: actor.fullName,
      role: actor.userRole
    },
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  await broadcastIssueRealtime(event, actor.orgId, issue.id, "issue_created", realtimePayload);
  await broadcastIssueRealtime(event, actor.orgId, issue.id, "logistics_alert", {
    type: "logistics_alert",
    document_id: documentId,
    document_title: document.title,
    trackingEvent: trackingEvent != null ? trackingEvent : null,
    issue,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
  return {
    success: true,
    message: `Issue flagged. Document tracking status set to DISCREPANCY_REPORTED.`,
    data: {
      issue,
      document: updatedDoc,
      trackingEvent: trackingEvent != null ? trackingEvent : null,
      openingMessage
    },
    realtime: {
      issueChannel: issueRealtimeChannel(actor.orgId, issue.id),
      logisticsChannel: orgLogisticsChannel(actor.orgId),
      events: ["issue_created", "new_message", "logistics_alert"]
    }
  };
});

export { create_post as default };
//# sourceMappingURL=create.post.mjs.map
