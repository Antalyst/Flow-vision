import { defineEventHandler, readBody, createError, setResponseStatus } from 'h3';

export default defineEventHandler(async (event) => {
  // 1. Safely read the incoming request body
  const body = await readBody(event);
  
  if (!body) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request: Request body is empty or invalid JSON',
    });
  }

  const {
    user_id,
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