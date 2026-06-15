import { d as defineEventHandler, f as readBody, c as createError, x as getCookie } from '../../../_/nitro.mjs';
import { s as serverSupabaseClient } from '../../../_/serverSupabaseClient.mjs';
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

const VALID_STATUSES = ["CREATED", "PICKED_UP", "IN_TRANSIT", "ARRIVED_AT_OFFICE", "DISCREPANCY_REPORTED", "COMPLETED"];
const TRANSITIONS = {
  CREATED: ["PICKED_UP"],
  PICKED_UP: ["IN_TRANSIT"],
  IN_TRANSIT: ["ARRIVED_AT_OFFICE"],
  ARRIVED_AT_OFFICE: ["PICKED_UP", "COMPLETED", "DISCREPANCY_REPORTED"],
  DISCREPANCY_REPORTED: ["ARRIVED_AT_OFFICE", "PICKED_UP"],
  COMPLETED: []
};
const advance_post = defineEventHandler(async (event) => {
  var _a, _b, _c, _d;
  const client = await serverSupabaseClient(event);
  const body = await readBody(event);
  const { document_id, status: nextStatus, notes } = body;
  if (!document_id) throw createError({ statusCode: 400, message: "document_id is required" });
  if (!nextStatus) throw createError({ statusCode: 400, message: "status is required" });
  if (!VALID_STATUSES.includes(nextStatus)) {
    throw createError({
      statusCode: 400,
      message: `Invalid status "${nextStatus}". Must be one of: ${VALID_STATUSES.join(", ")}`
    });
  }
  const actorId = getCookie(event, "user_session");
  const actorRole = getCookie(event, "user_role");
  if (!actorId || !actorRole) {
    throw createError({ statusCode: 401, message: "Authentication required" });
  }
  const { data: doc, error: docErr } = await client.from("documents").select("id, org_id, title, tracking_status, current_step, stage_id, assigned_messenger_id").eq("id", document_id).single();
  if (docErr || !doc) {
    throw createError({ statusCode: 404, message: "Document not found" });
  }
  const { data: actorRow } = await client.from("users").select("org_id, full_name").eq("user_id", actorId).single();
  if (!actorRow || String(actorRow.org_id) !== String(doc.org_id)) {
    throw createError({ statusCode: 403, message: "Forbidden: document belongs to a different organization" });
  }
  const currentStatus = doc.tracking_status || "CREATED";
  const allowed = (_a = TRANSITIONS[currentStatus]) != null ? _a : [];
  if (!allowed.includes(nextStatus)) {
    throw createError({
      statusCode: 422,
      message: `Invalid transition: "${currentStatus}" \u2192 "${nextStatus}". Allowed next states: [${allowed.join(", ") || "none \u2014 document is completed"}]`
    });
  }
  let nextStep = doc.current_step;
  let officeId = null;
  let officeName = null;
  if (nextStatus === "ARRIVED_AT_OFFICE" || nextStatus === "PICKED_UP") {
    const stepToLook = nextStatus === "IN_TRANSIT" ? doc.current_step + 1 : doc.current_step;
    if (doc.stage_id) {
      const { data: stepRow } = await client.from("stage_steps").select("office_id").eq("stage_id", doc.stage_id).eq("step_number", stepToLook).maybeSingle();
      if (stepRow) {
        officeId = stepRow.office_id;
        const { data: officeRow } = await client.from("offices").select("name").eq("id", officeId).maybeSingle();
        officeName = (_b = officeRow == null ? void 0 : officeRow.name) != null ? _b : null;
      }
    }
  }
  if (nextStatus === "IN_TRANSIT") {
    nextStep = doc.current_step + 1;
    if (doc.stage_id) {
      const { data: stepRow } = await client.from("stage_steps").select("office_id, offices(name)").eq("stage_id", doc.stage_id).eq("step_number", nextStep).maybeSingle();
      if (stepRow) {
        officeId = stepRow.office_id;
        officeName = (_d = (_c = stepRow.offices) == null ? void 0 : _c.name) != null ? _d : null;
      }
    }
  }
  const messengerUpdate = nextStatus === "PICKED_UP" ? { assigned_messenger_id: actorId } : nextStatus === "COMPLETED" ? { assigned_messenger_id: null } : {};
  const { data: trackingEvent, error: eventErr } = await client.from("document_tracking_events").insert({
    document_id,
    org_id: String(doc.org_id),
    status: nextStatus,
    step_index: nextStep,
    office_id: officeId,
    office_name: officeName,
    actor_id: actorId,
    actor_role: actorRole,
    actor_name: actorRow.full_name,
    notes: notes != null ? notes : null
  }).select("*").single();
  if (eventErr) {
    throw createError({ statusCode: 500, message: `Failed to write tracking event: ${eventErr.message}` });
  }
  const { data: updatedDoc, error: updateErr } = await client.from("documents").update({
    tracking_status: nextStatus,
    current_step: nextStep,
    ...messengerUpdate
  }).eq("id", document_id).select("id, title, tracking_status, current_step, assigned_messenger_id").single();
  if (updateErr) {
    throw createError({ statusCode: 500, message: `Failed to update document status: ${updateErr.message}` });
  }
  return {
    success: true,
    message: `Document advanced to ${nextStatus}`,
    data: {
      document: updatedDoc,
      trackingEvent,
      transition: { from: currentStatus, to: nextStatus }
    }
  };
});

export { advance_post as default };
//# sourceMappingURL=advance.post.mjs.map
