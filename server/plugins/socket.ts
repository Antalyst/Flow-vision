import { Server, Socket } from 'socket.io';
import { saveMessageToDatabase } from '../utils/chatStorage';
import type { IChatPayload } from '../utils/types/chat';

// ---------------------------------------------------------------------------
// Type Definitions
// ---------------------------------------------------------------------------

/** Payload shape expected from the client during `register_user` emission. */
interface IRegisterUserPayload {
  user_id: number | string;
  org_id: number | string;
}

/** Session data persisted on each socket instance for the duration of the connection. */
interface ISocketSessionData {
  userId: number;
  orgId: number;
}

// ---------------------------------------------------------------------------
// In-memory org registry: maps a userId → orgId for fast cross-org checks.
// This is populated on `register_user` and consulted during `send_message`.
// ---------------------------------------------------------------------------
const userOrgRegistry: Map<number, number> = new Map();

// ---------------------------------------------------------------------------
// Plugin Entry
// ---------------------------------------------------------------------------

export default defineNitroPlugin((nitroApp) => {
  const PORT = 3001;
  let io: Server;
  const globalKey = '__socket_io_server__';

  // Prevent multiple server instances during Nitro's hot-reload in development
  if ((globalThis as any)[globalKey]) {
    io = (globalThis as any)[globalKey];
    console.log('[Socket.io] Using existing Socket.io server instance from globalThis.');
  } else {
    try {
      io = new Server(PORT, {
        cors: {
          origin: '*',
          methods: ['GET', 'POST'],
        },
      });
      (globalThis as any)[globalKey] = io;
      console.log(`[Socket.io] Stateful Socket.io server listening on port ${PORT}.`);
    } catch (err: any) {
      console.error(`[Socket.io] Failed to start Socket.io server on port ${PORT}:`, err.message || err);
      return;
    }
  }

  // Clean listeners to prevent memory leaks and duplicate handlers during hot-reloads
  io.removeAllListeners();

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    // -----------------------------------------------------------------------
    // Event 1: Register user to an organization-scoped private room.
    //
    // The client MUST emit: socket.emit('register_user', { user_id, org_id })
    // Room naming convention: `org_${orgId}_user_${userId}`
    // -----------------------------------------------------------------------
    socket.on('register_user', (payload: IRegisterUserPayload) => {
      if (!payload || !payload.user_id || !payload.org_id) {
        console.warn(
          `[Socket.io] register_user: Received invalid payload from socket ${socket.id}. ` +
          `Both user_id and org_id are required. Received:`,
          payload,
        );
        return;
      }

      const userId = Number(payload.user_id);
      const orgId = Number(payload.org_id);

      if (isNaN(userId) || isNaN(orgId)) {
        console.warn(
          `[Socket.io] register_user: Non-numeric user_id (${payload.user_id}) or ` +
          `org_id (${payload.org_id}) from socket ${socket.id}. Connection rejected.`,
        );
        return;
      }

      // Persist session data on the socket instance
      (socket.data as ISocketSessionData).userId = userId;
      (socket.data as ISocketSessionData).orgId = orgId;

      // Populate the in-memory org registry
      userOrgRegistry.set(userId, orgId);

      // Join the organization-scoped room
      const roomName = `org_${orgId}_user_${userId}`;
      socket.join(roomName);
      console.log(`[Socket.io] Socket ${socket.id} registered — user ${userId}, org ${orgId} → room ${roomName}`);
    });

    // -----------------------------------------------------------------------
    // Event 2: Send message with strict cross-organization verification.
    //
    // The client MUST emit all 5 required data points:
    //   { document_id, sender_id, receiver_id, org_id, message_text }
    //
    // Before dispatching `receive_message`, the sender's org_id is compared
    // against the receiver's org_id from the in-memory registry. On mismatch
    // the message is silently dropped and a security warning is logged.
    // -----------------------------------------------------------------------
    socket.on('send_message', (payload: IChatPayload) => {
      // Validate all 5 required fields from the payload
      if (
        !payload ||
        !payload.document_id ||
        !payload.sender_id ||
        !payload.receiver_id ||
        !payload.org_id ||
        !payload.message_text
      ) {
        console.warn(
          '[Socket.io] send_message: Incomplete payload — all fields required ' +
          '(document_id, sender_id, receiver_id, org_id, message_text). Received:',
          payload,
        );
        return;
      }

      // Resolve sender's org_id — prefer socket session, fallback to payload
      const senderOrgId: number =
        (socket.data as ISocketSessionData)?.orgId ?? Number(payload.org_id);

      if (isNaN(senderOrgId)) {
        console.warn(
          `[Socket.io] ⚠️  SECURITY: send_message from socket ${socket.id} — ` +
          `sender org_id could not be resolved. Message dropped.`,
        );
        return;
      }

      // Resolve receiver's org_id from the in-memory registry
      const receiverOrgId: number | undefined = userOrgRegistry.get(Number(payload.receiver_id));

      // Cross-organization verification gate
      if (receiverOrgId != null && receiverOrgId !== senderOrgId) {
        console.warn(
          `[Socket.io] ⚠️  SECURITY: Cross-org message BLOCKED — ` +
          `sender ${payload.sender_id} (org ${senderOrgId}) → ` +
          `receiver ${payload.receiver_id} (org ${receiverOrgId}). Message silently dropped.`,
        );
        return;
      }

      // Build the organization-scoped receiver room name
      const receiverRoom = `org_${senderOrgId}_user_${payload.receiver_id}`;

      // Step 2.1: Instant broadcast to the receiver's organization-scoped room
      io.to(receiverRoom).emit('receive_message', payload);
      console.log(`[Socket.io] Emitted message to org-scoped room: ${receiverRoom}`);

      // Step 2.2: Build the typed persistence payload matching our chats table schema
      const dbPayload: IChatPayload = {
        document_id: Number(payload.document_id),
        sender_id: String(payload.sender_id),
        receiver_id: String(payload.receiver_id),
        org_id: String(senderOrgId),
        message_text: payload.message_text,
      };

      // Step 2.3: Asynchronously persist to MySQL (non-blocking)
      const db = nitroApp.db;
      saveMessageToDatabase(db, dbPayload)
        .then((success) => {
          if (!success) {
            console.error('[Socket.io] Asynchronous DB write failed for message:', dbPayload);
          } else {
            console.log('[Socket.io] Asynchronous DB write completed successfully for message.');
          }
        })
        .catch((error) => {
          console.error('[Socket.io] Critical error during asynchronous DB write:', error);
        });
    });

    // -----------------------------------------------------------------------
    // Event 3: Disconnect — clean up session data from the in-memory registry.
    // -----------------------------------------------------------------------
    socket.on('disconnect', (reason) => {
      const sessionData = socket.data as ISocketSessionData;
      if (sessionData?.userId) {
        userOrgRegistry.delete(sessionData.userId);
      }
      console.log(`[Socket.io] Client disconnected: ${socket.id}, reason: ${reason}`);
    });
  });

  // Handle Nitro server shutdown cleanly
  nitroApp.hooks.hook('close', async () => {
    console.log('[Socket.io] Closing Socket.io server during application teardown...');
    userOrgRegistry.clear();
    await new Promise<void>((resolve) => {
      io.close(() => {
        console.log('[Socket.io] Socket.io server closed.');
        delete (globalThis as any)[globalKey];
        resolve();
      });
    });
  });
});
