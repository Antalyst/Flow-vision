const fs = require('fs');
const path = require('path');

const employeePath = path.join(__dirname, 'app/pages/employee/messages.vue');
const clientPath = path.join(__dirname, 'app/pages/client/messages.vue');

function patchFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');

  // 1. Add unread dot
  const titleRegex = /<h3 class="pointer-events-none truncate text-sm font-bold" :class="isDark \? 'text-white' : 'text-gray-900'">\s*\{\{ item\.title \}\}\s*<\/h3>/;
  if (!content.includes('isUnread(item)')) {
    content = content.replace(titleRegex, `<div class="flex items-center gap-2">
                    <h3 class="pointer-events-none truncate text-sm font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">
                      {{ item.title }}
                    </h3>
                    <div v-if="isUnread(item)" class="h-2 w-2 rounded-full bg-candy-orange shrink-0"></div>
                  </div>`);
  }

  // 2. Add sender name to chat bubble
  const msgBubbleRegex = /<p class="whitespace-pre-wrap leading-relaxed">\{\{ msg\.message_text \}\}<\/p>/;
  if (!content.includes('getSenderName(msg)')) {
    content = content.replace(msgBubbleRegex, `<p v-if="!isOwnMessage(msg)" class="text-[10px] font-bold mb-0.5 opacity-70">
                    {{ getSenderName(msg) }}
                  </p>
                  <p class="whitespace-pre-wrap leading-relaxed">{{ msg.message_text }}</p>`);
  }

  // 3. Add isUnread, getSenderName, and watch in script
  if (!content.includes('const isUnread =')) {
    const isOwnMessageRegex = /const isOwnMessage = \(msg: any\) => \{[\s\S]*?return.*\n\}/;
    const match = content.match(isOwnMessageRegex);
    if (match) {
      const helpers = `\nconst isUnread = (item: any) => {
  if (!item.latest_message) return false
  if (isOwnMessage(item.latest_message)) return false
  const readBy = item.latest_message.read_by || []
  const isRead = readBy.includes(auth.user?.user_id) || (auth.user?.office_id && readBy.includes(auth.user?.office_id))
  return !isRead
}

const getSenderName = (msg: any) => {
  const senderId = msg.sender_office_id || msg.sender_user_id
  if (!senderId) return 'Unknown'
  const p = activeConversation.value?.participants?.find((p: any) => p.id === senderId)
  return p ? p.name : 'Unknown'
}

watch(() => chat.messages, async (newMsgs, oldMsgs) => {
  if (newMsgs.length > (oldMsgs?.length || 0)) {
    await scrollToBottom()
  }
}, { deep: true })\n`;
      content = content.replace(match[0], match[0] + helpers);
    }
  }

  fs.writeFileSync(filePath, content);
  console.log(`Patched ${filePath}`);
}

patchFile(employeePath);
// Let's also restore clientPath if needed by git checkout then apply the patch.
// We'll just patch clientPath directly since it was checked out earlier.
patchFile(clientPath);
