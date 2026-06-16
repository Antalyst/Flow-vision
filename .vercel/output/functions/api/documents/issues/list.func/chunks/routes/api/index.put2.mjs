import { d as defineEventHandler, a as useServerSupabase, e as readBody, c as createError } from '../../_/nitro.mjs';
import 'node:crypto';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import '@iconify/utils';
import 'consola';
import 'node:fs';
import 'node:path';

const index_put = defineEventHandler(async (event) => {
  try {
    const client = useServerSupabase();
    const body = await readBody(event);
    const { stage_id, id, name, step_number } = body;
    const targetId = stage_id || id;
    if (!targetId) {
      throw createError({
        statusCode: 400,
        message: "stage_id or id is required to update a stage"
      });
    }
    const updateData = {};
    if (name !== void 0) updateData.name = name;
    if (step_number !== void 0) updateData.step_number = step_number;
    const { data, error } = await client.from("stages").update(updateData).eq("stage_id", targetId).select("*").single();
    if (error) {
      throw createError({
        statusCode: 500,
        message: error.message || "Error updating stage"
      });
    }
    return {
      success: true,
      message: "Stage updated successfully",
      data
    };
  } catch (error) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || "Internal Server Error"
    });
  }
});

export { index_put as default };
//# sourceMappingURL=index.put2.mjs.map
