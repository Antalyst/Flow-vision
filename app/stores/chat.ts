import { defineStore } from 'pinia'

export interface ConversationParticipant {
  id: string
  type: string
  name: string
}

export interface Conversation {
  id: string
  title: string
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

export const useChatStore = defineStore('chat', {
  state: () => ({
    conversations: [] as Conversation[],
    messages: [] as DirectMessage[],
    contacts: [] as ConversationParticipant[],
    activeConversationId: null as string | null,
    loadingConversations: false,
    loadingMessages: false,
    loadingContacts: false,
    subscription: null as any,
  }),
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
          this.messages.push(res.data)
          if (!this.activeConversationId) {
            this.activeConversationId = res.conversationId
            await this.fetchConversations() // refresh sidebar
          }
        }
        return res
      } catch (err) {
        console.error('Failed to send message', err)
        throw err
      }
    },
    async fetchContacts() {
      this.loadingContacts = true
      try {
        const res: any = await $fetch('/api/messages/contacts')
        if (res.success) {
          this.contacts = res.data
        }
      } catch (err) {
        console.error('Failed to fetch contacts', err)
      } finally {
        this.loadingContacts = false
      }
    },
    async createGroup(participantIds: string[], participantOffices: string[], title?: string) {
      try {
        const res: any = await $fetch('/api/messages/group', {
          method: 'POST',
          body: { participantIds, participantOffices, title }
        })
        if (res.success) {
          await this.fetchConversations()
          this.activeConversationId = res.conversationId
        }
        return res
      } catch (err) {
        console.error('Failed to create group', err)
        throw err
      }
    },
    async updateGroupTitle(conversationId: string, title: string) {
      try {
        const res: any = await $fetch('/api/messages/updateGroup', {
          method: 'PUT',
          body: { conversationId, title }
        })
        if (res.success) {
          await this.fetchConversations()
        }
        return res
      } catch (err) {
        console.error('Failed to update group title', err)
        throw err
      }
    },
    setActiveConversation(id: string | null) {
      this.activeConversationId = id
      if (id) {
        this.fetchHistory(id)
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
        sender_id: message.sender_user_id || message.sender_office_id || '',
        read_by: message.read_by || []
      }
      
      // 4. Sort conversations
      this.sortConversations()
    },
    sortConversations() {
      this.conversations.sort((a, b) => {
        const timeA = a.latest_message ? new Date(a.latest_message.created_at).getTime() : 0
        const timeB = b.latest_message ? new Date(b.latest_message.created_at).getTime() : 0
        return timeB - timeA
      })
    }
  }
})
