// ---------------------------------------------------------------------------
// Strongly-Typed Chat Message Interfaces
//
// These types map directly to the `chats` MySQL table schema:
//   message_id  INT (Auto-Increment PK)
//   document_id INT (FK → documents)
//   sender_id   INT (FK → users)
//   receiver_id INT (FK → users)
//   org_id      INT (FK → offices)
//   message_text TEXT
//   created_at  TIMESTAMP (DEFAULT NOW())
// ---------------------------------------------------------------------------

/**
 * Payload shape required for active database insertion into the `chats` table.
 * Excludes auto-generated columns (`message_id`, `created_at`).
 */
export interface IChatPayload {
  document_id: number;
  sender_id: number;
  receiver_id: number;
  org_id: number;
  message_text: string;
}

/**
 * Full row shape returned when reading from the `chats` table.
 * Extends IChatPayload with server-generated columns for safe type-checked retrieval.
 */
export interface IChatResponse extends IChatPayload {
  message_id: number;
  created_at: string | Date;
}
