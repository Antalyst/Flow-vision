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

const dropoff_post = defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event);
  const body = await readBody(event);
  const { office_id } = body;
  if (!office_id) {
    throw createError({ statusCode: 400, message: "office_id is required" });
  }
  const actorId = getCookie(event, "user_session");
  const actorRole = getCookie(event, "user_role");
  if (!actorId) throw createError({ statusCode: 401, message: "Authentication required" });
  if (actorRole !== "messenger") {
    throw createError({ statusCode: 403, message: "Forbidden: only messenger accounts can perform office drop-offs" });
  }
  const { data: actorRow, error: actorErr } = await client.from("users").select("org_id, full_name").eq("user_id", actorId).single();
  if (actorErr || !(actorRow == null ? void 0 : actorRow.org_id)) {
    throw createError({ statusCode: 403, message: "Messenger account has no organisation assigned" });
  }
  const messengerOrgId = String(actorRow.org_id);
  const { data: office, error: officeErr } = await client.from("offices").select("id, name, code, org_id").eq("id", String(office_id)).maybeSingle();
  if (officeErr) throw createError({ statusCode: 500, message: officeErr.message });
  if (!office) {
    throw createError({
      statusCode: 404,
      message: "Office checkpoint not found. Ensure you are scanning a valid FlowVision office QR code."
    });
  }
  if (String(office.org_id) !== messengerOrgId) {
    throw createError({
      statusCode: 403,
      message: "SECURITY_ORG_MISMATCH: This office checkpoint belongs to a different organisation. Access denied.",
      data: { code: "SECURITY_ORG_MISMATCH", office_org: office.org_id, messenger_org: messengerOrgId }
    });
  }
  const { data: activeDocs, error: docErr } = await client.from("documents").select("id, org_id, title, tracking_status, current_step, stage_id").eq("assigned_messenger_id", actorId).eq("org_id", messengerOrgId).eq("tracking_status", "IN_TRANSIT");
  if (docErr) throw createError({ statusCode: 500, message: docErr.message });
  if (!activeDocs || activeDocs.length === 0) {
    throw createError({
      statusCode: 404,
      message: "No active in-transit document found. Please perform a document pickup first."
    });
  }
  let targetDoc = null;
  let totalSteps = 0;
  for (const doc of activeDocs) {
    if (!doc.stage_id) continue;
    const { data: stepRow } = await client.from("stage_steps").select("office_id, step_number").eq("stage_id", doc.stage_id).eq("step_number", doc.current_step).eq("office_id", String(office_id)).maybeSingle();
    if (stepRow) {
      const { count } = await client.from("stage_steps").select("*", { count: "exact", head: true }).eq("stage_id", doc.stage_id);
      totalSteps = count != null ? count : 0;
      targetDoc = doc;
      break;
    }
  }
  if (!targetDoc) {
    throw createError({
      statusCode: 422,
      message: `ROUTE_MISMATCH: Office "${office.name}" is not the expected next checkpoint for your current delivery. Please continue to the correct destination.`,
      data: { code: "ROUTE_MISMATCH", scanned_office: office.name }
    });
  }
  const isFinalStop = totalSteps > 0 && targetDoc.current_step >= totalSteps;
  const finalStatus = isFinalStop ? "COMPLETED" : "ARRIVED_AT_OFFICE";
  await client.from("document_tracking_events").insert({
    document_id: targetDoc.id,
    org_id: messengerOrgId,
    status: "ARRIVED_AT_OFFICE",
    step_index: targetDoc.current_step,
    // document_tracking_events.office_id is INTEGER (existing column — no FK);
    // store the numeric portion if the UUID is purely numeric, else store null.
    // The office name is denormalised so queries don't need to join back.
    office_id: null,
    office_name: office.name,
    actor_id: actorId,
    actor_role: "messenger",
    actor_name: actorRow.full_name,
    notes: `Arrived and checked in at ${office.name}${office.code ? ` (${office.code})` : ""}.`
  });
  if (isFinalStop) {
    await client.from("document_tracking_events").insert({
      document_id: targetDoc.id,
      org_id: messengerOrgId,
      status: "COMPLETED",
      step_index: targetDoc.current_step,
      office_id: null,
      office_name: office.name,
      actor_id: actorId,
      actor_role: "messenger",
      actor_name: actorRow.full_name,
      notes: `All route stages completed. Final delivery confirmed at ${office.name}.`
    });
  }
  const docUpdate = {
    tracking_status: finalStatus,
    // Keep current_office_id in sync with the document's physical location.
    // Cleared on COMPLETED (no longer at a specific office in transit sense).
    // current_office_id is UUID FK → offices(id); pass as raw UUID string
    current_office_id: isFinalStop ? null : String(office_id)
  };
  if (isFinalStop) {
    docUpdate.assigned_messenger_id = null;
  }
  const { data: updatedDoc, error: updateErr } = await client.from("documents").update(docUpdate).eq("id", targetDoc.id).select("id, title, tracking_status, current_step").single();
  if (updateErr) throw createError({ statusCode: 500, message: updateErr.message });
  return {
    success: true,
    is_final_stop: isFinalStop,
    message: isFinalStop ? `Delivery COMPLETED. "${targetDoc.title}" has reached its final destination at ${office.name}.` : `Checked in at ${office.name}. Document is now ARRIVED_AT_OFFICE. Ready for next leg.`,
    data: {
      document: updatedDoc,
      office: { id: office.id, name: office.name, code: office.code },
      step: targetDoc.current_step,
      total_steps: totalSteps
    }
  };
});

export { dropoff_post as default };
//# sourceMappingURL=dropoff.post.mjs.map
