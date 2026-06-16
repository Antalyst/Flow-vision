import { d as defineEventHandler, a as useServerSupabase, b as getQuery, c as createError, v as getCookie } from '../../../_/nitro.mjs';
import 'node:crypto';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'sql-escaper';
import 'events';
import 'lru.min';
import 'process';
import 'net';
import 'tls';
import 'timers';
import 'stream';
import 'denque';
import 'buffer';
import 'long';
import 'iconv-lite';
import 'crypto';
import 'zlib';
import 'generate-function';
import 'url';
import 'aws-ssl-profiles';
import 'named-placeholders';
import '@iconify/utils';
import 'consola';
import 'node:fs';
import 'node:path';

const timeline_get = defineEventHandler(async (event) => {
  var _a;
  const client = useServerSupabase();
  const query = getQuery(event);
  const documentId = query.documentId;
  if (!documentId) {
    throw createError({ statusCode: 400, message: "documentId is required" });
  }
  const actorId = getCookie(event, "user_session");
  if (!actorId) throw createError({ statusCode: 401, message: "Authentication required" });
  const { data: doc, error: docErr } = await client.from("documents").select("id, org_id, title, description, tracking_status, current_step, stage_id, qr_code_data, assigned_messenger_id, created_at").eq("id", documentId).single();
  if (docErr || !doc) {
    throw createError({ statusCode: 404, message: "Document not found" });
  }
  const { data: actorRow } = await client.from("users").select("org_id, full_name").eq("user_id", actorId).single();
  if (!actorRow || String(actorRow.org_id) !== String(doc.org_id)) {
    throw createError({ statusCode: 403, message: "Forbidden" });
  }
  const { data: events, error: eventsErr } = await client.from("document_tracking_events").select("id, status, step_index, office_id, office_name, actor_id, actor_role, actor_name, notes, created_at").eq("document_id", documentId).order("created_at", { ascending: true });
  if (eventsErr) {
    throw createError({ statusCode: 500, message: eventsErr.message });
  }
  let routeSteps = [];
  if (doc.stage_id) {
    const { data: steps } = await client.from("stage_steps").select("step_number, office_id, offices(id, name, code)").eq("stage_id", doc.stage_id).order("step_number", { ascending: true });
    routeSteps = (steps != null ? steps : []).map((s) => {
      var _a2, _b, _c, _d;
      return {
        step_number: s.step_number,
        office_id: s.office_id,
        office_name: (_b = (_a2 = s.offices) == null ? void 0 : _a2.name) != null ? _b : `Office #${s.office_id}`,
        office_code: (_d = (_c = s.offices) == null ? void 0 : _c.code) != null ? _d : null
      };
    });
  }
  let messengerName = null;
  if (doc.assigned_messenger_id) {
    const { data: mRow } = await client.from("users").select("full_name").eq("user_id", doc.assigned_messenger_id).single();
    messengerName = (_a = mRow == null ? void 0 : mRow.full_name) != null ? _a : null;
  }
  return {
    success: true,
    data: {
      document: {
        ...doc,
        messenger_name: messengerName
      },
      events: events != null ? events : [],
      routeSteps,
      summary: {
        total_steps: routeSteps.length,
        current_step: doc.current_step,
        tracking_status: doc.tracking_status,
        is_complete: doc.tracking_status === "COMPLETED",
        progress_pct: routeSteps.length ? Math.round(doc.current_step / routeSteps.length * 100) : 0
      }
    }
  };
});

export { timeline_get as default };
//# sourceMappingURL=timeline.get.mjs.map
