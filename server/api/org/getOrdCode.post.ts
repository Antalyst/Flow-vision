export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { code } = body; 
    const db = event.context.db;

    const [rows] = await db.query(`
      SELECT org_id, code, name FROM org WHERE code = ?
    `, [code]);
    
    if (rows && rows.length > 0) {
      return {
        success: true,
        rows: rows[0]
      }
    } else {
      return {
        success: false,
        message: "Invalid organization code" 
      }
    }
  } catch (error) {
    console.error('DATABASE ERROR:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
    });
  }
});