import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async(event)=>{
    const client = await serverSupabaseClient(event)
    const body = await readBody(event);
    
    const {name, org_id, step_number} = body;
    
    const {data, error} = await client.from('stages').insert({
        name,

        org_id,
        step_number
    }).select('*').single();

    if (error) {
        return {
            status: 500,
            message: "Error creating stage",
            error
        }
    }

    return {
        status: 200,
        message: "Stage created successfully",
        data
    }
})