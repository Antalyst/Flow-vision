<template>
  <section ref="pageRoot" class="w-full max-w-2xl mx-auto space-y-6 pb-24 lg:pb-8">

    <!-- ── Page Header ───────────────────────────────────────────────── -->
    <div ref="headerEl" class="print:hidden">
      <div class="mb-2 flex items-center gap-2 text-xs font-medium" :class="mutedText">
        <Icon name="ph:identification-badge-light" class="h-3.5 w-3.5 text-candy-orange" />
        <span>Staff Portal</span>
        <Icon name="ph:caret-right-light" class="h-3 w-3 opacity-50" />
        <span :class="isDark ? 'text-white' : 'text-gray-800'">My QR Code</span>
      </div>
      <h1 class="text-3xl font-bold tracking-tight leading-tight" :class="isDark ? 'text-white' : 'text-gray-900'">My QR Code</h1>
      <p class="mt-1.5 text-sm" :class="mutedText">
        Your personal FlowVision code. Download it or print it for your desk.
      </p>
    </div>

    <!-- ── QR Card ───────────────────────────────────────────────────── -->
    <div
      id="staff-qr-card"
      ref="cardEl"
      class="rounded-2xl border p-8 text-center"
      :class="isDark ? 'bg-onyx-card border-onyx-border' : 'bg-white border-gray-200'"
    >
      <p class="text-sm font-bold uppercase tracking-widest text-candy-orange">{{ auth.currentOrg?.name || 'FlowVision' }}</p>
      <h2 class="mt-1 text-xl font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">{{ auth.user?.full_name || 'Staff' }}</h2>
      <p class="mt-0.5 text-sm" :class="mutedText">{{ auth.user?.email }}</p>

      <div class="mt-6 flex flex-col items-center gap-4 rounded-xl border p-6" :class="isDark ? 'border-onyx-border bg-onyx-black' : 'border-gray-200 bg-white-surface'">
        <canvas ref="qrCanvas" class="h-56 w-56 max-w-full rounded-lg bg-white p-2 shadow-sm" aria-label="Staff QR code" />
        <p class="break-all text-center font-mono text-xs" :class="mutedText">{{ qrPayload }}</p>
      </div>

      <div class="mt-6 flex flex-col gap-3 sm:flex-row print:hidden">
        <button
          type="button"
          class="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors"
          :class="isDark ? 'border-onyx-border text-gray-200 hover:bg-onyx-black' : 'border-gray-200 text-gray-700 hover:bg-gray-50'"
          @click="handleDownload"
        >
          <Icon name="ph:download-simple-light" class="h-4 w-4" />
          Download PNG
        </button>
        <button
          type="button"
          class="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-candy-orange px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-candy-hover"
          @click="handlePrint"
        >
          <Icon name="ph:printer-fill" class="h-4 w-4" />
          Print
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import QRCode from 'qrcode'
import { useAuthStore } from '~/stores/auth'
import { useTheme } from '~/composables/useTheme'
import { buildStaffQrPayload } from '~/utils/parseFlowVisionQr'
import { gsap } from 'gsap'

definePageMeta({ layout: 'staff' })
useSeoMeta({ title: 'FlowVision | My QR Code', description: 'View, download, or print your personal FlowVision QR code.' })

const auth = useAuthStore()
const { isDark } = useTheme()
const mutedText = computed(() => isDark.value ? 'text-gray-400' : 'text-gray-500')

const qrCanvas = ref(null)
const qrPayload = computed(() => auth.user?.user_id ? buildStaffQrPayload(String(auth.user.user_id)) : '')

async function renderQr() {
  if (!qrPayload.value || !qrCanvas.value) return
  try {
    await QRCode.toCanvas(qrCanvas.value, qrPayload.value, {
      width: 224,
      margin: 1,
      color: { dark: '#1A1A1A', light: '#FFFFFF' },
    })
  } catch (err) {
    console.error('Failed to render QR code:', err)
  }
}

function handleDownload() {
  if (!qrCanvas.value) return
  const link = document.createElement('a')
  link.href = qrCanvas.value.toDataURL('image/png')
  link.download = `flowvision-staff-qr-${auth.user?.full_name?.replace(/\s+/g, '-').toLowerCase() || 'code'}.png`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function handlePrint() {
  window.print()
}

// GSAP refs
const pageRoot = ref(null)
const headerEl = ref(null)
const cardEl = ref(null)

onMounted(async () => {
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
  if (headerEl.value) tl.fromTo(headerEl.value, { opacity: 0, y: -16 }, { opacity: 1, y: 0, duration: 0.45 }, 0)
  if (cardEl.value) tl.fromTo(cardEl.value, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.5 }, 0.14)

  await nextTick()
  await renderQr()
})
</script>

<style scoped>
@media print {
  body * { visibility: hidden; }
  #staff-qr-card, #staff-qr-card * { visibility: visible; }
  #staff-qr-card {
    position: fixed;
    inset: 0;
    margin: auto;
    max-width: 400px;
    height: fit-content;
    border: none;
    box-shadow: none;
  }
}
</style>
