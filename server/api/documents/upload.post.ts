
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server';
import { analyzeDocument } from '~~/server/utils/aiAnalyzer';
export default defineEventHandler(async (event) => {
  const db = event.context.db; 
  const client = await serverSupabaseClient(event);
  // const user = await serverSupabaseUser(event);

  // if (!user) {
  //   throw createError({ statusCode: 401, message: 'Unauthorized access.' });
  // }
  const user = "0f31ed85-a1ab-40cc-b1c7-910e11a0379a";
  const formData = await readMultipartFormData(event);
  if (!formData) {
    throw createError({ statusCode: 400, message: 'No multi-part form data received.' });
  }

  const fileItem = formData.find(item => item.name === 'file');
  const officeId = formData.find(item => item.name === 'office_id')?.data.toString();
  const orgId = formData.find(item => item.name === 'org_id')?.data.toString();

  if (!fileItem || !fileItem.data) {
    throw createError({ statusCode: 400, message: 'Missing document file payload.' });
  }

  try {
    const extractedText = await extractTextFromFile({
      filename: fileItem.filename || 'unknown.txt',
      data: fileItem.data
    });
    const contextToAnalyze = extractedText || `Filename: ${fileItem.filename}`;
    const aiAnalysis = await analyzeDocument(contextToAnalyze);
    const docUuid = crypto.randomUUID();
    const [mysqlResult] = await db.execute(
      'INSERT INTO document_storage (document_uuid, file_blob, file_name, mime_type) VALUES (?, ?, ?, ?)',
      [docUuid, fileItem.data, fileItem.filename || 'unnamed', fileItem.type]
    );
    const mysqlInsertedId = (mysqlResult as any).insertId;
    const randomQrCode = `QR-${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
    
    const { data: supabaseDoc, error: supabaseError } = await client
      .from('documents')
      .insert({
        id: docUuid,
        org_id: orgId || null,
        office_id: officeId || null,
        user_id: user.id,
        title: aiAnalysis.title || fileItem.filename || 'Untitled Document',
        description: aiAnalysis.description || 'No description extracted.',
        qr_code_data: randomQrCode,
        status: 'Pending',
        mysql_storage_id: mysqlInsertedId
      })
      .select()
      .single();

    if (supabaseError) throw supabaseError;
    return {
      success: true,
      message: 'Document successfully parsed, analyzed, and split-stored.',
      metadata: supabaseDoc,
      storage: {
        engine: 'Hostinger_MySQL_Blob',
        targetId: mysqlInsertedId
      }
    };

  } catch (error: any) {
    console.error('Hybrid Document Multi-Storage Failed:', error);
    throw createError({
      statusCode: 500,
      statusMessage: `Hybrid Storage Execution Error: ${error.message}`
    });
  }
});