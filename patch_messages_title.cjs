const fs = require('fs');

function applyPatches(file) {
  let content = fs.readFileSync(file, 'utf-8');

  // 1. Replace header title with editable title
  const headerChunk = `<div class="min-w-0 flex-1">
              <h2 class="truncate text-base font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">
                {{ activeConversation?.title || 'New Conversation' }}
              </h2>
            </div>`;
  const replacementHeader = `<div class="min-w-0 flex-1 flex items-center gap-2">
              <template v-if="!isEditingTitle">
                <h2 class="truncate text-base font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">
                  {{ activeConversation?.title || 'New Conversation' }}
                </h2>
                <button
                  v-if="activeConversation?.isExisting"
                  @click="startEditingTitle"
                  class="opacity-50 hover:opacity-100 transition-opacity"
                  title="Rename Conversation"
                >
                  <Icon name="ph:pencil-simple" class="h-4 w-4" />
                </button>
              </template>
              <template v-else>
                <input
                  v-model="editedTitle"
                  @keyup.enter="saveTitle"
                  @keyup.esc="isEditingTitle = false"
                  type="text"
                  class="rounded border px-2 py-1 text-sm bg-transparent outline-none focus:border-candy-orange"
                  :class="isDark ? 'border-white/20 text-white' : 'border-gray-300 text-black'"
                  autoFocus
                />
                <button @click="saveTitle" :disabled="updatingTitle" class="text-green-500 hover:text-green-600 disabled:opacity-50">
                  <Icon v-if="updatingTitle" name="ph:spinner-gap" class="h-4 w-4 animate-spin" />
                  <Icon v-else name="ph:check-bold" class="h-4 w-4" />
                </button>
                <button @click="isEditingTitle = false" class="text-gray-400 hover:text-red-500">
                  <Icon name="ph:x-bold" class="h-4 w-4" />
                </button>
              </template>
            </div>`;
  content = content.replace(headerChunk.replace(/\n/g, '\r\n'), replacementHeader);
  content = content.replace(headerChunk.replace(/\r\n/g, '\n'), replacementHeader);

  // 2. Add Script refs and methods
  const scriptImportsChunk = `const creatingGroup = ref(false)`;
  const replacementScriptImports = `const creatingGroup = ref(false)
const isEditingTitle = ref(false)
const editedTitle = ref('')
const updatingTitle = ref(false)

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
}`;
  content = content.replace(scriptImportsChunk, replacementScriptImports);

  // Watch for active conversation change to close edit mode
  const watcherChunk = `const openCreateGroupModal = async () => {`;
  const watcherReplacement = `watch(activeConversationId, () => {
  isEditingTitle.value = false
})

const openCreateGroupModal = async () => {`;
  content = content.replace(watcherChunk, watcherReplacement);

  const importChunk = `import { ref, computed, onMounted, nextTick, onUnmounted } from 'vue'`;
  const importReplacement = `import { ref, computed, onMounted, nextTick, onUnmounted, watch } from 'vue'`;
  content = content.replace(importChunk, importReplacement);

  fs.writeFileSync(file, content);
  console.log('Patched ' + file);
}

try {
  applyPatches('app/pages/client/messages.vue');
  applyPatches('app/pages/employee/messages.vue');
} catch(e) {
  console.error(e);
}
