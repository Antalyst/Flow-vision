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
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-base font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">Inbox</h2>
            <button
              @click="showGroupModal = true"
              class="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
              :class="isDark ? 'bg-onyx-card hover:bg-white/10 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'"
              title="Create Group"
            >
              <Icon name="ph:users-three-light" class="h-4 w-4" />
            </button>
          </div>
          <div class="relative">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search conversations..."
              class="w-full rounded-none border px-4 py-2.5 text-sm outline-none transition-colors"
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
              class="group flex w-full cursor-pointer items-start gap-3 rounded-none p-3 text-left transition-colors border-l-4 border-transparent"
              :class="[
                isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-50/80',
                currentActiveId === item.id 
                  ? (isDark ? 'bg-white/[0.05] border-candy-orange' : 'bg-orange-50/50 border-candy-orange') 
                  : ''
              ]"
              @click.prevent="selectConversation(item)"
            >
              <div class="pointer-events-none flex h-10 w-10 shrink-0 items-center justify-center rounded-none border border-candy-orange/20 text-candy-orange"
                :class="isDark ? 'bg-candy-orange/10' : 'bg-candy-orange/5'">
                <Icon :name="item.is_group ? 'ph:users-three-light' : 'ph:files-light'" class="pointer-events-none h-5 w-5" />
              </div>
              <div class="pointer-events-none min-w-0 flex-1">
                <div class="pointer-events-none flex items-center justify-between">
                  <h3 class="pointer-events-none truncate text-sm" :class="[
                    item.unread_count > 0 
                      ? (isDark ? 'text-white font-extrabold' : 'text-gray-900 font-extrabold')
                      : (isDark ? 'text-white/80 font-bold' : 'text-gray-900/80 font-bold')
                  ]">
                    {{ item.title }}
                  </h3>
                  <span class="pointer-events-none shrink-0 text-xs text-gray-400 flex items-center gap-1.5">
                    {{ formatTimeRelative(item.latest_message?.created_at || item.created_at) }}
                    <span v-if="item.unread_count > 0" class="h-2.5 w-2.5 rounded-full bg-red-500 inline-block shrink-0"></span>
                  </span>
                </div>
                <p class="pointer-events-none mt-1 truncate text-xs" :class="[
                  item.unread_count > 0
                    ? (isDark ? 'text-white font-bold' : 'text-gray-900 font-bold')
                    : (isDark ? 'text-gray-400' : 'text-gray-500')
                ]">
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
              class="inline-flex h-8 w-8 items-center justify-center rounded-none sm:hidden"
              :class="isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'"
              @click="chat.activeConversationId = null; localDraftTarget = null"
            >
              <Icon name="ph:arrow-left-light" class="h-4 w-4" />
            </button>
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-none border border-candy-orange/20 text-candy-orange"
              :class="isDark ? 'bg-candy-orange/10' : 'bg-candy-orange/5'">
              <Icon :name="activeConversation?.is_group ? 'ph:users-three-light' : 'ph:files-light'" class="h-5 w-5" />
            </div>
            <div class="min-w-0 flex-1">
              <h2 class="truncate text-base font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">
                {{ activeConversation?.title || 'New Conversation' }}
              </h2>
            </div>
          </header>

          <!-- Messages -->
          <div ref="messagesContainer" class="flex-1 overflow-y-auto p-4 md:p-6">
            <div v-if="loadingMessages" class="flex h-full items-center justify-center text-gray-400">
              <Icon name="ph:spinner-gap-light" class="mr-2 h-5 w-5 animate-spin text-candy-orange" />
              Loading history...
            </div>
            <div v-else-if="messages.length === 0" class="flex h-full flex-col items-center justify-center text-gray-400">
              <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-none border"
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
                  class="group relative max-w-[85%] rounded-none border px-4 py-3 text-sm md:max-w-[70%]"
                  :class="[
                    isOwnMessage(msg)
                      ? 'border-candy-orange/30 bg-candy-orange/10 text-gray-900 dark:text-gray-100 text-right' 
                      : 'border-gray-200 dark:border-onyx-border bg-gray-50 dark:bg-onyx-card text-gray-800 dark:text-gray-200 text-left'
                  ]"
                >
                  <p class="whitespace-pre-wrap leading-relaxed">{{ msg.message_text }}</p>
                  <span 
                    class="mt-1 block text-[10px] opacity-60"
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
                class="max-h-32 min-h-[44px] flex-1 resize-none rounded-none border px-4 py-3 text-sm outline-none transition-colors"
                :class="isDark 
                  ? 'border-onyx-border bg-onyx-black text-white focus:border-candy-orange' 
                  : 'border-gray-200 bg-white text-gray-900 focus:border-candy-orange'"
                @keydown.enter.prevent="handleSendMessage"
                @input="autoResize"
              />
              <button
                type="submit"
                class="flex h-11 w-11 shrink-0 items-center justify-center rounded-none bg-candy-orange text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
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
          <div class="mb-6 flex h-24 w-24 items-center justify-center rounded-none border"
            :class="isDark ? 'border-candy-orange/20 bg-candy-orange/10' : 'border-candy-orange/30 bg-candy-orange/5'">
            <Icon name="ph:chats-light" class="h-10 w-10 text-candy-orange" />
          </div>
          <h2 class="text-xl font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">Your Messages</h2>
          <p class="mt-2 max-w-sm text-sm" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
            Select a conversation from the sidebar to view the message history and reply to your pipeline network.
          </p>
        </div>
      </main>
    </div>

    <!-- Create Group Modal -->
    <div v-if="showGroupModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div class="w-full max-w-md rounded-none shadow-xl border" :class="isDark ? 'bg-onyx-card border-white/5' : 'bg-white border-gray-200'">
        <div class="flex items-center justify-between border-b p-4" :class="isDark ? 'border-white/5' : 'border-gray-200'">
          <h2 class="text-lg font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">Create Group</h2>
          <button @click="showGroupModal = false" class="text-gray-400 hover:text-gray-500">
            <Icon name="ph:x-light" class="h-5 w-5" />
          </button>
        </div>
        <div class="p-4">
          <div class="mb-4">
            <label class="mb-1 block text-sm font-medium" :class="isDark ? 'text-gray-300' : 'text-gray-700'">Group Name</label>
            <input v-model="newGroupName" type="text" class="w-full rounded-none border p-2 text-sm outline-none transition focus:border-candy-orange focus:ring-1 focus:ring-candy-orange" :class="isDark ? 'border-white/10 bg-onyx-black text-white' : 'border-gray-200 bg-white'" placeholder="Enter group name" />
          </div>
          <div class="mb-4">
            <label class="mb-1 block text-sm font-medium" :class="isDark ? 'text-gray-300' : 'text-gray-700'">Select Members</label>
            <div class="max-h-48 overflow-y-auto rounded-none border" :class="isDark ? 'border-white/10' : 'border-gray-200'">
              <div v-for="office in officeStore.offices" :key="office.id" class="flex items-center gap-3 p-2 border-b last:border-b-0" :class="isDark ? 'border-white/5 hover:bg-white/5' : 'border-gray-100 hover:bg-gray-50'">
                <input type="checkbox" :id="'cb-' + office.id" :value="String(office.id)" v-model="selectedGroupOffices" class="accent-candy-orange" />
                <label :for="'cb-' + office.id" class="flex-1 cursor-pointer text-sm" :class="isDark ? 'text-gray-200' : 'text-gray-700'">{{ office.name }}</label>
              </div>
            </div>
          </div>
          <div class="flex justify-end gap-3 pt-2">
            <button @click="showGroupModal = false" class="px-4 py-2 text-sm font-medium" :class="isDark ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'">Cancel</button>
            <button @click="handleCreateGroup" :disabled="!newGroupName || selectedGroupOffices.length === 0 || creatingGroup" class="flex items-center justify-center gap-2 rounded-none bg-candy-orange px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-orange-600 disabled:opacity-50">
              <Icon v-if="creatingGroup" name="ph:spinner-gap-light" class="h-4 w-4 animate-spin" />
              Create
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, onUnmounted } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useChatStore, parseUtcDate } from '~/stores/chat'
import { useOfficeStore } from '~/stores/office'
import { useTheme } from '~/composables/useTheme'

definePageMeta({
  layout: 'employee'
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

const showGroupModal = ref(false)
const newGroupName = ref('')
const selectedGroupOffices = ref<string[]>([])
const creatingGroup = ref(false)

const handleCreateGroup = async () => {
  if (!newGroupName.value || selectedGroupOffices.value.length === 0) return
  creatingGroup.value = true
  try {
    await chat.createGroup(newGroupName.value, [], selectedGroupOffices.value)
    showGroupModal.value = false
    newGroupName.value = ''
    selectedGroupOffices.value = []
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
      targetOfficeId: null, // it's already an existing convo
      title: c.title,
      is_group: c.is_group,
      latest_message: c.latest_message,
      created_at: c.created_at,
      unread_count: c.unread_count,
      has_unread: c.has_unread
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
        created_at: null
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
    chat.setActiveConversation(item.id)
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
  const date = parseUtcDate(dateString)
  if (!date) return ''
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 0) return 'Just now'
  if (diffInSeconds < 60) return 'Just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
  return date.toLocaleDateString()
}

const formatTimeOnly = (dateString: string) => {
  const date = parseUtcDate(dateString)
  if (!date) return ''
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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
