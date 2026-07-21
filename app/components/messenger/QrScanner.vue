<template>
  <div class="relative w-full">
    <!-- Camera viewport -->
    <div
      class="relative overflow-hidden rounded-2xl bg-black"
      :style="{ aspectRatio: '1 / 1', maxWidth: '360px', margin: '0 auto' }"
    >
      <!-- html5-qrcode target (Web Viewport) -->
      <div v-show="!isNativeCapacitor" :id="scannerId" class="absolute inset-0 w-full h-full" />

      <!-- Native Capacitor Camera Interface (Bypasses WebView 'getUserMedia' limitations) -->
      <div
        v-if="isNativeCapacitor && !result"
        class="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gray-900 px-6 text-center"
      >
        <Icon name="ph:camera-fill" class="h-12 w-12 text-amber-500" />
        <p class="text-sm font-semibold text-white">Native Camera Ready</p>
        <p class="text-xs text-gray-400">Tap below to securely launch the native camera and scan a QR code.</p>
        <button
          type="button"
          class="mt-2 rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-bold text-white transition shadow-lg shadow-amber-500/20 hover:bg-amber-600 active:scale-[0.98]"
          @click="startNativeCamera"
        >
          Open Native Camera
        </button>
      </div>

      <!-- Overlay: scanning frame + corner brackets (Only Web) -->
      <div
        v-if="isScanning && !result && !isNativeCapacitor"
        class="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <div class="absolute inset-0 bg-black/30" />
        <div class="relative z-10 h-52 w-52">
          <span class="absolute top-0 left-0 h-10 w-10 border-t-4 border-l-4 rounded-tl-xl border-amber-400" />
          <span class="absolute top-0 right-0 h-10 w-10 border-t-4 border-r-4 rounded-tr-xl border-amber-400" />
          <span class="absolute bottom-0 left-0 h-10 w-10 border-b-4 border-l-4 rounded-bl-xl border-amber-400" />
          <span class="absolute bottom-0 right-0 h-10 w-10 border-b-4 border-r-4 rounded-br-xl border-amber-400" />
          <div class="absolute inset-x-2 h-0.5 bg-amber-400/80 shadow-[0_0_8px_rgba(245,158,11,0.8)] scan-laser" />
        </div>
        <p class="absolute bottom-4 left-0 right-0 text-center text-xs font-semibold text-white/80">
          Align QR code within the frame
        </p>
      </div>

      <!-- Camera permission denied overlay (Web Fallback) -->
      <div
        v-if="permissionDenied"
        class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/90 px-6 text-center"
      >
        <Icon name="ph:camera-slash-fill" class="h-10 w-10 text-amber-500/70" />
        <p class="text-sm font-semibold text-white">Camera access denied</p>
        <p class="text-xs text-gray-400">Enable camera permissions, then reload.</p>
      </div>

      <!-- Initialising overlay -->
      <div
        v-if="!isScanning && !permissionDenied && !result && !isNativeCapacitor"
        class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80"
      >
        <Icon name="ph:spinner-gap" class="h-8 w-8 animate-spin text-amber-400" />
        <p class="text-xs font-semibold text-white/80">Starting camera…</p>
      </div>
    </div>

    <!-- Controls below viewport -->
    <div class="mt-4 flex items-center justify-center gap-3">
      <button
        v-if="isScanning && !result && !isNativeCapacitor"
        type="button"
        class="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
        @click="toggleTorch"
      >
        <Icon :name="torchOn ? 'ph:flashlight-fill' : 'ph:flashlight'" class="h-4 w-4 text-amber-400" />
        {{ torchOn ? 'Torch On' : 'Torch Off' }}
      </button>

      <button
        v-if="result"
        type="button"
        class="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-amber-600 active:scale-[0.98]"
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
