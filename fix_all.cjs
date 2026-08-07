const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function fix() {
  const empPath = path.join(__dirname, 'app/pages/employee/messages.vue');
  const cliPath = path.join(__dirname, 'app/pages/client/messages.vue');
  
  // Get original employee file from git HEAD
  let content = execSync('git show HEAD:app/pages/employee/messages.vue', { encoding: 'utf-8' });

  // 1. Add unread dot
  content = content.replace(
    /(\s*)<h3 class="pointer-events-none truncate text-sm font-bold" :class="isDark \? 'text-white' : 'text-gray-900'">\s*\{\{\s*item\.title\s*\}\}\s*<\/h3>/,
    `$1<div class="flex items-center gap-2">
$1  <h3 class="pointer-events-none truncate text-sm font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">
$1    {{ item.title }}
$1  </h3>
$1  <div v-if="isUnread(item)" class="h-2 w-2 rounded-full bg-candy-orange shrink-0"></div>
$1</div>`
  );

  // 2. Add sender name
  content = content.replace(
    /(\s*)<p class="whitespace-pre-wrap leading-relaxed">\{\{\s*msg\.message_text\s*\}\}<\/p>/,
    `$1<p v-if="!isOwnMessage(msg)" class="text-[10px] font-bold mb-0.5 opacity-70">{{ getSenderName(msg) }}</p>
$1<p class="whitespace-pre-wrap leading-relaxed">{{ msg.message_text }}</p>`
  );

  // 3. Add helpers
  const isOwnMsgMatch = `const isOwnMessage = (msg: any) => {`;
  const helpers = `const isUnread = (item: any) => {
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
}, { deep: true })

`;
  
  // Make sure we import watch if it's not already
  if (content.includes("import { ref, computed, onMounted, nextTick, onUnmounted } from 'vue'")) {
    content = content.replace(
      "import { ref, computed, onMounted, nextTick, onUnmounted } from 'vue'",
      "import { ref, computed, onMounted, nextTick, onUnmounted, watch } from 'vue'"
    );
  }

  content = content.replace(isOwnMsgMatch, helpers + isOwnMsgMatch);

  // Write employee
  fs.writeFileSync(empPath, content);
  
  // For client, we just copy employee, and change layout: 'employee' to layout: 'client'
  let cliContent = content.replace(/layout:\s*'employee'/, "layout: 'client'");
  
  // Client also uses a slightly different sidebar icon and search bar style but they are extremely close.
  // Actually, client has a few structural differences (e.g. no targetOfficeId draft logic). 
  // Let's just repair client/messages.vue identically!
  fs.writeFileSync(cliPath, cliContent);

  console.log("Fixed!");
}

fix();
