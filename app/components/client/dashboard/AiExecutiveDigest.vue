<template>
  <div class="h-full w-full">
    <div v-if="loading" class="flex flex-col gap-8">
      <div class="flex items-center gap-2.5 text-sm font-medium text-candy-orange">
        <Icon name="ph:sparkle-fill" class="h-4 w-4 animate-pulse" />
        Analyzing your dashboard…
      </div>
      <div class="animate-pulse space-y-6">
        <div class="space-y-3">
          <div class="h-4 w-1/3 rounded-md bg-onyx-border"></div>
          <div class="h-3 w-full rounded-md bg-onyx-border/60"></div>
          <div class="h-3 w-5/6 rounded-md bg-onyx-border/60"></div>
          <div class="h-3 w-4/6 rounded-md bg-onyx-border/60"></div>
        </div>
        <div class="space-y-3">
          <div class="h-4 w-1/4 rounded-md bg-onyx-border"></div>
          <div class="h-3 w-full rounded-md bg-onyx-border/60"></div>
          <div class="h-3 w-3/6 rounded-md bg-onyx-border/60"></div>
        </div>
      </div>
    </div>

    <div v-else-if="error" class="flex flex-col items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-300">
      <div class="flex items-center gap-2 font-semibold text-red-200">
        <Icon name="ph:warning-circle-fill" class="h-4.5 w-4.5" />
        Couldn't generate the digest
      </div>
      <p>{{ error }}</p>
      <button
        type="button"
        class="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-semibold text-red-200 transition hover:bg-red-500/10"
        @click="fetchDigest"
      >
        <Icon name="ph:arrow-clockwise-bold" class="h-3.5 w-3.5" />
        Try again
      </button>
    </div>

    <div v-else class="ai-digest max-w-none text-[17px] leading-[1.75] text-zinc-300" v-html="formattedNarrative"></div>
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
/* The markdown comes back as raw HTML from marked + DOMPurify, so it has to be
   styled by element selector rather than component classes. */
.ai-digest :deep(h2),
.ai-digest :deep(h3) {
  display: flex;
  align-items: center;
  gap: 0.4em;
  margin-top: 2em;
  margin-bottom: 0.6em;
  font-size: 15.5px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: #EE4D2D;
}
.ai-digest :deep(h2:first-child),
.ai-digest :deep(h3:first-child) {
  margin-top: 0;
}
.ai-digest :deep(h4) {
  margin-top: 1.4em;
  margin-bottom: 0.4em;
  font-size: 13.5px;
  font-weight: 700;
  color: #FEFEFE;
}
.ai-digest :deep(p) {
  margin-bottom: 1em;
}
.ai-digest :deep(strong) {
  font-weight: 700;
  color: #FEFEFE;
}
.ai-digest :deep(ul),
.ai-digest :deep(ol) {
  margin: 0.75em 0 1.25em;
  padding-left: 1.4em;
  display: flex;
  flex-direction: column;
  gap: 0.5em;
}
.ai-digest :deep(ul) {
  list-style: none;
  padding-left: 0.2em;
}
.ai-digest :deep(ul li) {
  position: relative;
  padding-left: 1.3em;
}
.ai-digest :deep(ul li)::before {
  content: '';
  position: absolute;
  left: 0.15em;
  top: 0.62em;
  width: 5px;
  height: 5px;
  border-radius: 999px;
  background: #EE4D2D;
}
.ai-digest :deep(ol) {
  list-style: decimal;
}
.ai-digest :deep(ol li)::marker {
  color: #EE4D2D;
  font-weight: 700;
}
.ai-digest :deep(hr) {
  margin: 1.75em 0;
  border: none;
  border-top: 1px solid #2A2A2A;
}
.ai-digest :deep(code) {
  padding: 0.15em 0.4em;
  border-radius: 5px;
  background: #2A2A2A;
  font-size: 0.9em;
}
.ai-digest :deep(blockquote) {
  margin: 1em 0;
  padding: 0.75em 1em;
  border-left: 3px solid #EE4D2D;
  background: rgba(238, 77, 45, 0.06);
  color: #8F8F94;
  border-radius: 0 10px 10px 0;
}
.ai-digest :deep(a) {
  color: #EE4D2D;
  text-decoration: underline;
  text-underline-offset: 2px;
}
</style>
