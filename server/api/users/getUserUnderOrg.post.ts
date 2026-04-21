export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { orgId } = body;
    const db = event.context.db;

    if (!db) {
      throw createError({
        statusCode: 500,
        message: "Database driver not initialized",
      });
    }

    if (!orgId) {
      throw createError({
        statusCode: 400,
        message: "orgId is required",
      });
    }

    const [rows] = await db.query("SELECT * FROM users WHERE org_id = ? and role= 'employee'", [orgId]);

    return {
      success: true,
      data: rows,
    };
  } catch (err: any) {
    throw createError({
      statusCode: err.statusCode || 500,
      message: err.message || "Internal Server Error",
    });
  }
});