export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { name, user_id } = body; 
  const db = event.context.db;

  if (!name || !user_id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Organization name and User ID are required',
    });
  }

  try {
    const generateOrgCode = () => {
      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let result = '';
      for (let i = 0; i < 16; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      return result;
    };

    const orgCode = generateOrgCode();
    const createdAt = new Date();
    const [result]: any = await db.query(
      `INSERT INTO org(name, code,user_id, created_at) VALUES (?, ?, ?, ?)`,
      [name, orgCode, user_id, createdAt]
    );

    const newOrgId = result.insertId;
    await db.query(
      `UPDATE users SET org_id = ? WHERE user_id = ?`,
      [newOrgId, user_id]
    );

    return {
      success: true,
      org_id: newOrgId,
      org_code: orgCode
    };

  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Internal Server Error',
    });
  }
});