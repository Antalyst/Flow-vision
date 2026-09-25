<template>
  <article
    class="group relative flex flex-col overflow-hidden rounded-2xl border shadow-card transition-colors"
    :class="isDark ? 'border-onyx-border bg-onyx-card' : 'border-gray-200 bg-white'"
  >
    <div class="flex flex-1 flex-col gap-4 p-5">
      <!-- Staff meta -->
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <Icon name="ph:identification-badge-fill" class="h-4 w-4 flex-none text-candy-orange" />
            <h3 class="truncate text-base font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">
              {{ staff.full_name }}
            </h3>
          </div>
          <p class="mt-1 truncate text-xs" :class="isDark ? 'text-gray-400' : 'text-white-muted'">
            {{ staff.email }}
          </p>
          <span
            class="mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
            :class="staff.status === 1 ? 'bg-success/10 text-success' : 'bg-gray-400/10 text-gray-500'"
          >
            <span class="h-1.5 w-1.5 rounded-full" :class="staff.status === 1 ? 'bg-success' : 'bg-gray-400'" />
            {{ staff.status === 1 ? 'Active' : 'Suspended' }}
          </span>
        </div>
      </div>

      <!-- QR Code display -->
      <div class="flex flex-col items-center gap-3">
        <div class="relative flex h-44 w-44 items-center justify-center rounded-2xl border-2 border-candy-orange/30 bg-white p-3 shadow-sm transition-shadow group-hover:shadow-md">
          <img
            v-if="qrDataUrl"
            :src="qrDataUrl"
            :alt="`QR code for ${staff.full_name}`"
            class="h-full w-full object-contain mix-blend-multiply"
          />
          <div v-else class="flex flex-col items-center gap-2">
            <Icon name="ph:spinner-gap" class="h-8 w-8 animate-spin text-candy-orange" />
            <span class="text-xs" :class="isDark ? 'text-gray-400' : 'text-white-muted'">Generating…</span>
          </div>
        </div>

        <p class="text-center font-mono text-xs" :class="isDark ? 'text-gray-400' : 'text-white-muted'">
          {{ qrUri }}
        </p>
      </div>

      <!-- Download QR button -->
      <button
        type="button"
        :disabled="!qrDataUrl"
        class="flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
        :class="isDark
          ? 'border-candy-orange/30 bg-candy-orange/10 text-candy-orange hover:bg-candy-orange/20'
          : 'border-candy-orange/30 bg-orange-50 text-candy-orange hover:bg-orange-100'"
        @click="downloadQr"
      >
        <Icon name="ph:download-simple-bold" class="h-3.5 w-3.5" />
        Download QR Code
      </button>
    </div>
  </article>
</template>

<script setup lang="ts">
import QRCode from 'qrcode'
import { computed, onMounted, ref } from 'vue'
import { useTheme } from '~/composables/useTheme'
import { buildStaffQrPayload } from '~/utils/parseFlowVisionQr'

interface StaffRecord {
  user_id: string
  full_name: string
  email: string
  status: number
}

const props = defineProps<{ staff: StaffRecord }>()

const { isDark } = useTheme()

const qrUri = computed(() => buildStaffQrPayload(props.staff.user_id))
const qrDataUrl = ref<string | null>(null)

const generateQr = async () => {
  try {
    qrDataUrl.value = await QRCode.toDataURL(qrUri.value, {
      margin: 1,
      width: 320,
      color: { dark: '#0f172a', light: '#ffffff' },
      errorCorrectionLevel: 'H',
    })
  } catch (err) {
    console.error('[StaffQrCard] QR generation failed:', err)
  }
}

const downloadQr = () => {
  if (!qrDataUrl.value) return
  const anchor = document.createElement('a')
  const safeName = props.staff.full_name.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_')
  anchor.href = qrDataUrl.value
  anchor.download = `QR_Staff_${safeName}.png`
  anchor.click()
}

onMounted(generateQr)
</script>
