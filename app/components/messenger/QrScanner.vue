<template>
  <div class="relative w-full">
    <!-- Camera viewport -->
    <div
      class="relative overflow-hidden rounded-2xl bg-black/95 shadow-xl w-full max-w-[400px] aspect-square mx-auto"
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
import { findRearCameraDeviceId, resolveCameraConstraint, useMessengerSettings } from '~/composables/useMessengerSettings'

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

// No mirroring, ever, for either camera. FlowVision only ever points the
// camera at an external QR code / document — never at the user's own face —
// so there is no "selfie" convention to satisfy. Mirroring an external QR
// code flips its printed text/pattern backwards relative to reality, which
// is precisely the "inverted camera" symptom this component must avoid.
// (Previously this mirrored the front camera; that was the actual bug —
// see the camera diagnostic notes on startScanner() below.)

// Flat brand color only — no colored glow shadows (see redesign skill).
const primaryBgClass = computed(() => 'bg-candy-orange')
const primaryTextClass = computed(() => 'text-candy-orange')
const primaryBorderClass = computed(() => 'border-candy-orange')
const primaryShadowClass = computed(() => 'shadow-sm')
const hoverPrimaryBgClass = computed(() => 'hover:bg-candy-hover')

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

  const startConfig = {
    fps:    props.fps ?? 12,
    qrbox:  { width: props.qrboxSize ?? 220, height: props.qrboxSize ?? 220 },
    aspectRatio: 1,
    disableFlip: false,
  }

  try {
    const { Html5Qrcode } = await import('html5-qrcode')
    scannerInstance = new Html5Qrcode(id)

    try {
      await scannerInstance.start(getCameraConfig(), startConfig, onDecodeSuccess, onDecodeError)
    } catch (preferredErr: any) {
      // The preferred camera (e.g. a specific saved device, or the rear
      // camera on a device that doesn't report one) can fail to open even
      // though camera access is otherwise granted — fall back to whatever
      // camera the browser can actually provide rather than dead-ending.
      const msg = String(preferredErr?.message ?? preferredErr ?? '')
      if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('denied') || msg.toLowerCase().includes('notallowed')) {
        throw preferredErr
      }
      const cameras = await Html5Qrcode.getCameras().catch(() => [])
      if (!cameras.length) throw preferredErr
      await scannerInstance.start(cameras[0].id, startConfig, onDecodeSuccess, onDecodeError)
    }
    isScanning.value = true

    // ── Camera diagnostic (dev-only) ────────────────────────────────────
    // `facingMode: 'environment'` is only a hint — verify what the browser
    // actually granted. If we asked for the rear camera by default and it
    // silently gave us the front one instead, retry once against a device
    // whose *label* says rear/back/environment, when one is enumerable now
    // that permission has been granted (labels are blank before that).
    try {
      const settings = scannerInstance.getRunningTrackSettings?.() ?? {}
      if (import.meta.dev) {
        // eslint-disable-next-line no-console
        console.info('[QrScanner] resolved camera track:', {
          facingMode: settings.facingMode ?? '(not reported by this browser)',
          deviceId: settings.deviceId ? '(redacted)' : undefined,
          width: settings.width,
          height: settings.height,
        })
      }
      const askedForRearByDefault = defaultCameraDeviceId.value === 'environment'
      if (askedForRearByDefault && settings.facingMode === 'user') {
        const rearDeviceId = await findRearCameraDeviceId()
        if (rearDeviceId) {
          if (import.meta.dev) {
            // eslint-disable-next-line no-console
            console.info('[QrScanner] Browser granted the front camera despite requesting "environment" — retrying with the labeled rear device.')
          }
          await stopScanner()
          scannerInstance = new Html5Qrcode(id)
          await scannerInstance.start(rearDeviceId, startConfig, onDecodeSuccess, onDecodeError)
          isScanning.value = true
        }
      }
    } catch {
      // Diagnostic/verification is best-effort only — never block scanning over it.
    }
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
