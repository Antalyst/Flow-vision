<<<<<<< HEAD
export default defineEventHandler(async (event)=>{
    
    try{
        const body = await readBody(event);
        const {name, user_id,  org_id} = body;
        const created_at = new Date().toISOString();
        const db  = event.context.db;
=======
export default defineEventHandler(async (event) => {
>>>>>>> 3c0c7fff94b7d8972c6af2b25fd3807c7797dfb7

  try {
    const body = await readBody(event);
    const { name, user_id, org_id } = body;
    const created_at = new Date().toISOString();
    const db = event.context.db;

    if (!name || !org_id || !user_id) {

      return {
        status: 400,
        message: "Missing required fields"
      }
    }
    const [rows] = await db.query(`
            insert into offices (name, assigned_user, org_id, created_at) values (?, ?, ?, ?)
        `, [name, user_id, org_id, created_at]);

    if (rows) {
      return {
        status: 200,
        message: "Office created successfully",
        data: rows
      }
    }
  } catch (error) {
    return error;
  }

})