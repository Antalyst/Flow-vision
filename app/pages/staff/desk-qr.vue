<template>
  <section ref="pageRoot" class="w-full max-w-md mx-auto space-y-6 pb-24 lg:pb-8">

    <!-- ── Page Header ───────────────────────────────────────────────── -->
    <div ref="headerEl">
      <div class="mb-2 flex items-center gap-2 text-xs font-medium" :class="mutedText">
        <Icon name="ph:desktop-light" class="h-3.5 w-3.5 text-candy-orange" />
        <span>Staff Portal</span>
        <Icon name="ph:caret-right-light" class="h-3 w-3 opacity-50" />
        <span :class="isDark ? 'text-white' : 'text-gray-800'">My Desk QR</span>
      </div>
      <h1 class="text-3xl font-bold tracking-tight leading-tight" :class="isDark ? 'text-white' : 'text-gray-900'">
        My Desk QR Code
      </h1>
      <p class="mt-1.5 text-sm" :class="mutedText">
        Messengers scan this to drop off or pick up documents at your desk.
      </p>
    </div>

    <!-- ── Loading ───────────────────────────────────────────────────── -->
    <div v-if="loading" class="py-16 text-center" :class="mutedText">
      <Icon name="ph:spinner-gap-light" class="h-6 w-6 animate-spin mx-auto mb-3 text-candy-orange" />
      <p class="text-xs font-medium">Loading your desk…</p>
    </div>

    <!-- ── Empty ─────────────────────────────────────────────────────── -->
    <div
      v-else-if="!myDesk"
      class="rounded-2xl border p-10 text-center"
      :class="isDark ? 'bg-onyx-card border-onyx-border' : 'bg-white border-gray-200'"
    >
      <div class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-candy-orange/10">
        <Icon name="ph:desktop-light" class="h-7 w-7 text-candy-orange/60" />
      </div>
      <p class="font-semibold text-sm" :class="isDark ? 'text-gray-300' : 'text-gray-700'">No desk on record yet</p>
      <p class="mt-1 text-xs max-w-[240px] mx-auto" :class="mutedText">
        Ask your office admin to check your staff account setup.
      </p>
    </div>

    <!-- ── Desk QR ───────────────────────────────────────────────────── -->
    <div v-else ref="cardEl">
      <OfficeQrCard :office="myDesk" :editable="false" />
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { gsap } from 'gsap'
import OfficeQrCard from '~/components/employee/OfficeQrCard.vue'
import { useTheme } from '~/composables/useTheme'

definePageMeta({ layout: 'staff' })
useSeoMeta({ title: 'FlowVision | My Desk QR', description: 'View and download your desk QR code for document drop-off and pickup.' })

const { isDark } = useTheme()
const mutedText = computed(() => isDark.value ? 'text-gray-400' : 'text-gray-500')

const myDesk = ref(null)
const loading = ref(true)

async function fetchMyDesk() {
  loading.value = true
  try {
    const res = await $fetch('/api/staff/my-desk')
    myDesk.value = res.data || null
  } catch (err) {
    console.error('Failed to load your desk:', err)
  } finally {
    loading.value = false
  }
}

const pageRoot = ref(null)
const headerEl = ref(null)
const cardEl = ref(null)

onMounted(async () => {
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
  if (headerEl.value) tl.fromTo(headerEl.value, { opacity: 0, y: -16 }, { opacity: 1, y: 0, duration: 0.45 }, 0)

  await fetchMyDesk()
  await nextTick()
  if (cardEl.value) tl.fromTo(cardEl.value, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.5 }, 0.1)
})
</script>
