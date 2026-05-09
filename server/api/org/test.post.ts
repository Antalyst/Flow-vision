import { serverSupabaseClient } from '#supabase/server';

export default defineEventHandler(async (event) => {
const body = await readBody(event);
const { name, user_id } = body;
const db = event.context.db;
const client = await serverSupabaseClient(event);

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
        const { data, error } = await client
            .from('org')
            .insert({ name, code: orgCode, user_id})
            .select('org_id')
            .single();

        if (error) {
            throw error;
        }

        return { org_id: data.org_id, org_code: orgCode };

    } catch (error: any) {
        throw createError({
        statusCode: 500,
        statusMessage: error.message || 'Internal Server Error',
        });
    }
});