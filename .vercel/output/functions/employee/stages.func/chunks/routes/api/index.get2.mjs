import { d as defineEventHandler, a as useServerSupabase, b as getQuery, h as parseScope, i as resolveActorContextWithOffices, c as createError } from '../../_/nitro.mjs';
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

const index_get = defineEventHandler(async (event) => {
  var _a;
  try {
    const supabase = useServerSupabase();
    const query = getQuery(event);
    const scope = parseScope(query.scope);
    const limit = Math.min(Number((_a = query.limit) != null ? _a : 200), 500);
    const actor = await resolveActorContextWithOffices(event, supabase);
    if (actor.userRole === "messenger") {
      throw createError({
        statusCode: 403,
        message: "Messengers must use /api/tracking/queue for document access."
      });
    }
    let dbQuery = supabase.from("documents").select("*").eq("org_id", actor.orgId).order("created_at", { ascending: false }).limit(limit);
    if (scope === "LOCAL" && actor.userRole === "employee") {
      if (actor.officeIds.length === 0) {
        dbQuery = dbQuery.eq("user_id", actor.userId);
      } else {
        const officeList = actor.officeIds.join(",");
        dbQuery = dbQuery.or(
          `user_id.eq.${actor.userId},origin_office_id.in.(${officeList}),current_office_id.in.(${officeList}),office_id.in.(${officeList})`
        );
      }
    }
    const { data: documents, error } = await dbQuery;
    if (error) {
      throw createError({ statusCode: 500, message: error.message || "Error fetching documents" });
    }
    const rows = documents != null ? documents : [];
    const uploaderIds = [...new Set(rows.map((d) => d.user_id).filter(Boolean))];
    let nameById = {};
    if (uploaderIds.length > 0) {
      const { data: users } = await supabase.from("users").select("user_id, full_name").in("user_id", uploaderIds);
      nameById = (users != null ? users : []).reduce((acc, u) => {
        acc[String(u.user_id)] = u.full_name;
        return acc;
      }, {});
    }
    const officeIds = [...new Set(
      rows.flatMap((d) => [d.office_id, d.origin_office_id, d.current_office_id]).filter(Boolean)
    )];
    let officeLabelById = {};
    if (officeIds.length > 0) {
      const { data: offices } = await supabase.from("offices").select("id, name, code").in("id", officeIds);
      officeLabelById = (offices != null ? offices : []).reduce((acc, o) => {
        acc[String(o.id)] = o.code ? `${o.name} (${o.code})` : o.name;
        return acc;
      }, {});
    }
    const enriched = rows.map((doc) => {
      var _a2, _b, _c, _d;
      return {
        ...doc,
        uploader_name: (_a2 = nameById[String(doc.user_id)]) != null ? _a2 : null,
        office_label: doc.office_id ? (_b = officeLabelById[String(doc.office_id)]) != null ? _b : null : null,
        origin_label: doc.origin_office_id ? (_c = officeLabelById[String(doc.origin_office_id)]) != null ? _c : null : null,
        current_label: doc.current_office_id ? (_d = officeLabelById[String(doc.current_office_id)]) != null ? _d : null : null,
        // Convenience flag for employee LOCAL views
        is_own_upload: String(doc.user_id) === String(actor.userId)
      };
    });
    return {
      success: true,
      scope,
      org_id: actor.orgId,
      role: actor.userRole,
      total: enriched.length,
      data: enriched
    };
  } catch (error) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || "Internal Server Error"
    });
  }
});

export { index_get as default };
//# sourceMappingURL=index.get2.mjs.map
