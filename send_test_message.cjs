const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const client = createClient(
  process.env.NUXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const CLIENT_ID = '0e09d826-aad3-4cc1-a35b-2dc513247a74';
const EMPLOYEE_ID = '8afff3be-b690-48db-b1a3-fdd9379eaa68';
const ORG_ID = '05f7b4b3-07d6-47ac-993c-b90cb72974a0';

async function run() {
  try {
    console.log("Checking for existing conversation between client and employee...");
    
    // Find matching conversation
    const { data: selfParts } = await client
      .from('conversation_participants')
      .select('conversation_id')
      .eq('participant_type', 'user')
      .eq('user_id', CLIENT_ID);

    let conversationId = null;
    if (selfParts && selfParts.length > 0) {
      const convIds = selfParts.map(p => p.conversation_id);
      const { data: targetParts } = await client
        .from('conversation_participants')
        .select('conversation_id')
        .in('conversation_id', convIds)
        .eq('participant_type', 'user')
        .eq('user_id', EMPLOYEE_ID);
        
      if (targetParts && targetParts.length > 0) {
        conversationId = targetParts[0].conversation_id;
      }
    }

    if (!conversationId) {
      console.log("No existing conversation, creating one...");
      const { data: conv, error: convErr } = await client
        .from('conversations')
        .insert({ org_id: ORG_ID })
        .select('id')
        .single();
      if (convErr) throw convErr;
      conversationId = conv.id;

      const participants = [
        {
          conversation_id: conversationId,
          participant_type: 'user',
          user_id: CLIENT_ID,
          office_id: null
        },
        {
          conversation_id: conversationId,
          participant_type: 'user',
          user_id: EMPLOYEE_ID,
          office_id: null
        }
      ];
      const { error: partErr } = await client.from('conversation_participants').insert(participants);
      if (partErr) throw partErr;
    }

    console.log("Using Conversation ID:", conversationId);

    // Send a message from employee to client
    const { data: message, error: msgErr } = await client
      .from('direct_messages')
      .insert({
        conversation_id: conversationId,
        sender_user_id: EMPLOYEE_ID,
        sender_office_id: null,
        message_text: "Hi, this is a test unread message!",
        read_by: [] // start as unread
      })
      .select('*')
      .single();

    if (msgErr) throw msgErr;
    console.log("Inserted test message successfully:", message.id);

    // Update conversation timestamp
    await client.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId);

  } catch (err) {
    console.error("Test setup failed:", err);
  } finally {
    process.exit(0);
  }
}

run();
