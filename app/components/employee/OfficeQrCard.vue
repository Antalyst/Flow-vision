<template>
  <article
    class="group relative flex flex-col overflow-hidden rounded-2xl border shadow-card transition-colors"
    :class="isDark ? 'border-onyx-border bg-onyx-card' : 'border-gray-200 bg-white'"
  >

    <div class="flex flex-1 flex-col gap-4 p-5">
      <!-- Office meta -->
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <Icon name="ph:buildings-fill" class="h-4 w-4 flex-none text-candy-orange" />
            <h3 class="truncate text-base font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">
              {{ office.name }}
            </h3>
          </div>
          <p class="mt-1 font-mono text-[14px] font-semibold text-candy-orange">
            {{ office.code || derivedCode }}
          </p>
        </div>

        <!-- Action buttons -->
        <div class="flex flex-shrink-0 items-center gap-1">
          <button
            type="button"
            class="inline-flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-candy-orange/10 hover:text-candy-orange"
            :class="isDark ? 'text-gray-400' : 'text-gray-500'"
            title="Edit office"
            @click="emit('edit', office)"
          >
            <Icon name="ph:pencil-simple-bold" class="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-danger transition hover:bg-danger/10"
            title="Delete office"
            @click="emit('delete', office.id)"
          >
            <Icon name="ph:trash-bold" class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <!-- QR Code display -->
      <div class="flex flex-col items-center gap-3">
        <div
          class="relative flex h-44 w-44 items-center justify-center rounded-2xl border-2 border-candy-orange/30 bg-white p-3 shadow-sm transition-shadow group-hover:shadow-md"
        >
          <img
            v-if="qrDataUrl"
            :src="qrDataUrl"
            :alt="`QR code for ${office.name}`"
            class="h-full w-full object-contain mix-blend-multiply"
          />
          <div v-else class="flex flex-col items-center gap-2">
            <Icon name="ph:spinner-gap" class="h-8 w-8 animate-spin text-candy-orange" />
            <span class="text-[13px]" :class="isDark ? 'text-gray-500' : 'text-gray-400'">Generating…</span>
          </div>
        </div>

        <p class="text-center font-mono text-[13px]" :class="isDark ? 'text-gray-500' : 'text-gray-400'">
          {{ qrUri }}
        </p>
      </div>

      <!-- Stats row -->
      <div
        class="grid grid-cols-2 gap-3 rounded-xl p-3 text-center"
        :class="isDark ? 'bg-white/[0.03]' : 'bg-gray-50'"
      >
        <div>
          <p class="text-sm font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">{{ office.doc_count ?? '—' }}</p>
          <p class="mt-0.5 text-[13px]" :class="isDark ? 'text-gray-500' : 'text-gray-400'">Documents</p>
        </div>
        <div>
          <p class="text-sm font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">
            {{ formatDate(office.created_at) }}
          </p>
          <p class="mt-0.5 text-[13px]" :class="isDark ? 'text-gray-500' : 'text-gray-400'">Created</p>
        </div>
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

interface OfficeRecord {
  id: number
  name: string
  code?: string
  org_id: string | number
  assigned_user: string | number
  stage_id: number | null
  created_at: string
  doc_count?: number
}

const props = defineProps<{ office: OfficeRecord }>()
const emit  = defineEmits<{
  edit:   [office: OfficeRecord]
  delete: [id: number]
}>()

const { isDark } = useTheme()

// Derive a code from the id if the DB column doesn't exist yet
const derivedCode = computed(() => `OFF-${String(props.office.id).padStart(6, '0')}`)

const qrUri    = computed(() => `flowvision://office/${props.office.id}`)
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
    console.error('[OfficeQrCard] QR generation failed:', err)
  }
}

const downloadQr = () => {
  if (!qrDataUrl.value) return
  const anchor = document.createElement('a')
  const safeName = props.office.name.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_')
  anchor.href = qrDataUrl.value
  anchor.download = `QR_${props.office.code ?? derivedCode.value}_${safeName}.png`
  anchor.click()
}

const formatDate = (value: string) =>
  value ? new Intl.DateTimeFormat('en', { month: 'short', day: '2-digit', year: 'numeric' }).format(new Date(value)) : '—'

onMounted(generateQr)
</script>
