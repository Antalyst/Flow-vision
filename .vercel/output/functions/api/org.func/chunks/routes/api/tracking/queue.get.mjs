import { d as defineEventHandler, a as useServerSupabase, b as getQuery, h as parseScope, i as resolveActorContextWithOffices, c as createError } from '../../../_/nitro.mjs';
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

const queue_get = defineEventHandler(async (event) => {
  var _a, _b, _c, _d;
  const client = useServerSupabase();
  const query = getQuery(event);
  const scope = parseScope(query.scope);
  const limit = Math.min(Number((_a = query.limit) != null ? _a : 100), 500);
  const statusFilter = (_c = (_b = query.status) == null ? void 0 : _b.split(",").map((s) => s.trim()).filter(Boolean)) != null ? _c : [];
  const actor = await resolveActorContextWithOffices(event, client);
  const qOrgId = query.orgId;
  if (qOrgId && String(qOrgId) !== actor.orgId) {
    console.warn(
      `[tracking/queue] orgId param (${qOrgId}) differs from session org (${actor.orgId}). Session org_id takes precedence.`
    );
  }
  let dbQuery = client.from("documents").select(
    "id, title, description, tracking_status, current_step, stage_id, office_id, origin_office_id, current_office_id, qr_code_data, assigned_messenger_id, created_at, user_id, creator_role"
  ).eq("org_id", actor.orgId).order("created_at", { ascending: false }).limit(limit);
  if (statusFilter.length > 0) {
    dbQuery = dbQuery.in("tracking_status", statusFilter);
  }
  if (actor.userRole === "messenger") {
    dbQuery = dbQuery.or(
      `assigned_messenger_id.eq.${actor.userId},and(tracking_status.eq.CREATED,assigned_messenger_id.is.null)`
    );
  } else if (actor.userRole === "employee" && scope === "LOCAL") {
    if (actor.officeIds.length === 0) {
      dbQuery = dbQuery.eq("user_id", actor.userId);
    } else {
      const officeList = actor.officeIds.join(",");
      dbQuery = dbQuery.or(
        `user_id.eq.${actor.userId},current_office_id.in.(${officeList}),origin_office_id.in.(${officeList})`
      );
    }
  }
  const { data: docs, error } = await dbQuery;
  if (error) {
    throw createError({ statusCode: 500, message: error.message });
  }
  const rows = docs != null ? docs : [];
  const stageIds = [...new Set(rows.map((d) => d.stage_id).filter(Boolean))];
  let stageById = {};
  if (stageIds.length) {
    const [{ data: stageRows }, { data: stepCounts }] = await Promise.all([
      client.from("stages").select("stage_id, name").in("stage_id", stageIds),
      client.from("stage_steps").select("stage_id").in("stage_id", stageIds)
    ]);
    const countByStage = {};
    for (const s of stepCounts != null ? stepCounts : []) {
      countByStage[String(s.stage_id)] = ((_d = countByStage[String(s.stage_id)]) != null ? _d : 0) + 1;
    }
    stageById = (stageRows != null ? stageRows : []).reduce((acc, s) => {
      var _a2;
      acc[String(s.stage_id)] = {
        name: s.name,
        total_steps: (_a2 = countByStage[String(s.stage_id)]) != null ? _a2 : 0
      };
      return acc;
    }, {});
  }
  const messengerIds = [...new Set(rows.map((d) => d.assigned_messenger_id).filter(Boolean))];
  let messengerNameById = {};
  if (messengerIds.length) {
    const { data: userRows } = await client.from("users").select("user_id, full_name").in("user_id", messengerIds);
    messengerNameById = (userRows != null ? userRows : []).reduce((acc, u) => {
      acc[String(u.user_id)] = u.full_name;
      return acc;
    }, {});
  }
  const allOfficeIds = [...new Set(
    rows.flatMap((d) => [d.office_id, d.origin_office_id, d.current_office_id]).filter(Boolean)
  )];
  let officeLabelById = {};
  if (allOfficeIds.length) {
    const { data: officeRows } = await client.from("offices").select("id, name, code").in("id", allOfficeIds);
    officeLabelById = (officeRows != null ? officeRows : []).reduce((acc, o) => {
      acc[String(o.id)] = o.code ? `${o.name} (${o.code})` : o.name;
      return acc;
    }, {});
  }
  const enriched = rows.map((doc) => {
    var _a2, _b2, _c2, _d2, _e, _f;
    const stage = doc.stage_id ? stageById[String(doc.stage_id)] : null;
    return {
      ...doc,
      stage_name: (_a2 = stage == null ? void 0 : stage.name) != null ? _a2 : null,
      total_steps: (_b2 = stage == null ? void 0 : stage.total_steps) != null ? _b2 : 0,
      progress_pct: (stage == null ? void 0 : stage.total_steps) ? Math.round(doc.current_step / stage.total_steps * 100) : 0,
      messenger_name: doc.assigned_messenger_id ? (_c2 = messengerNameById[String(doc.assigned_messenger_id)]) != null ? _c2 : "Unknown" : null,
      office_label: doc.office_id ? (_d2 = officeLabelById[String(doc.office_id)]) != null ? _d2 : null : null,
      origin_label: doc.origin_office_id ? (_e = officeLabelById[String(doc.origin_office_id)]) != null ? _e : null : null,
      current_label: doc.current_office_id ? (_f = officeLabelById[String(doc.current_office_id)]) != null ? _f : null : null,
      is_own_upload: String(doc.user_id) === String(actor.userId)
    };
  });
  const summary = {
    scope,
    total: enriched.length,
    created: enriched.filter((d) => d.tracking_status === "CREATED").length,
    picked_up: enriched.filter((d) => d.tracking_status === "PICKED_UP").length,
    in_transit: enriched.filter((d) => d.tracking_status === "IN_TRANSIT").length,
    arrived_at_office: enriched.filter((d) => d.tracking_status === "ARRIVED_AT_OFFICE").length,
    completed: enriched.filter((d) => d.tracking_status === "COMPLETED").length
  };
  return { success: true, scope, org_id: actor.orgId, data: enriched, summary };
});

export { queue_get as default };
//# sourceMappingURL=queue.get.mjs.map
