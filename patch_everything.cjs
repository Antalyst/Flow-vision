const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function patch() {
  const empPath = path.join(__dirname, 'app/pages/employee/messages.vue');
  const cliPath = path.join(__dirname, 'app/pages/client/messages.vue');
  
  // 1. Get from HEAD
  let content = execSync('git show HEAD:app/pages/employee/messages.vue', { encoding: 'utf-8' });

  // 2. Add unread dot in sidebar
  content = content.replace(
    /(\s*)<h3 class="pointer-events-none truncate text-sm font-bold" :class="isDark \? 'text-white' : 'text-gray-900'">\s*\{\{\s*item\.title\s*\}\}\s*<\/h3>/,
    `$1<div class="flex items-center gap-2">
$1  <h3 class="pointer-events-none truncate text-sm font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">
$1    {{ item.title }}
$1  </h3>
$1  <div v-if="isUnread(item)" class="h-2 w-2 rounded-full bg-candy-orange shrink-0"></div>
$1</div>`
  );

  // 3. Add sender name inside chat bubble
  content = content.replace(
    /(\s*)<p class="whitespace-pre-wrap leading-relaxed">\{\{\s*msg\.message_text\s*\}\}<\/p>/,
    `$1<p v-if="!isOwnMessage(msg)" class="text-[10px] font-bold mb-0.5 opacity-70">{{ getSenderName(msg) }}</p>
$1<p class="whitespace-pre-wrap leading-relaxed">{{ msg.message_text }}</p>`
  );

  // 4. Update the chat header for editing title and showing members
  content = content.replace(
    `<div class="min-w-0 flex-1">
              <h2 class="truncate text-base font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">
                {{ activeConversation?.title || 'New Conversation' }}
              </h2>
            </div>`,
    `<div class="min-w-0 flex-1 flex flex-col justify-center">
              <div class="flex items-center gap-2">
                <template v-if="!isEditingTitle">
                  <h2 class="truncate text-base font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">
                    {{ activeConversation?.title || 'Unknown Group' }}
                  </h2>
                  <!-- Edit Title Button for groups -->
                  <button v-if="activeConversation?.participants?.length > 1" @click="startEditingTitle" class="text-gray-400 hover:text-candy-orange">
                    <Icon name="ph:pencil-simple" class="h-4 w-4" />
                  </button>
                </template>
                <template v-else>
                  <input 
                    v-model="editedTitle" 
                    @keyup.enter="saveTitle"
                    @keyup.esc="isEditingTitle = false"
                    class="border border-candy-orange px-2 py-1 rounded text-sm bg-transparent outline-none"
                    :class="isDark ? 'text-white' : 'text-gray-900'"
                    autofocus
                  />
                  <button @click="saveTitle" :disabled="updatingTitle" class="text-candy-orange hover:text-orange-600 ml-1">
                    <Icon v-if="updatingTitle" name="ph:spinner-gap" class="h-4 w-4 animate-spin" />
                    <Icon v-else name="ph:check-bold" class="h-4 w-4" />
                  </button>
                  <button @click="isEditingTitle = false" class="text-gray-400 hover:text-red-500 ml-1">
                    <Icon name="ph:x-bold" class="h-4 w-4" />
                  </button>
                </template>
              </div>
              
              <!-- Participants subheader -->
              <p v-if="activeConversation?.participants?.length" class="truncate text-xs mt-0.5" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
                Members: {{ activeConversation.participants.map(p => p.name).join(', ') }}
              </p>
            </div>`
  );

  // 5. Add "Create Group" Modal to template end
  const modalHTML = `
    <!-- Create Group Modal -->
    <div v-if="showCreateGroupModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div class="w-full max-w-md rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]" :class="isDark ? 'bg-[#18181b] border border-white/10' : 'bg-white'">
        <div class="p-4 border-b flex justify-between items-center" :class="isDark ? 'border-white/5' : 'border-gray-200'">
          <h3 class="text-lg font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">Create New Group</h3>
          <button @click="showCreateGroupModal = false" class="text-gray-400 hover:text-gray-500 transition-colors">
            <Icon name="ph:x-bold" class="h-5 w-5" />
          </button>
        </div>
        <div class="p-4 border-b" :class="isDark ? 'border-white/5' : 'border-gray-200'">
          <label class="block text-sm font-medium mb-1" :class="isDark ? 'text-gray-300' : 'text-gray-700'">Group Name</label>
          <input
            v-model="newGroupName"
            type="text"
            placeholder="e.g. Project Alpha (Optional)"
            class="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors"
            :class="isDark 
              ? 'border-onyx-border bg-[#27272a] text-white focus:border-candy-orange' 
              : 'border-gray-300 bg-white text-gray-900 focus:border-candy-orange'"
          />
        </div>
        <div class="flex-1 overflow-y-auto p-4">
          <p class="text-sm font-medium mb-3" :class="isDark ? 'text-gray-300' : 'text-gray-700'">Select Contacts</p>
          <div class="space-y-2">
            <label
              v-for="contact in chat.contacts"
              :key="contact.id"
              class="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors border"
              :class="isDark ? 'border-white/5 hover:bg-white/5' : 'border-gray-200 hover:bg-gray-50'"
            >
              <input
                type="checkbox"
                :value="contact"
                v-model="selectedContacts"
                class="h-4 w-4 rounded border-gray-300 text-candy-orange focus:ring-candy-orange bg-transparent"
              />
              <div class="flex-1">
                <p class="text-sm font-medium" :class="isDark ? 'text-white' : 'text-gray-900'">{{ contact.name }}</p>
              </div>
            </label>
            <div v-if="!chat.contacts?.length" class="py-8 text-center text-gray-400">
              <p class="text-sm">No other contacts found in your organization.</p>
            </div>
          </div>
        </div>
        <div class="p-4 border-t flex justify-end gap-2" :class="isDark ? 'border-white/5 bg-[#18181b]' : 'border-gray-200 bg-gray-50'">
          <button
            @click="showCreateGroupModal = false"
            class="px-4 py-2 text-sm font-medium transition-colors"
            :class="isDark ? 'hover:text-white text-gray-300' : 'hover:bg-gray-100 text-gray-700'"
          >
            Cancel
          </button>
          <button
            @click="handleCreateGroup"
            :disabled="!selectedContacts?.length || creatingGroup"
            class="px-4 py-2 text-sm font-medium rounded bg-[#e87030] text-white hover:bg-[#d86020] transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icon v-if="creatingGroup" name="ph:spinner-gap" class="animate-spin h-4 w-4" />
            Create
          </button>
        </div>
      </div>
    </div>
  </div>
</template>`;
  content = content.replace("  </div>\n</template>", modalHTML);

  // 6. Update Vue imports
  if (!content.includes("watch")) {
    content = content.replace(
      "import { ref, computed, onMounted, nextTick, onUnmounted } from 'vue'",
      "import { ref, computed, onMounted, nextTick, onUnmounted, watch } from 'vue'"
    );
  }

  // 7. Insert script variables
  const scriptInsertion = `
const showCreateGroupModal = ref(false)
const selectedContacts = ref<any[]>([])
const creatingGroup = ref(false)
const isEditingTitle = ref(false)
const editedTitle = ref('')
const updatingTitle = ref(false)
const newGroupName = ref('')

const startEditingTitle = () => {
  editedTitle.value = activeConversation.value?.title || ''
  isEditingTitle.value = true
}

const saveTitle = async () => {
  if (!activeConversation.value?.isExisting) return
  updatingTitle.value = true
  try {
    await chat.updateGroupTitle(activeConversation.value.id, editedTitle.value)
    isEditingTitle.value = false
  } catch(e) {
    console.error(e)
  } finally {
    updatingTitle.value = false
  }
}

watch(() => chat.activeConversationId, () => {
  isEditingTitle.value = false
})

const openCreateGroupModal = async () => {
  showCreateGroupModal.value = true
  selectedContacts.value = []
  newGroupName.value = ''
  if (chat.contacts.length === 0) {
    await chat.fetchContacts()
  }
}

const handleCreateGroup = async () => {
  if (selectedContacts.value.length === 0) return
  creatingGroup.value = true
  try {
    const userIds = selectedContacts.value.filter(c => c.type === 'user').map(c => c.id)
    const officeIds = selectedContacts.value.filter(c => c.type === 'office').map(c => c.id)
    await chat.createGroup(userIds, officeIds, newGroupName.value)
    showCreateGroupModal.value = false
    localDraftTarget.value = null
    await scrollToBottom()
  } catch (err) {
    console.error(err)
  } finally {
    creatingGroup.value = false
  }
}
`;
  content = content.replace("const messagesContainer = ref<HTMLElement | null>(null)", "const messagesContainer = ref<HTMLElement | null>(null)\n" + scriptInsertion);

  // 8. Add participants to mergedList
  content = content.replace(
    `      targetOfficeId: null, // it's already an existing convo
      title: c.title,
      latest_message: c.latest_message`,
    `      targetOfficeId: null,
      title: c.title,
      latest_message: c.latest_message,
      participants: c.participants`
  );
  content = content.replace(
    `        targetOfficeId: String(o.id),
        title: o.name,
        latest_message: null`,
    `        targetOfficeId: String(o.id),
        title: o.name,
        latest_message: null,
        participants: [o]`
  );

  // 9. Add isUnread, getSenderName, watch
  const isOwnMsgMatch = `const isOwnMessage = (msg: any) => {`;
  const helpers = `const isUnread = (item: any) => {
  if (!item.latest_message) return false
  if (isOwnMessage(item.latest_message)) return false
  const readBy = item.latest_message.read_by || []
  const isRead = readBy.includes(auth.user?.user_id) || (auth.user?.office_id && readBy.includes(auth.user?.office_id))
  return !isRead
}

const getSenderName = (msg: any) => {
  if (msg.sender_office_id) {
    const p = activeConversation.value?.participants?.find((p: any) => String(p.id) === String(msg.sender_office_id) && p.type === 'office')
    if (p) return p.name
    const o = officeStore.offices.find(o => String(o.id) === String(msg.sender_office_id))
    if (o) return o.name
  }
  if (msg.sender_user_id) {
    const p = activeConversation.value?.participants?.find((p: any) => String(p.id) === String(msg.sender_user_id) && p.type === 'user')
    if (p) return p.name
  }
  return 'Unknown'
}

watch(() => chat.messages, async (newMsgs, oldMsgs) => {
  if (newMsgs.length > (oldMsgs?.length || 0)) {
    await scrollToBottom()
  }
}, { deep: true })

`;
  content = content.replace(isOwnMsgMatch, helpers + isOwnMsgMatch);

  // 10. Update format time (fix UTC bug)
  content = content.replace(
    /const formatTimeRelative = \(dateString: string \| undefined \| null\) => \{\n  if \(\!dateString\) return ''\n  const date = new Date\(dateString\)/,
    `const formatTimeRelative = (dateString: string | undefined | null) => {\n  if (!dateString) return ''\n  const dateStr = dateString.endsWith('Z') || dateString.includes('+') ? dateString : \`\${dateString}Z\`\n  const date = new Date(dateStr)`
  );
  content = content.replace(
    /const formatTimeOnly = \(dateString: string\) => \{\n  return new Date\(dateString\)\.toLocaleTimeString\(\[\], \{ hour: '2-digit', minute: '2-digit' \}\)\n\}/,
    `const formatTimeOnly = (dateString: string) => {\n  if (!dateString) return ''\n  const dateStr = dateString.endsWith('Z') || dateString.includes('+') ? dateString : \`\${dateString}Z\`\n  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })\n}`
  );

  fs.writeFileSync(empPath, content);
  
  // Clone to client (with layout change)
  const cliContent = content.replace("layout: 'employee'", "layout: 'client'");
  fs.writeFileSync(cliPath, cliContent);

  console.log("Everything patched perfectly from HEAD.");
}

patch();
