import { defineEventHandler, getRouterParam, getQuery, createError } from 'h3';
import type { IChatResponse } from '../../utils/types/chat';

// ---------------------------------------------------------------------------
// Type Definitions
// ---------------------------------------------------------------------------

/** Shape of expected query-string parameters on this endpoint. */
interface IChatHistoryQuery {
  document_id?: string;
}

/** Row shape returned from the `documents` table ownership check. */
interface IDocumentOwnershipRow {
  document_id: number;
  office_id: number;
}

// ---------------------------------------------------------------------------
// GET /api/chats/:org_id?document_id=<document_id>
//
// Returns the chronological chat history for a given document thread, but
// ONLY if the requesting org_id matches the document's owning office.
//
// Route param:  org_id       → organizational isolation boundary
// Query param:  document_id  → the document thread to retrieve
// ---------------------------------------------------------------------------

export default defineEventHandler(async (event) => {
  // 1. Extract and validate the org_id route parameter
  const orgIdStr = getRouterParam(event, 'org_id');
  if (!orgIdStr) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request: org_id is required.',
    });
  }

  const orgId = parseInt(orgIdStr, 10);
  if (isNaN(orgId)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request: org_id must be a valid integer.',
    });
  }

  // 2. Extract and validate document_id from query parameters
  const query = getQuery<IChatHistoryQuery>(event);
  const documentIdStr = query.document_id;

  if (!documentIdStr) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request: document_id query parameter is required.',
    });
  }

  const documentId = parseInt(String(documentIdStr), 10);
  if (isNaN(documentId)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request: document_id must be a valid integer.',
    });
  }

  // 3. Retrieve the MySQL pool connection from context
  const db = event.context.db;
  if (!db) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error: Database connection is not available in the request context.',
    });
  }

  try {
    // 4. Organizational ownership verification — check the document's office_id
    const verificationSql = `
      SELECT document_id, office_id
      FROM documents
      WHERE document_id = ?
      LIMIT 1
    `;

    const [verificationRows]: any = await db.query(verificationSql, [documentId]);

    if (!verificationRows || verificationRows.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Not Found: The requested document does not exist.',
      });
    }

    const document: IDocumentOwnershipRow = verificationRows[0];

    // Strict org_id ↔ office_id parity check
    if (Number(document.office_id) !== orgId) {
      console.warn(
        `[Chats History GET] ⚠️  FORBIDDEN: org_id ${orgId} attempted to access ` +
        `document ${documentId} owned by office_id ${document.office_id}. Request denied.`,
      );
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden: Organizational Access Denied',
      });
    }

    // 5. Query historical messages — all columns aligned with the chats table schema
    const sql = `
      SELECT
        message_id,
        document_id,
        sender_id,
        receiver_id,
        org_id,
        message_text,
        created_at
      FROM chats
      WHERE document_id = ?
      ORDER BY created_at ASC
    `;

    const [rows]: any = await db.query(sql, [documentId]);

    // 6. Map DB rows to the strongly-typed IChatResponse interface
    const history: IChatResponse[] = (rows || []).map((row: any) => ({
      message_id: Number(row.message_id),
      document_id: Number(row.document_id),
      sender_id: Number(row.sender_id),
      receiver_id: Number(row.receiver_id),
      org_id: Number(row.org_id),
      message_text: row.message_text,
      created_at: row.created_at,
    }));

    return {
      success: true,
      statusCode: 200,
      message: 'Chat history retrieved successfully.',
      data: history,
    };
  } catch (error: any) {
    // Re-throw H3 errors directly (403, 404, etc.) without wrapping
    if (error.statusCode) {
      throw error;
    }
    console.error(`[Chats History GET Error] Failed to retrieve history for document ${documentId}:`, error);
    throw createError({
      statusCode: 500,
      statusMessage: 'An error occurred while retrieving chat history.',
    });
  }
});
