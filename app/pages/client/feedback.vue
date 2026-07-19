<template>
  <div class="space-y-6 pb-24 lg:pb-8">
    <header>
      <div class="mb-2 flex items-center gap-2 text-sm" :class="mutedClass">
        <Icon name="ph:chat-circle-text-fill" class="h-4 w-4 text-candy-orange" />
        <span>Support</span>
        <Icon name="ph:caret-right" class="h-3 w-3" />
        <span class="font-medium" :class="headingClass">Feedback</span>
      </div>
      <h1 class="text-2xl font-bold tracking-tight sm:text-3xl" :class="headingClass">Platform Feedback</h1>
      <p class="mt-1 text-sm" :class="mutedClass">Report processing glitches or share operational notes with your organisation.</p>
    </header>

    <form class="max-w-2xl space-y-5 rounded-none border p-8 shadow-sm transition-all duration-300 hover:shadow-md" :class="panelClass" @submit.prevent="submit">
      <label class="block">
        <span class="mb-1.5 block text-xs font-semibold uppercase tracking-wide" :class="mutedClass">Category</span>
        <select v-model="category" class="w-full rounded-none border px-4 py-3 text-sm outline-none transition-all duration-200 focus:border-candy-orange focus:ring-1 focus:ring-candy-orange" :class="inputClass">
          <option value="platform">Platform Glitch</option>
          <option value="operations">Team Operations</option>
          <option value="routing">Routing / Stages</option>
          <option value="general">General Note</option>
        </select>
      </label>
      <label class="block">
        <span class="mb-1.5 block text-xs font-semibold uppercase tracking-wide" :class="mutedClass">Subject</span>
        <input v-model="subject" required type="text" class="w-full rounded-none border px-4 py-3 text-sm outline-none transition-all duration-200 focus:border-candy-orange focus:ring-1 focus:ring-candy-orange" :class="inputClass" placeholder="Brief summary of your feedback" />
      </label>
      <label class="block">
        <span class="mb-1.5 block text-xs font-semibold uppercase tracking-wide" :class="mutedClass">Message</span>
        <textarea v-model="message" required rows="6" class="w-full resize-y rounded-none border px-4 py-3 text-sm outline-none transition-all duration-200 focus:border-candy-orange focus:ring-1 focus:ring-candy-orange" :class="inputClass" placeholder="Provide as much detail as possible..." />
      </label>
      <div class="pt-2">
        <button type="submit" class="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-none bg-candy-orange px-8 py-3 text-sm font-bold text-white-pure shadow-sm transition-all duration-200 hover:bg-[#e95a0b] active:scale-[0.98] disabled:opacity-50" :disabled="submitting">
        <Icon v-if="submitting" name="ph:spinner-gap" class="h-4 w-4 animate-spin" />
        Submit Feedback
        </button>
      </div>
    </form>

    <Teleport to="body">
      <Transition name="toast-fade">
        <div v-if="toast.visible" class="fixed bottom-24 left-1/2 z-[100] max-w-sm -translate-x-1/2 rounded-none border px-5 py-4 text-sm font-semibold shadow-lg md:bottom-8" :class="toastClass">
          {{ toast.message }}
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
useSeoMeta({
  title: 'FlowVision | Send Feedback',
  description: 'Report issues, suggest improvements, and provide feedback directly to the FlowVision development team.'
})
import { useClientToast } from '~/composables/useClientToast'

definePageMeta({ layout: 'client' })

const { isDark } = useTheme()
const { toast, show: showToast } = useClientToast()

const category = ref('platform')
const subject = ref('')
const message = ref('')
const submitting = ref(false)

const headingClass = computed(() => (isDark.value ? 'text-white-pure' : 'text-onyx-black'))
const mutedClass = computed(() => (isDark.value ? 'text-gray-400' : 'text-gray-500'))
const panelClass = computed(() => (isDark.value ? 'border-onyx-border bg-onyx-black' : 'border-zinc-200 bg-white'))
const inputClass = computed(() => (isDark.value ? 'border-onyx-border bg-onyx-card text-white-pure' : 'border-zinc-200 bg-white text-onyx-black'))
const toastClass = computed(() => toast.type === 'error'
  ? 'border-red-500/40 bg-red-50 text-red-800 dark:bg-onyx-card dark:text-red-300'
  : 'border-emerald-200 bg-white text-emerald-700 dark:border-emerald-500/30 dark:bg-onyx-card dark:text-emerald-300')

async function submit() {
  submitting.value = true
  try {
    const res = await $fetch<{ success: boolean; message: string }>('/api/client/feedback', {
      method: 'POST',
      body: { category: category.value, subject: subject.value, message: message.value },
    })
    showToast(res.message)
    subject.value = ''
    message.value = ''
  } catch (err: unknown) {
    const e = err as { data?: { message?: string } }
    showToast(e?.data?.message ?? 'Failed to submit feedback.', 'error')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.toast-fade-enter-active, .toast-fade-leave-active { transition: opacity 0.2s ease; }
.toast-fade-enter-from, .toast-fade-leave-to { opacity: 0; }
</style>
