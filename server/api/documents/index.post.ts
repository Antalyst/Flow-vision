import { defineEventHandler, readBody, createError, setResponseStatus } from 'h3';
import { broadcastInboundOfficeNotification, broadcastInboundDispatchRealtime } from '~~/server/utils/notifications';

export default defineEventHandler(async (event) => {
  // 1. Safely read the incoming request body
  const body = await readBody(event);
  
  if (!body) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request: Request body is empty or invalid JSON',
    });
  }

  // Legacy prototype endpoint: signed-in users only, and the author is always
  // the session user — never a user_id sent in the body.
  const user_id = requireOrgAuth(event).userId
  const {
    office_id,
    document_name,
    document_description,
    document_data,
    status = 'pending'
  } = body;

  // 2. Validate required request payload fields
  if (!user_id || !office_id || !document_name || !document_data) {
    throw createError({
      statusCode: 400,
      statusMessage: `Missing required fields: ${[
        !user_id && 'user_id',
        !office_id && 'office_id',
        !document_name && 'document_name',
        !document_data && 'document_data'
      ].filter(Boolean).join(', ')}`
    });
  }

  // 3. Verify that the database connection is active and accessible
  const database = event.context.db;
  if (!database) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error: Database connection is not available',
    });
  }

  try {
    // 4. Extract and convert Base64 document payload to Buffer
    const fileBuffer = Buffer.from(document_data, 'base64');

    // 5. Encrypt the file buffer using the server's encryption utility
    const { encryptBuffer } = (useNitroApp() as any).encryption;
    if (!encryptBuffer) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Internal Server Error: Encryption utility not available'
      });
    }
    const encryptedData = encryptBuffer(fileBuffer);

    // 6. Generate a unique tracking code (as part of the documents workflow)
    const trackingCode = body.qr_code || `FLOW-${Math.random().toString(36).substring(2, 11).toUpperCase()}`;

    // 7. Insert the metadata fields and encrypted buffer into the MySQL database
    const sql = `
      INSERT INTO documents (
        user_id, 
        office_id, 
        document_data, 
        qr_code, 
        document_name,
        document_description,
        status,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    const [result]: any = await database.query(sql, [
      user_id,
      office_id,
      encryptedData,
      trackingCode,
      document_name,
      document_description || '',
      status
    ]);

    // Optional pre-pickup ASN notice if destinationOfficeId is provided
    const destinationOfficeId = body.destination_office_id || body.destinationOfficeId || null;
    const orgId = body.org_id || body.orgId || null;

    if (destinationOfficeId && orgId) {
      try {
        await broadcastInboundOfficeNotification({
          orgId: String(orgId),
          documentId: String(result.insertId),
          documentTitle: document_name,
          officeId: String(destinationOfficeId),
          type: 'ASN_PENDING_PICKUP',
          title: 'Inbound Advance Notice — Awaiting Pickup',
          message: `"${document_name}" has been released by origin office and is waiting for courier pickup.`,
          metadata: {
            type: 'ASN_PENDING_PICKUP',
            origin_office_id: office_id,
            target_step: 1,
          },
        });

        await broadcastInboundDispatchRealtime(
          String(orgId),
          String(destinationOfficeId),
          'ASN_PENDING_PICKUP',
          {
            type: 'ASN_PENDING_PICKUP',
            event: 'ASN_PENDING_PICKUP',
            document_id: String(result.insertId),
            document_title: document_name,
            origin_office_id: office_id,
            target_office_id: String(destinationOfficeId),
            step: 1,
            tracking_status: 'CREATED',
            dispatched_at: new Date().toISOString(),
            notes: `Document released by origin office and awaiting courier pickup.`,
          },
        );
      } catch (asnErr) {
        console.warn('[Documents POST] Pre-pickup ASN notification skipped or failed:', asnErr);
      }
    }

    // 8. Return 201 Success status with the database insertion ID
    setResponseStatus(event, 201);
    
    return {
      success: true,
      statusCode: 201,
      message: 'Document uploaded and encrypted successfully',
      data: {
        tracking_id: result.insertId,
        qr_code: trackingCode,
        affectedRows: result.affectedRows
      }
    };

  } catch (error: any) {
    console.error('[Nitro API Documents POST Error]:', error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'An error occurred while creating the document'
    });
  }
});