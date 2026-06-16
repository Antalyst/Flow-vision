import { d as defineEventHandler, h as readBody, a as createError, y as getCookie } from '../../../_/nitro.mjs';
import { s as serverSupabaseClient } from '../../../_/serverSupabaseClient.mjs';
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
import '@supabase/ssr';

const pickup_post = defineEventHandler(async (event) => {
  var _a, _b;
  const client = await serverSupabaseClient(event);
  const body = await readBody(event);
  const { qr_code_data } = body;
  if (!(qr_code_data == null ? void 0 : qr_code_data.trim())) {
    throw createError({ statusCode: 400, message: "qr_code_data is required" });
  }
  const actorId = getCookie(event, "user_session");
  const actorRole = getCookie(event, "user_role");
  if (!actorId) throw createError({ statusCode: 401, message: "Authentication required" });
  if (actorRole !== "messenger") {
    throw createError({ statusCode: 403, message: "Forbidden: only messenger accounts can perform document pickups" });
  }
  const { data: actorRow, error: actorErr } = await client.from("users").select("org_id, full_name").eq("user_id", actorId).single();
  if (actorErr || !(actorRow == null ? void 0 : actorRow.org_id)) {
    throw createError({ statusCode: 403, message: "Messenger account has no organisation assigned" });
  }
  const messengerOrgId = String(actorRow.org_id);
  const { data: doc, error: docErr } = await client.from("documents").select("id, org_id, title, tracking_status, current_step, stage_id, assigned_messenger_id").eq("qr_code_data", qr_code_data.trim()).maybeSingle();
  if (docErr) throw createError({ statusCode: 500, message: docErr.message });
  if (!doc) {
    throw createError({
      statusCode: 404,
      message: "No document found for this QR code. Ensure you are scanning a valid FlowVision document."
    });
  }
  if (String(doc.org_id) !== messengerOrgId) {
    throw createError({
      statusCode: 403,
      message: "SECURITY_ORG_MISMATCH: This document belongs to a different organisation. Scanning is not permitted.",
      data: { code: "SECURITY_ORG_MISMATCH" }
    });
  }
  const allowedFromStates = ["CREATED", "ARRIVED_AT_OFFICE"];
  if (!allowedFromStates.includes(doc.tracking_status)) {
    throw createError({
      statusCode: 422,
      message: `Cannot pick up a document in "${doc.tracking_status}" status. Document must be CREATED or ARRIVED_AT_OFFICE.`
    });
  }
  const nextStep = doc.current_step + 1;
  let officeId = null;
  let officeName = null;
  if (doc.stage_id) {
    const { data: stepRow } = await client.from("stage_steps").select("office_id, offices(name)").eq("stage_id", doc.stage_id).eq("step_number", nextStep).maybeSingle();
    if (stepRow) {
      officeId = stepRow.office_id;
      officeName = (_b = (_a = stepRow.offices) == null ? void 0 : _a.name) != null ? _b : null;
    }
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await client.from("document_tracking_events").insert({
    document_id: doc.id,
    org_id: messengerOrgId,
    status: "PICKED_UP",
    step_index: doc.current_step,
    actor_id: actorId,
    actor_role: "messenger",
    actor_name: actorRow.full_name,
    notes: `Document physically acquired by ${actorRow.full_name}.`,
    created_at: now
  });
  await client.from("document_tracking_events").insert({
    document_id: doc.id,
    org_id: messengerOrgId,
    status: "IN_TRANSIT",
    step_index: nextStep,
    office_id: officeId,
    office_name: officeName,
    actor_id: actorId,
    actor_role: "messenger",
    actor_name: actorRow.full_name,
    notes: officeName ? `In transit to ${officeName} (Step ${nextStep}).` : `In transit toward Step ${nextStep}.`
  });
  const { data: updatedDoc, error: updateErr } = await client.from("documents").update({
    tracking_status: "IN_TRANSIT",
    current_step: nextStep,
    assigned_messenger_id: actorId,
    current_office_id: null
  }).eq("id", doc.id).select("id, title, tracking_status, current_step, assigned_messenger_id, current_office_id").single();
  if (updateErr) throw createError({ statusCode: 500, message: updateErr.message });
  return {
    success: true,
    message: `Document "${doc.title}" is now IN TRANSIT${officeName ? ` toward ${officeName}` : ""}.`,
    data: {
      document: updatedDoc,
      destination: { office_id: officeId, office_name: officeName, step: nextStep },
      messenger: { id: actorId, name: actorRow.full_name }
    }
  };
});

export { pickup_post as default };
//# sourceMappingURL=pickup.post.mjs.map
