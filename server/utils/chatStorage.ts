import type { IChatPayload } from './types/chat';

/**
 * Saves a chat message to the `chats` table asynchronously.
 *
 * Targets the exact column layout:
 *   document_id, sender_id, receiver_id, org_id, message_text, created_at
 *
 * @param db  The MySQL connection pool or connection instance
 * @param msg The typed message payload matching the `chats` table schema
 * @returns   A promise resolving to `true` on successful insert, `false` otherwise.
 */
export async function saveMessageToDatabase(db: any, msg: IChatPayload): Promise<boolean> {
  if (!db) {
    console.error('[saveMessageToDatabase] Database connection pool is not available.');
    return false;
  }

  try {
    const sql = `
      INSERT INTO chats (
        document_id,
        sender_id,
        receiver_id,
        org_id,
        message_text,
        created_at
      ) VALUES (?, ?, ?, ?, ?, NOW())
    `;

    const params = [
      msg.document_id,
      msg.sender_id,
      msg.receiver_id,
      msg.org_id,
      msg.message_text,
    ];

    const [result]: any = await db.query(sql, params);
    return !!(result && result.affectedRows > 0);
  } catch (error: any) {
    // Surface FK constraint violations explicitly for debugging
    if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.errno === 1452) {
      console.error(
        '[saveMessageToDatabase] Foreign key constraint violation — ' +
        'one of document_id, sender_id, receiver_id, or org_id references a non-existent row:',
        error.message,
      );
    } else {
      console.error('[saveMessageToDatabase] Failed to insert chat message:', error.message || error);
    }
    return false;
  }
}
