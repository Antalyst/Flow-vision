import { d as defineEventHandler, a as useServerSupabase, e as readBody, v as getCookie, c as createError } from '../../_/nitro.mjs';
import { randomBytes } from 'node:crypto';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'mysql2/promise';
import '@iconify/utils';
import 'consola';
import 'node:fs';
import 'node:path';

const generateOfficeCode = () => "OFF-" + randomBytes(3).toString("hex").toUpperCase();
const index_post = defineEventHandler(async (event) => {
  try {
    const client = useServerSupabase();
    const body = await readBody(event);
    const { name, user_id, org_id, stage_id, code } = body;
    if (!name || !org_id || !user_id) {
      return {
        status: 400,
        message: `Missing required fields: ${!name ? "name " : ""}${!org_id ? "org_id " : ""}${!user_id ? "user_id" : ""}`
      };
    }
    const officeCode = (code != null ? code : "").trim() || generateOfficeCode();
    const createdBy = getCookie(event, "user_session") || user_id;
    const { data: rows, error } = await client.from("offices").insert({
      name,
      assigned_user: user_id,
      org_id,
      stage_id: stage_id != null ? stage_id : null,
      code: officeCode,
      created_by: createdBy
    }).select("*").single();
    if (error) {
      throw createError({
        statusCode: 500,
        message: error.message || "Failed to create office"
      });
    }
    return {
      status: 200,
      success: true,
      message: "Office created successfully",
      data: rows
    };
  } catch (error) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || "Internal Server Error"
    });
  }
});

export { index_post as default };
//# sourceMappingURL=index.post.mjs.map
