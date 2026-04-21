export default defineEventHandler(async (event)=>{
    
    try{
        const body = await readBody(event);
        const {name, user_id,  org_id} = body; 
        const created_at = new Date().toISOString();
        const db  = event.context.db;

        if(!name || !org_id || !user_id){

            return{
                status: 400,
                message: "Missing required fields"
            }
        }
        const [rows] = await db.query(`
            insert into offices (name, assigned_user, org_id, created_at) values (?, ?, ?, ?)
        `, [name, user_id, org_id, created_at]);

        if(rows){
            return{
                status: 200,
                message: "Office created successfully",
                data:rows            }
        }
    }catch(error){
        return error;
    }
    
})