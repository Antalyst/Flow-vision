<template>
  <div class="relative w-full">
    <!-- Camera viewport -->
    <div
      class="relative overflow-hidden rounded-2xl bg-black/95 shadow-xl w-full max-w-[400px] aspect-square mx-auto"
      :class="{ 'mirror-feed': isFrontFacingCamera }"
    >
      <!-- html5-qrcode target (Web Viewport) -->
      <div v-show="!isNativeCapacitor" :id="scannerId" class="absolute inset-0 w-full h-full" />

      <!-- Native Capacitor Camera Interface (Bypasses WebView 'getUserMedia' limitations) -->
      <div
        v-if="isNativeCapacitor && !result"
        class="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-gradient-to-br from-black/80 to-gray-950/90 backdrop-blur-md px-6 text-center"
      >
        <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 border border-white/10 shadow-lg" :class="primaryShadowClass">
          <Icon name="ph:camera-plus-fill" class="h-8 w-8" :class="primaryTextClass" />
        </div>
        <div>
          <p class="text-base font-bold text-white tracking-tight">Camera Ready</p>
          <p class="mt-1.5 text-xs leading-relaxed text-gray-400 max-w-[240px] mx-auto">
            Securely launch your device camera to scan a QR code payload.
          </p>
        </div>
        <button
          type="button"
          class="mt-2 rounded-xl px-7 py-3 text-sm font-bold text-white transition shadow-lg active:scale-[0.98]"
          :class="[primaryBgClass, primaryShadowClass, hoverPrimaryBgClass]"
          @click="startNativeCamera"
        >
          Open Camera
        </button>
      </div>

      <!-- Overlay: scanning frame + corner brackets (Only Web) -->
      <div
        v-if="isScanning && !result && !isNativeCapacitor"
        class="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <div class="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
        <div class="relative z-10 h-[220px] w-[220px]">
          <!-- Top Left -->
          <span class="absolute top-0 left-0 h-10 w-10 border-t-[3px] border-l-[3px] rounded-tl-2xl" :class="primaryBorderClass" />
          <!-- Top Right -->
          <span class="absolute top-0 right-0 h-10 w-10 border-t-[3px] border-r-[3px] rounded-tr-2xl" :class="primaryBorderClass" />
          <!-- Bottom Left -->
          <span class="absolute bottom-0 left-0 h-10 w-10 border-b-[3px] border-l-[3px] rounded-bl-2xl" :class="primaryBorderClass" />
          <!-- Bottom Right -->
          <span class="absolute bottom-0 right-0 h-10 w-10 border-b-[3px] border-r-[3px] rounded-br-2xl" :class="primaryBorderClass" />
          <!-- Laser -->
          <div class="absolute inset-x-2 h-0.5 opacity-80 scan-laser" :class="[primaryBgClass, primaryShadowClass]" />
        </div>
        <div class="absolute bottom-6 left-0 right-0 text-center">
          <span class="inline-flex items-center gap-2 rounded-full bg-black/60 backdrop-blur-md px-4 py-2 text-xs font-semibold tracking-wide text-white/90 border border-white/10">
            <Icon name="ph:corners-out-fill" class="h-3.5 w-3.5 opacity-70" />
            Align QR in frame
          </span>
        </div>
      </div>

      <!-- Camera permission denied overlay (Web Fallback) -->
      <div
        v-if="permissionDenied"
        class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/90 backdrop-blur-sm px-6 text-center"
      >
        <Icon name="ph:camera-slash-fill" class="h-10 w-10 text-red-500/70" />
        <p class="text-sm font-semibold text-white">Camera Access Denied</p>
        <p class="text-xs text-gray-400 max-w-[200px]">Please enable camera permissions in your browser or device settings.</p>
      </div>

      <!-- Initialising overlay -->
      <div
        v-if="!isScanning && !permissionDenied && !result && !isNativeCapacitor"
        class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/90 backdrop-blur-sm"
      >
        <Icon name="ph:spinner-gap" class="h-8 w-8 animate-spin" :class="primaryTextClass" />
        <p class="text-xs font-semibold tracking-wide text-white/80">Starting Engine…</p>
      </div>
    </div>

    <!-- Controls below viewport -->
    <div class="mt-4 flex items-center justify-center gap-3">
      <button
        v-if="isScanning && !result && !isNativeCapacitor"
        type="button"
        class="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-white/10 active:scale-[0.98]"
        @click="toggleTorch"
      >
        <Icon :name="torchOn ? 'ph:flashlight-fill' : 'ph:flashlight'" class="h-4 w-4" :class="primaryTextClass" />
        {{ torchOn ? 'Torch On' : 'Torch Off' }}
      </button>

      <button
        v-if="result"
        type="button"
        class="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition active:scale-[0.98]"
        :class="[primaryBgClass, primaryShadowClass, hoverPrimaryBgClass]"
        @click="rescan"
      >
        <Icon name="ph:arrows-clockwise-bold" class="h-4 w-4" />
        Scan Again
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { resolveCameraConstraint, useMessengerSettings } from '~/composables/useMessengerSettings'

const props = defineProps<{
  scannerId?: string
  fps?: number
  qrboxSize?: number
  themeColor?: 'amber' | 'orange' | 'blue'
}>()

const emit = defineEmits<{
  scan:  [rawValue: string]
  error: [message: string]
}>()

const id          = props.scannerId ?? `qr-scanner-${Math.random().toString(36).slice(2, 7)}`
const scannerId   = id
const isScanning  = ref(false)
const permissionDenied = ref(false)
const result      = ref<string | null>(null)
const torchOn     = ref(false)
const { defaultCameraDeviceId } = useMessengerSettings()

// Only mirror for an actual front/selfie camera — the scanner defaults to
// the rear ("environment") camera for scanning a QR on a desk/document, and
// mirroring that flips left/right relative to reality, making it hard to
// line the code up in frame. A front camera still gets the natural mirror.
const isFrontFacingCamera = computed(() => defaultCameraDeviceId.value === 'user')

const primaryBgClass = computed(() => props.themeColor === 'orange' ? 'bg-candy-orange' : props.themeColor === 'blue' ? 'bg-blue-500' : 'bg-amber-500')
const primaryTextClass = computed(() => props.themeColor === 'orange' ? 'text-candy-orange' : props.themeColor === 'blue' ? 'text-blue-500' : 'text-amber-500')
const primaryBorderClass = computed(() => props.themeColor === 'orange' ? 'border-candy-orange' : props.themeColor === 'blue' ? 'border-blue-400' : 'border-amber-400')
const primaryShadowClass = computed(() => props.themeColor === 'orange' ? 'shadow-candy-orange/20' : props.themeColor === 'blue' ? 'shadow-blue-500/20' : 'shadow-[0_4px_14px_rgba(245,158,11,0.2)]')
const hoverPrimaryBgClass = computed(() => props.themeColor === 'orange' ? 'hover:bg-[#D96518]' : props.themeColor === 'blue' ? 'hover:bg-blue-600' : 'hover:bg-amber-600')

// 1. Detect if running inside a Capacitor wrapper environment
const isNativeCapacitor = ref(false)

if (import.meta.client) {
  // @ts-ignore - Safely check the window object for Capacitor runtime injections
  isNativeCapacitor.value = !!window.Capacitor?.isNativePlatform()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let scannerInstance: any = null

function getCameraConfig() {
  return resolveCameraConstraint(defaultCameraDeviceId.value)
}

const onDecodeSuccess = (rawValue: string) => {
  if (result.value === rawValue) return
  result.value = rawValue
  emit('scan', rawValue)
  scannerInstance?.pause(true)
}

const onDecodeError = (_err: unknown) => {
  // Continuous decode errors are normal
}

// 2. Bypass browser-level validation and directly initialize the Native Camera
const startNativeCamera = async () => {
  try {
    // Launch the actual OS-level native camera app
    const image = await Camera.getPhoto({
      quality: 100,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
    })

    if (image.webPath) {
      // Decode the captured native photo using html5-qrcode's static file decoder
      const response = await fetch(image.webPath)
      const blob = await response.blob()
      const file = new File([blob], 'qr_snapshot.jpg', { type: 'image/jpeg' })

      const { Html5Qrcode } = await import('html5-qrcode')
      const staticDecoder = new Html5Qrcode(id)
      
      try {
        const decodedResult = await staticDecoder.scanFile(file, false)
        result.value = decodedResult
        emit('scan', decodedResult)
      } catch (decodeErr) {
        emit('error', 'No QR code found in the captured image. Please try again.')
      }
    }
  } catch (err: any) {
    if (err.message && !err.message.includes('User cancelled')) {
      emit('error', 'Native Camera Failed: ' + err.message)
    }
  }
}

// Standard Web Initialization
const startScanner = async () => {
  if (!import.meta.client) return

  // Prevent web browser getUserMedia trigger if running natively
  if (isNativeCapacitor.value) {
    // Native users will tap the button to call startNativeCamera()
    return
  }

  try {
    const { Html5Qrcode } = await import('html5-qrcode')
    scannerInstance = new Html5Qrcode(id)

    await scannerInstance.start(
      getCameraConfig(),
      {
        fps:    props.fps ?? 12,
        qrbox:  { width: props.qrboxSize ?? 220, height: props.qrboxSize ?? 220 },
        aspectRatio: 1,
        disableFlip: false,
      },
      onDecodeSuccess,
      onDecodeError,
    )
    isScanning.value = true
  } catch (err: any) {
    const msg = String(err?.message ?? err ?? 'Camera error')
    if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('denied') || msg.toLowerCase().includes('notallowed')) {
      permissionDenied.value = true
    }
    emit('error', msg)
  }
}

const stopScanner = async () => {
  if (!scannerInstance) return
  try {
    if (scannerInstance.isScanning) await scannerInstance.stop()
    scannerInstance.clear()
  } catch { /* ignore */ }
  isScanning.value = false
  scannerInstance  = null
}

const rescan = () => {
  result.value = null
  if (isNativeCapacitor.value) {
    startNativeCamera()
  } else {
    scannerInstance?.resume()
  }
}

const toggleTorch = async () => {
  if (!scannerInstance) return
  try {
    torchOn.value = !torchOn.value
    await scannerInstance.applyVideoConstraints({ advanced: [{ torch: torchOn.value }] })
  } catch { /* torch not supported */ }
}

onMounted(() => {
  if (!isNativeCapacitor.value) {
    startScanner()
  }
})

onBeforeUnmount(stopScanner)

watch(defaultCameraDeviceId, async () => {
  if (isNativeCapacitor.value || !scannerInstance?.isScanning) return
  await stopScanner()
  result.value = null
  await startScanner()
})

defineExpose({ rescan, stopScanner })
</script>

<style scoped>
/* Mirror the web video feed only when a front/selfie camera is active —
   that's the only case where a mirrored preview feels natural. The default
   rear camera (used to scan a QR on a desk/document) must stay unmirrored
   so what's on screen matches reality. Doesn't affect Native Capacitor,
   which uses the OS camera app instead of this <video> element. */
.mirror-feed :deep(video) {
  transform: scaleX(-1);
}

@keyframes scanLaser {
  0%   { top: 8%;  }
  50%  { top: 88%; }
  100% { top: 8%;  }
}
.scan-laser {
  position: absolute;
  left: 8px;
  right: 8px;
  animation: scanLaser 2s ease-in-out infinite;
}
</style>
