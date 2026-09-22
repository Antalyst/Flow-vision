<template>
  <section class="mx-auto w-full max-w-2xl space-y-6 pb-24 lg:pb-8">
    <header>
      <div class="mb-3 h-1 w-14 rounded-full bg-candy-orange" />
      <p class="text-sm font-bold uppercase tracking-widest text-candy-orange">Origin Checkpoint</p>
      <h1 class="mt-1 text-2xl font-bold tracking-tight sm:text-3xl" :class="isDark ? 'text-white-pure' : 'text-onyx-black'">
        My Station QR
      </h1>
      <p class="mt-2 text-sm" :class="mutedClass">
        Print this badge and keep it at your desk — messengers scan it to pick up documents from your office.
      </p>
    </header>

    <div v-if="loading" class="flex items-center justify-center gap-2 py-24" :class="mutedClass">
      <Icon name="ph:spinner-gap" class="h-6 w-6 animate-spin text-candy-orange" />
      Loading station checkpoint…
    </div>

    <div v-else-if="error" class="rounded-xl border border-danger/30 bg-danger/10 px-5 py-4 text-sm text-danger">
      {{ error }}
    </div>

  <article
    v-else
    id="station-print-area"
    class="overflow-hidden rounded-2xl border shadow-card"
    :class="isDark ? 'border-onyx-border bg-onyx-card' : 'border-gray-200 bg-white-surface'"
  >
      <div class="border-b px-6 py-4" :class="isDark ? 'border-onyx-border bg-onyx-sidebar/50' : 'border-gray-200 bg-white-muted'">
        <div class="flex items-center gap-2">
          <Icon name="ph:buildings-fill" class="h-5 w-5 text-candy-orange" />
          <div>
            <h2 class="text-lg font-bold" :class="isDark ? 'text-white-pure' : 'text-onyx-black'">
              {{ station?.name }}
            </h2>
            <p class="font-mono text-xs text-candy-orange">{{ station?.code }}</p>
          </div>
        </div>
      </div>

      <div class="flex flex-col items-center gap-6 px-6 py-10">
        <div
          class="flex h-72 w-72 max-w-full items-center justify-center rounded-2xl border-2 border-candy-orange/30 bg-white-pure p-4"
        >
          <canvas
            ref="qrCanvas"
            class="h-full w-full pt-4"
            aria-label="Client dispatch station QR code"
          />
        </div>

        

        <p class="max-w-md text-center text-sm leading-relaxed pt-10" :class="mutedClass">
          Affix this badge to your physical dispatch desk. Messengers scan it in <strong class="text-candy-orange">Pickup</strong> mode to register origin collection.
        </p>
      </div>

      <div class="flex flex-col gap-3 border-t px-6 py-5 sm:flex-row sm:justify-center print:hidden" :class="isDark ? 'border-onyx-border' : 'border-gray-200'">
        <button
          type="button"
          class="inline-flex items-center justify-center gap-2 rounded-xl bg-candy-orange px-6 py-3 text-sm font-bold text-white-pure shadow-sm transition hover:bg-candy-hover active:scale-[0.98]"
          @click="printBadge"
        >
          <Icon name="ph:printer-fill" class="h-4 w-4" />
          Print Station Badge
        </button>
        <button
          type="button"
          class="inline-flex items-center justify-center gap-2 rounded-xl border px-6 py-3 text-sm font-semibold transition"
          :class="isDark ? 'border-onyx-border text-white-muted hover:bg-white/5' : 'border-gray-200 text-gray-700 hover:bg-gray-50'"
          :disabled="!qrDataUrl"
          @click="downloadQr"
        >
          <Icon name="ph:download-simple-bold" class="h-4 w-4" />
          Download PNG
        </button>
      </div>
    </article>
  </section>
</template>

<script setup lang="ts">
import QRCode from 'qrcode'
import { computed, nextTick, onMounted, ref } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { buildCheckpointQrPayload } from '~/utils/checkpointQr'

interface StationRecord {
  id: string
  name: string
  code: string | null
}

const auth = useAuthStore()
const { isDark } = useTheme()

const loading = ref(true)
const error = ref('')
const station = ref<StationRecord | null>(null)
const qrPayload = ref('')
const qrDataUrl = ref('')
const qrCanvas = ref<HTMLCanvasElement | null>(null)

const mutedClass = computed(() => (isDark.value ? 'text-white-muted' : 'text-gray-500'))

const renderQr = async () => {
  if (!qrPayload.value || !qrCanvas.value) return
  try {
    await QRCode.toCanvas(qrCanvas.value, qrPayload.value, {
      width: 280,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: { dark: '#1A1A1A', light: '#FFFFFF' },
    })
    qrDataUrl.value = qrCanvas.value.toDataURL('image/png')
  } catch (err) {
    console.error('[ClientStation] QR render failed:', err)
  }
}

const fetchStation = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await $fetch<{
      success: boolean
      data: { station: StationRecord; qr_payload: string }
    }>('/api/client/station')

    station.value = res.data.station
    qrPayload.value = res.data.qr_payload || buildCheckpointQrPayload(res.data.station.id)
  } catch (err: any) {
    error.value = err?.data?.message || 'Could not load your dispatch station.'
  } finally {
    loading.value = false
    await nextTick()
    await renderQr()
  }
}

const printBadge = () => {
  window.print()
}

const downloadQr = () => {
  if (!qrDataUrl.value || !station.value) return
  const anchor = document.createElement('a')
  const safeName = station.value.name.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_')
  anchor.href = qrDataUrl.value
  anchor.download = `Station_QR_${station.value.code ?? safeName}.png`
  anchor.click()
}

onMounted(async () => {
  if (auth.isLoggedIn && !auth.currentOrg) await auth.fetchMyOrg()
  await fetchStation()
})
</script>

<style scoped>
@media print {
  :global(body *) {
    visibility: hidden;
  }
  #station-print-area,
  #station-print-area * {
    visibility: visible;
  }
  #station-print-area {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    border: none;
    box-shadow: none;
  }
}
</style>
