import { d as defineEventHandler, a as useServerSupabase, b as getQuery, c as createError, j as assertDocumentOrgAccess } from '../../../../_/nitro.mjs';
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

const list_get = defineEventHandler(async (event) => {
  var _a, _b;
  const supabase = useServerSupabase();
  const query = getQuery(event);
  const documentId = String((_a = query.document_id) != null ? _a : "").trim();
  if (!documentId) {
    throw createError({ statusCode: 400, message: "document_id is required." });
  }
  const { actor, document } = await assertDocumentOrgAccess(event, supabase, documentId);
  const { data: issues, error } = await supabase.from("document_issues").select("id, document_id, org_id, reported_by_office_id, title, status, created_at").eq("document_id", documentId).eq("org_id", actor.orgId).order("created_at", { ascending: false }).limit(10);
  if (error) {
    throw createError({ statusCode: 500, message: error.message });
  }
  const openIssue = (_b = (issues != null ? issues : []).find((i) => i.status === "OPEN")) != null ? _b : null;
  return {
    success: true,
    org_id: actor.orgId,
    document: {
      id: document.id,
      title: document.title,
      tracking_status: document.tracking_status
    },
    openIssue,
    history: issues != null ? issues : []
  };
});

export { list_get as default };
//# sourceMappingURL=list.get.mjs.map
