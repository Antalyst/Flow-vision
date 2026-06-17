<template>
  <Teleport to="body">
    <Transition name="drawer-fade">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
        @click="handleClose"
      />
    </Transition>

    <Transition name="drawer-slide">
      <form
        v-if="isOpen"
        class="fixed bottom-0 right-0 top-0 z-[90] flex w-full max-w-5xl flex-col border-l shadow-2xl"
        :class="surfaceClass"
        @submit.prevent="handlePrintAndSubmit"
      >
        <!-- ── Header ──────────────────────────────────────────────────── -->
        <header
          class="flex items-start justify-between gap-4 border-b px-6 py-5"
          :class="borderClass"
        >
          <div>
            <div class="mb-1 h-0.5 w-8 rounded-full bg-rich-orange" />
            <p class="text-[10px] font-bold uppercase tracking-widest text-rich-orange">
              {{ scope === 'LOCAL' ? 'Office Document' : 'Organisation Document' }}
            </p>
            <h2 class="mt-1 text-xl font-bold" :class="headingClass">Upload & Analyze</h2>
            <p class="mt-0.5 text-xs" :class="mutedClass">
              AI-analyzed, then split-stored across Supabase and blob storage.
            </p>
          </div>
          <button
            type="button"
            class="inline-flex h-10 w-10 items-center justify-center rounded-xl transition hover:bg-rich-orange/10 hover:text-rich-orange"
            aria-label="Close"
            @click="handleClose"
          >
            <Icon name="ph:x-bold" class="h-4 w-4" :class="headingClass" />
          </button>
        </header>

        <!-- ── Body ───────────────────────────────────────────────────── -->
        <div class="flex flex-1 flex-col gap-5 overflow-hidden px-6 py-5 lg:flex-row">

          <!-- ── LEFT: live document preview ──────────────────────────── -->
          <div class="w-full overflow-y-auto lg:w-7/12">
            <DocumentLivePreview
              :file="selectedFile"
              :tracking-id="currentTrackingId"
              :print-strategy="selectedStrategy"
            />
          </div>

          <!-- ── RIGHT: form fields ────────────────────────────────────── -->
          <div class="w-full space-y-5 overflow-y-auto lg:w-5/12">

            <!-- 1. Origin Office (mandatory) -->
            <div>
              <label class="block">
                <span class="text-sm font-semibold text-rich-orange">
                  Origin Office <span class="text-red-500">*</span>
                </span>
                <p class="mt-0.5 text-[11px]" :class="mutedClass">
                  The physical branch where this hard-copy originates.
                </p>
                <select
                  v-model="selectedOriginOfficeId"
                  class="mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-rich-orange"
                  :class="inputClass"
                  required
                  @change="onOriginOfficeChange"
                >
                  <option value="" :style="optionStyle">Select your office…</option>
                  <option
                    v-for="office in offices"
                    :key="office.id"
                    :value="String(office.id)"
                    :style="optionStyle"
                  >
                    {{ office.name }}
                  </option>
                </select>
                <p v-if="!offices.length" class="mt-1.5 text-xs text-amber-500">
                  No offices assigned. Register a sub-office first in My Offices.
                </p>
              </label>
            </div>

            <!-- 2. Drop zone -->
            <label
              class="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-7 text-center transition"
              :class="isDragging ? 'border-rich-orange bg-rich-orange/10' : borderClass"
              @dragover.prevent="isDragging = true"
              @dragleave.prevent="isDragging = false"
              @drop.prevent="handleDrop"
            >
              <Icon name="ph:cloud-arrow-up" class="h-9 w-9 text-rich-orange" />
              <div>
                <p class="text-sm font-semibold" :class="headingClass">
                  {{ selectedFile ? selectedFile.name : 'Drop a file here or click to browse' }}
                </p>
                <p class="mt-1 text-xs" :class="mutedClass">PDF, DOCX, XLSX, TXT, CSV supported</p>
              </div>
              <input
                ref="fileInput"
                type="file"
                class="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.json"
                @change="handleFileChange"
              />
            </label>

            <!-- Selected file chip -->
            <div
              v-if="selectedFile"
              class="flex items-center justify-between gap-3 rounded-xl border p-3 text-sm"
              :class="isDark ? 'border-white/10 bg-rich-black/40' : 'border-gray-200 bg-gray-50'"
            >
              <div class="flex min-w-0 items-center gap-3">
                <Icon name="ph:file-text" class="h-5 w-5 flex-none text-rich-orange" />
                <div class="min-w-0">
                  <p class="truncate font-semibold" :class="headingClass">{{ selectedFile.name }}</p>
                  <p class="text-xs" :class="mutedClass">{{ formatSize(selectedFile.size) }}</p>
                </div>
              </div>
              <button
                type="button"
                class="inline-flex h-8 w-8 items-center justify-center rounded-xl text-red-500 transition hover:bg-red-500/10"
                aria-label="Remove file"
                @click="clearFile"
              >
                <Icon name="ph:trash" class="h-4 w-4" />
              </button>
            </div>

            <!-- ══════════════════════════════════════════════════════════ -->
            <!-- 3. ROUTING PATHWAY PICKER                                 -->
            <!-- ══════════════════════════════════════════════════════════ -->
            <div>
              <!-- Section label + scope tab toggle -->
              <div class="flex items-center justify-between gap-3">
                <div>
                  <span class="text-sm font-semibold" :class="headingClass">
                    Routing Pathway <span class="text-red-500">*</span>
                  </span>
                  <p class="mt-0.5 text-[11px]" :class="mutedClass">
                    Where the messenger must physically carry this document.
                  </p>
                </div>

                <!-- Dual-scope tab toggle -->
                <div
                  class="flex flex-none items-center rounded-xl border p-0.5 text-xs"
                  :class="isDark ? 'border-white/10 bg-white/[0.04]' : 'border-gray-200 bg-gray-100'"
                >
                  <button
                    v-for="tab in routeTabs"
                    :key="tab.value"
                    type="button"
                    class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition-all duration-200 select-none"
                    :class="routeTab === tab.value
                      ? 'bg-rich-orange text-white shadow'
                      : isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'"
                    @click="routeTab = tab.value"
                  >
                    <Icon :name="tab.icon" class="h-3 w-3" />
                    {{ tab.label }}
                  </button>
                </div>
              </div>

              <!-- Route description line -->
              <p class="mt-2 text-[11px]" :class="mutedClass">
                <span v-if="routeTab === 'global'">
                  <Icon name="ph:globe-hemisphere-west-fill" class="inline h-3 w-3 text-rich-orange" />
                  Organisation-wide routes created by your Client Admin — available to all offices.
                </span>
                <span v-else>
                  <Icon name="ph:buildings-fill" class="inline h-3 w-3 text-rich-orange" />
                  Custom routes built specifically for
                  <span class="font-semibold text-rich-orange">{{ selectedOriginOfficeName || 'your office' }}</span>.
                </span>
              </p>

              <!-- Route cards list -->
              <div
                class="mt-3 max-h-52 space-y-2 overflow-y-auto pr-0.5"
                :class="{ 'opacity-50 pointer-events-none': !selectedOriginOfficeId && routeTab === 'local' }"
              >
                <!-- No origin warning for local tab -->
                <div
                  v-if="routeTab === 'local' && !selectedOriginOfficeId"
                  class="flex items-center gap-2 rounded-xl border border-dashed px-4 py-3 text-xs"
                  :class="isDark ? 'border-white/10 text-gray-500' : 'border-gray-200 text-gray-400'"
                >
                  <Icon name="ph:warning" class="h-4 w-4 text-amber-500" />
                  Select your origin office first to see local routes.
                </div>

                <!-- Empty state -->
                <div
                  v-else-if="!visibleRoutes.length"
                  class="flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-5 text-center text-xs"
                  :class="isDark ? 'border-white/10 text-gray-500' : 'border-gray-200 text-gray-400'"
                >
                  <Icon name="ph:path" class="h-6 w-6" :class="mutedClass" />
                  <span>
                    No {{ routeTab === 'global' ? 'global' : 'local' }} routes found.
                    <template v-if="routeTab === 'local'">
                      <NuxtLink to="/employee/stages" class="text-rich-orange hover:underline">Create one</NuxtLink> in Stages.
                    </template>
                  </span>
                </div>

                <!-- Route card -->
                <button
                  v-for="stage in visibleRoutes"
                  :key="stage.stage_id"
                  type="button"
                  class="group w-full rounded-xl border px-4 py-3 text-left transition-all duration-200 hover:border-rich-orange/40"
                  :class="selectedStageId === String(stage.stage_id)
                    ? isDark
                      ? 'border-rich-orange bg-rich-orange/10 shadow-md shadow-rich-orange/10'
                      : 'border-rich-orange bg-orange-50 shadow-md shadow-rich-orange/10'
                    : isDark ? 'border-white/10 hover:bg-white/[0.03]' : 'border-gray-200 hover:bg-gray-50'"
                  @click="selectRoute(stage)"
                >
                  <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center gap-2">
                        <!-- Selected checkmark -->
                        <div
                          class="flex h-4 w-4 flex-none items-center justify-center rounded-full transition-all"
                          :class="selectedStageId === String(stage.stage_id)
                            ? 'bg-rich-orange'
                            : isDark ? 'border border-white/20' : 'border border-gray-300'"
                        >
                          <Icon
                            v-if="selectedStageId === String(stage.stage_id)"
                            name="ph:check-bold"
                            class="h-2.5 w-2.5 text-white"
                          />
                        </div>
                        <span class="text-sm font-semibold" :class="headingClass">{{ stage.name }}</span>
                      </div>

                      <!-- Mini stop-name pills -->
                      <div v-if="getRouteSteps(stage.stage_id).length" class="mt-2 flex flex-wrap gap-1">
                        <span
                          v-for="(stop, idx) in getRouteStops(stage.stage_id)"
                          :key="idx"
                          class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium"
                          :class="isDark ? 'border-white/10 bg-white/5 text-gray-300' : 'border-gray-200 bg-gray-100 text-gray-600'"
                        >
                          <span class="h-1 w-1 rounded-full bg-rich-orange/60" />
                          {{ stop }}
                        </span>
                        <span
                          v-if="getRouteSteps(stage.stage_id).length > 3"
                          class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium text-rich-orange"
                        >
                          +{{ getRouteSteps(stage.stage_id).length - 3 }} more
                        </span>
                      </div>
                    </div>

                    <!-- Right: stop count badge + scope tag -->
                    <div class="flex flex-none flex-col items-end gap-1.5">
                      <span
                        class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold"
                        :class="routeTab === 'global'
                          ? 'border-blue-400/30 bg-blue-400/10 text-blue-400'
                          : 'border-rich-orange/30 bg-rich-orange/10 text-rich-orange'"
                      >
                        <Icon :name="routeTab === 'global' ? 'ph:globe-hemisphere-west-fill' : 'ph:buildings-fill'" class="h-2.5 w-2.5" />
                        {{ routeTab === 'global' ? 'Global' : 'Local' }}
                      </span>
                      <span class="text-[10px]" :class="mutedClass">
                        {{ getRouteSteps(stage.stage_id).length }} stop{{ getRouteSteps(stage.stage_id).length !== 1 ? 's' : '' }}
                      </span>
                    </div>
                  </div>
                </button>
              </div>

              <!-- ── VISUAL TIMELINE PREVIEW ─────────────────────────── -->
              <Transition name="route-expand">
                <div
                  v-if="selectedStageId && selectedTimelineSteps.length"
                  class="mt-4 overflow-hidden rounded-xl border"
                  :class="isDark
                    ? 'border-rich-orange/20 bg-rich-orange/[0.03]'
                    : 'border-orange-200 bg-orange-50/60'"
                >
                  <!-- Preview header -->
                  <div class="flex items-center justify-between border-b px-4 py-2.5" :class="isDark ? 'border-rich-orange/15' : 'border-orange-200/70'">
                    <div class="flex items-center gap-2">
                      <Icon name="ph:path-fill" class="h-3.5 w-3.5 text-rich-orange" />
                      <span class="text-[11px] font-bold uppercase tracking-wider text-rich-orange">Route Preview</span>
                    </div>
                    <span class="text-[10px]" :class="mutedClass">
                      {{ selectedTimelineSteps.length + 1 }} stops &middot; Messenger run
                    </span>
                  </div>

                  <!-- Horizontal scroll timeline -->
                  <div class="overflow-x-auto px-4 py-4">
                    <div class="flex min-w-max items-start gap-0">

                      <!-- ── Origin node (always first) ─────────────── -->
                      <div class="flex flex-col items-center" style="min-width: 80px">
                        <div class="relative flex h-10 w-10 items-center justify-center rounded-full bg-rich-orange shadow-lg shadow-rich-orange/40">
                          <Icon name="ph:map-pin-fill" class="h-5 w-5 text-white" />
                          <!-- Pulse ring -->
                          <span class="absolute inset-0 animate-ping rounded-full bg-rich-orange opacity-20" />
                        </div>
                        <p
                          class="mt-2 max-w-[76px] text-center text-[10px] font-bold leading-tight text-rich-orange"
                          style="word-break: break-word"
                        >
                          {{ selectedOriginOfficeName || 'Origin' }}
                        </p>
                        <span class="mt-0.5 rounded-full bg-rich-orange/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-rich-orange">
                          Origin
                        </span>
                      </div>

                      <!-- ── Route steps ─────────────────────────────── -->
                      <template
                        v-for="(step, idx) in selectedTimelineSteps"
                        :key="`step-${idx}`"
                      >
                        <!-- Connector arrow -->
                        <div class="flex items-center" style="padding-top: 14px; min-width: 40px">
                          <div
                            class="h-px flex-1"
                            :class="isDark ? 'bg-rich-orange/30' : 'bg-rich-orange/40'"
                          />
                          <Icon name="ph:caret-right-fill" class="h-3 w-3 flex-none text-rich-orange/50" />
                        </div>

                        <!-- Step node -->
                        <div class="flex flex-col items-center" style="min-width: 80px">
                          <!-- Circle: final stop gets filled, others get ring -->
                          <div
                            class="flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all"
                            :class="idx === selectedTimelineSteps.length - 1
                              ? 'border-rich-orange bg-rich-orange text-white shadow-lg shadow-rich-orange/30'
                              : isDark
                                ? 'border-rich-orange/60 bg-rich-orange/10 text-rich-orange'
                                : 'border-rich-orange bg-orange-50 text-rich-orange'"
                          >
                            <Icon
                              v-if="idx === selectedTimelineSteps.length - 1"
                              name="ph:flag-checkered-fill"
                              class="h-4 w-4"
                            />
                            <span v-else class="text-xs font-bold">{{ idx + 1 }}</span>
                          </div>

                          <!-- Office name -->
                          <p
                            class="mt-2 max-w-[76px] text-center text-[10px] font-semibold leading-tight"
                            :class="headingClass"
                            style="word-break: break-word"
                          >
                            {{ resolveOfficeName(step.office_id) }}
                          </p>

                          <!-- Step label -->
                          <span
                            class="mt-0.5 text-[9px]"
                            :class="idx === selectedTimelineSteps.length - 1 ? 'font-bold text-rich-orange' : mutedClass"
                          >
                            {{ idx === selectedTimelineSteps.length - 1 ? 'Final Stop' : `Stop ${idx + 1}` }}
                          </span>
                        </div>
                      </template>
                    </div>
                  </div>

                  <!-- Route summary footer -->
                  <div class="border-t px-4 py-2.5 text-[10px]" :class="isDark ? 'border-rich-orange/15' : 'border-orange-200/70'">
                    <div class="flex items-center gap-3 flex-wrap" :class="mutedClass">
                      <span class="flex items-center gap-1">
                        <Icon name="ph:buildings-fill" class="h-3 w-3 text-rich-orange" />
                        <strong class="text-rich-orange">{{ selectedOriginOfficeName || '—' }}</strong>
                      </span>
                      <Icon name="ph:arrow-right" class="h-3 w-3" />
                      <span>{{ selectedTimelineSteps.length }} office{{ selectedTimelineSteps.length !== 1 ? 's' : '' }} in route</span>
                      <Icon name="ph:arrow-right" class="h-3 w-3" />
                      <span class="flex items-center gap-1">
                        <Icon name="ph:flag-checkered-fill" class="h-3 w-3 text-rich-orange" />
                        <strong class="text-rich-orange">{{ finalDestinationName }}</strong>
                      </span>
                    </div>
                  </div>
                </div>
              </Transition>
            </div>

            <!-- 4. QR Code Placement Strategy -->
            <div>
              <span class="text-sm font-semibold" :class="headingClass">QR Code Placement Strategy</span>
              <div class="mt-2 space-y-2">
                <label
                  class="flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition"
                  :class="selectedStrategy === 'embedded'
                    ? 'border-rich-orange bg-rich-orange/5'
                    : isDark ? 'border-white/10' : 'border-gray-200'"
                >
                  <input v-model="selectedStrategy" type="radio" value="embedded" class="mt-1 accent-[#FF620C]" />
                  <span>
                    <span class="block text-sm font-semibold" :class="headingClass">Embed with Document Content</span>
                    <span class="block text-xs" :class="mutedClass">
                      Prints tracking metadata directly alongside the document payload.
                    </span>
                  </span>
                </label>

                <label
                  class="flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition"
                  :class="selectedStrategy === 'standalone'
                    ? 'border-rich-orange bg-rich-orange/5'
                    : isDark ? 'border-white/10' : 'border-gray-200'"
                >
                  <input v-model="selectedStrategy" type="radio" value="standalone" class="mt-1 accent-[#FF620C]" />
                  <span>
                    <span class="block text-sm font-semibold" :class="headingClass">Standalone Tracking Trailer Page</span>
                    <span class="block text-xs" :class="mutedClass">
                      Keeps document pages clean and appends a dedicated tracking sheet.
                    </span>
                  </span>
                </label>
              </div>
            </div>

            <!-- 5. Standalone QR size -->
            <label v-if="selectedStrategy === 'standalone'" class="block">
              <span class="text-sm font-semibold" :class="headingClass">Trailer QR Print Size</span>
              <select
                v-model.number="selectedQrSize"
                class="mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-rich-orange"
                :class="inputClass"
              >
                <option :value="50"  :style="optionStyle">Small (50px × 50px)</option>
                <option :value="120" :style="optionStyle">Medium (120px × 120px)</option>
                <option :value="200" :style="optionStyle">Large (200px × 200px)</option>
              </select>
            </label>

            <!-- 6. Error -->
            <p
              v-if="errorMessage"
              class="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500"
            >
              {{ errorMessage }}
            </p>

            <!-- 7. AI analysis result -->
            <div
              v-if="aiAnalysis"
              class="rounded-xl border p-4"
              :class="isDark ? 'border-white/10 bg-white/[0.03]' : 'border-gray-200 bg-gray-50'"
            >
              <div class="flex items-center gap-2 text-sm font-semibold text-rich-orange">
                <Icon name="ph:sparkle-fill" class="h-4 w-4" />
                AI Analysis
              </div>
              <p class="mt-2 text-sm font-semibold" :class="headingClass">{{ aiAnalysis.title }}</p>
              <p class="mt-1 text-xs leading-5" :class="mutedClass">{{ aiAnalysis.description }}</p>
            </div>

          </div>
        </div>

        <!-- ── Footer ─────────────────────────────────────────────────── -->
        <footer
          class="flex items-center justify-between gap-3 border-t px-6 py-4"
          :class="borderClass"
        >
          <!-- Route summary pill (shows in footer when a route is selected) -->
          <div class="flex min-w-0 items-center gap-2">
            <Transition name="fade-in">
              <div
                v-if="selectedStageId"
                class="flex min-w-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold text-rich-orange"
                :class="isDark ? 'border-rich-orange/20 bg-rich-orange/5' : 'border-orange-200 bg-orange-50'"
              >
                <Icon name="ph:path-fill" class="h-3 w-3 flex-none" />
                <span class="truncate">{{ selectedRouteName }}</span>
                <Icon name="ph:x-bold" class="h-2.5 w-2.5 flex-none cursor-pointer hover:text-red-400" @click.stop="selectedStageId = ''" />
              </div>
            </Transition>
          </div>

          <div class="flex items-center gap-3">
            <button
              type="button"
              class="rounded-xl border px-4 py-2.5 text-sm font-semibold transition hover:bg-black/5 dark:hover:bg-white/5"
              :class="isDark ? 'border-white/10 text-white' : 'border-gray-200 text-gray-900'"
              @click="handleClose"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="inline-flex items-center gap-2 rounded-xl bg-rich-orange px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rich-orange/25 transition hover:bg-[#e95a0b] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="!canSubmit"
            >
              <Icon v-if="uploading" name="ph:spinner-gap" class="h-4 w-4 animate-spin" />
              <Icon v-else name="ph:printer" class="h-4 w-4" />
              {{ uploading ? 'Saving…' : 'Print & Save' }}
            </button>
          </div>
        </footer>
      </form>
    </Transition>

    <!-- QR-only fallback print template -->
    <DocumentPrintCanvas :qr-data-url="printQrDataUrl" />
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import QRCode from 'qrcode'
import { PDFDocument } from 'pdf-lib'
import { renderAsync } from 'docx-preview'
import DocumentLivePreview from '~/components/client/documents/documentLivePreview.vue'
import DocumentPrintCanvas from '~/components/client/documents/documentPrintCanvas.vue'
import { useStageStore } from '~/stores/stage'
import { useOfficeStore } from '~/stores/office'
import { useAuthStore } from '~/stores/auth'

// ── Types ─────────────────────────────────────────────────────────────
interface OfficeRecord { id: string; name: string; code?: string }
interface AiAnalysis   { title: string; description: string }

// Stage record extended with office_id (local routes) from the API
interface EnrichedStage {
  stage_id: number | string
  name: string
  office_id?: string | null
  step_number?: number
  workflow_items?: Array<{ office_id: string | number; step_number: number }>
}

// ── Props / emits ──────────────────────────────────────────────────────
const props = defineProps<{
  isOpen:  boolean
  offices: OfficeRecord[]
  scope:   'GLOBAL' | 'LOCAL'
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'uploaded'): void
}>()

// ── Stores ────────────────────────────────────────────────────────────
const stageStore  = useStageStore()
const officeStore = useOfficeStore()
const auth        = useAuthStore()
const { isDark }  = useTheme()

// ── Route scope tab ───────────────────────────────────────────────────
type RouteTab = 'global' | 'local'
const routeTab = ref<RouteTab>('global')
const routeTabs = [
  { value: 'global' as RouteTab, label: 'Global', icon: 'ph:globe-hemisphere-west-fill' },
  { value: 'local'  as RouteTab, label: 'Local',  icon: 'ph:buildings-fill' },
]

// ── Form state ────────────────────────────────────────────────────────
const fileInput              = ref<HTMLInputElement | null>(null)
const selectedFile           = ref<File | null>(null)
const selectedOriginOfficeId = ref<string>('')
const selectedStageId        = ref<string>('')
const selectedStrategy       = ref<'embedded' | 'standalone'>('embedded')
const selectedQrSize         = ref<50 | 120 | 200>(120)
const currentTrackingId      = ref('')
const isDragging             = ref(false)
const errorMessage           = ref('')
const uploading              = ref(false)
const aiAnalysis             = ref<AiAnalysis | null>(null)
const printQrDataUrl         = ref('')

const generateTrackingId = () => `FLOW-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

// ── All stages (cast to enriched shape with optional office_id) ────────
const allStages = computed<EnrichedStage[]>(() => stageStore.stages as unknown as EnrichedStage[])

// ── Visible routes based on selected tab ──────────────────────────────
const visibleRoutes = computed<EnrichedStage[]>(() => {
  if (routeTab.value === 'global') {
    return allStages.value.filter((s) => !s.office_id)
  }
  // Local: stages with an office_id
  if (!selectedOriginOfficeId.value) {
    // show all local stages from any of the employee's offices
    const myOfficeIds = props.offices.map((o) => String(o.id))
    return allStages.value.filter((s) => s.office_id && myOfficeIds.includes(String(s.office_id)))
  }
  // filter to the selected origin office
  return allStages.value.filter((s) => s.office_id && String(s.office_id) === selectedOriginOfficeId.value)
})

// ── Resolve all org offices for name lookup ────────────────────────────
const resolveOfficeName = (officeId: string | number | null | undefined): string => {
  if (officeId == null) return 'Unknown Office'
  // Check the org office store first (all offices in org)
  const fromStore = officeStore.offices.find((o) => String(o.id) === String(officeId))
  if (fromStore) return fromStore.name
  // Fallback to employee's own offices prop
  const fromProps = props.offices.find((o) => String(o.id) === String(officeId))
  return fromProps?.name || `Office ${String(officeId).slice(0, 8)}`
}

// ── Selected origin office name ───────────────────────────────────────
const selectedOriginOfficeName = computed(() => {
  if (!selectedOriginOfficeId.value) return ''
  const found = props.offices.find((o) => String(o.id) === selectedOriginOfficeId.value)
  return found?.name || ''
})

// ── Route step helpers ─────────────────────────────────────────────────
const getRouteSteps = (stageId: number | string) => {
  const seq = stageStore.stageOfficeSequences[stageId as number] || []
  return [...seq].sort((a, b) => a.step_number - b.step_number)
}

const getRouteStops = (stageId: number | string): string[] =>
  getRouteSteps(stageId)
    .slice(0, 3)
    .map((s) => resolveOfficeName(s.office_id))

// ── Timeline: steps for the selected stage ────────────────────────────
const selectedTimelineSteps = computed(() => {
  if (!selectedStageId.value) return []
  return getRouteSteps(selectedStageId.value)
})

const selectedRouteName = computed(() => {
  if (!selectedStageId.value) return ''
  return allStages.value.find((s) => String(s.stage_id) === selectedStageId.value)?.name || ''
})

const finalDestinationName = computed(() => {
  const steps = selectedTimelineSteps.value
  if (!steps.length) return '—'
  return resolveOfficeName(steps[steps.length - 1].office_id)
})

// ── Select route card ─────────────────────────────────────────────────
const selectRoute = (stage: EnrichedStage) => {
  selectedStageId.value = String(stage.stage_id)
}

// ── When origin office changes, reset stage if it no longer matches ───
const onOriginOfficeChange = () => {
  if (!selectedStageId.value) return
  const currentRoute = allStages.value.find((s) => String(s.stage_id) === selectedStageId.value)
  if (currentRoute?.office_id && String(currentRoute.office_id) !== selectedOriginOfficeId.value) {
    selectedStageId.value = ''
  }
}

// ── canSubmit ─────────────────────────────────────────────────────────
const canSubmit = computed(
  () =>
    !!selectedFile.value &&
    !!selectedOriginOfficeId.value &&
    !!selectedStageId.value &&
    !uploading.value
)

// ── Theming ───────────────────────────────────────────────────────────
const surfaceClass = computed(() =>
  isDark.value ? 'bg-[#111111]/95 backdrop-blur-xl border-white/10' : 'border-gray-200 bg-white'
)
const borderClass  = computed(() => isDark.value ? 'border-white/10' : 'border-gray-200')
const mutedClass   = computed(() => isDark.value ? 'text-gray-400' : 'text-gray-500')
const headingClass = computed(() => isDark.value ? 'text-white' : 'text-gray-900')
const inputClass   = computed(() =>
  isDark.value
    ? 'border-white/10 bg-rich-black text-white placeholder:text-gray-500'
    : 'border-gray-200 bg-white text-gray-900 placeholder:text-gray-400'
)
const optionStyle = computed(() =>
  isDark.value
    ? { backgroundColor: '#1A1A1A', color: '#ffffff' }
    : { backgroundColor: '#ffffff', color: '#121212' }
)

// ── Watch isOpen — fetch stages + offices ─────────────────────────────
watch(
  () => props.isOpen,
  (open) => {
    if (!open) return
    if (!stageStore.stages.length) stageStore.fetchStages()
    if (!officeStore.offices.length) officeStore.fetchOffices()
  }
)

// ── File handlers ─────────────────────────────────────────────────────
const formatSize = (bytes: number) => {
  if (bytes < 1024)           return `${bytes} B`
  if (bytes < 1024 * 1024)   return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const handleFileChange = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0] || null
  selectedFile.value = file
  currentTrackingId.value = file ? generateTrackingId() : ''
  errorMessage.value = ''
}

const handleDrop = (e: DragEvent) => {
  isDragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) {
    selectedFile.value = file
    currentTrackingId.value = generateTrackingId()
    errorMessage.value = ''
  }
}

const clearFile = () => {
  selectedFile.value = null
  currentTrackingId.value = ''
  if (fileInput.value) fileInput.value.value = ''
}

const handleClose = () => {
  if (uploading.value) return
  clearFile()
  selectedOriginOfficeId.value = ''
  selectedStageId.value = ''
  selectedStrategy.value = 'embedded'
  selectedQrSize.value = 120
  printQrDataUrl.value = ''
  errorMessage.value = ''
  aiAnalysis.value = null
  emit('close')
}

// ── Print: Standalone trailer ─────────────────────────────────────────
const printStandaloneDocument = async (file: File, qrDataUrl: string) => {
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  const buf = await file.arrayBuffer()
  const sz  = selectedQrSize.value

  if (ext === 'pdf') {
    const pdf = await PDFDocument.load(buf)
    const img = await pdf.embedPng(qrDataUrl)
    const pg  = pdf.addPage()
    const { width, height } = pg.getSize()
    pg.drawImage(img, { x: (width - sz) / 2, y: (height - sz) / 2, width: sz, height: sz })
    const url = URL.createObjectURL(new Blob([await pdf.save()], { type: 'application/pdf' }))
    const win = window.open(url)
    if (win) win.onload = () => { win.focus(); win.print() }
    setTimeout(() => URL.revokeObjectURL(url), 60000)
    return
  }

  if (ext === 'docx') {
    const div = document.createElement('div')
    await renderAsync(buf, div)
    const win = window.open('', '_blank')
    if (win) {
      win.document.write(`<html><head><style>@page{margin:0}body{margin:0;padding:0;background:#fff}.docx-wrapper{background:#fff!important;padding:0!important}.docx{box-shadow:none!important;margin:0!important;width:100%!important}</style></head><body>${div.innerHTML}<div style="page-break-before:always;display:flex;justify-content:center;align-items:center;height:100vh;background:#fff"><img src="${qrDataUrl}" style="width:${sz}px;height:${sz}px"/></div></body></html>`)
      win.document.close()
      win.focus()
      setTimeout(() => { win.print(); win.close() }, 500)
    }
    return
  }

  printQrDataUrl.value = qrDataUrl
  await nextTick()
  window.print()
}

// ── Print: Embedded QR stamp ──────────────────────────────────────────
const printEmbeddedDocument = async (file: File, qrDataUrl: string) => {
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  const buf = await file.arrayBuffer()

  if (ext === 'pdf') {
    const pdf = await PDFDocument.load(buf)
    const img = await pdf.embedPng(qrDataUrl)
    const sz = 50, margin = 20
    pdf.getPages().forEach((pg) => {
      const { height } = pg.getSize()
      pg.drawImage(img, { x: margin, y: height - sz - margin, width: sz, height: sz })
    })
    const url = URL.createObjectURL(new Blob([await pdf.save()], { type: 'application/pdf' }))
    const win = window.open(url)
    if (win) win.onload = () => { win.focus(); win.print() }
    setTimeout(() => URL.revokeObjectURL(url), 60000)
    return
  }

  if (ext === 'docx') {
    const div = document.createElement('div')
    await renderAsync(buf, div)
    const win = window.open('', '_blank')
    if (win) {
      win.document.write(`<html><head><style>@page{margin:0}body{margin:0;padding:0;background:#fff}.docx-wrapper{background:#fff!important;padding:0!important}.docx{box-shadow:none!important;margin:0!important;width:100%!important}</style></head><body><img src="${qrDataUrl}" style="position:absolute;top:20px;left:20px;width:50px;height:50px;z-index:9999"/>${div.innerHTML}</body></html>`)
      win.document.close()
      win.focus()
      setTimeout(() => { win.print(); win.close() }, 500)
    }
    return
  }

  printQrDataUrl.value = qrDataUrl
  await nextTick()
  window.print()
}

// ── Submit: print → persist ───────────────────────────────────────────
const handlePrintAndSubmit = async () => {
  errorMessage.value = ''
  if (!selectedFile.value)           { errorMessage.value = 'Please select a file.';              return }
  if (!selectedOriginOfficeId.value) { errorMessage.value = 'Please select your origin office.';  return }
  if (!selectedStageId.value)        { errorMessage.value = 'Please select a routing pathway.';    return }

  const trackingCode = currentTrackingId.value || generateTrackingId()
  currentTrackingId.value = trackingCode

  let qrDataUrl = ''
  try { qrDataUrl = await QRCode.toDataURL(trackingCode, { margin: 1, width: 320 }) } catch { /* non-fatal */ }

  if (selectedStrategy.value === 'embedded') {
    await printEmbeddedDocument(selectedFile.value, qrDataUrl)
  } else {
    await printStandaloneDocument(selectedFile.value, qrDataUrl)
  }

  uploading.value = true
  try {
    const fd = new FormData()
    fd.append('file',             selectedFile.value, selectedFile.value.name)
    fd.append('origin_office_id', selectedOriginOfficeId.value)
    fd.append('office_id',        selectedOriginOfficeId.value)
    fd.append('stage_id',         selectedStageId.value)
    fd.append('qr_code_data',     trackingCode)
    fd.append('user_id',          String(auth.user?.user_id ?? ''))
    fd.append('org_id',           String(auth.user?.org_id ?? ''))

    const res = await $fetch<{ success: boolean; data?: any }>('/api/documents/upload', {
      method: 'POST',
      body: fd,
    })

    if (res.success) {
      if (res.data?.title || res.data?.description) {
        aiAnalysis.value = { title: res.data.title, description: res.data.description }
      }
      emit('uploaded')
      clearFile()
      selectedOriginOfficeId.value = ''
      selectedStageId.value = ''
      currentTrackingId.value = ''
      printQrDataUrl.value = ''
    } else {
      errorMessage.value = 'Upload failed. Please try again.'
      currentTrackingId.value = generateTrackingId()
    }
  } catch (err: any) {
    errorMessage.value = err?.data?.message || 'Upload failed. Please try again.'
    currentTrackingId.value = generateTrackingId()
  } finally {
    uploading.value = false
  }
}
</script>

<style scoped>
/* Drawer backdrop */
.drawer-fade-enter-active, .drawer-fade-leave-active { transition: opacity 0.2s ease; }
.drawer-fade-enter-from,   .drawer-fade-leave-to     { opacity: 0; }

/* Drawer panel slide */
.drawer-slide-enter-active, .drawer-slide-leave-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.drawer-slide-enter-from, .drawer-slide-leave-to { transform: translateX(100%); }

/* Route timeline expand */
.route-expand-enter-active {
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.route-expand-leave-active {
  transition: all 0.2s ease;
}
.route-expand-enter-from, .route-expand-leave-to {
  opacity: 0;
  transform: translateY(-6px);
  max-height: 0;
}
.route-expand-enter-to, .route-expand-leave-from {
  opacity: 1;
  transform: translateY(0);
  max-height: 400px;
}

/* Footer route pill fade */
.fade-in-enter-active { transition: all 0.2s ease; }
.fade-in-leave-active { transition: all 0.15s ease; }
.fade-in-enter-from, .fade-in-leave-to { opacity: 0; transform: scale(0.95); }
</style>
