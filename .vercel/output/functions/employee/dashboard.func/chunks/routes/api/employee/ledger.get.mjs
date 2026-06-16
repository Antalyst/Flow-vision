import { d as defineEventHandler, e as getQuery, j as parseScope, k as resolveActorContextWithOffices, a as createError } from '../../../_/nitro.mjs';
import { s as serverSupabaseClient } from '../../../_/serverSupabaseClient.mjs';
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
import '../../../_/index2.mjs';
import 'cookie';

const ledger_get = defineEventHandler(async (event) => {
  var _a, _b;
  const client = await serverSupabaseClient(event);
  const query = getQuery(event);
  const scope = parseScope((_a = query.scope) != null ? _a : "LOCAL");
  const limit = Math.min(Number((_b = query.limit) != null ? _b : 50), 200);
  const actor = await resolveActorContextWithOffices(event, client);
  if (scope === "GLOBAL") {
    const { data: allDocs, error: allDocsErr } = await client.from("documents").select(
      "id, title, description, status, tracking_status, current_step, qr_code_data, office_id, origin_office_id, current_office_id, stage_id, created_at, user_id, creator_role"
    ).eq("org_id", actor.orgId).order("created_at", { ascending: false }).limit(limit);
    if (allDocsErr) {
      throw createError({ statusCode: 500, message: allDocsErr.message });
    }
    const rows = allDocs != null ? allDocs : [];
    const uploaderIds = [...new Set(rows.map((d) => d.user_id).filter(Boolean))];
    let nameById = {};
    if (uploaderIds.length > 0) {
      const { data: users } = await client.from("users").select("user_id, full_name").in("user_id", uploaderIds);
      nameById = (users != null ? users : []).reduce((acc, u) => {
        acc[String(u.user_id)] = u.full_name;
        return acc;
      }, {});
    }
    const allOfficeIds = [...new Set(
      rows.flatMap((d) => [d.office_id, d.origin_office_id, d.current_office_id]).filter(Boolean)
    )];
    let officeLabelById = {};
    if (allOfficeIds.length > 0) {
      const { data: offices } = await client.from("offices").select("id, name, code").in("id", allOfficeIds);
      officeLabelById = (offices != null ? offices : []).reduce((acc, o) => {
        acc[String(o.id)] = o.code ? `${o.name} (${o.code})` : o.name;
        return acc;
      }, {});
    }
    const enriched2 = rows.map((doc) => {
      var _a2, _b2, _c, _d;
      return {
        ...doc,
        uploader_name: (_a2 = nameById[String(doc.user_id)]) != null ? _a2 : null,
        office_label: doc.office_id ? (_b2 = officeLabelById[String(doc.office_id)]) != null ? _b2 : null : null,
        origin_label: doc.origin_office_id ? (_c = officeLabelById[String(doc.origin_office_id)]) != null ? _c : null : null,
        current_label: doc.current_office_id ? (_d = officeLabelById[String(doc.current_office_id)]) != null ? _d : null : null,
        is_own_upload: String(doc.user_id) === String(actor.userId)
      };
    });
    return {
      success: true,
      scope: "GLOBAL",
      org_id: actor.orgId,
      total: enriched2.length,
      data: enriched2
    };
  }
  let docQuery = client.from("documents").select(
    "id, title, description, status, tracking_status, current_step, qr_code_data, office_id, origin_office_id, current_office_id, stage_id, created_at, user_id, creator_role"
  ).eq("org_id", actor.orgId).order("created_at", { ascending: false }).limit(limit);
  if (actor.officeIds.length > 0) {
    const officeList = actor.officeIds.join(",");
    docQuery = docQuery.or(
      `user_id.eq.${actor.userId},origin_office_id.in.(${officeList}),current_office_id.in.(${officeList}),office_id.in.(${officeList})`
    );
  } else {
    docQuery = docQuery.eq("user_id", actor.userId);
  }
  const { data: documents, error: docError } = await docQuery;
  if (docError) {
    throw createError({ statusCode: 500, message: docError.message });
  }
  const uniqueOfficeIds = [...new Set(
    (documents != null ? documents : []).flatMap((d) => [d.office_id, d.origin_office_id, d.current_office_id]).filter(Boolean)
  )];
  let officeNameById = {};
  if (uniqueOfficeIds.length > 0) {
    const { data: officeRows } = await client.from("offices").select("id, name, code").in("id", uniqueOfficeIds);
    officeNameById = (officeRows != null ? officeRows : []).reduce((acc, o) => {
      acc[String(o.id)] = o.code ? `${o.name} (${o.code})` : o.name;
      return acc;
    }, {});
  }
  const enriched = (documents != null ? documents : []).map((doc) => {
    var _a2, _b2, _c;
    return {
      ...doc,
      office_label: doc.office_id ? (_a2 = officeNameById[String(doc.office_id)]) != null ? _a2 : `Office #${doc.office_id}` : null,
      origin_label: doc.origin_office_id ? (_b2 = officeNameById[String(doc.origin_office_id)]) != null ? _b2 : null : null,
      current_label: doc.current_office_id ? (_c = officeNameById[String(doc.current_office_id)]) != null ? _c : null : null,
      is_own_upload: String(doc.user_id) === String(actor.userId)
    };
  });
  return {
    success: true,
    scope: "LOCAL",
    org_id: actor.orgId,
    total: enriched.length,
    data: enriched
  };
});

export { ledger_get as default };
//# sourceMappingURL=ledger.get.mjs.map
