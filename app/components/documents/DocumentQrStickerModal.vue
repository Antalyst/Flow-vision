<template>
  <Teleport to="body">
    <Transition name="sticker-fade">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-[100] flex items-center justify-center p-4 print:hidden"
        @click.self="emit('close')"
      >
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" />

        <div
          ref="stickerRef"
          class="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border shadow-2xl"
          :class="surfaceClass"
        >
          <header class="flex items-start justify-between gap-3 border-b px-5 py-4" :class="borderClass">
            <div>
              <p class="text-[13px] font-bold uppercase tracking-widest text-candy-orange">Print Sticker</p>
              <h2 class="mt-1 text-lg font-bold" :class="headingClass">QR Tracking Label</h2>
              <p class="mt-1 text-xs" :class="mutedClass">
                Attach this label to the physical hard-copy.
              </p>
            </div>
            <button
              type="button"
              class="inline-flex h-9 w-9 items-center justify-center rounded-xl transition hover:bg-candy-orange/10"
              aria-label="Close"
              @click="emit('close')"
            >
              <Icon name="ph:x-bold" class="h-4 w-4" :class="headingClass" />
            </button>
          </header>

          <div class="space-y-4 px-5 py-5">
            <div
              class="rounded-xl border p-4 text-center"
              :class="isDark ? 'border-onyx-border bg-onyx-black' : 'border-gray-200 bg-white-pure'"
            >
              <p class="mb-1 text-[13px] font-bold uppercase tracking-wider text-candy-orange">Document</p>
              <p class="truncate text-sm font-semibold" :class="headingClass">{{ title }}</p>
              <p v-if="priority" class="mt-1 text-xs" :class="mutedClass">Priority: {{ priority }}</p>
            </div>

            <div
              class="flex flex-col items-center gap-3 rounded-xl border p-6"
              :class="qrFrameClass"
            >
              <canvas ref="qrCanvas" class="h-48 w-48 rounded-lg bg-white-pure p-2 shadow-sm" />
              <p class="break-all text-center font-mono text-[14px]" :class="mutedClass">
                {{ qrPayload }}
              </p>
            </div>

            <p class="text-center text-xs" :class="mutedClass">
              Scan with the FlowVision messenger app to claim pickup.
            </p>
          </div>

          <footer class="flex gap-3 border-t px-5 py-4 print:hidden" :class="borderClass">
            <button
              type="button"
              class="flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold transition hover:bg-candy-orange/10"
              :class="isDark ? 'border-onyx-border text-white' : 'border-gray-200 text-onyx-black'"
              @click="emit('close')"
            >
              Done
            </button>
            <button
              type="button"
              class="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-candy-orange px-4 py-2.5 text-sm font-semibold text-white-pure shadow-lg shadow-candy-orange/25 transition hover:bg-candy-hover"
              @click="handlePrint"
            >
              <Icon name="ph:printer-fill" class="h-4 w-4" />
              Print Sticker
            </button>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import QRCode from 'qrcode'

const props = defineProps<{
  isOpen: boolean
  title: string
  qrPayload: string
  priority?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const { isDark } = useTheme()
const qrCanvas = ref<HTMLCanvasElement | null>(null)
const stickerRef = ref<HTMLElement | null>(null)

const surfaceClass = computed(() =>
  isDark.value
    ? 'border-onyx-border bg-onyx-card text-white-pure'
    : 'border-gray-200 bg-white-surface text-onyx-black'
)
const borderClass = computed(() => (isDark.value ? 'border-onyx-border' : 'border-gray-200'))
const headingClass = computed(() => (isDark.value ? 'text-white-pure' : 'text-onyx-black'))
const mutedClass = computed(() => (isDark.value ? 'text-white-muted' : 'text-gray-500'))
const qrFrameClass = computed(() =>
  isDark.value ? 'border-onyx-border bg-onyx-sidebar' : 'border-gray-200 bg-white-muted'
)

const renderQr = async () => {
  if (!props.isOpen || !props.qrPayload || !qrCanvas.value) return
  try {
    await QRCode.toCanvas(qrCanvas.value, props.qrPayload, {
      width: 192,
      margin: 1,
      color: {
        dark: '#1A1A1A',
        light: '#FFFFFF',
      },
    })
  } catch {
    /* non-fatal */
  }
}

watch(
  () => [props.isOpen, props.qrPayload] as const,
  async ([open]) => {
    if (open) {
      await nextTick()
      await renderQr()
    }
  },
  { immediate: true },
)

const handlePrint = () => {
  window.print()
}
</script>

<style scoped>
.sticker-fade-enter-active,
.sticker-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.sticker-fade-enter-from,
.sticker-fade-leave-to {
  opacity: 0;
  transform: scale(0.97);
}

@media print {
  body * {
    visibility: hidden;
  }
  .relative.z-10,
  .relative.z-10 * {
    visibility: visible;
  }
  .relative.z-10 {
    position: fixed;
    inset: 0;
    margin: auto;
    max-width: 100%;
    box-shadow: none;
    border: none;
  }
}
</style>
