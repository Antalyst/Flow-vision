<template>
  <div ref="pageRoot" class="space-y-6 pb-24 lg:pb-8">

    <!-- ── Page Header ───────────────────────────────────────────────── -->
    <div ref="headerEl" class="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div class="mb-2 flex items-center gap-2 text-xs font-medium" :class="mutedClass">
          <Icon name="ph:clock-counter-clockwise-fill" class="h-3.5 w-3.5 text-candy-orange" />
          <span>Employee Portal</span>
          <Icon name="ph:caret-right" class="h-3 w-3 opacity-50" />
          <span :class="isDark ? 'text-white' : 'text-gray-800'">Activity</span>
        </div>
        <h1 class="text-3xl font-bold tracking-tight leading-tight" :class="isDark ? 'text-white' : 'text-gray-900'">
          Office Activity
        </h1>
        <p class="mt-1.5 text-sm" :class="mutedClass">
          A chronological log of local office operations and outbound pickup events.
        </p>
      </div>

      <!-- Live indicator -->
      <div
        class="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold"
        :class="isDark ? 'border-onyx-border bg-onyx-card text-gray-300' : 'border-gray-200 bg-white text-gray-700'"
      >
        <span class="h-2 w-2 animate-pulse rounded-full bg-candy-orange" />
        Live feed
      </div>
    </div>

    <!-- ── Timeline Card ──────────────────────────────────────────────── -->
    <div
      ref="cardEl"
      class="rounded-2xl border overflow-hidden"
      :class="isDark ? 'bg-onyx-card border-onyx-border' : 'bg-white border-gray-200'"
    >
      <!-- Card header strip -->
      <div
        class="flex items-center gap-3 border-b px-6 py-4"
        :class="isDark ? 'border-onyx-border' : 'border-gray-100'"
      >
        <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-candy-orange/10 ring-1 ring-candy-orange/20">
          <Icon name="ph:activity-fill" class="h-4.5 w-4.5 text-candy-orange" />
        </span>
        <div>
          <h2 class="text-sm font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">Event Timeline</h2>
          <p class="text-[11px]" :class="mutedClass">Document pickup, drop-off, and compliance events</p>
        </div>
      </div>

      <div class="p-5 sm:p-6">
        <ActivityTimeline />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { gsap } from 'gsap'

definePageMeta({ layout: 'employee' })

const { isDark } = useTheme()
const mutedClass = computed(() => (isDark.value ? 'text-gray-400' : 'text-gray-500'))

// GSAP refs
const pageRoot = ref(null)
const headerEl = ref(null)
const cardEl   = ref(null)

const runEntranceAnimation = () => {
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
  if (headerEl.value) {
    tl.fromTo(headerEl.value, { opacity: 0, y: -16 }, { opacity: 1, y: 0, duration: 0.45 }, 0)
  }
  if (cardEl.value) {
    tl.fromTo(cardEl.value, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.5 }, 0.18)
  }
}

onMounted(() => {
  runEntranceAnimation()
})
</script>
