
export default defineEventHandler(async (event) => {
  try {
    const db = event.context.db;
    const [rows] = await db.query('SELECT * FROM account_types');
    return rows;
  } catch (error) {

    console.error('DATABASE ERROR:', error); 
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Database query failed',
      data: error 
    });
  }
});