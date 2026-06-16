import { d as defineEventHandler, e as getQuery, a as createError, m as assertDocumentOrgAccess } from '../../../../_/nitro.mjs';
import { s as serverSupabaseClient } from '../../../../_/serverSupabaseClient.mjs';
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
import '../../../../_/index2.mjs';
import 'cookie';

const list_get = defineEventHandler(async (event) => {
  var _a, _b;
  const client = await serverSupabaseClient(event);
  const query = getQuery(event);
  const documentId = String((_a = query.document_id) != null ? _a : "").trim();
  if (!documentId) {
    throw createError({ statusCode: 400, message: "document_id is required." });
  }
  const { actor, document } = await assertDocumentOrgAccess(event, client, documentId);
  const { data: issues, error } = await client.from("document_issues").select("id, document_id, org_id, reported_by_office_id, title, status, created_at").eq("document_id", documentId).eq("org_id", actor.orgId).order("created_at", { ascending: false }).limit(10);
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
