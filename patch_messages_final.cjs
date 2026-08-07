const fs = require('fs');

function applyPatches(file) {
  let content = fs.readFileSync(file, 'utf-8');

  // 1. Add Create Group Icon above search bar
  const searchChunk = `<div class="shrink-0 p-4">
          <div class="relative">
            
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search conversations..."
              class="w-full rounded-none border py-2.5 !pl-10 pr-4 text-sm outline-none transition focus:border-candy-orange focus:ring-1 focus:ring-candy-orange p-4"
              :class="isDark ? 'border-white/10 bg-onyx-black text-white focus:border-candy-orange' : 'border-gray-200 bg-white'"
            />
          </div>
        </div>`;
  const searchReplacement = `<div class="shrink-0 p-4">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">Inbox</h2>
            <button
              @click="openCreateGroupModal"
              class="flex items-center justify-center h-8 w-8 rounded-full transition-colors"
              :class="isDark ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'"
              title="Create Group Chat"
            >
              <Icon name="ph:users-three-fill" class="h-4 w-4" />
            </button>
          </div>
          <div class="relative">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search conversations..."
              class="w-full rounded-none border py-2.5 !pl-10 pr-4 text-sm outline-none transition focus:border-candy-orange focus:ring-1 focus:ring-candy-orange p-4"
              :class="isDark ? 'border-white/10 bg-onyx-black text-white focus:border-candy-orange' : 'border-gray-200 bg-white'"
            />
          </div>
        </div>`;
  // Using exact replace but normalizing newlines to avoid mismatch
  content = content.replace(searchChunk.replace(/\r\n/g, '\n'), searchReplacement);
  content = content.replace(searchChunk.replace(/\n/g, '\r\n'), searchReplacement);

  // 2. Add Modal to bottom of template
  const modalHtml = `
    <!-- Create Group Modal -->
    <div v-if="showCreateGroupModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div class="w-full max-w-md rounded-xl shadow-xl overflow-hidden flex flex-col" :class="isDark ? 'bg-[#18181b]' : 'bg-white'">
        <div class="p-4 border-b flex items-center justify-between" :class="isDark ? 'border-white/5' : 'border-gray-200'">
          <h3 class="font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">Create Group</h3>
          <button @click="showCreateGroupModal = false" class="text-gray-400 hover:text-gray-500">
            <Icon name="ph:x-bold" class="h-5 w-5" />
          </button>
        </div>
        <div class="p-4 border-b" :class="isDark ? 'border-white/5' : 'border-gray-200'">
          <label class="block text-xs font-medium mb-1" :class="isDark ? 'text-gray-300' : 'text-gray-700'">Group Name</label>
          <input
            v-model="newGroupName"
            type="text"
            placeholder="Enter group name"
            class="w-full rounded border px-3 py-2 text-sm outline-none transition focus:border-candy-orange focus:ring-1 focus:ring-candy-orange"
            :class="isDark ? 'border-white/10 bg-[#09090b] text-white focus:border-candy-orange' : 'border-gray-200 bg-white'"
          />
        </div>
        <div class="p-4 flex-1 overflow-y-auto max-h-[50vh]">
          <h4 class="text-xs font-medium mb-3" :class="isDark ? 'text-gray-300' : 'text-gray-700'">Select Members</h4>
          <div v-if="chat.loadingContacts" class="py-8 text-center text-gray-400">
            <Icon name="ph:spinner-gap" class="mx-auto h-6 w-6 animate-spin text-candy-orange mb-2" />
            <p class="text-sm">Loading contacts...</p>
          </div>
          <div v-else class="space-y-2">
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
            <div v-if="chat.contacts.length === 0" class="py-8 text-center text-gray-400">
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
            :disabled="selectedContacts.length === 0 || creatingGroup"
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
  content = content.replace('  </div>\n</template>', modalHtml);
  content = content.replace('  </div>\r\n</template>', modalHtml);

  // 3. Add Script state and methods
  const scriptImportsChunk = `const messagesContainer = ref<HTMLElement | null>(null)`;
  const replacementScriptImports = `const messagesContainer = ref<HTMLElement | null>(null)
const showCreateGroupModal = ref(false)
const selectedContacts = ref<any[]>([])
const creatingGroup = ref(false)
const newGroupName = ref('')

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
    localDraftTarget.value = null // clear any draft
    await scrollToBottom()
  } catch (err) {
    console.error(err)
  } finally {
    creatingGroup.value = false
  }
}`;
  content = content.replace(scriptImportsChunk, replacementScriptImports);

  // 4. Fix formatting time
  const oldTimeRel = `const formatTimeRelative = (dateString: string | undefined | null) => {
  if (!dateString) return ''
  const date = new Date(dateString)`;
  const newTimeRel = `const formatTimeRelative = (dateString: string | undefined | null) => {
  if (!dateString) return ''
  const dateStr = dateString.endsWith('Z') || dateString.includes('+') ? dateString : \`\${dateString}Z\`
  const date = new Date(dateStr)`;
  content = content.replace(oldTimeRel.replace(/\n/g, '\r\n'), newTimeRel);
  content = content.replace(oldTimeRel.replace(/\r\n/g, '\n'), newTimeRel);

  const oldTimeOnly = `const formatTimeOnly = (dateString: string) => {
  return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}`;
  const newTimeOnly = `const formatTimeOnly = (dateString: string) => {
  if (!dateString) return ''
  const dateStr = dateString.endsWith('Z') || dateString.includes('+') ? dateString : \`\${dateString}Z\`
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}`;
  content = content.replace(oldTimeOnly.replace(/\n/g, '\r\n'), newTimeOnly);
  content = content.replace(oldTimeOnly.replace(/\r\n/g, '\n'), newTimeOnly);

  fs.writeFileSync(file, content);
  console.log('Patched ' + file);
}

patchApplyWrapper();
function patchApplyWrapper() {
  try {
    applyPatches('app/pages/client/messages.vue');
    applyPatches('app/pages/employee/messages.vue');
  } catch(e) {
    console.error(e);
  }
}
