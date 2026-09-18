<template>
  <div class="h-full flex flex-col p-4 md:p-6 lg:p-8">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Citizen AI Assistant</h1>
        <p class="text-sm md:text-base text-gray-500 mt-1">Ask questions about your documents, requirements, or LGU processes.</p>
      </div>
    </div>

    <!-- Chat Container -->
    <div class="flex-1 min-h-0 border bg-white dark:bg-onyx-card flex flex-col rounded-none shadow-sm" :class="isDark ? 'border-onyx-border' : 'border-gray-200'">
      
      <!-- Messages Area -->
      <div class="flex-1 overflow-y-auto p-6 space-y-6" ref="messagesContainer">
        <!-- Initial Welcome Message -->
        <div class="flex items-start gap-4">
          <div class="w-10 h-10 bg-candy-orange text-white flex items-center justify-center rounded-none shadow-sm flex-shrink-0">
            <Icon name="ph:robot-bold" class="w-5 h-5" />
          </div>
          <div class="bg-gray-50 dark:bg-onyx-black border p-4 rounded-none max-w-[85%] md:max-w-[70%]" :class="isDark ? 'border-onyx-border' : 'border-gray-200'">
            <p class="text-sm text-gray-900 dark:text-white leading-relaxed">
              Hello! I'm your LGU Citizen Assistant. I can help you check the requirements for your business permit, track your active documents, or answer general questions about our services. How can I help you today?
            </p>
          </div>
        </div>

        <!-- Dynamic Messages -->
        <div v-for="(msg, idx) in messages" :key="idx" class="flex items-start gap-4 animate-fade-in" :class="msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'">
          <!-- Avatar -->
          <div v-if="msg.role === 'assistant'" class="w-10 h-10 bg-candy-orange text-white flex items-center justify-center rounded-none shadow-sm flex-shrink-0">
            <Icon name="ph:robot-bold" class="w-5 h-5" />
          </div>
          <div v-else class="w-10 h-10 bg-gray-900 dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-lg rounded-none shadow-sm flex-shrink-0">
            JD
          </div>
          
          <!-- Bubble -->
          <div class="p-4 rounded-none max-w-[85%] md:max-w-[70%] border"
               :class="msg.role === 'user' 
                 ? 'bg-gray-900 border-gray-900 dark:bg-white dark:border-white text-white dark:text-black' 
                 : (isDark ? 'bg-onyx-black border-onyx-border text-white' : 'bg-gray-50 border-gray-200 text-gray-900')">
            <p class="text-sm leading-relaxed whitespace-pre-wrap">{{ msg.content }}</p>
          </div>
        </div>

        <!-- Loading Indicator -->
        <div v-if="isLoading" class="flex items-start gap-4 animate-fade-in">
          <div class="w-10 h-10 bg-candy-orange text-white flex items-center justify-center rounded-none shadow-sm flex-shrink-0">
            <Icon name="ph:robot-bold" class="w-5 h-5" />
          </div>
          <div class="bg-gray-50 dark:bg-onyx-black border p-4 rounded-none flex gap-2 items-center" :class="isDark ? 'border-onyx-border' : 'border-gray-200'">
            <div class="w-2 h-2 bg-candy-orange animate-bounce"></div>
            <div class="w-2 h-2 bg-candy-orange animate-bounce" style="animation-delay: 0.2s"></div>
            <div class="w-2 h-2 bg-candy-orange animate-bounce" style="animation-delay: 0.4s"></div>
          </div>
        </div>
      </div>

      <!-- Input Area -->
      <div class="p-4 border-t bg-gray-50 dark:bg-onyx-black" :class="isDark ? 'border-onyx-border' : 'border-gray-200'">
        <form @submit.prevent="sendMessage" class="relative">
          <input 
            v-model="inputQuery"
            type="text" 
            placeholder="Ask about your document status..." 
            class="w-full pl-4 pr-12 py-3 border outline-none transition-colors rounded-none text-sm shadow-sm"
            :class="isDark ? 'bg-onyx-card border-onyx-border text-white focus:border-candy-orange' : 'bg-white border-gray-300 text-gray-900 focus:border-candy-orange'"
            :disabled="isLoading"
          >
          <button 
            type="submit" 
            class="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-candy-orange hover:bg-candy-orange/10 transition-colors disabled:opacity-50"
            :disabled="!inputQuery.trim() || isLoading"
          >
            <Icon name="ph:paper-plane-right-fill" class="w-5 h-5" />
          </button>
        </form>
        <div class="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button @click="presetQuestion('What are the requirements for Business Permit?')" class="whitespace-nowrap px-3 py-1 text-[13px] uppercase tracking-wider border text-gray-500 hover:text-candy-orange hover:border-candy-orange transition-colors" :class="isDark ? 'border-onyx-border' : 'border-gray-200'">Requirements</button>
          <button @click="presetQuestion('Where is my document PKG-0x8F2A?')" class="whitespace-nowrap px-3 py-1 text-[13px] uppercase tracking-wider border text-gray-500 hover:text-candy-orange hover:border-candy-orange transition-colors" :class="isDark ? 'border-onyx-border' : 'border-gray-200'">Track PKG-0x8F2A</button>
          <button @click="presetQuestion('How long does a Barangay Clearance take?')" class="whitespace-nowrap px-3 py-1 text-[13px] uppercase tracking-wider border text-gray-500 hover:text-candy-orange hover:border-candy-orange transition-colors" :class="isDark ? 'border-onyx-border' : 'border-gray-200'">Processing Time</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import { useTheme } from '~/composables/useTheme'

const { isDark } = useTheme()
definePageMeta({ layout: 'public-dashboard' })
useHead({ title: 'AI Assistant - FlowVision' })

type Message = { role: 'user' | 'assistant', content: string }

const messages = ref<Message[]>([])
const inputQuery = ref('')
const isLoading = ref(false)
const messagesContainer = ref<HTMLElement | null>(null)

// Auto-scroll to bottom
watch(messages, async () => {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}, { deep: true })

const presetQuestion = (q: string) => {
  inputQuery.value = q
  sendMessage()
}

const sendMessage = () => {
  if (!inputQuery.value.trim() || isLoading.value) return

  const userText = inputQuery.value.trim()
  messages.value.push({ role: 'user', content: userText })
  inputQuery.value = ''
  isLoading.value = true

  // Simulate AI Response (Simple frontend mock)
  setTimeout(() => {
    let aiResponse = "I'm a public assistant demo! I can verify that your document is securely traversing our system. If you need a specific tracking update, you can check the 'Document Tracking' tab."
    
    const lower = userText.toLowerCase()
    if (lower.includes('pkg-0x8f2a') || lower.includes('where is')) {
      aiResponse = "Document PKG-0x8F2A is your 'Business Permit Renewal 2024'. It is currently IN TRANSIT. The last telemetry ping was recorded at the HUB mesh core 10 minutes ago. It should arrive at Office B shortly."
    } else if (lower.includes('requirement') || lower.includes('permit')) {
      aiResponse = "To apply for a Business Permit, you will generally need:\n\n1. DTI or SEC Registration\n2. Barangay Clearance\n3. Lease Contract or Transfer Certificate of Title\n4. Sketch of Location\n\nYou can submit these directly at the Intake Node."
    } else if (lower.includes('barangay')) {
      aiResponse = "A Barangay Clearance usually takes 1-3 working days to process depending on your local district. Our system shows your recent request (PKG-0x1A2C) was already COMPLETED."
    }

    messages.value.push({ role: 'assistant', content: aiResponse })
    isLoading.value = false
  }, 1200)
}
</script>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.3s ease-out forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}

.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
}
</style>
