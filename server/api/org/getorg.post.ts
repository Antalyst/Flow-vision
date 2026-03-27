export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { user_id } = body; 
    const db = event.context.db;

    const [rows] = await db.query(`
      SELECT o.* FROM org o
      JOIN users u ON o.org_id = u.org_id
      WHERE u.user_id = ?
    `, [user_id]);

    return rows.length > 0 ? rows[0] : null;

  } catch (error) {
    console.error('DATABASE ERROR:', error); 
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Database query failed',
    });
  }
});