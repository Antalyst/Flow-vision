import { d as defineEventHandler, a as useServerSupabase, e as readBody, c as createError, q as assertIssueOrgAccess, I as ISSUE_ALLOWED_ROLES, m as broadcastIssueRealtime, o as orgLogisticsChannel, n as issueRealtimeChannel } from '../../../../_/nitro.mjs';
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

const resolve_post = defineEventHandler(async (event) => {
  var _a, _b, _c;
  const supabase = useServerSupabase();
  const body = await readBody(event);
  const issueId = String((_a = body == null ? void 0 : body.issue_id) != null ? _a : "").trim();
  if (!issueId) {
    throw createError({ statusCode: 400, message: "issue_id is required." });
  }
  const { actor, issue } = await assertIssueOrgAccess(event, supabase, issueId);
  if (!ISSUE_ALLOWED_ROLES.includes(actor.userRole)) {
    throw createError({
      statusCode: 403,
      message: "Forbidden: only supabase or employee accounts may resolve issues."
    });
  }
  if (issue.status === "RESOLVED") {
    throw createError({ statusCode: 422, message: "Issue is already resolved." });
  }
  const { data: document, error: docErr } = await supabase.from("documents").select("id, org_id, title, tracking_status, current_office_id").eq("id", issue.document_id).eq("org_id", actor.orgId).maybeSingle();
  if (docErr || !document) {
    throw createError({ statusCode: 404, message: "Parent document not found." });
  }
  const { data: resolvedIssue, error: issueErr } = await supabase.from("document_issues").update({ status: "RESOLVED" }).eq("id", issueId).eq("org_id", actor.orgId).select("id, document_id, org_id, reported_by_office_id, title, status, created_at").single();
  if (issueErr || !resolvedIssue) {
    throw createError({
      statusCode: 500,
      message: (_b = issueErr == null ? void 0 : issueErr.message) != null ? _b : "Failed to resolve issue."
    });
  }
  const { data: updatedDoc, error: trackUpdateErr } = await supabase.from("documents").update({ tracking_status: "ARRIVED_AT_OFFICE" }).eq("id", issue.document_id).eq("org_id", actor.orgId).select("id, title, tracking_status, current_office_id").single();
  if (trackUpdateErr) {
    throw createError({
      statusCode: 500,
      message: `Issue resolved but failed to restore document status: ${trackUpdateErr.message}`
    });
  }
  const resolveNotes = `Issue "${issue.title}" marked RESOLVED by ${(_c = actor.fullName) != null ? _c : "an operator"}. Document returned to ARRIVED_AT_OFFICE \u2014 clean delivery workflow resumed.`;
  const { data: trackingEvent } = await supabase.from("document_tracking_events").insert({
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
  await broadcastIssueRealtime(event, actor.orgId, issueId, "issue_resolved", payload);
  await broadcastIssueRealtime(event, actor.orgId, issueId, "logistics_alert", {
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
