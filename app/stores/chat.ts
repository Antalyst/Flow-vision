import { defineStore } from 'pinia'

export interface ConversationParticipant {
  id: string
  type: string
  name: string
}

export interface Conversation {
  id: string
  title: string
  is_group?: boolean
  group_name?: string
  avatar_url?: string
  created_at?: string
  unread_count?: number
  has_unread?: boolean
  participants: ConversationParticipant[]
  latest_message?: {
    text: string
    created_at: string
    sender_id: string
  } | null
}

export interface DirectMessage {
  id: string
  conversation_id: string
  sender_user_id: string | null
  sender_office_id: string | null
  message_text: string
  created_at: string
  read_by: any
}

export const parseUtcDate = (dateString: string | undefined | null) => {
  if (!dateString) return null
  let formatted = dateString.trim()
  if (!formatted.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(formatted)) {
    formatted = formatted.replace(' ', 'T') + 'Z'
  }
  return new Date(formatted)
}

export const useChatStore = defineStore('chat', {
  state: () => ({
    conversations: [] as Conversation[],
    messages: [] as DirectMessage[],
    activeConversationId: null as string | null,
    loadingConversations: false,
    loadingMessages: false,
    subscription: null as any,
  }),
  getters: {
    totalUnreadCount: (state) => {
      return state.conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0)
    }
  },
  actions: {
    async fetchConversations() {
      this.loadingConversations = true
      try {
        const res: any = await $fetch('/api/messages/conversations')
        if (res.success) {
          this.conversations = res.data
          this.sortConversations()
        }
      } catch (err) {
        console.error('Failed to fetch conversations', err)
      } finally {
        this.loadingConversations = false
      }
    },
    async fetchHistory(conversationId: string) {
      this.loadingMessages = true
      this.activeConversationId = conversationId
      try {
        const res: any = await $fetch('/api/messages/history', {
          params: { id: conversationId }
        })
        if (res.success) {
          this.messages = res.data
        }
      } catch (err) {
        console.error('Failed to fetch history', err)
      } finally {
        this.loadingMessages = false
      }
    },
    async sendMessage(text: string, targetUserId?: string, targetOfficeId?: string) {
      try {
        const payload: any = { text }
        if (this.activeConversationId) {
          payload.conversationId = this.activeConversationId
        } else {
          if (targetUserId) payload.targetUserId = targetUserId
          if (targetOfficeId) payload.targetOfficeId = targetOfficeId
        }

        const res: any = await $fetch('/api/messages/send', {
          method: 'POST',
          body: payload
        })

        if (res.success) {
          const msg = res.data
          // 1. Push to local active messages if matched
          if (this.activeConversationId === msg.conversation_id) {
            const exists = this.messages.find(m => m.id === msg.id)
            if (!exists) {
              this.messages.push(msg)
            }
          }

          // 2. Update conversation preview instantly and sort
          const convo = this.conversations.find(c => c.id === msg.conversation_id)
          if (convo) {
            convo.latest_message = {
              text: msg.message_text,
              created_at: msg.created_at,
              sender_id: msg.sender_user_id || msg.sender_office_id || ''
            }
            this.sortConversations()
          } else {
            // New conversation draft just got sent successfully, refresh to load it
            this.activeConversationId = res.conversationId
            await this.fetchConversations()
          }
        }
        return res
      } catch (err) {
        console.error('Failed to send message', err)
        throw err
      }
    },
    async createGroup(groupName: string, participantUserIds: string[], participantOfficeIds: string[] = []) {
      try {
        const res: any = await $fetch('/api/messages/group/create', {
          method: 'POST',
          body: { groupName, participantUserIds, participantOfficeIds }
        })
        if (res.success) {
          await this.fetchConversations()
          this.setActiveConversation(res.conversationId)
        }
        return res
      } catch (err) {
        console.error('Failed to create group', err)
        throw err
      }
    },
    async markConversationAsRead(conversationId: string) {
      try {
        const res: any = await $fetch('/api/messages/read', {
          method: 'POST',
          body: { conversationId }
        })
        if (res.success) {
          const convo = this.conversations.find(c => c.id === conversationId)
          if (convo) {
            convo.unread_count = 0
            convo.has_unread = false
          }
        }
      } catch (err) {
        console.error('Failed to mark conversation as read', err)
      }
    },
    setActiveConversation(id: string | null) {
      this.activeConversationId = id
      if (id) {
        this.fetchHistory(id)
        this.markConversationAsRead(id)
      } else {
        this.messages = []
      }
    },
    subscribeToMessages() {
      if (this.subscription) return
      const client = useSupabaseClient()
      this.subscription = client.channel('public:direct_messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, payload => {
          this.receiveMessage(payload.new as DirectMessage)
        })
        .subscribe()
    },
    unsubscribe() {
      if (this.subscription) {
        const client = useSupabaseClient()
        client.removeChannel(this.subscription)
        this.subscription = null
      }
    },
    receiveMessage(message: DirectMessage) {
      // 1. Check if the message belongs to a conversation we are part of
      const convo = this.conversations.find(c => c.id === message.conversation_id)
      if (!convo) {
        // We received a message for a conversation not in our list (new chat started by someone else)
        this.fetchConversations()
        return
      }
      
      // 2. Update active messages array
      if (this.activeConversationId === message.conversation_id) {
        const exists = this.messages.find(m => m.id === message.id)
        if (!exists) {
          this.messages.push(message)
        }
      }

      // 3. Update sidebar preview
      convo.latest_message = {
        text: message.message_text,
        created_at: message.created_at,
        sender_id: message.sender_user_id || message.sender_office_id || ''
      }

      // Update unread status
      if (this.activeConversationId === message.conversation_id) {
        this.markConversationAsRead(message.conversation_id)
      } else {
        convo.unread_count = (convo.unread_count || 0) + 1
        convo.has_unread = true
      }
      
      // 4. Sort conversations
      this.sortConversations()
    },
    sortConversations() {
      const sorted = [...this.conversations].sort((a, b) => {
        const dateA = a.latest_message ? parseUtcDate(a.latest_message.created_at) : (a.created_at ? parseUtcDate(a.created_at) : null)
        const dateB = b.latest_message ? parseUtcDate(b.latest_message.created_at) : (b.created_at ? parseUtcDate(b.created_at) : null)
        const timeA = dateA ? dateA.getTime() : 0
        const timeB = dateB ? dateB.getTime() : 0
        return timeB - timeA
      })
      this.conversations = sorted
    }
  }
})
