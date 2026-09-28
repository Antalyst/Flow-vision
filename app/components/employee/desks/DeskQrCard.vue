<template>
  <article
    class="group relative flex flex-col overflow-hidden rounded-2xl border shadow-card transition-colors"
    :class="isDark ? 'border-onyx-border bg-onyx-card' : 'border-gray-200 bg-white'"
  >
    <div class="flex flex-1 flex-col gap-4 p-5">
      <!-- Desk meta -->
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <Icon name="ph:desktop-fill" class="h-4 w-4 flex-none text-candy-orange" />
            <h3 class="truncate text-base font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">
              {{ desk.name }}
            </h3>
          </div>
          <p class="mt-1 font-mono text-sm font-semibold text-candy-orange">{{ desk.code }}</p>
          <div class="mt-2 flex flex-wrap items-center gap-1.5">
            <span
              class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
              :class="desk.assigned_user ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'"
            >
              <Icon :name="desk.assigned_user ? 'ph:user-check-light' : 'ph:user-minus-light'" class="h-3 w-3" />
              {{ desk.assigned_user ? desk.assigned_user.full_name : 'Unassigned' }}
            </span>
            <span
              class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
              :class="desk.is_active ? 'bg-success/10 text-success' : 'bg-gray-500/10 text-gray-500'"
            >
              <span class="h-1.5 w-1.5 rounded-full bg-current" />
              {{ desk.is_active ? 'Active' : 'Inactive' }}
            </span>
          </div>
        </div>

        <div class="flex flex-shrink-0 items-center gap-1">
          <button
            type="button"
            class="inline-flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-candy-orange/10 hover:text-candy-orange"
            :class="isDark ? 'text-gray-400' : 'text-gray-500'"
            title="Edit desk"
            @click="emit('edit', desk)"
          >
            <Icon name="ph:pencil-simple-bold" class="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-danger transition hover:bg-danger/10"
            title="Delete desk"
            @click="emit('delete', desk.id)"
          >
            <Icon name="ph:trash-bold" class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <!-- QR Code display -->
      <div class="flex flex-col items-center gap-3">
        <div class="relative flex h-44 w-44 items-center justify-center rounded-2xl border-2 border-candy-orange/30 bg-white p-3 shadow-sm transition-shadow group-hover:shadow-md">
          <img
            v-if="qrDataUrl"
            :src="qrDataUrl"
            :alt="`QR code for ${desk.name}`"
            class="h-full w-full object-contain mix-blend-multiply"
          />
          <div v-else class="flex flex-col items-center gap-2">
            <Icon name="ph:spinner-gap" class="h-8 w-8 animate-spin text-candy-orange" />
            <span class="text-xs" :class="isDark ? 'text-gray-400' : 'text-white-muted'">Generating…</span>
          </div>
        </div>
        <p class="text-center text-xs" :class="isDark ? 'text-gray-400' : 'text-white-muted'">
          {{ desk.office?.name || 'Office' }}
        </p>
      </div>

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
        Download Desk QR Code
      </button>
    </div>
  </article>
</template>

<script setup lang="ts">
import QRCode from 'qrcode'
import { computed, onMounted, ref, watch } from 'vue'
import { useTheme } from '~/composables/useTheme'

interface DeskRecord {
  id: string
  name: string
  code: string
  qr_code_data: string
  is_active: boolean
  office_id: string
  office: { id: string; name: string } | null
  assigned_user: { user_id: string; full_name: string } | null
}

const props = defineProps<{ desk: DeskRecord }>()
const emit = defineEmits<{
  edit: [desk: DeskRecord]
  delete: [id: string]
}>()

const { isDark } = useTheme()

const qrDataUrl = ref<string | null>(null)

const generateQr = async () => {
  try {
    qrDataUrl.value = await QRCode.toDataURL(props.desk.qr_code_data, {
      margin: 1,
      width: 320,
      color: { dark: '#0f172a', light: '#ffffff' },
      errorCorrectionLevel: 'H',
    })
  } catch (err) {
    console.error('[DeskQrCard] QR generation failed:', err)
  }
}

const downloadQr = () => {
  if (!qrDataUrl.value) return
  const anchor = document.createElement('a')
  const safeName = props.desk.name.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_')
  anchor.href = qrDataUrl.value
  anchor.download = `Desk_QR_${props.desk.code}_${safeName}.png`
  anchor.click()
}

onMounted(generateQr)
watch(() => props.desk.qr_code_data, generateQr)
</script>
