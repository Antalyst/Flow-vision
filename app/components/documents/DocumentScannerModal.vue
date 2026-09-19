<template>
  <Teleport to="body">
    <Transition name="drawer-fade">
      <div
        v-if="isOpen && !showSticker"
        class="fixed inset-0 z-[80] bg-black/55 backdrop-blur-sm"
        @click="handleClose"
      />
    </Transition>

    <Transition name="drawer-slide">
      <div
        v-if="isOpen && !showSticker"
        class="fixed bottom-0 right-0 top-0 z-[90] flex w-full max-w-xl flex-col border-l shadow-2xl"
        :class="surfaceClass"
      >
        <header class="flex items-start justify-between gap-4 border-b px-5 py-5" :class="borderClass">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-candy-orange">Documents</p>
            <h2 class="mt-1 text-xl font-bold" :class="headingClass">Scan Physical Document</h2>
            <p class="mt-1 text-xs" :class="mutedClass">{{ stepSubtitle }}</p>
          </div>
          <button
            type="button"
            class="inline-flex h-10 w-10 items-center justify-center rounded-lg transition hover:bg-candy-orange/10"
            aria-label="Close"
            @click="handleClose"
          >
            <Icon name="ph:x-bold" class="h-4 w-4" :class="headingClass" />
          </button>
        </header>

        <div class="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <!-- ══════════ STEP 1: MODE SELECT ══════════ -->
          <div v-if="step === 'mode'" class="space-y-3">
            <button
              type="button"
              class="flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition hover:border-candy-orange/50"
              :class="isDark ? 'border-onyx-border bg-onyx-black/40' : 'border-gray-200 bg-gray-50'"
              @click="selectMode('FIRST_PAGE')"
            >
              <Icon name="ph:file-text-fill" class="h-7 w-7 flex-none text-candy-orange" />
              <span>
                <span class="block text-sm font-semibold" :class="headingClass">First Page Only</span>
                <span class="block text-xs" :class="mutedClass">
                  Scan just the cover/first page. Fast — AI identifies title, sender, subject and date from what's visible.
                </span>
              </span>
            </button>

            <button
              type="button"
              class="flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition hover:border-candy-orange/50"
              :class="isDark ? 'border-onyx-border bg-onyx-black/40' : 'border-gray-200 bg-gray-50'"
              @click="selectMode('FULL_DOCUMENT')"
            >
              <Icon name="ph:files-fill" class="h-7 w-7 flex-none text-candy-orange" />
              <span>
                <span class="block text-sm font-semibold" :class="headingClass">Full Document</span>
                <span class="block text-xs" :class="mutedClass">
                  Scan every page. Pages are combined into one PDF and stored — AI reads all of them.
                </span>
              </span>
            </button>

            <p v-if="startError" class="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
              {{ startError }}
            </p>
          </div>

          <!-- ══════════ STEP 2: CAMERA ══════════ -->
          <div v-else-if="step === 'camera'" class="space-y-4">
            <!-- Live web camera viewport -->
            <div
              v-if="!isNativeCapacitor"
              class="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-2xl bg-black shadow-xl"
            >
              <video ref="videoRef" class="h-full w-full object-cover" autoplay playsinline muted />
              <canvas ref="canvasRef" class="hidden" />

              <!-- Framing guide overlay -->
              <div v-if="cameraReady" class="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
                <div class="h-full w-full rounded-xl border-2 border-dashed border-candy-orange/70" />
              </div>

              <!-- Permission denied -->
              <div
                v-if="permissionDenied"
                class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/90 px-6 text-center"
              >
                <Icon name="ph:camera-slash-fill" class="h-10 w-10 text-red-500/70" />
                <p class="text-sm font-semibold text-white">Camera Access Denied</p>
                <p class="text-xs text-gray-400">Camera permission was denied. Please allow camera access and try again.</p>
                <button type="button" class="mt-2 rounded-lg bg-candy-orange px-4 py-2 text-xs font-semibold text-white" @click="startCamera">
                  Try Again
                </button>
              </div>

              <!-- Camera unavailable -->
              <div
                v-else-if="cameraError"
                class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/90 px-6 text-center"
              >
                <Icon name="ph:warning-circle-fill" class="h-10 w-10 text-amber-500/80" />
                <p class="text-sm font-semibold text-white">Camera Unavailable</p>
                <p class="text-xs text-gray-400">{{ cameraError }}</p>
                <button type="button" class="mt-2 rounded-lg bg-candy-orange px-4 py-2 text-xs font-semibold text-white" @click="startCamera">
                  Retry
                </button>
              </div>

              <!-- Starting -->
              <div
                v-else-if="cameraStarting"
                class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/90"
              >
                <Icon name="ph:spinner-gap" class="h-8 w-8 animate-spin text-candy-orange" />
                <p class="text-xs font-semibold text-white/80">Requesting camera…</p>
              </div>
            </div>

            <!-- Native Capacitor camera trigger -->
            <div
              v-else
              class="mx-auto flex aspect-[3/4] w-full max-w-sm flex-col items-center justify-center gap-4 rounded-2xl bg-black px-6 text-center shadow-xl"
            >
              <Icon name="ph:camera-plus-fill" class="h-10 w-10 text-candy-orange" />
              <p class="text-sm font-semibold text-white">Ready to capture</p>
              <button
                type="button"
                class="rounded-xl bg-candy-orange px-6 py-3 text-sm font-bold text-white shadow-lg disabled:opacity-50"
                :disabled="capturing || !canCaptureMore"
                @click="handleCapture"
              >
                {{ capturing ? 'Opening Camera…' : 'Open Camera' }}
              </button>
            </div>

            <!-- Capture controls (web only — native captures directly via the button above) -->
            <div v-if="!isNativeCapacitor" class="flex items-center justify-center gap-3">
              <button
                type="button"
                class="inline-flex items-center gap-2 rounded-xl bg-candy-orange px-6 py-3 text-sm font-bold text-white shadow-lg shadow-candy-orange/25 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="!cameraReady || capturing || !canCaptureMore"
                @click="handleCapture"
              >
                <Icon name="ph:camera-fill" class="h-4 w-4" />
                {{ capturing ? 'Capturing…' : !canCaptureMore ? 'Page Captured' : 'Capture' }}
              </button>
            </div>

            <!-- Captured page strip -->
            <div v-if="capturedPages.length" class="space-y-2">
              <p class="text-xs font-semibold uppercase tracking-wide" :class="mutedClass">
                Captured Pages ({{ capturedPages.length }})
              </p>
              <div class="flex gap-2 overflow-x-auto pb-1">
                <div
                  v-for="(page, idx) in capturedPages"
                  :key="page.url"
                  class="relative flex-none"
                >
                  <img :src="page.url" class="h-20 w-16 rounded-lg border object-cover" :class="borderClass" />
                  <span class="absolute left-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">{{ idx + 1 }}</span>
                  <button
                    type="button"
                    class="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow"
                    aria-label="Remove page"
                    @click="removePage(idx)"
                  >
                    <Icon name="ph:x-bold" class="h-2.5 w-2.5" />
                  </button>
                </div>
              </div>
            </div>

            <p v-if="captureError" class="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
              {{ captureError }}
            </p>

            <div class="flex items-center justify-between gap-3 border-t pt-4" :class="borderClass">
              <button type="button" class="text-xs font-semibold" :class="mutedClass" @click="backToModeSelect">
                ← Change Mode
              </button>
              <button
                type="button"
                class="inline-flex items-center gap-2 rounded-xl bg-candy-orange px-5 py-2.5 text-sm font-semibold text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="!capturedPages.length || analyzing"
                @click="handleDoneScanning"
              >
                <Icon name="ph:sparkle-fill" class="h-4 w-4" />
                {{ scanMode === 'FIRST_PAGE' ? 'Analyze Page' : `Done Scanning (${capturedPages.length})` }}
              </button>
            </div>
          </div>

          <!-- ══════════ STEP 3: ANALYZING ══════════ -->
          <div v-else-if="step === 'analyzing'" class="flex flex-col items-center justify-center gap-4 py-20">
            <Icon name="ph:sparkle-fill" class="h-10 w-10 animate-pulse text-candy-orange" />
            <p class="text-sm font-semibold" :class="headingClass">Reading your document…</p>
            <p class="text-xs" :class="mutedClass">Groq Vision is extracting visible details. This won't take long.</p>
          </div>

          <!-- ══════════ STEP 4: REVIEW ══════════ -->
          <div v-else-if="step === 'review'" class="space-y-5">
            <!-- AI failure banner -->
            <div v-if="aiError && !aiSkipped" class="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-600 dark:text-amber-400">
              <p class="font-semibold">AI analysis failed.</p>
              <p class="mt-1 text-xs opacity-90">{{ aiError }} Your scan has been preserved.</p>
              <div class="mt-3 flex gap-2">
                <button type="button" class="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white" @click="retryAnalysis">
                  Retry AI Analysis
                </button>
                <button type="button" class="rounded-lg border border-amber-500/40 px-3 py-1.5 text-xs font-bold text-amber-600 dark:text-amber-400" @click="continueManually">
                  Continue Manually
                </button>
              </div>
            </div>

            <template v-else>
              <div v-if="!aiSkipped" class="rounded-2xl border p-4" :class="isDark ? 'border-white/10 bg-white/[0.03]' : 'border-gray-200 bg-gray-50'">
                <div class="flex items-center justify-between gap-2">
                  <div class="flex items-center gap-2 text-sm font-semibold text-candy-orange">
                    <Icon name="ph:sparkle-fill" class="h-4 w-4" />
                    AI Document Analysis
                  </div>
                  <span class="text-xs font-bold" :class="mutedClass">Confidence: {{ Math.round(analysis?.confidence ?? 0) }}%</span>
                </div>
                <div class="mt-3 flex flex-wrap gap-2 text-xs">
                  <span class="inline-flex items-center gap-1 rounded-full border px-2 py-1" :class="detectionPillClass(containsSignature)">
                    <Icon :name="containsSignature ? 'ph:check-circle-fill' : 'ph:circle'" class="h-3 w-3" /> Signature
                  </span>
                  <span class="inline-flex items-center gap-1 rounded-full border px-2 py-1" :class="detectionPillClass(containsLetterhead)">
                    <Icon :name="containsLetterhead ? 'ph:check-circle-fill' : 'ph:circle'" class="h-3 w-3" /> Letterhead
                  </span>
                  <span class="inline-flex items-center gap-1 rounded-full border px-2 py-1" :class="detectionPillClass(containsStamp)">
                    <Icon :name="containsStamp ? 'ph:check-circle-fill' : 'ph:circle'" class="h-3 w-3" /> Stamp
                  </span>
                  <span class="inline-flex items-center gap-1 rounded-full border px-2 py-1" :class="detectionPillClass(containsSeal)">
                    <Icon :name="containsSeal ? 'ph:check-circle-fill' : 'ph:circle'" class="h-3 w-3" /> Seal
                  </span>
                </div>
              </div>
              <p v-else class="text-xs" :class="mutedClass">
                Continuing without AI — fill in the details manually below.
              </p>

              <label class="block">
                <span class="text-sm font-semibold" :class="headingClass">Document Type</span>
                <input v-model="documentType" type="text" placeholder="e.g. Memorandum" class="mt-2 w-full rounded-lg border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-candy-orange" :class="inputClass" />
                <p v-if="!aiSkipped && !documentType" class="mt-1 text-[11px]" :class="mutedClass">Not detected / Unknown</p>
              </label>

              <label class="block">
                <span class="text-sm font-semibold" :class="headingClass">Title <span class="text-red-500">*</span></span>
                <input v-model="title" type="text" required maxlength="200" placeholder="Document title" class="mt-2 w-full rounded-lg border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-candy-orange" :class="inputClass" />
              </label>

              <div class="grid grid-cols-2 gap-3">
                <label class="block">
                  <span class="text-sm font-semibold" :class="headingClass">Sender</span>
                  <input v-model="sender" type="text" placeholder="Not detected" class="mt-2 w-full rounded-lg border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-candy-orange" :class="inputClass" />
                </label>
                <label class="block">
                  <span class="text-sm font-semibold" :class="headingClass">Recipient</span>
                  <input v-model="recipient" type="text" placeholder="Not detected" class="mt-2 w-full rounded-lg border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-candy-orange" :class="inputClass" />
                </label>
              </div>

              <label class="block">
                <span class="text-sm font-semibold" :class="headingClass">Subject</span>
                <input v-model="subject" type="text" placeholder="Not detected" class="mt-2 w-full rounded-lg border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-candy-orange" :class="inputClass" />
              </label>

              <label class="block">
                <span class="text-sm font-semibold" :class="headingClass">Document Date</span>
                <input v-model="documentDate" type="date" class="mt-2 w-full rounded-lg border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-candy-orange" :class="inputClass" />
              </label>

              <label class="block">
                <span class="text-sm font-semibold" :class="headingClass">Summary</span>
                <textarea v-model="summary" rows="3" placeholder="Not detected" class="mt-2 w-full resize-none rounded-lg border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-candy-orange" :class="inputClass" />
              </label>

              <fieldset>
                <legend class="text-sm font-semibold" :class="headingClass">Priority</legend>
                <div class="mt-2 grid grid-cols-3 gap-2">
                  <label
                    v-for="opt in priorityOptions"
                    :key="opt.value"
                    class="flex cursor-pointer flex-col items-center gap-1 rounded-lg border px-3 py-3 text-center text-xs font-semibold transition"
                    :class="priority === opt.value ? 'border-candy-orange bg-candy-orange/10 text-candy-orange' : (isDark ? 'border-onyx-border text-white-muted' : 'border-gray-200 text-gray-600')"
                  >
                    <input v-model="priority" type="radio" :value="opt.value" class="sr-only" />
                    <Icon :name="opt.icon" class="h-4 w-4" />
                    {{ opt.label }}
                  </label>
                </div>
              </fieldset>

              <div v-if="!aiSkipped" class="grid grid-cols-2 gap-2 text-xs">
                <label class="flex items-center gap-2"><input v-model="containsSignature" type="checkbox" class="accent-candy-orange" /> Signature visible</label>
                <label class="flex items-center gap-2"><input v-model="containsLetterhead" type="checkbox" class="accent-candy-orange" /> Letterhead visible</label>
                <label class="flex items-center gap-2"><input v-model="containsStamp" type="checkbox" class="accent-candy-orange" /> Stamp visible</label>
                <label class="flex items-center gap-2"><input v-model="containsSeal" type="checkbox" class="accent-candy-orange" /> Seal visible</label>
              </div>

              <hr :class="borderClass" />

              <!-- Employee: origin office -->
              <label v-if="role === 'employee'" class="block">
                <span class="text-sm font-semibold" :class="headingClass">Origin Office</span>
                <select v-model="originOfficeId" class="mt-2 w-full rounded-lg border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-candy-orange" :class="inputClass" required>
                  <option value="" disabled>Select your sub-office</option>
                  <option v-for="office in myOffices" :key="office.id" :value="String(office.id)">{{ office.name }}</option>
                </select>
              </label>

              <label class="block">
                <span class="text-sm font-semibold" :class="headingClass">Document Category <span class="text-red-500">*</span></span>
                <select v-model="categoryId" class="mt-2 w-full rounded-lg border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-candy-orange" :class="inputClass" required>
                  <option value="" disabled>Select a category</option>
                  <option v-for="cat in categoriesStore.categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                </select>
              </label>

              <label class="block">
                <span class="text-sm font-semibold" :class="headingClass">Target Route <span class="text-red-500">*</span></span>
                <select v-model="stageId" class="mt-2 w-full rounded-lg border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-candy-orange" :class="inputClass" required>
                  <option value="" disabled>Select a workflow route</option>
                  <option v-for="stage in visibleStages" :key="stage.stage_id" :value="String(stage.stage_id)">{{ stage.name }}</option>
                </select>
              </label>
            </template>

            <p v-if="registerError" class="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
              {{ registerError }}
            </p>
          </div>
        </div>

        <footer v-if="step === 'review' && !(aiError && !aiSkipped)" class="flex gap-3 border-t px-5 py-4" :class="borderClass">
          <button type="button" class="rounded-xl border px-4 py-3 text-sm font-semibold transition" :class="isDark ? 'border-onyx-border text-white' : 'border-gray-200 text-gray-900'" :disabled="registering" @click="backToCamera">
            Retake Scan
          </button>
          <button
            type="button"
            class="flex flex-1 items-center justify-center gap-2 rounded-xl bg-candy-orange px-4 py-3 text-sm font-semibold text-white-pure shadow-lg shadow-candy-orange/25 transition hover:bg-candy-hover disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="!canSubmit"
            @click="handleRegister"
          >
            <Icon v-if="registering" name="ph:spinner-gap" class="h-4 w-4 animate-spin" />
            <Icon v-else name="ph:qr-code-bold" class="h-4 w-4" />
            {{ registering ? 'Registering…' : 'Confirm & Register' }}
          </button>
        </footer>
      </div>
    </Transition>

    <DocumentQrStickerModal
      :is-open="showSticker"
      :title="registeredTitle"
      :qr-payload="registeredQr"
      :priority="priority"
      @close="handleStickerClose"
    />
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useStageStore } from '~/stores/stage'
import { useOfficeStore } from '~/stores/office'
import { useAuthStore } from '~/stores/auth'
import { useCategoriesStore } from '~/stores/categories'
import DocumentQrStickerModal from './DocumentQrStickerModal.vue'

type DocumentRole = 'client' | 'employee'
type ScanMode = 'FIRST_PAGE' | 'FULL_DOCUMENT'
type Priority = 'High' | 'Medium' | 'Low'
type Step = 'mode' | 'camera' | 'analyzing' | 'review'

interface EnrichedStage {
  stage_id: number | string
  name: string
  office_id?: string | null
}

interface ScanAnalysisResult {
  model: string
  document_type: string | null
  title: string | null
  sender: string | null
  recipient: string | null
  subject: string | null
  document_date: string | null
  summary: string | null
  priority: Priority | null
  contains_signature: boolean
  contains_letterhead: boolean
  contains_stamp: boolean
  contains_seal: boolean
  confidence: number
  raw_response: Record<string, unknown>
}

const props = withDefaults(defineProps<{
  isOpen: boolean
  role: DocumentRole
}>(), {})

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'registered'): void
}>()

const stageStore = useStageStore()
const officeStore = useOfficeStore()
const auth = useAuthStore()
const categoriesStore = useCategoriesStore()
const { isDark } = useTheme()

// ── Step / mode state ────────────────────────────────────────────────────
const step = ref<Step>('mode')
const scanMode = ref<ScanMode>('FIRST_PAGE')
const startError = ref('')
const sessionId = ref('')

const stepSubtitle = computed(() => {
  if (step.value === 'mode') return 'Choose how much of the document to capture.'
  if (step.value === 'camera') return scanMode.value === 'FIRST_PAGE' ? 'Capture the first page.' : 'Capture each page in order.'
  if (step.value === 'analyzing') return 'AI is reading the scan…'
  return 'Review and confirm before registering.'
})

// ── Camera state ─────────────────────────────────────────────────────────
const videoRef = ref<HTMLVideoElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
let mediaStream: MediaStream | null = null
const cameraReady = ref(false)
const cameraStarting = ref(false)
const cameraError = ref('')
const permissionDenied = ref(false)
const capturing = ref(false)
const captureError = ref('')

const isNativeCapacitor = ref(false)
if (import.meta.client) {
  // @ts-ignore
  isNativeCapacitor.value = !!window.Capacitor?.isNativePlatform()
}

interface CapturedPage { blob: Blob; url: string }
const capturedPages = ref<CapturedPage[]>([])

// FIRST_PAGE is a one-page contract end-to-end (AI prompt + storage both assume
// exactly one image) — stop the user capturing a second page in that mode; they
// can still remove the page and recapture (acts as "retake").
const canCaptureMore = computed(() => scanMode.value !== 'FIRST_PAGE' || capturedPages.value.length === 0)

async function startCamera() {
  if (!import.meta.client || isNativeCapacitor.value) return
  cameraError.value = ''
  permissionDenied.value = false
  cameraStarting.value = true
  cameraReady.value = false
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false,
    })
    await nextTick()
    if (videoRef.value) {
      videoRef.value.srcObject = mediaStream
      await videoRef.value.play()
      cameraReady.value = true
    }
  } catch (err: any) {
    const name = err?.name || ''
    const msg = String(err?.message || err)
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || msg.toLowerCase().includes('denied')) {
      permissionDenied.value = true
    } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
      cameraError.value = 'No usable camera was found on this device.'
    } else {
      cameraError.value = msg || 'Camera could not be started.'
    }
  } finally {
    cameraStarting.value = false
  }
}

function stopCamera() {
  mediaStream?.getTracks().forEach((t) => t.stop())
  mediaStream = null
  cameraReady.value = false
}

async function captureWebFrame(): Promise<Blob | null> {
  const video = videoRef.value
  if (!video || !video.videoWidth) return null
  const canvas = canvasRef.value ?? document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
  return await new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92))
}

async function captureNativeFrame(): Promise<Blob | null> {
  const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera')
  const photo = await Camera.getPhoto({ quality: 90, allowEditing: false, resultType: CameraResultType.Uri, source: CameraSource.Camera })
  if (!photo.webPath) return null
  const res = await fetch(photo.webPath)
  const rawBlob = await res.blob()
  // Some native webviews return a blob with an empty/generic MIME type for local
  // file:// or capacitor:// URIs, which would fail the server's image/* check.
  // Same guard already used for native capture in QrScanner.vue.
  return rawBlob.type.startsWith('image/') ? rawBlob : new Blob([rawBlob], { type: 'image/jpeg' })
}

async function handleCapture() {
  if (capturing.value) return
  captureError.value = ''
  capturing.value = true
  try {
    const blob = isNativeCapacitor.value ? await captureNativeFrame() : await captureWebFrame()
    if (!blob) {
      captureError.value = 'Capture failed. Please try again.'
      return
    }
    capturedPages.value.push({ blob, url: URL.createObjectURL(blob) })
  } catch (err: any) {
    const msg = String(err?.message || err)
    if (!msg.toLowerCase().includes('cancel')) {
      captureError.value = 'Capture failed: ' + msg
    }
  } finally {
    capturing.value = false
  }
}

function removePage(idx: number) {
  const [removed] = capturedPages.value.splice(idx, 1)
  if (removed) URL.revokeObjectURL(removed.url)
}

function selectMode(mode: ScanMode) {
  scanMode.value = mode
  startError.value = ''
  startScanSession()
}

async function startScanSession() {
  try {
    const res = await $fetch<{ success: boolean; session: { id: string } }>('/api/documents/scan/session', {
      method: 'POST',
      body: { scan_mode: scanMode.value },
    })
    sessionId.value = res.session.id
    step.value = 'camera'
    await nextTick()
    startCamera()
  } catch (err: any) {
    startError.value = err?.data?.message || 'Could not start a scan session. Please try again.'
  }
}

function backToModeSelect() {
  stopCamera()
  capturedPages.value.forEach((p) => URL.revokeObjectURL(p.url))
  capturedPages.value = []
  captureError.value = ''
  step.value = 'mode'
}

function backToCamera() {
  aiError.value = ''
  analysis.value = null
  aiSkipped.value = false
  step.value = 'camera'
  nextTick(() => startCamera())
}

// ── AI analysis ──────────────────────────────────────────────────────────
const analyzing = ref(false)
const analysis = ref<ScanAnalysisResult | null>(null)
const aiError = ref('')
const aiSkipped = ref(false)

async function runAnalysis() {
  analyzing.value = true
  aiError.value = ''
  step.value = 'analyzing'
  try {
    const fd = new FormData()
    fd.append('session_id', sessionId.value)
    fd.append('scan_mode', scanMode.value)
    capturedPages.value.forEach((p, i) => fd.append('pages', p.blob, `page-${i + 1}.jpg`))

    const res = await $fetch<{ success: boolean; analysis: ScanAnalysisResult }>('/api/documents/scan/analyze', {
      method: 'POST',
      body: fd,
    })

    analysis.value = res.analysis
    applyAnalysisToFields(res.analysis)
    aiSkipped.value = false
    step.value = 'review'
  } catch (err: any) {
    aiError.value = err?.data?.message || 'AI analysis failed. You can retry or continue manually.'
    step.value = 'review'
  } finally {
    analyzing.value = false
  }
}

function handleDoneScanning() {
  stopCamera()
  runAnalysis()
}

function retryAnalysis() {
  runAnalysis()
}

function continueManually() {
  aiError.value = ''
  aiSkipped.value = true
  analysis.value = null
  step.value = 'review'
}

function applyAnalysisToFields(a: ScanAnalysisResult) {
  documentType.value = a.document_type ?? ''
  title.value = a.title ?? ''
  sender.value = a.sender ?? ''
  recipient.value = a.recipient ?? ''
  subject.value = a.subject ?? ''
  documentDate.value = a.document_date ?? ''
  summary.value = a.summary ?? ''
  priority.value = a.priority ?? 'Medium'
  containsSignature.value = a.contains_signature
  containsLetterhead.value = a.contains_letterhead
  containsStamp.value = a.contains_stamp
  containsSeal.value = a.contains_seal
}

// ── Review / editable fields ─────────────────────────────────────────────
const documentType = ref('')
const title = ref('')
const sender = ref('')
const recipient = ref('')
const subject = ref('')
const documentDate = ref('')
const summary = ref('')
const priority = ref<Priority>('Medium')
const containsSignature = ref(false)
const containsLetterhead = ref(false)
const containsStamp = ref(false)
const containsSeal = ref(false)

const stageId = ref('')
const categoryId = ref('')
const originOfficeId = ref('')

const priorityOptions = [
  { value: 'High' as Priority, label: 'High', icon: 'ph:warning-circle-fill' },
  { value: 'Medium' as Priority, label: 'Medium', icon: 'ph:minus-circle-fill' },
  { value: 'Low' as Priority, label: 'Low', icon: 'ph:check-circle-fill' },
]

const myOffices = computed(() =>
  officeStore.offices.filter((o) => String(o.assigned_user) === String(auth.user?.user_id)),
)

const allStages = computed<EnrichedStage[]>(() => stageStore.stages as unknown as EnrichedStage[])

const visibleStages = computed<EnrichedStage[]>(() => {
  if (props.role === 'client') return allStages.value
  if (!originOfficeId.value) {
    const myIds = myOffices.value.map((o) => String(o.id))
    return allStages.value.filter((s) => !s.office_id || myIds.includes(String(s.office_id)))
  }
  return allStages.value.filter((s) => !s.office_id || String(s.office_id) === originOfficeId.value)
})

function detectionPillClass(active: boolean) {
  return active
    ? 'border-candy-orange/40 bg-candy-orange/10 text-candy-orange'
    : isDark.value
      ? 'border-onyx-border text-white-muted'
      : 'border-gray-200 text-gray-400'
}

const canSubmit = computed(() =>
  !registering.value &&
  !!title.value.trim() &&
  !!categoryId.value &&
  !!stageId.value &&
  (props.role !== 'employee' || !!originOfficeId.value) &&
  capturedPages.value.length > 0,
)

// ── Registration ─────────────────────────────────────────────────────────
const registering = ref(false)
const registerError = ref('')
const showSticker = ref(false)
const registeredTitle = ref('')
const registeredQr = ref('')

async function handleRegister() {
  if (!canSubmit.value) return
  registering.value = true
  registerError.value = ''
  try {
    const fd = new FormData()
    fd.append('session_id', sessionId.value)
    fd.append('scan_mode', scanMode.value)
    capturedPages.value.forEach((p, i) => fd.append('pages', p.blob, `page-${i + 1}.jpg`))

    fd.append('stage_id', stageId.value)
    fd.append('category_id', categoryId.value)
    if (props.role === 'employee') fd.append('origin_office_id', originOfficeId.value)

    fd.append('ai_skipped', String(aiSkipped.value))
    fd.append('title', title.value.trim())
    fd.append('document_type', documentType.value)
    fd.append('sender', sender.value)
    fd.append('recipient', recipient.value)
    fd.append('subject', subject.value)
    fd.append('document_date', documentDate.value)
    fd.append('summary', summary.value)
    fd.append('priority', priority.value)
    fd.append('contains_signature', String(containsSignature.value))
    fd.append('contains_letterhead', String(containsLetterhead.value))
    fd.append('contains_stamp', String(containsStamp.value))
    fd.append('contains_seal', String(containsSeal.value))
    if (analysis.value) {
      fd.append('model', analysis.value.model)
      fd.append('confidence', String(analysis.value.confidence))
      fd.append('raw_response', JSON.stringify(analysis.value.raw_response ?? {}))
    }

    const res = await $fetch<{ success: boolean; metadata: { title: string; qr_code_data: string } }>('/api/documents/scan/register', {
      method: 'POST',
      body: fd,
    })

    registeredTitle.value = res.metadata.title
    registeredQr.value = res.metadata.qr_code_data
    showSticker.value = true
  } catch (err: any) {
    registerError.value = err?.data?.message || 'Registration failed. Please try again.'
  } finally {
    registering.value = false
  }
}

// ── Theming ───────────────────────────────────────────────────────────
const surfaceClass = computed(() => isDark.value ? 'border-onyx-border bg-onyx-card text-white-pure' : 'border-gray-200 bg-white-surface text-onyx-black')
const borderClass = computed(() => (isDark.value ? 'border-onyx-border' : 'border-gray-200'))
const headingClass = computed(() => (isDark.value ? 'text-white-pure' : 'text-onyx-black'))
const mutedClass = computed(() => (isDark.value ? 'text-white-muted' : 'text-gray-500'))
const inputClass = computed(() =>
  isDark.value
    ? 'border-onyx-border bg-onyx-black text-white-pure placeholder:text-white-muted'
    : 'border-gray-200 bg-white-pure text-onyx-black placeholder:text-gray-400',
)

// ── Reset / lifecycle ─────────────────────────────────────────────────
function resetAll() {
  stopCamera()
  capturedPages.value.forEach((p) => URL.revokeObjectURL(p.url))
  capturedPages.value = []
  step.value = 'mode'
  scanMode.value = 'FIRST_PAGE'
  sessionId.value = ''
  startError.value = ''
  captureError.value = ''
  analysis.value = null
  aiError.value = ''
  aiSkipped.value = false
  documentType.value = ''
  title.value = ''
  sender.value = ''
  recipient.value = ''
  subject.value = ''
  documentDate.value = ''
  summary.value = ''
  priority.value = 'Medium'
  containsSignature.value = false
  containsLetterhead.value = false
  containsStamp.value = false
  containsSeal.value = false
  stageId.value = ''
  categoryId.value = ''
  originOfficeId.value = ''
  registerError.value = ''
  showSticker.value = false
  registeredTitle.value = ''
  registeredQr.value = ''
}

function handleClose() {
  if (registering.value) return
  // Best-effort: mark the abandoned session CANCELLED so it doesn't sit forever
  // in SCANNING/AI_ANALYZING/REVIEW. Never blocks the UI on the result.
  if (sessionId.value) {
    $fetch('/api/documents/scan/cancel', { method: 'POST', body: { session_id: sessionId.value } }).catch(() => {})
  }
  resetAll()
  emit('close')
}

function handleStickerClose() {
  resetAll()
  emit('registered')
  emit('close')
}

watch(
  () => props.isOpen,
  async (open) => {
    if (!open) return
    if (!stageStore.stages.length) await stageStore.fetchStages()
    if (!officeStore.offices.length) await officeStore.fetchOffices()
    if (!categoriesStore.categories.length) await categoriesStore.fetchCategories()
  },
)

onBeforeUnmount(() => {
  stopCamera()
  capturedPages.value.forEach((p) => URL.revokeObjectURL(p.url))
})
</script>

<style scoped>
.drawer-fade-enter-active,
.drawer-fade-leave-active { transition: opacity 0.2s ease; }
.drawer-fade-enter-from,
.drawer-fade-leave-to { opacity: 0; }

.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.drawer-slide-enter-from,
.drawer-slide-leave-to { transform: translateX(100%); }
</style>
