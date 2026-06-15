import { d as defineEventHandler, b as getQuery, i as parseScope, j as resolveActorContextWithOffices, c as createError } from '../../_/nitro.mjs';
import { s as serverSupabaseClient } from '../../_/serverSupabaseClient.mjs';
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

const index_get = defineEventHandler(async (event) => {
  var _a;
  try {
    const client = await serverSupabaseClient(event);
    const query = getQuery(event);
    const scope = parseScope(query.scope);
    const explicitOffice = ((_a = query.officeId) == null ? void 0 : _a.trim()) || null;
    const actor = await resolveActorContextWithOffices(event, client);
    const targetOfficeIds = explicitOffice ? [explicitOffice] : actor.officeIds;
    let stagesQuery = client.from("stages").select("*").eq("org_id", actor.orgId).order("step_number", { ascending: true });
    if (scope === "GLOBAL") {
    } else {
      if (targetOfficeIds.length === 0) {
        stagesQuery = stagesQuery.is("office_id", null);
      } else if (targetOfficeIds.length === 1) {
        stagesQuery = stagesQuery.or(
          `office_id.is.null,office_id.eq.${targetOfficeIds[0]}`
        );
      } else {
        const officeList = targetOfficeIds.join(",");
        stagesQuery = stagesQuery.or(
          `office_id.is.null,office_id.in.(${officeList})`
        );
      }
    }
    const { data: stages, error: stagesError } = await stagesQuery;
    if (stagesError) {
      throw createError({
        statusCode: 500,
        message: stagesError.message || "Error fetching stages"
      });
    }
    const stageIds = (stages != null ? stages : []).map((s) => s.stage_id);
    let stepRows = [];
    if (stageIds.length > 0) {
      const { data: steps, error: stepsError } = await client.from("stage_steps").select("stage_id, office_id, step_number").in("stage_id", stageIds).order("step_number", { ascending: true });
      if (stepsError) {
        throw createError({
          statusCode: 500,
          message: stepsError.message || "Error fetching stage steps"
        });
      }
      stepRows = steps != null ? steps : [];
    }
    const localOfficeIds = [...new Set(
      (stages != null ? stages : []).map((s) => s.office_id).filter(Boolean)
    )];
    let officeNameById = {};
    if (localOfficeIds.length > 0) {
      const { data: officeRows } = await client.from("offices").select("id, name, code").in("id", localOfficeIds);
      officeNameById = (officeRows != null ? officeRows : []).reduce((acc, o) => {
        acc[String(o.id)] = o.code ? `${o.name} (${o.code})` : o.name;
        return acc;
      }, {});
    }
    const enrichedStages = (stages != null ? stages : []).map((stage) => {
      var _a2;
      return {
        ...stage,
        scope: stage.office_id == null ? "global" : "local",
        office_name: stage.office_id ? (_a2 = officeNameById[String(stage.office_id)]) != null ? _a2 : null : null,
        workflow_items: stepRows.filter(
          (item) => String(item.stage_id) === String(stage.stage_id)
        )
      };
    });
    return {
      success: true,
      scope,
      org_id: actor.orgId,
      total: enrichedStages.length,
      data: enrichedStages
    };
  } catch (error) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || "Internal Server Error"
    });
  }
});

export { index_get as default };
//# sourceMappingURL=index.get4.mjs.map
