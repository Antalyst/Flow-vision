const fs = require('fs');
const path = require('path');

const empPath = path.join(__dirname, 'app/pages/employee/messages.vue');
const cliPath = path.join(__dirname, 'app/pages/client/messages.vue');

function patchFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');

  // 1. Replace the Chat Header area to include the edit title UI and members list
  const headerRegex = /<div class="min-w-0 flex-1">\s*<h2 class="truncate font-bold" :class="isDark \? 'text-white' : 'text-gray-900'">\s*\{\{\s*activeConversation\?\.title \|\| 'Unknown Group'\s*\}\}\s*<\/h2>\s*<p class="truncate text-xs" :class="isDark \? 'text-gray-400' : 'text-gray-500'">\s*(.*?)\s*<\/p>\s*<\/div>/;
  
  const newHeader = `<div class="min-w-0 flex-1 flex flex-col justify-center">
              <div class="flex items-center gap-2">
                <template v-if="!isEditingTitle">
                  <h2 class="truncate font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">
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
            </div>`;

  if (content.match(headerRegex)) {
    content = content.replace(headerRegex, newHeader);
  }

  // 2. Fix getSenderName function
  const getSenderNameRegex = /const getSenderName = \(msg: any\) => \{[\s\S]*?return p \? p\.name : 'Unknown'\n\}/;
  const newGetSenderName = `const getSenderName = (msg: any) => {
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
}`;

  if (content.match(getSenderNameRegex)) {
    content = content.replace(getSenderNameRegex, newGetSenderName);
  }

  fs.writeFileSync(filePath, content);
}

patchFile(empPath);
patchFile(cliPath);
console.log("Header and Unknown user patched.");
