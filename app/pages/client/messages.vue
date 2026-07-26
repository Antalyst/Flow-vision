<template>
  <div class="absolute inset-0 flex flex-col" :class="isDark ? 'bg-onyx-background' : 'bg-white'">
    <!-- Mobile header -->
    <header class="flex shrink-0 items-center border-b px-4 py-3 sm:hidden"
      :class="isDark ? 'border-white/5 bg-onyx-card' : 'border-gray-200 bg-white-surface'">
      <h1 class="text-lg font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">Messages</h1>
    </header>

    <div class="flex min-h-0 flex-1 overflow-hidden">
      <!-- Left sidebar: Inbox List -->
      <aside
        class="flex flex-col border-r transition-all"
        :class="[
          activeIssueId ? 'hidden md:flex md:w-80 lg:w-96' : 'w-full md:w-80 lg:w-96',
          isDark ? 'border-white/5 bg-onyx-sidebar' : 'border-gray-200 bg-gray-50/50'
        ]"
      >
        <div class="shrink-0 p-4">
          <div class="relative">
            
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search conversations..."
              class="w-full rounded-none border py-2.5 !pl-10 pr-4 text-sm outline-none transition focus:border-candy-orange focus:ring-1 focus:ring-candy-orange p-4"
              :class="isDark ? 'border-white/10 bg-onyx-black text-white focus:border-candy-orange' : 'border-gray-200 bg-white'"
            />
          </div>
        </div>

        <div class="flex-1 overflow-y-auto">
          <div v-if="loadingInbox" class="flex flex-col items-center justify-center py-12 text-gray-400">
            <Icon name="ph:spinner-gap" class="mb-2 h-6 w-6 animate-spin text-candy-orange" />
            <p class="text-sm">Loading messages...</p>
          </div>
          <div v-else-if="filteredInbox.length === 0" class="px-6 py-12 text-center text-gray-400">
            <Icon name="ph:chat-teardrop-slash" class="mx-auto mb-3 h-10 w-10 opacity-30" />
            <p class="text-sm">No conversations found.</p>
          </div>
          <div v-else class="flex flex-col gap-1 p-2">
            <button
              type="button"
              v-for="item in filteredInbox"
              :key="item.id"
              class="group flex w-full cursor-pointer items-start gap-3 rounded-none p-3 text-left transition-all border-l-4 border-transparent"
              :class="[
                isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50',
                currentActiveId === item.id 
                  ? (isDark ? 'bg-zinc-800 border-orange-500 shadow-sm' : 'bg-orange-50 border-orange-500 shadow-sm') 
                  : ''
              ]"
              @click.prevent="selectConversation(item)"
            >
              <div class="pointer-events-none flex h-10 w-10 shrink-0 items-center justify-center rounded-none text-candy-orange"
                :class="isDark ? 'bg-candy-orange/20' : 'bg-candy-orange/10'">
                <Icon name="ph:files-fill" class="pointer-events-none h-5 w-5" />
              </div>
              <div class="pointer-events-none min-w-0 flex-1">
                <div class="pointer-events-none flex items-center justify-between">
                  <h3 class="pointer-events-none truncate text-sm font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">
                    {{ item.title }}
                  </h3>
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
          <header class="flex shrink-0 items-center gap-4 border-b px-4 py-3 backdrop-blur-xl"
            :class="isDark ? 'border-white/5 bg-onyx-card/50' : 'border-gray-200 bg-white/70'">
            <button
              class="inline-flex h-8 w-8 items-center justify-center rounded-none sm:hidden"
              :class="isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'"
              @click="chat.activeConversationId = null; localDraftTarget = null"
            >
              <Icon name="ph:arrow-left-bold" class="h-4 w-4" />
            </button>
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-none text-candy-orange"
              :class="isDark ? 'bg-candy-orange/20' : 'bg-candy-orange/10'">
              <Icon name="ph:files-fill" class="h-5 w-5" />
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
              <Icon name="ph:spinner-gap" class="mr-2 h-5 w-5 animate-spin text-candy-orange" />
              Loading history...
            </div>
            <div v-else-if="messages.length === 0" class="flex h-full flex-col items-center justify-center text-gray-400">
              <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-none"
                :class="isDark ? 'bg-white/5' : 'bg-gray-100'">
                <Icon name="ph:chat-circle-dots" class="h-8 w-8" :class="isDark ? 'text-gray-600' : 'text-gray-300'" />
              </div>
              <p class="text-sm">No messages yet. Send a message to start the conversation.</p>
            </div>
            <div v-else class="flex flex-col gap-4">
              <div
                v-for="msg in messages"
                :key="msg.id"
                class="flex w-full"
                :class="isOwnMessage(msg) ? 'justify-end' : 'justify-start'"
              >
                <div
                  class="group relative max-w-[85%] rounded-none px-4 py-2.5 text-sm md:max-w-[70%]"
                  :class="[
                    isOwnMessage(msg)
                      ? 'bg-orange-600 text-white shadow-sm' 
                      : 'bg-zinc-800 text-gray-200 shadow-sm'
                  ]"
                >
                  <p class="whitespace-pre-wrap leading-relaxed">{{ msg.message_text }}</p>
                  <span 
                    class="mt-1 block text-[10px] opacity-60"
                    :class="isOwnMessage(msg) ? 'text-right' : 'text-left'"
                  >
                    {{ formatTimeOnly(msg.created_at) }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Input Area -->
          <div class="shrink-0 border-t p-4"
            :class="isDark ? 'border-white/5 bg-onyx-card' : 'border-gray-200 bg-white'">
            <form class="flex items-end gap-3" @submit.prevent="sendMessage">
              <textarea
                v-model="newMessage"
                rows="1"
                placeholder="Type a message..."
                class="max-h-32 min-h-[44px] flex-1 resize-none rounded-none border px-4 py-3 text-sm outline-none transition focus:border-candy-orange focus:ring-1 focus:ring-candy-orange"
                :class="isDark 
                  ? 'border-white/10 bg-onyx-black text-white focus:bg-onyx-black focus:border-candy-orange' 
                  : 'border-gray-200 bg-gray-50 focus:bg-white focus:border-candy-orange'"
                @keydown.enter.prevent="handleEnter"
                @input="autoResize"
              />
              <button
                type="submit"
                class="flex h-11 w-11 shrink-0 items-center justify-center rounded-none bg-candy-orange text-white shadow-sm shadow-candy-orange/30 transition-all hover:-translate-y-0.5 hover:shadow-candy-orange/40 active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0"
                :disabled="!newMessage.trim() || sending"
              >
                <Icon v-if="sending" name="ph:spinner-gap" class="h-5 w-5 animate-spin" />
                <Icon v-else name="ph:paper-plane-right-fill" class="h-5 w-5" />
              </button>
            </form>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="flex h-full w-full flex-col items-center justify-center p-8 text-center"
          :class="isDark ? 'bg-onyx-background' : 'bg-gray-50/50'">
          <div class="mb-6 flex h-24 w-24 items-center justify-center rounded-none border-4 shadow-sm"
            :class="isDark ? 'border-onyx-background bg-candy-orange/20' : 'border-white bg-candy-orange/10'">
            <Icon name="ph:chats-circle-fill" class="h-10 w-10 text-candy-orange" />
          </div>
          <h2 class="text-xl font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">Your Messages</h2>
          <p class="mt-2 max-w-sm text-sm" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
            Select a conversation from the sidebar to view the message history and reply to your pipeline network.
          </p>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
useSeoMeta({
  title: 'FlowVision | Secure Comms',
  description: 'Communicate with couriers, resolve active document transit issues, and review team conversations securely.'
})
import { ref, computed, onMounted, nextTick, onUnmounted } from 'vue'
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
const newMessage = ref('')
const sending = ref(false)
const messagesContainer = ref<HTMLElement | null>(null)

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
      latest_message: c.latest_message
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
        latest_message: null
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
  const isUserMatch = msg.sender_user_id && msg.sender_user_id === auth.user?.user_id
  const isOfficeMatch = msg.sender_office_id && msg.sender_office_id === auth.user?.office_id
  return isUserMatch || isOfficeMatch
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

const sendMessage = async () => {
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
    sendMessage()
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
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) return 'Just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
  return date.toLocaleDateString()
}

const formatTimeOnly = (dateString: string) => {
  return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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
  border-radius: 0;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(156, 163, 175, 0.5);
}
</style>
