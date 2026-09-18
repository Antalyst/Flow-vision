<template>
  <div class="absolute inset-0 flex flex-col" :class="isDark ? 'bg-onyx-background' : 'bg-white'">
    <!-- Mobile header -->
    <header class="flex shrink-0 items-center border-b px-4 py-3 sm:hidden"
      :class="isDark ? 'border-onyx-border bg-onyx-card' : 'border-gray-200 bg-white'">
      <h1 class="text-lg font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">Messages</h1>
    </header>

    <div class="flex min-h-0 flex-1 overflow-hidden">
      <!-- Left sidebar: Inbox List -->
      <aside
        class="flex flex-col border-r transition-all"
        :class="[
          activeIssueId ? 'hidden md:flex md:w-80 lg:w-96' : 'w-full md:w-80 lg:w-96',
          isDark ? 'border-onyx-border bg-onyx-sidebar' : 'border-gray-200 bg-gray-50/50'
        ]"
      >
        <div class="shrink-0 p-4">
          <div class="relative">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search conversations..."
              class="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors"
              :class="isDark
                ? 'border-onyx-border bg-onyx-black text-white focus:border-candy-orange'
                : 'border-gray-200 bg-white text-gray-900 focus:border-candy-orange'"
            />
          </div>
        </div>

        <div class="flex-1 overflow-y-auto">
          <div v-if="loadingInbox" class="flex flex-col items-center justify-center py-12 text-gray-400">
            <Icon name="ph:spinner-gap-light" class="mb-2 h-6 w-6 animate-spin text-candy-orange" />
            <p class="text-sm">Loading messages...</p>
          </div>
          <div v-else-if="filteredInbox.length === 0" class="px-6 py-12 text-center text-gray-400">
            <Icon name="ph:chat-teardrop-slash-light" class="mx-auto mb-3 h-10 w-10 opacity-30" />
            <p class="text-sm">No conversations found.</p>
          </div>
          <div v-else class="flex flex-col gap-1 p-2">
            <button
              type="button"
              v-for="item in filteredInbox"
              :key="item.id"
              class="group flex w-full cursor-pointer items-start gap-3 rounded-xl p-3 text-left transition-colors border-l-4 border-transparent"
              :class="[
                isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-50/80',
                currentActiveId === item.id
                  ? (isDark ? 'bg-white/[0.05] border-candy-orange' : 'bg-orange-50/50 border-candy-orange')
                  : ''
              ]"
              @click.prevent="selectConversation(item)"
            >
              <div class="pointer-events-none flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-candy-orange/20 text-candy-orange"
                :class="isDark ? 'bg-candy-orange/10' : 'bg-candy-orange/5'">
                <Icon name="ph:files-light" class="pointer-events-none h-5 w-5" />
              </div>
              <div class="pointer-events-none min-w-0 flex-1">
                <div class="pointer-events-none flex items-center justify-between">
                  <div class="flex items-center gap-2">

                    <h3 class="pointer-events-none truncate text-sm font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">

                      {{ item.title }}

                    </h3>

                    <div v-if="isUnread(item)" class="h-2 w-2 rounded-full bg-candy-orange shrink-0"></div>

                  </div>
                  <span class="pointer-events-none shrink-0 text-xs text-gray-400">
                    {{ formatTimeRelative(item.latest_message?.created_at) }}
                  </span>
                </div>
                <p class="pointer-events-none mt-1 truncate text-xs" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
                  <span v-if="item.latest_message" class="pointer-events-none" :class="item.latest_message.sender_id === auth.user?.user_id ? 'font-medium' : ''">
                    {{ item.latest_message.sender_id === auth.user?.user_id ? 'You: ' : '' }}{{ item.latest_message.text }}
                  </span>
                  <span v-else class="pointer-events-none italic">No messages yet</span>
                </p>
              </div>
            </button>
          </div>
        </div>
      </aside>

      <!-- Right sidebar: Chat Area -->
      <main
        class="flex min-w-0 flex-1 flex-col transition-all"
        :class="[
          !currentActiveId ? 'hidden md:flex' : 'flex',
          isDark ? 'bg-onyx-background' : 'bg-white'
        ]"
      >
        <div v-if="currentActiveId" class="flex flex-1 flex-col min-h-0">
          <!-- Chat Header -->
          <header class="flex shrink-0 items-center gap-4 border-b px-4 py-3"
            :class="isDark ? 'border-onyx-border bg-onyx-card' : 'border-gray-200 bg-white'">
            <button
              class="inline-flex h-8 w-8 items-center justify-center rounded-lg sm:hidden"
              :class="isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'"
              @click="chat.activeConversationId = null; localDraftTarget = null"
            >
              <Icon name="ph:arrow-left-light" class="h-4 w-4" />
            </button>
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-candy-orange/20 text-candy-orange"
              :class="isDark ? 'bg-candy-orange/10' : 'bg-candy-orange/5'">
              <Icon name="ph:files-light" class="h-5 w-5" />
            </div>
            <div class="min-w-0 flex-1 flex flex-col justify-center">
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
                    class="border border-candy-orange px-2 py-1 rounded-lg text-sm bg-transparent outline-none"
                    :class="isDark ? 'text-white' : 'text-gray-900'"
                    autofocus
                  />
                  <button @click="saveTitle" :disabled="updatingTitle" class="text-candy-orange hover:text-candy-hover ml-1">
                    <Icon v-if="updatingTitle" name="ph:spinner-gap" class="h-4 w-4 animate-spin" />
                    <Icon v-else name="ph:check-bold" class="h-4 w-4" />
                  </button>
                  <button @click="isEditingTitle = false" class="text-gray-400 hover:text-danger ml-1">
                    <Icon name="ph:x-bold" class="h-4 w-4" />
                  </button>
                </template>
              </div>
              
              <!-- Participants subheader -->
              <p v-if="activeConversation?.participants?.length" class="truncate text-xs mt-0.5" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
                Members: {{ activeConversation.participants.map(p => p.name).join(', ') }}
              </p>
            </div>
          </header>

          <!-- Messages -->
          <div ref="messagesContainer" class="flex-1 overflow-y-auto p-4 md:p-6">
            <div v-if="loadingMessages" class="flex h-full items-center justify-center text-gray-400">
              <Icon name="ph:spinner-gap-light" class="mr-2 h-5 w-5 animate-spin text-candy-orange" />
              Loading history...
            </div>
            <div v-else-if="messages.length === 0" class="flex h-full flex-col items-center justify-center text-gray-400">
              <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full border"
                :class="isDark ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-100'">
                <Icon name="ph:chats-light" class="h-8 w-8" :class="isDark ? 'text-gray-600' : 'text-gray-400'" />
              </div>
              <p class="text-sm">No messages yet. Send a message to start the conversation.</p>
            </div>
            <div v-else class="flex flex-col gap-4">
              <div
                v-for="msg in messages"
                :key="msg.id"
                :class="['flex w-full', isOwnMessage(msg) ? 'justify-end' : 'justify-start']"
              >
                <div
                  class="group relative max-w-[85%] rounded-2xl border px-4 py-3 text-sm md:max-w-[70%]"
                  :class="[
                    isOwnMessage(msg)
                      ? 'border-candy-orange/30 bg-candy-orange/10 text-gray-900 dark:text-gray-100 text-right' 
                      : 'border-gray-200 dark:border-onyx-border bg-gray-50 dark:bg-onyx-card text-gray-800 dark:text-gray-200 text-left'
                  ]"
                >
                  <p v-if="!isOwnMessage(msg)" class="text-[13px] font-bold mb-0.5 opacity-70">{{ getSenderName(msg) }}</p>

                  <p class="whitespace-pre-wrap leading-relaxed">{{ msg.message_text }}</p>
                  <span 
                    class="mt-1 block text-[13px] opacity-60"
                  >
                    {{ formatTimeOnly(msg.created_at) }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Input Area -->
          <div class="shrink-0 border-t p-4"
            :class="isDark ? 'border-onyx-border bg-onyx-card' : 'border-gray-200 bg-white'">
            <form class="flex items-end gap-3" @submit.prevent="handleSendMessage">
              <textarea
                v-model="newMessage"
                rows="1"
                placeholder="Type a message..."
                class="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border px-4 py-3 text-sm outline-none transition-colors"
                :class="isDark
                  ? 'border-onyx-border bg-onyx-black text-white focus:border-candy-orange'
                  : 'border-gray-200 bg-white text-gray-900 focus:border-candy-orange'"
                @keydown.enter.prevent="handleSendMessage"
                @input="autoResize"
              />
              <button
                type="submit"
                class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-candy-orange text-white transition-colors hover:bg-candy-hover disabled:opacity-50"
                :disabled="!newMessage.trim() || sending"
              >
                <Icon v-if="sending" name="ph:spinner-gap-light" class="h-5 w-5 animate-spin" />
                <Icon v-else name="ph:paper-plane-right-light" class="h-5 w-5" />
              </button>
            </form>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="flex h-full w-full flex-col items-center justify-center p-8 text-center"
          :class="isDark ? 'bg-onyx-background' : 'bg-gray-50/50'">
          <div class="mb-6 flex h-24 w-24 items-center justify-center rounded-full border"
            :class="isDark ? 'border-candy-orange/20 bg-candy-orange/10' : 'border-candy-orange/30 bg-candy-orange/5'">
            <Icon name="ph:chats-light" class="h-10 w-10 text-candy-orange" />
          </div>
          <h2 class="text-xl font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">Your Messages</h2>
          <p class="mt-2 max-w-sm text-sm" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
            Select a conversation to view your messages and reply.
          </p>
        </div>
      </main>
    </div>

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
            class="px-4 py-2 text-sm font-medium rounded-lg bg-candy-orange text-white hover:bg-candy-hover transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icon v-if="creatingGroup" name="ph:spinner-gap" class="animate-spin h-4 w-4" />
            Create
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, onUnmounted, watch } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useChatStore } from '~/stores/chat'
import { useOfficeStore } from '~/stores/office'
import { useTheme } from '~/composables/useTheme'

definePageMeta({
  layout: 'client'
})

const auth = useAuthStore()
const chat = useChatStore()
const officeStore = useOfficeStore()
const { isDark } = useTheme()

// State
const searchQuery = ref('')
const activeIssueId = ref(false) // Required ref for template to compile, was unused in original logic but referenced in template


const newMessage = ref('')
const sending = ref(false)
const messagesContainer = ref<HTMLElement | null>(null)

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


// Computed
const mergedList = computed(() => {
  // Combine offices and existing conversations.
  // Each office is a potential conversation target.
  const list: any[] = []
  const officeSet = new Set()

  // First, map existing conversations
  for (const c of chat.conversations) {
    if (c.participants && c.participants.length > 0) {
      const p = c.participants[0]
      if (p.type === 'office') {
        officeSet.add(String(p.id))
      }
    }
    list.push({
      id: c.id,
      isExisting: true,
      targetOfficeId: null,
      title: c.title,
      latest_message: c.latest_message,
      participants: c.participants
    })
  }

  // Then, append offices that do NOT have an existing conversation yet
  for (const o of officeStore.offices) {
    if (!officeSet.has(String(o.id))) {
      list.push({
        id: `office-${o.id}`,
        isExisting: false,
        targetOfficeId: String(o.id),
        title: o.name,
        latest_message: null,
        participants: [o]
      })
    }
  }
  return list
})

const filteredInbox = computed(() => {
  if (!searchQuery.value) return mergedList.value
  const query = searchQuery.value.toLowerCase()
  return mergedList.value.filter((c) => 
    c.title?.toLowerCase().includes(query)
  )
})

const currentActiveId = computed(() => {
  if (chat.activeConversationId) return chat.activeConversationId
  if (localDraftTarget.value) return `office-${localDraftTarget.value}`
  return null
})

// To support new chats seamlessly in the UI, when the user clicks an office,
// we set it as active. If it doesn't exist, we track it locally until a message is sent.
const localDraftTarget = ref<string | null>(null)

const activeConversation = computed(() => {
  if (chat.activeConversationId) {
    return mergedList.value.find(c => c.id === chat.activeConversationId)
  }
  if (localDraftTarget.value) {
    return mergedList.value.find(c => c.targetOfficeId === localDraftTarget.value)
  }
  return null
})

const loadingInbox = computed(() => chat.loadingConversations || officeStore.loading)
const loadingMessages = computed(() => chat.loadingMessages)
const messages = computed(() => chat.messages)

// Actions
const isUnread = (item: any) => {
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

const isOwnMessage = (msg: any) => {
  if (msg.sender_user_id && msg.sender_user_id === auth.user?.user_id) return true
  
  if (msg.sender_office_id) {
    if (msg.sender_office_id === auth.user?.office_id) return true
    
    // Fallback: Check if the user is the assigned_user (owner) of this office
    const office = officeStore.offices.find(o => o.id === msg.sender_office_id)
    if (office && office.assigned_user === auth.user?.user_id) return true
  }
  return false
}

onMounted(async () => {
  await officeStore.fetchOffices()
  await chat.fetchConversations()
  chat.subscribeToMessages()
})

onUnmounted(() => {
  chat.unsubscribe()
})

const selectConversation = async (item: any) => {
  console.log("Clicked sidebar item:", item)
  if (item.isExisting) {
    localDraftTarget.value = null
    chat.activeConversationId = item.id
    await chat.fetchHistory(item.id)
    console.log("Active Conversation ID:", currentActiveId.value, "Fetched Messages Array:", chat.messages)
    await scrollToBottom()
  } else {
    // New conversation draft
    chat.activeConversationId = null
    chat.messages = []
    localDraftTarget.value = item.targetOfficeId
  }
}

const handleSendMessage = async () => {
  const text = newMessage.value.trim()
  if (!text || sending.value) return
  if (!chat.activeConversationId && !localDraftTarget.value) return

  sending.value = true
  try {
    await chat.sendMessage(text, undefined, localDraftTarget.value || undefined)
    newMessage.value = ''
    localDraftTarget.value = null
    resetTextarea()
    await scrollToBottom()
  } catch (err) {
    console.error('Failed to send message:', err)
  } finally {
    sending.value = false
  }
}

const handleEnter = (e: KeyboardEvent) => {
  if (!e.shiftKey) {
    handleSendMessage()
  }
}

const autoResize = (e: Event) => {
  const target = e.target as HTMLTextAreaElement
  target.style.height = 'auto'
  target.style.height = `${target.scrollHeight}px`
}

const resetTextarea = () => {
  const textarea = document.querySelector('textarea')
  if (textarea) {
    textarea.style.height = 'auto'
  }
}

const scrollToBottom = async () => {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// Formatting
const formatTimeRelative = (dateString: string | undefined | null) => {
  if (!dateString) return ''
  const dateStr = dateString.endsWith('Z') || dateString.includes('+') ? dateString : `${dateString}Z`
  const date = new Date(dateStr)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) return 'Just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
  return date.toLocaleDateString()
}

const formatTimeOnly = (dateString: string) => {
  if (!dateString) return ''
  const dateStr = dateString.endsWith('Z') || dateString.includes('+') ? dateString : `${dateString}Z`
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
/* Custom scrollbar for webkit */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: rgba(156, 163, 175, 0.3);
  border-radius: 10px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(156, 163, 175, 0.5);
}
</style>
