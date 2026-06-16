import { d as defineEventHandler, a as useServerSupabase, e as readBody, c as createError } from '../../_/nitro.mjs';
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

const index_post = defineEventHandler(async (event) => {
  try {
    const client = useServerSupabase();
    const body = await readBody(event);
    const { stage_name, org_id, workflow_items, office_id = null } = body;
    if (!(stage_name == null ? void 0 : stage_name.trim())) {
      throw createError({
        statusCode: 400,
        message: "stage_name is required"
      });
    }
    if (org_id == null || org_id === "") {
      throw createError({
        statusCode: 400,
        message: "org_id is required"
      });
    }
    if (!Array.isArray(workflow_items)) {
      throw createError({
        statusCode: 400,
        message: "workflow_items must be an array"
      });
    }
    if (office_id != null) {
      const { data: officeRow, error: officeCheckErr } = await client.from("offices").select("id, org_id").eq("id", String(office_id)).maybeSingle();
      if (officeCheckErr || !officeRow) {
        throw createError({ statusCode: 404, message: `Office ${office_id} not found.` });
      }
      if (String(officeRow.org_id) !== String(org_id)) {
        throw createError({
          statusCode: 403,
          message: `CROSS_ORG_VIOLATION: office_id ${office_id} does not belong to org_id ${org_id}.`
        });
      }
    }
    const { data: existingStages, error: existingError } = await client.from("stages").select("step_number").eq("org_id", org_id).order("step_number", { ascending: false }).limit(1);
    if (existingError) {
      console.error("[Backend Stage Error]:", existingError);
      throw createError({
        statusCode: 500,
        message: existingError.message || "Failed to resolve stage order"
      });
    }
    const nextStageStep = (existingStages == null ? void 0 : existingStages.length) ? Number(existingStages[0].step_number || 0) + 1 : 1;
    const { data: stage, error: stageError } = await client.from("stages").insert({
      name: stage_name.trim(),
      org_id,
      step_number: nextStageStep,
      // null = global route template; UUID string = local mini-office route
      office_id: office_id != null ? String(office_id) : null
    }).select("*").single();
    if (stageError) {
      console.error("[Backend Stage Error]:", stageError);
      throw createError({
        statusCode: 500,
        message: stageError.message || "Failed to create stage"
      });
    }
    let persistedWorkflowItems = [];
    if (workflow_items.length > 0) {
      const stepRows = workflow_items.map((item) => ({
        stage_id: stage.stage_id,
        office_id: item.office_id,
        step_number: item.step_number,
        org_id
      }));
      const { data: steps, error: stepsError } = await client.from("stage_steps").insert(stepRows).select("office_id, step_number, stage_id, org_id");
      if (stepsError) {
        console.error("[Backend Stage Error]:", stepsError);
        await client.from("stages").delete().eq("stage_id", stage.stage_id);
        throw createError({
          statusCode: 500,
          message: stepsError.message || "Failed to create workflow items"
        });
      }
      persistedWorkflowItems = steps || [];
    }
    return {
      status: 201,
      success: true,
      message: "Stage created successfully",
      data: {
        stage,
        workflow_items: persistedWorkflowItems
      }
    };
  } catch (error) {
    if (error.statusCode) throw error;
    console.error("[Backend Stage Error]:", error);
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || "Internal Server Error"
    });
  }
});

export { index_post as default };
//# sourceMappingURL=index.post4.mjs.map
