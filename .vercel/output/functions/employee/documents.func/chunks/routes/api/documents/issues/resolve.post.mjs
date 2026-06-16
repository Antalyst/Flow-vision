import { d as defineEventHandler, h as readBody, a as createError, x as assertIssueOrgAccess, I as ISSUE_ALLOWED_ROLES, o as broadcastIssueRealtime, q as orgLogisticsChannel, v as issueRealtimeChannel } from '../../../../_/nitro.mjs';
import { s as serverSupabaseClient } from '../../../../_/serverSupabaseClient.mjs';
import 'node:crypto';
import 'groq-sdk';
import 'tslib';
import 'iceberg-js';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'mysql2/promise';
import '@iconify/utils';
import 'consola';
import 'node:fs';
import 'node:path';
import '../../../../_/index2.mjs';
import 'cookie';

const resolve_post = defineEventHandler(async (event) => {
  var _a, _b, _c;
  const client = await serverSupabaseClient(event);
  const body = await readBody(event);
  const issueId = String((_a = body == null ? void 0 : body.issue_id) != null ? _a : "").trim();
  if (!issueId) {
    throw createError({ statusCode: 400, message: "issue_id is required." });
  }
  const { actor, issue } = await assertIssueOrgAccess(event, client, issueId);
  if (!ISSUE_ALLOWED_ROLES.includes(actor.userRole)) {
    throw createError({
      statusCode: 403,
      message: "Forbidden: only client or employee accounts may resolve issues."
    });
  }
  if (issue.status === "RESOLVED") {
    throw createError({ statusCode: 422, message: "Issue is already resolved." });
  }
  const { data: document, error: docErr } = await client.from("documents").select("id, org_id, title, tracking_status, current_office_id").eq("id", issue.document_id).eq("org_id", actor.orgId).maybeSingle();
  if (docErr || !document) {
    throw createError({ statusCode: 404, message: "Parent document not found." });
  }
  const { data: resolvedIssue, error: issueErr } = await client.from("document_issues").update({ status: "RESOLVED" }).eq("id", issueId).eq("org_id", actor.orgId).select("id, document_id, org_id, reported_by_office_id, title, status, created_at").single();
  if (issueErr || !resolvedIssue) {
    throw createError({
      statusCode: 500,
      message: (_b = issueErr == null ? void 0 : issueErr.message) != null ? _b : "Failed to resolve issue."
    });
  }
  const { data: updatedDoc, error: trackUpdateErr } = await client.from("documents").update({ tracking_status: "ARRIVED_AT_OFFICE" }).eq("id", issue.document_id).eq("org_id", actor.orgId).select("id, title, tracking_status, current_office_id").single();
  if (trackUpdateErr) {
    throw createError({
      statusCode: 500,
      message: `Issue resolved but failed to restore document status: ${trackUpdateErr.message}`
    });
  }
  const resolveNotes = `Issue "${issue.title}" marked RESOLVED by ${(_c = actor.fullName) != null ? _c : "an operator"}. Document returned to ARRIVED_AT_OFFICE \u2014 clean delivery workflow resumed.`;
  const { data: trackingEvent } = await client.from("document_tracking_events").insert({
    document_id: issue.document_id,
    org_id: actor.orgId,
    status: "ARRIVED_AT_OFFICE",
    step_index: null,
    office_id: null,
    office_name: null,
    actor_id: actor.userId,
    actor_role: actor.userRole,
    actor_name: actor.fullName,
    notes: resolveNotes
  }).select("*").single();
  const payload = {
    type: "issue_resolved",
    issue: resolvedIssue,
    document: updatedDoc,
    trackingEvent: trackingEvent != null ? trackingEvent : null,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  await broadcastIssueRealtime(actor.orgId, issueId, "issue_resolved", payload);
  await broadcastIssueRealtime(actor.orgId, issueId, "logistics_alert", {
    type: "logistics_alert",
    document_id: issue.document_id,
    document_title: document.title,
    trackingEvent: trackingEvent != null ? trackingEvent : null,
    issue: resolvedIssue,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
  return {
    success: true,
    message: "Issue resolved. Document returned to At Office status.",
    data: {
      issue: resolvedIssue,
      document: updatedDoc,
      trackingEvent: trackingEvent != null ? trackingEvent : null
    },
    realtime: {
      issueChannel: issueRealtimeChannel(actor.orgId, issueId),
      logisticsChannel: orgLogisticsChannel(actor.orgId),
      event: "issue_resolved"
    }
  };
});

export { resolve_post as default };
//# sourceMappingURL=resolve.post.mjs.map
