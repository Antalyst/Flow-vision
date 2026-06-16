import { d as defineEventHandler, a as useServerSupabase, c as createError, v as getCookie, x as readMultipartFormData, y as analyzeDocumentBuffer } from '../../../_/nitro.mjs';
import { randomUUID } from 'node:crypto';
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

const ALLOWED_ROLES = ["client", "employee"];
const upload_post = defineEventHandler(async (event) => {
  var _a, _b;
  const db = event.context.db;
  const client = useServerSupabase();
  if (!db) {
    throw createError({
      statusCode: 500,
      message: "MySQL storage connector is not available on the request context."
    });
  }
  const userId = getCookie(event, "user_session");
  const userRole = getCookie(event, "user_role");
  if (!userId || !userRole || !ALLOWED_ROLES.includes(userRole)) {
    throw createError({
      statusCode: 403,
      message: "Forbidden: only client or employee accounts may upload documents."
    });
  }
  const { data: actorRow, error: actorErr } = await client.from("users").select("org_id, full_name, role").eq("user_id", userId).single();
  if (actorErr || !(actorRow == null ? void 0 : actorRow.org_id)) {
    throw createError({
      statusCode: 401,
      message: "Could not resolve authenticated user profile. Please log in again."
    });
  }
  const orgId = String(actorRow.org_id);
  const actorName = (_a = actorRow.full_name) != null ? _a : null;
  const resolvedRole = actorRow.role === userRole ? userRole : null;
  if (!resolvedRole) {
    throw createError({
      statusCode: 403,
      message: "Role mismatch: session cookie does not match database profile."
    });
  }
  const formData = await readMultipartFormData(event);
  if (!formData) {
    throw createError({ statusCode: 400, message: "No multipart form data received." });
  }
  const get = (name) => {
    var _a2;
    return ((_a2 = formData.find((f) => f.name === name)) == null ? void 0 : _a2.data.toString().trim()) || null;
  };
  const fileItem = formData.find((f) => f.name === "file");
  const stageIdRaw = get("stage_id");
  const clientQrCode = get("qr_code_data");
  const originOfficeId = get("origin_office_id");
  const officeIdLegacy = get("office_id");
  if (!(fileItem == null ? void 0 : fileItem.data)) {
    throw createError({ statusCode: 400, message: "Missing document file payload." });
  }
  const fileName = fileItem.filename || "unnamed";
  const mimeType = fileItem.type || "application/octet-stream";
  let resolvedOriginOfficeId = null;
  let resolvedOfficeName = null;
  if (resolvedRole === "employee") {
    if (!originOfficeId) {
      throw createError({
        statusCode: 400,
        message: "EMPLOYEE_ORIGIN_REQUIRED: Employees must supply origin_office_id \u2014 the sub-office/branch where this hard-copy is being physically registered."
      });
    }
    const { data: officeRow, error: officeErr } = await client.from("offices").select("id, name, org_id, assigned_user").eq("id", originOfficeId).maybeSingle();
    if (officeErr) {
      throw createError({ statusCode: 500, message: `Office lookup failed: ${officeErr.message}` });
    }
    if (!officeRow) {
      throw createError({
        statusCode: 404,
        message: `OFFICE_NOT_FOUND: No office found with id ${originOfficeId}.`
      });
    }
    if (String(officeRow.org_id) !== orgId) {
      throw createError({
        statusCode: 403,
        message: `CROSS_ORG_VIOLATION: Office ${originOfficeId} belongs to a different organisation. Cross-tenant document registration is not permitted.`
      });
    }
    if (String(officeRow.assigned_user) !== String(userId)) {
      throw createError({
        statusCode: 403,
        message: "UNAUTHORIZED_OFFICE: This office is not assigned to your account. Employees may only register documents under their own sub-office branches."
      });
    }
    resolvedOriginOfficeId = String(officeRow.id);
    resolvedOfficeName = officeRow.name;
  } else {
    resolvedOriginOfficeId = null;
    resolvedOfficeName = null;
  }
  let resolvedStageId = stageIdRaw;
  if (stageIdRaw) {
    const { data: stageRow, error: stageErr } = await client.from("stages").select("stage_id, name, org_id, office_id").eq("stage_id", stageIdRaw).maybeSingle();
    if (stageErr) {
      throw createError({ statusCode: 500, message: `Stage lookup failed: ${stageErr.message}` });
    }
    if (!stageRow) {
      throw createError({
        statusCode: 404,
        message: `STAGE_NOT_FOUND: No stage template found with id ${stageIdRaw}.`
      });
    }
    if (String(stageRow.org_id) !== orgId) {
      throw createError({
        statusCode: 403,
        message: "CROSS_ORG_VIOLATION: The selected stage template belongs to a different organisation."
      });
    }
    if (resolvedRole === "employee" && stageRow.office_id) {
      if (String(stageRow.office_id) !== resolvedOriginOfficeId) {
        throw createError({
          statusCode: 403,
          message: `STAGE_SCOPE_MISMATCH: Employees may only use global stages or stages scoped to their own sub-office. Select a global route template or one belonging to your office (${resolvedOfficeName != null ? resolvedOfficeName : resolvedOriginOfficeId}).`
        });
      }
    }
    resolvedStageId = String(stageRow.stage_id);
  }
  let resolvedRouteSteps = [];
  if (resolvedStageId) {
    const { data: rawSteps, error: stepsErr } = await client.from("stage_steps").select("step_number, office_id").eq("stage_id", resolvedStageId).order("step_number", { ascending: true });
    if (stepsErr) {
      throw createError({
        statusCode: 500,
        message: `Route checkpoint fetch failed: ${stepsErr.message}`
      });
    }
    const steps = rawSteps != null ? rawSteps : [];
    if (steps.length > 0) {
      const uniqueCheckpointIds = [
        ...new Set(steps.map((s) => String(s.office_id)).filter(Boolean))
      ];
      const { data: checkpointOffices, error: cpOfficeErr } = await client.from("offices").select("id, name, code, org_id").in("id", uniqueCheckpointIds);
      if (cpOfficeErr) {
        throw createError({
          statusCode: 500,
          message: `Route checkpoint office verification failed: ${cpOfficeErr.message}`
        });
      }
      const fetchedOffices = checkpointOffices != null ? checkpointOffices : [];
      const crossOrgViolators = fetchedOffices.filter(
        (o) => String(o.org_id) !== orgId
      );
      if (crossOrgViolators.length > 0) {
        const violatingIds = crossOrgViolators.map((o) => String(o.id)).join(", ");
        const violatingNames = crossOrgViolators.map((o) => o.name || o.id).join(", ");
        throw createError({
          statusCode: 403,
          message: `CROSS_ORG_ROUTE_VIOLATION: Route checkpoints [${violatingNames}] (id: ${violatingIds}) belong to a different organisation. All destination offices in a routing pathway must be registered under organisation ${orgId}. Cross-tenant routing is strictly prohibited and has been logged.`
        });
      }
      const fetchedIds = new Set(fetchedOffices.map((o) => String(o.id)));
      const ghostIds = uniqueCheckpointIds.filter((id) => !fetchedIds.has(id));
      if (ghostIds.length > 0) {
        throw createError({
          statusCode: 404,
          message: `INVALID_ROUTE_CHECKPOINTS: The following office IDs in the routing pathway do not exist in the database: [${ghostIds.join(", ")}]. Ensure all destination offices are registered before routing documents through them.`
        });
      }
      const officeMap = fetchedOffices.reduce(
        (acc, o) => {
          acc[String(o.id)] = o;
          return acc;
        },
        {}
      );
      resolvedRouteSteps = steps.map((s) => {
        var _a2, _b2, _c;
        const office = officeMap[String(s.office_id)];
        return {
          step_number: s.step_number,
          office_id: String(s.office_id),
          office_name: (_a2 = office == null ? void 0 : office.name) != null ? _a2 : `Office ${String(s.office_id).slice(0, 8)}`,
          office_code: (_b2 = office == null ? void 0 : office.code) != null ? _b2 : null,
          org_id: String((_c = office == null ? void 0 : office.org_id) != null ? _c : orgId)
        };
      });
    }
  }
  const aiAnalysis = await analyzeDocumentBuffer(fileItem.data, mimeType);
  const documentId = randomUUID();
  const qrCode = clientQrCode || `QR-${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
  const effectiveOfficeId = (_b = resolvedOriginOfficeId != null ? resolvedOriginOfficeId : officeIdLegacy) != null ? _b : null;
  let supabaseDocId = null;
  let mysqlInsertedId = null;
  try {
    const { data: supabaseDoc, error: supabaseError } = await client.from("documents").insert({
      id: documentId,
      org_id: orgId,
      // server-resolved, never from form
      office_id: effectiveOfficeId,
      stage_id: resolvedStageId,
      user_id: userId,
      title: aiAnalysis.title,
      description: aiAnalysis.description,
      qr_code_data: qrCode,
      status: "Pending",
      tracking_status: "CREATED",
      current_step: 0,
      // Mini-office architecture
      creator_role: resolvedRole,
      origin_office_id: resolvedOriginOfficeId,
      // current_office_id = origin for employees (doc physically there at start)
      // NULL for client admins (not yet at a specific office)
      current_office_id: resolvedOriginOfficeId
    }).select().single();
    if (supabaseError) throw supabaseError;
    supabaseDocId = supabaseDoc.id;
    const [mysqlResult] = await db.execute(
      "INSERT INTO document_storage (document_uuid, file_blob, file_name, mime_type) VALUES (?, ?, ?, ?)",
      [supabaseDoc.id, fileItem.data, fileName, mimeType]
    );
    mysqlInsertedId = mysqlResult.insertId;
    const { error: linkError } = await client.from("documents").update({ mysql_storage_id: mysqlInsertedId }).eq("id", supabaseDoc.id);
    if (linkError) throw linkError;
    try {
      let routeSnapshotLine = "";
      if (resolvedRouteSteps.length > 0) {
        const originLabel = resolvedOfficeName ? `[Origin: ${resolvedOfficeName}]` : "[Origin: Org-wide]";
        const stopLabels = resolvedRouteSteps.map((step, idx) => {
          const isLast = idx === resolvedRouteSteps.length - 1;
          const label = step.office_code ? `${step.office_name} (${step.office_code})` : step.office_name;
          return isLast ? `Final Stop: ${label}` : `Stop ${step.step_number}: ${label}`;
        });
        routeSnapshotLine = `
Route schema locked (${resolvedRouteSteps.length} checkpoint${resolvedRouteSteps.length !== 1 ? "s" : ""}): ` + [originLabel, ...stopLabels].join(" \u2192 ");
      } else if (resolvedStageId) {
        routeSnapshotLine = `
Route template attached (stage_id: ${resolvedStageId}) \u2014 no checkpoint steps defined yet.`;
      }
      const initNotes = resolvedRole === "employee" ? `Document physically registered at "${resolvedOfficeName}" (office: ${resolvedOriginOfficeId}) by ${actorName != null ? actorName : "an employee"} (role: employee). Hard-copy asset is stationed at its origin checkpoint and armed for messenger QR-scan pickup.` + routeSnapshotLine : `Document registered org-wide under organisation ${orgId} by ${actorName != null ? actorName : "an administrator"} (role: client). Not yet assigned to a specific office checkpoint. Ready for route assignment and messenger pickup.` + routeSnapshotLine;
      await client.from("document_tracking_events").insert({
        document_id: supabaseDoc.id,
        org_id: orgId,
        status: "CREATED",
        step_index: 0,
        // office_id in tracking_events is stored as null (UUID not integer);
        // office_name is denormalized so reads don't require a join.
        office_id: null,
        office_name: resolvedOfficeName,
        actor_id: userId,
        actor_role: resolvedRole,
        actor_name: actorName,
        notes: initNotes
      });
    } catch (trackErr) {
      console.warn("[Upload] Non-fatal: failed to seed CREATED tracking event:", trackErr);
    }
    return {
      success: true,
      message: resolvedRole === "employee" ? `Document registered at "${resolvedOfficeName}" and armed for messenger pickup.` : "Document analyzed and registered org-wide. Ready for route assignment.",
      scope: {
        role: resolvedRole,
        org_id: orgId,
        origin_office_id: resolvedOriginOfficeId,
        origin_office: resolvedOfficeName,
        stage_id: resolvedStageId,
        tracking_status: "CREATED",
        // Expose the validated checkpoint array to the client
        route_checkpoints: resolvedRouteSteps.map((s) => ({
          step: s.step_number,
          office_id: s.office_id,
          office_name: s.office_name,
          office_code: s.office_code
        }))
      },
      metadata: {
        ...supabaseDoc,
        mysql_storage_id: mysqlInsertedId
      },
      storage: {
        engine: "Hostinger_MySQL_Blob",
        targetId: mysqlInsertedId
      }
    };
  } catch (error) {
    if (supabaseDocId) {
      await client.from("documents").delete().eq("id", supabaseDocId).catch(() => {
      });
    }
    console.error("[Document Upload] Pipeline failed:", error);
    throw createError({
      statusCode: error.statusCode || 500,
      message: `Document upload failed: ${error.message || "Internal Server Error"}`
    });
  }
});

export { upload_post as default };
//# sourceMappingURL=upload.post.mjs.map
