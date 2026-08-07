import mysql from 'mysql2/promise';

export default defineEventHandler(async (event) => {
    const document_id  = getRouterParam(event, 'document_id');
    const { decryptBuffer } = (useNitroApp() as any).encryption;
    const database = event.context.db;

    if(!database) {
        return {
            status: 500,
            message: "Database connection not available"
        }
    }

    try{
        
        const sql = 'SELECT * FROM documents WHERE document_id = ?';
        const [rows] = await database.query(sql, [document_id]);

        const encryptedData = rows[0].document_data;
        const decryptedData = decryptBuffer(encryptedData)

        if(rows.length === 0) {
            return {
                status: 404,
                message: "Document not found"
            }
        }

        return {
            status: 200,
            message: "Document retrieved successfully",
            data: {
                ...rows[0],
                document_data: decryptedData.toString('base64')
            }
        }

    } catch (error: any) {
        return {
            status: 500,
            message: "Error occurred while retrieving document"
        }
    }
});