<template>
  <div class="h-full w-full">
    <div v-if="loading" class="animate-pulse space-y-6">
      <div class="h-5 w-1/3 rounded bg-zinc-800"></div>
      <div class="space-y-3">
        <div class="h-4 w-full rounded bg-zinc-800/50"></div>
        <div class="h-4 w-5/6 rounded bg-zinc-800/50"></div>
        <div class="h-4 w-4/6 rounded bg-zinc-800/50"></div>
      </div>
      <div class="space-y-3 pt-6">
        <div class="h-4 w-full rounded bg-zinc-800/50"></div>
        <div class="h-4 w-5/6 rounded bg-zinc-800/50"></div>
      </div>
    </div>
    <div v-else-if="error" class="text-sm text-red-400 p-4 bg-red-500/10 rounded-lg border border-red-500/20">
      {{ error }}
    </div>
    <div v-else class="prose prose-sm prose-invert max-w-none text-zinc-300">
      <div v-html="formattedNarrative"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { marked } from 'marked'
import DOMPurify from 'dompurify'

const props = defineProps<{
  metrics: Record<string, any> | null
  officeName?: string
}>()

const loading = ref(false)
const error = ref<string | null>(null)
const narrative = ref<string>('')

const formattedNarrative = computed(() => {
  if (!narrative.value) return ''
  const html = marked.parse(narrative.value) as string
  return DOMPurify.sanitize(html)
})

const fetchDigest = async () => {
  if (!props.metrics) return

  loading.value = true
  error.value = null
  try {
    const res = await $fetch<{ success: boolean; narrative: string; debugError?: string }>('/api/client/dashboard-ai', {
      method: 'POST',
      body: {
        metrics: props.metrics,
        officeName: props.officeName
      }
    })
    
    if (res.success) {
      narrative.value = res.narrative
    } else {
      error.value = `Failed to load executive digest. ${res.debugError || ''}`
    }
  } catch (err: any) {
    error.value = err?.data?.message || err?.message || 'Failed to load executive digest.'
  } finally {
    loading.value = false
  }
}

watch(
  () => props.metrics,
  () => {
    fetchDigest()
  },
  { deep: true, immediate: true }
)
</script>

<style scoped>
.prose h3 {
  color: #93c5fd; /* blue-300 */
  margin-top: 1.5em;
  margin-bottom: 0.5em;
}
.prose p {
  margin-bottom: 1em;
}
</style>
