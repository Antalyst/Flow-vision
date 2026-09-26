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
        class="fixed bottom-0 right-0 top-0 z-[90] flex w-full flex-col border-l transition-[width,max-width] duration-300"
        :class="[surfaceClass, selectedFile ? 'lg:w-[70%] lg:max-w-none' : 'max-w-2xl']"
        @submit.prevent="handlePrintAndSubmit"
      >
        <!-- ── Header ──────────────────────────────────────────────────── -->
        <header
          class="flex items-start justify-between gap-4 border-b px-6 py-5"
          :class="[borderClass, isDark ? 'bg-gradient-to-b from-white/[0.02] to-transparent' : 'bg-gradient-to-b from-gray-50/50 to-transparent']"
        >
          <div>
            <span
              class="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-candy-orange"
              :class="isDark ? 'bg-candy-orange/15' : 'bg-candy-orange/10'"
            >
              {{ scope === 'LOCAL' ? 'Office Document' : 'Organisation Document' }}
            </span>
            <h2 class="mt-2.5 text-xl font-bold" :class="headingClass">Upload Document</h2>
            <p class="mt-0.5 text-xs" :class="mutedClass">
              AI reads the file and fills in the details automatically.
            </p>
          </div>
          <button
            type="button"
            class="inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg transition hover:bg-candy-orange/10 hover:text-candy-orange"
            :class="isDark ? 'bg-white/5' : 'bg-gray-100'"
            aria-label="Close"
            @click="handleClose"
          >
            <Icon name="ph:x-bold" class="h-4 w-4" :class="headingClass" />
          </button>
        </header>

        <!-- ── Body ───────────────────────────────────────────────────── -->
        <!-- Single column until a file is picked (nothing to preview yet); -->
        <!-- opens into a two-column layout with the live preview once one is. -->
        <div
          class="flex flex-1 flex-col gap-5 overflow-hidden px-6 py-5"
          :class="[selectedFile ? 'lg:flex-row' : '', isDark ? 'bg-onyx-black' : 'bg-white-surface']"
        >

          <!-- ── LEFT: live document preview (only once a file exists) ─── -->
          <div v-if="selectedFile" class="w-full overflow-y-auto lg:h-full lg:w-7/12">
            <DocumentLivePreview
              :file="selectedFile"
              :tracking-id="currentTrackingId"
              :print-strategy="selectedStrategy"
            />
          </div>

          <!-- ── Form fields ─────────────────────────────────────────── -->
          <div
            class="w-full space-y-4 overflow-y-auto"
            :class="selectedFile ? 'lg:w-5/12' : 'mx-auto max-w-xl'"
          >

            <!-- ══════════════════════════════════════════════════════════ -->
            <!-- 1. DOCUMENT FILE                                          -->
            <!-- ══════════════════════════════════════════════════════════ -->
            <div class="rounded-2xl border p-5" :class="cardClass">
              <div class="mb-3.5 flex items-start gap-2.5">
                <span class="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full text-[11px] font-bold" :class="stepBadgeClass">1</span>
                <div>
                  <p class="text-sm font-semibold" :class="headingClass">Document File</p>
                  <p class="mt-0.5 text-xs" :class="mutedClass">Word or Excel — swap it any time before saving.</p>
                </div>
              </div>

              <input
                id="upload-file-input"
                ref="fileInput"
                type="file"
                class="hidden"
                accept=".doc,.docx,.xls,.xlsx,.csv"
                @change="handleFileChange"
              />

              <!-- Drop zone -->
              <label
                v-if="!selectedFile"
                for="upload-file-input"
                class="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-7 text-center transition"
                :class="isDragging ? 'border-candy-orange bg-candy-orange/10' : borderClass"
                @dragover.prevent="isDragging = true"
                @dragleave.prevent="isDragging = false"
                @drop.prevent="handleDrop"
              >
                <Icon name="ph:cloud-arrow-up-light" class="h-9 w-9 text-candy-orange" />
                <div>
                  <p class="text-sm font-semibold" :class="headingClass">Drop a file here or click to browse</p>
                  <p class="mt-1 text-xs" :class="mutedClass">Only Word (.doc, .docx) and Excel (.xls, .xlsx, .csv) supported</p>
                </div>
              </label>

              <!-- Selected file chip -->
              <div v-else class="flex flex-col gap-3">
                <div
                  class="flex min-w-0 items-center justify-between gap-3 rounded-xl border px-3.5 py-3"
                  :class="isDark ? 'border-onyx-border bg-onyx-black/60' : 'border-gray-200 bg-gray-50'"
                >
                  <div class="flex items-center gap-3 min-w-0">
                    <span class="flex h-9 w-9 flex-none items-center justify-center rounded-lg" :class="isDark ? 'bg-candy-orange/15' : 'bg-candy-orange/10'">
                      <Icon name="ph:file-text-light" class="h-4 w-4 text-candy-orange" />
                    </span>
                    <div class="min-w-0">
                      <p class="truncate text-sm font-semibold" :class="headingClass">{{ selectedFile.name }}</p>
                      <p class="text-xs" :class="mutedClass">
                        {{ formatSize(selectedFile.size) }} ·
                        <label for="upload-file-input" class="cursor-pointer underline-offset-2 hover:text-candy-orange hover:underline">Replace file</label>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    class="inline-flex h-8 w-8 flex-none items-center justify-center rounded-lg text-danger transition hover:bg-danger/10"
                    aria-label="Remove file"
                    @click="clearFile"
                  >
                    <Icon name="ph:trash-light" class="h-4 w-4" />
                  </button>
                </div>

                <!-- Excel options -->
                <div v-if="isExcelFile" class="rounded-xl border p-4 space-y-4" :class="isDark ? 'border-onyx-border bg-onyx-black/40' : 'border-gray-200 bg-gray-50'">
                  <p class="flex items-center gap-1.5 text-xs font-semibold" :class="headingClass">
                    <Icon name="ph:info-light" class="h-3.5 w-3.5 text-candy-orange" />
                    Excel file detected — previewed on the left.
                  </p>

                  <!-- Manual override for AI analysis -->
                  <div class="space-y-3 border-t pt-3" :class="borderClass">
                    <p class="text-sm font-semibold" :class="headingClass">Manual Document Details</p>
                    <div>
                      <label class="block text-xs font-semibold mb-1" :class="headingClass">Title</label>
                      <input
                        v-model="manualTitle"
                        type="text"
                        placeholder="Enter document title..."
                        class="w-full rounded-xl border px-3 py-2 text-sm outline-none transition focus:border-candy-orange focus:ring-1 focus:ring-candy-orange"
                        :class="inputClass"
                      />
                    </div>
                    <div>
                      <label class="block text-xs font-semibold mb-1" :class="headingClass">Description</label>
                      <textarea
                        v-model="manualDescription"
                        rows="2"
                        placeholder="Briefly describe the contents..."
                        class="w-full resize-none rounded-xl border px-3 py-2 text-sm outline-none transition focus:border-candy-orange focus:ring-1 focus:ring-candy-orange"
                        :class="inputClass"
                      ></textarea>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- ══════════════════════════════════════════════════════════ -->
            <!-- 2. DOCUMENT CATEGORY PICKER                               -->
            <!-- ══════════════════════════════════════════════════════════ -->
            <div class="rounded-2xl border p-5" :class="cardClass">
              <div class="mb-3 flex items-start gap-2.5">
                <span class="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full text-[11px] font-bold" :class="stepBadgeClass">2</span>
                <div>
                  <p class="text-sm font-semibold" :class="headingClass">
                    Document Category <span class="text-danger">*</span>
                  </p>
                  <p class="mt-0.5 text-xs" :class="mutedClass">
                    What kind of document is this?
                  </p>
                </div>
              </div>
              <div class="relative">
                <select
                  v-model="selectedCategoryId"
                  class="w-full appearance-none rounded-xl border px-3.5 py-2.5 pr-9 text-sm outline-none transition focus:border-candy-orange focus:ring-1 focus:ring-candy-orange"
                  :class="isDark ? 'border-onyx-border bg-onyx-black text-white' : 'border-gray-200 bg-white text-gray-900'"
                >
                  <option value="" disabled>Select a category...</option>
                  <option v-for="cat in categoriesStore.categories" :key="cat.id" :value="cat.id" :class="isDark ? 'bg-onyx-black text-white' : 'bg-white text-gray-900'">
                    {{ cat.name }}
                  </option>
                </select>
                <Icon name="ph:caret-down-bold" class="pointer-events-none absolute right-3.5 top-1/2 h-3 w-3 -translate-y-1/2" :class="mutedClass" />
                <div v-if="!categoriesStore.categories.length" class="mt-1.5 text-xs text-warning">
                  <Icon name="ph:warning-light" class="inline h-3 w-3" /> No categories found. Please ask an admin to create them.
                </div>
              </div>
            </div>

            <!-- ══════════════════════════════════════════════════════════ -->
            <!-- 3. DELIVERY ROUTE PICKER                                  -->
            <!-- ══════════════════════════════════════════════════════════ -->
            <div class="rounded-2xl border p-5" :class="cardClass">
              <div class="mb-3.5 flex items-start justify-between gap-3">
                <div class="flex items-start gap-2.5">
                  <span class="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full text-[11px] font-bold" :class="stepBadgeClass">3</span>
                  <div>
                    <p class="text-sm font-semibold" :class="headingClass">
                      Delivery Route <span class="text-danger">*</span>
                    </p>
                    <p class="mt-0.5 text-xs" :class="mutedClass">
                      Which offices this document needs to pass through.
                    </p>
                  </div>
                </div>

                <!-- Scope segmented control -->
                <div class="flex flex-none gap-0.5 rounded-lg p-0.5" :class="isDark ? 'bg-white/5' : 'bg-gray-100'">
                  <button
                    v-for="tab in routeTabs"
                    :key="tab.value"
                    type="button"
                    class="rounded-md px-3 py-1.5 text-xs font-semibold transition"
                    :class="routeTab === tab.value
                      ? (isDark ? 'bg-onyx-border text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm')
                      : (isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700')"
                    @click="routeTab = tab.value"
                  >
                    {{ tab.label }}
                  </button>
                </div>
              </div>

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
                  <Icon name="ph:warning-light" class="h-4 w-4 text-warning" />
                  Select your origin office first to see local routes.
                </div>

                <!-- Empty state -->
                <div
                  v-else-if="!visibleRoutes.length"
                  class="flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-5 text-center text-xs"
                  :class="isDark ? 'border-white/10 text-gray-500' : 'border-gray-200 text-gray-400'"
                >
                  <Icon name="ph:path-light" class="h-6 w-6" :class="mutedClass" />
                  <span>
                    No {{ routeTab === 'global' ? 'global' : 'local' }} routes found.
                    <template v-if="routeTab === 'local'">
                      <NuxtLink :to="stagesPath" class="text-candy-orange hover:underline">Create one</NuxtLink> in Stages.
                    </template>
                  </span>
                </div>

                <!-- Route card -->
                <button
                  v-for="stage in visibleRoutes"
                  :key="stage.stage_id"
                  type="button"
                  class="group w-full rounded-xl border px-4 py-3 text-left transition-all duration-200 hover:border-candy-orange/40"
                  :class="selectedStageId === String(stage.stage_id)
                    ? isDark
                      ? 'border-candy-orange bg-candy-orange/10'
                      : 'border-candy-orange bg-orange-50'
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
                            ? 'bg-candy-orange'
                            : isDark ? 'border border-white/20' : 'border border-gray-300'"
                        >
                          <Icon
                            v-if="selectedStageId === String(stage.stage_id)"
                            name="ph:check-light"
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
                          class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium"
                          :class="isDark ? 'border-white/10 bg-white/5 text-gray-300' : 'border-gray-200 bg-gray-100 text-gray-600'"
                        >
                          <span class="h-1 w-1 rounded-full bg-candy-orange/60" />
                          {{ stop }}
                        </span>
                        <span
                          v-if="getRouteSteps(stage.stage_id).length > 3"
                          class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-candy-orange"
                        >
                          +{{ getRouteSteps(stage.stage_id).length - 3 }} more
                        </span>
                      </div>
                    </div>

                    <!-- Right: stop count badge + scope tag -->
                    <div class="flex flex-none flex-col items-end gap-1.5">
                      <span
                        class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold"
                        :class="routeTab === 'global'
                          ? 'border-candy-orange/30 bg-candy-orange/10 text-candy-orange'
                          : 'border-gray-300/40 bg-gray-500/10 text-gray-500 dark:border-gray-500/30 dark:text-gray-400'"
                      >
                        <Icon :name="routeTab === 'global' ? 'ph:globe-hemisphere-west-fill' : 'ph:buildings-fill'" class="h-2.5 w-2.5" />
                        {{ routeTab === 'global' ? 'Global' : 'Local' }}
                      </span>
                      <span class="text-xs" :class="mutedClass">
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
                  class="mt-4 overflow-hidden rounded-2xl border"
                  :class="isDark ? 'border-white/10 bg-white/[0.03]' : 'border-gray-200 bg-gray-50'"
                >
                  <!-- Preview header -->
                  <div class="flex items-center justify-between border-b px-4 py-2.5" :class="borderClass">
                    <div class="flex items-center gap-2">
                      <Icon name="ph:path-light" class="h-3.5 w-3.5 text-candy-orange" />
                      <span class="text-sm font-semibold" :class="headingClass">Route Preview</span>
                    </div>
                    <span class="text-xs" :class="mutedClass">
                      {{ selectedTimelineSteps.length + 1 }} stops
                    </span>
                  </div>

                  <!-- Horizontal scroll timeline -->
                  <div class="overflow-x-auto px-4 py-4">
                    <div class="flex min-w-max items-start gap-0">

                      <!-- ── Origin node (always first) ─────────────── -->
                      <div class="flex flex-col items-center" style="min-width: 80px">
                        <div class="flex h-10 w-10 items-center justify-center rounded-full bg-candy-orange">
                          <Icon name="ph:map-pin-light" class="h-5 w-5 text-white" />
                        </div>
                        <p
                          class="mt-2 max-w-[76px] text-center text-xs font-semibold leading-tight"
                          :class="headingClass"
                          style="word-break: break-word"
                        >
                          {{ selectedOriginOfficeName || 'Origin' }}
                        </p>
                        <span class="mt-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium uppercase tracking-wide text-candy-orange" :class="isDark ? 'bg-white/5' : 'bg-gray-100'">
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
                            :class="isDark ? 'bg-white/10' : 'bg-gray-300'"
                          />
                          <Icon name="ph:caret-right-light" class="h-3 w-3 flex-none" :class="mutedClass" />
                        </div>

                        <!-- Step node -->
                        <div class="flex flex-col items-center" style="min-width: 80px">
                          <!-- Circle: final stop gets filled, others get a neutral outline -->
                          <div
                            class="flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all"
                            :class="idx === selectedTimelineSteps.length - 1
                              ? 'border-candy-orange bg-candy-orange text-white'
                              : isDark
                                ? 'border-white/15 bg-white/5 text-gray-400'
                                : 'border-gray-300 bg-white text-gray-500'"
                          >
                            <Icon
                              v-if="idx === selectedTimelineSteps.length - 1"
                              name="ph:flag-checkered-light"
                              class="h-4 w-4"
                            />
                            <span v-else class="text-xs font-bold">{{ idx + 1 }}</span>
                          </div>

                          <!-- Office name -->
                          <p
                            class="mt-2 max-w-[76px] text-center text-xs font-semibold leading-tight"
                            :class="headingClass"
                            style="word-break: break-word"
                          >
                            {{ resolveOfficeName(step.office_id) }}
                          </p>

                          <!-- Step label -->
                          <span
                            class="mt-0.5 text-xs"
                            :class="idx === selectedTimelineSteps.length - 1 ? 'font-bold text-candy-orange' : mutedClass"
                          >
                            {{ idx === selectedTimelineSteps.length - 1 ? 'Final Stop' : `Stop ${idx + 1}` }}
                          </span>
                        </div>
                      </template>
                    </div>
                  </div>

                  <!-- Route summary footer -->
                  <div class="border-t px-4 py-2.5 text-xs" :class="borderClass">
                    <div class="flex items-center gap-3 flex-wrap" :class="mutedClass">
                      <span class="flex items-center gap-1">
                        <Icon name="ph:buildings-light" class="h-3 w-3" />
                        <strong :class="headingClass">{{ selectedOriginOfficeName || '—' }}</strong>
                      </span>
                      <Icon name="ph:arrow-right-light" class="h-3 w-3" />
                      <span>{{ selectedTimelineSteps.length }} office{{ selectedTimelineSteps.length !== 1 ? 's' : '' }} in route</span>
                      <Icon name="ph:arrow-right-light" class="h-3 w-3" />
                      <span class="flex items-center gap-1">
                        <Icon name="ph:flag-checkered-light" class="h-3 w-3 text-candy-orange" />
                        <strong class="text-candy-orange">{{ finalDestinationName }}</strong>
                      </span>
                    </div>
                  </div>
                </div>
              </Transition>
            </div>

            <!-- ══════════════════════════════════════════════════════════ -->
            <!-- 4. ASSIGN MESSENGER (optional)                            -->
            <!-- ══════════════════════════════════════════════════════════ -->
            <div class="rounded-2xl border p-5" :class="cardClass">
              <div class="mb-3 flex items-start gap-2.5">
                <span class="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full text-[11px] font-bold" :class="stepBadgeClass">4</span>
                <div>
                  <p class="text-sm font-semibold" :class="headingClass">Assign Messenger <span class="font-normal" :class="mutedClass">(optional)</span></p>
                  <p class="mt-0.5 text-xs" :class="mutedClass">
                    Choose who from your office will carry this document. You can also assign one later.
                  </p>
                </div>
              </div>
              <div class="relative">
                <select
                  v-model="selectedMessengerId"
                  class="w-full appearance-none rounded-xl border px-3.5 py-2.5 pr-9 text-sm outline-none transition focus:border-candy-orange focus:ring-1 focus:ring-candy-orange"
                  :class="isDark ? 'border-onyx-border bg-onyx-black text-white' : 'border-gray-200 bg-white text-gray-900'"
                >
                  <option value="">Not now — assign later</option>
                  <option v-for="m in officeMessengers" :key="m.user_id" :value="m.user_id">{{ m.full_name }}</option>
                </select>
                <Icon name="ph:caret-down-bold" class="pointer-events-none absolute right-3.5 top-1/2 h-3 w-3 -translate-y-1/2" :class="mutedClass" />
                <p v-if="!officeMessengers.length" class="mt-1.5 text-xs" :class="mutedClass">
                  No messengers registered at your office yet.
                </p>
              </div>
            </div>

            <!-- ══════════════════════════════════════════════════════════ -->
            <!-- 5. QR CODE PLACEMENT                                      -->
            <!-- ══════════════════════════════════════════════════════════ -->
            <div class="rounded-2xl border p-5" :class="cardClass">
              <div class="mb-3.5 flex items-start gap-2.5">
                <span class="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full text-[11px] font-bold" :class="stepBadgeClass">5</span>
                <div>
                  <p class="text-sm font-semibold" :class="headingClass">QR Code Placement</p>
                  <p v-if="isExcelFile" class="mt-0.5 text-xs" :class="mutedClass">Excel file detected — added on a separate page.</p>
                </div>
              </div>

              <div class="space-y-2">
                <button
                  type="button"
                  class="flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all duration-200"
                  :class="[
                    selectedStrategy === 'embedded'
                      ? 'border-candy-orange bg-candy-orange/10'
                      : isDark ? 'border-onyx-border hover:border-candy-orange/40' : 'border-gray-200 hover:border-candy-orange/40',
                    isExcelFile ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer'
                  ]"
                  :disabled="isExcelFile"
                  @click="selectedStrategy = 'embedded'"
                >
                  <span
                    class="flex h-[17px] w-[17px] flex-none items-center justify-center rounded-full"
                    :class="selectedStrategy === 'embedded' ? 'bg-candy-orange' : (isDark ? 'border border-white/20' : 'border border-gray-300')"
                  >
                    <Icon v-if="selectedStrategy === 'embedded'" name="ph:check-bold" class="h-2.5 w-2.5 text-white" />
                  </span>
                  <span>
                    <span class="block text-sm font-semibold" :class="headingClass">On the Document Itself</span>
                    <span class="block text-xs" :class="mutedClass">
                      {{ isExcelFile ? 'Not available for spreadsheet files.' : "Prints the QR code directly on the file's pages." }}
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  class="flex w-full cursor-pointer items-center gap-3 rounded-xl border p-3 text-left transition-all duration-200"
                  :class="selectedStrategy === 'standalone'
                    ? 'border-candy-orange bg-candy-orange/10'
                    : isDark ? 'border-onyx-border hover:border-candy-orange/40' : 'border-gray-200 hover:border-candy-orange/40'"
                  @click="selectedStrategy = 'standalone'"
                >
                  <span
                    class="flex h-[17px] w-[17px] flex-none items-center justify-center rounded-full"
                    :class="selectedStrategy === 'standalone' ? 'bg-candy-orange' : (isDark ? 'border border-white/20' : 'border border-gray-300')"
                  >
                    <Icon v-if="selectedStrategy === 'standalone'" name="ph:check-bold" class="h-2.5 w-2.5 text-white" />
                  </span>
                  <span>
                    <span class="block text-sm font-semibold" :class="headingClass">On a Separate Page</span>
                    <span class="block text-xs" :class="mutedClass">
                      Keeps the original file untouched and adds one extra page for the QR code.
                    </span>
                  </span>
                </button>
              </div>

              <!-- Standalone QR size -->
              <div v-if="selectedStrategy === 'standalone'" class="mt-4 border-t pt-4" :class="borderClass">
                <p class="mb-2 text-xs font-semibold" :class="headingClass">QR Code Size</p>
                <div class="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    class="flex flex-col items-center justify-center rounded-xl border p-3 transition"
                    :class="selectedQrSize === 50 ? 'border-candy-orange bg-candy-orange/10 text-candy-orange' : (isDark ? 'border-onyx-border text-gray-400 hover:border-white/30' : 'border-gray-200 text-gray-500 hover:border-gray-300')"
                    @click="selectedQrSize = 50"
                  >
                    <Icon name="ph:qr-code-light" class="h-6 w-6 mb-1" />
                    <span class="text-xs font-semibold">Small</span>
                    <span class="text-xs opacity-70">1x1 in</span>
                  </button>
                  <button
                    type="button"
                    class="flex flex-col items-center justify-center rounded-xl border p-3 transition"
                    :class="selectedQrSize === 120 ? 'border-candy-orange bg-candy-orange/10 text-candy-orange' : (isDark ? 'border-onyx-border text-gray-400 hover:border-white/30' : 'border-gray-200 text-gray-500 hover:border-gray-300')"
                    @click="selectedQrSize = 120"
                  >
                    <Icon name="ph:qr-code-light" class="h-7 w-7 mb-1" />
                    <span class="text-xs font-semibold">Medium</span>
                    <span class="text-xs opacity-70">2x2 in</span>
                  </button>
                  <button
                    type="button"
                    class="flex flex-col items-center justify-center rounded-xl border p-3 transition"
                    :class="selectedQrSize === 200 ? 'border-candy-orange bg-candy-orange/10 text-candy-orange' : (isDark ? 'border-onyx-border text-gray-400 hover:border-white/30' : 'border-gray-200 text-gray-500 hover:border-gray-300')"
                    @click="selectedQrSize = 200"
                  >
                    <Icon name="ph:qr-code-light" class="h-8 w-8 mb-1" />
                    <span class="text-xs font-semibold">Large</span>
                    <span class="text-xs opacity-70">4x4 in</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- 6. Error -->
            <p
              v-if="errorMessage"
              class="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
            >
              {{ errorMessage }}
            </p>

            <!-- 7. AI analysis result -->
            <div
              v-if="aiAnalysis"
              class="rounded-2xl border p-4"
              :class="isDark ? 'border-white/10 bg-white/[0.03]' : 'border-gray-200 bg-gray-50'"
            >
              <div class="flex items-center gap-2 text-sm font-semibold text-candy-orange">
                <Icon name="ph:sparkle-light" class="h-4 w-4" />
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
                class="flex min-w-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold text-candy-orange"
                :class="isDark ? 'border-candy-orange/20 bg-candy-orange/5' : 'border-orange-200 bg-orange-50'"
              >
                <Icon name="ph:path-light" class="h-3 w-3 flex-none" />
                <span class="truncate">{{ selectedRouteName }}</span>
                <Icon name="ph:x-light" class="h-2.5 w-2.5 flex-none cursor-pointer hover:text-red-400" @click.stop="selectedStageId = ''" />
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
              class="inline-flex items-center gap-2 rounded-xl bg-candy-orange px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-candy-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="!canSubmit"
            >
              <Icon v-if="uploading" name="ph:spinner-gap-light" class="h-4 w-4 animate-spin" />
              <Icon v-else name="ph:printer-light" class="h-4 w-4" />
              {{ uploading ? 'Saving…' : 'Print & Save' }}
            </button>
          </div>
        </footer>
      </form>
    </Transition>

    <!-- QR-only fallback print template -->
    <DocumentPrintCanvas :qr-data-url="printQrDataUrl" :qr-size="selectedQrSize" />

    <DocumentQrStickerModal
      :is-open="showAssignedQr"
      :title="lastUploadedTitle"
      :qr-payload="lastUploadedQrPayload"
      @close="showAssignedQr = false"
    />
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import QRCode from 'qrcode'
import { PDFDocument } from 'pdf-lib'
import { renderAsync } from 'docx-preview'
import DocumentLivePreview from '~/components/client/documents/documentLivePreview.vue'
import DocumentPrintCanvas from '~/components/client/documents/documentPrintCanvas.vue'
import DocumentQrStickerModal from '~/components/documents/DocumentQrStickerModal.vue'
import { buildDocumentTrackQrPayload } from '~/utils/parseFlowVisionQr'
import { useStageStore } from '~/stores/stage'
import { useOfficeStore } from '~/stores/office'
import { useAuthStore } from '~/stores/auth'
import { useCategoriesStore } from '~/stores/categories'

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
const categoriesStore = useCategoriesStore()
const { isDark }  = useTheme()

// Sub-users get their own Staff portal (see /staff/routes) instead of /employee/stages.
const stagesPath = computed(() => auth.user?.role === 'employee_sub_user' ? '/staff/routes' : '/employee/stages')

// ── Assign Messenger (optional, at upload time) ────────────────────────
interface OfficeMessenger { user_id: string; full_name: string; email: string }
const officeMessengers = ref<OfficeMessenger[]>([])
const selectedMessengerId = ref('')
const showAssignedQr = ref(false)
const lastUploadedTitle = ref('')
const lastUploadedQrPayload = ref('')

async function fetchOfficeMessengers() {
  try {
    const res = await $fetch<{ success: boolean; data: OfficeMessenger[] }>('/api/employee/office-messengers')
    officeMessengers.value = res.data || []
  } catch (err) {
    console.error('Failed to fetch office messengers:', err)
  }
}

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
const selectedOriginOfficeId = computed(() => {
  if (auth.user?.office_id) return String(auth.user.office_id)
  if (props.offices && props.offices.length > 0) return String(props.offices[0].id)
  return ''
})
const selectedStageId        = ref<string>('')
const selectedStrategy       = ref<'embedded' | 'standalone'>('embedded')
const selectedQrSize         = ref<50 | 120 | 200>(120)
const currentTrackingId      = ref('')
const isDragging             = ref(false)
const errorMessage           = ref('')
const uploading              = ref(false)
const aiAnalysis             = ref<AiAnalysis | null>(null)
const printQrDataUrl         = ref('')
const manualTitle            = ref('')
const manualDescription      = ref('')

const selectedCategoryId = ref<string>('')

const isExcelFile = computed(() => {
  if (!selectedFile.value) return false
  const name = selectedFile.value.name.toLowerCase()
  return name.endsWith('.xls') || name.endsWith('.xlsx') || name.endsWith('.csv')
})

// Force standalone strategy for Excel files
watch(isExcelFile, (isExcel) => {
  if (isExcel) {
    selectedStrategy.value = 'standalone'
  }
})

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
    !!selectedStageId.value &&
    !!selectedCategoryId.value &&
    !uploading.value
)

// ── Theming ───────────────────────────────────────────────────────────
const surfaceClass = computed(() =>
  isDark.value ? 'bg-onyx-black border-onyx-border' : 'border-gray-200 bg-white-pure'
)
const borderClass  = computed(() => isDark.value ? 'border-white/10' : 'border-gray-200')
const mutedClass   = computed(() => isDark.value ? 'text-gray-400' : 'text-gray-500')
const headingClass = computed(() => isDark.value ? 'text-white' : 'text-gray-900')
const cardClass    = computed(() => isDark.value ? 'border-onyx-border bg-onyx-card' : 'border-gray-200 bg-white-pure')
const stepBadgeClass = computed(() => isDark.value ? 'bg-white/10 text-gray-300' : 'bg-gray-100 text-gray-600')
const inputClass   = computed(() =>
  isDark.value
    ? 'border-white/10 bg-onyx-black text-white placeholder:text-gray-500'
    : 'border-gray-200 bg-white text-gray-900 placeholder:text-gray-400'
)

// ── Watch isOpen — fetch stages + offices ─────────────────────────────
watch(
  () => props.isOpen,
  (open) => {
    if (!open) return
    if (!stageStore.stages.length) stageStore.fetchStages()
    if (!officeStore.offices.length) officeStore.fetchOffices()
    if (!categoriesStore.categories.length) categoriesStore.fetchCategories()
    fetchOfficeMessengers()
  }
)

// ── File handlers ─────────────────────────────────────────────────────
const formatSize = (bytes: number) => {
  if (bytes < 1024)           return `${bytes} B`
  if (bytes < 1024 * 1024)   return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const ALLOWED_EXTENSIONS = ['doc', 'docx', 'xls', 'xlsx', 'csv']

const isValidDocumentFile = (file: File | null | undefined): boolean => {
  if (!file) return false
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  return ALLOWED_EXTENSIONS.includes(ext)
}

const handleFileChange = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0] || null
  if (!file) {
    clearFile()
    return
  }

  if (!isValidDocumentFile(file)) {
    errorMessage.value = 'Invalid file format. Only Word (.doc, .docx) and Excel (.xls, .xlsx, .csv) documents are accepted.'
    clearFile()
    return
  }

  selectedFile.value = file
  currentTrackingId.value = generateTrackingId()
  errorMessage.value = ''
}

const handleDrop = (e: DragEvent) => {
  isDragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (!file) return

  if (!isValidDocumentFile(file)) {
    errorMessage.value = 'Invalid file format. Only Word (.doc, .docx) and Excel (.xls, .xlsx, .csv) documents are accepted.'
    clearFile()
    return
  }

  selectedFile.value = file
  currentTrackingId.value = generateTrackingId()
  errorMessage.value = ''
}

const clearFile = () => {
  selectedFile.value = null
  currentTrackingId.value = ''
  manualTitle.value = ''
  manualDescription.value = ''
  if (fileInput.value) fileInput.value.value = ''
}

const handleClose = () => {
  if (uploading.value) return
  clearFile()
  // selectedOriginOfficeId is now computed, do not reset it manually
  selectedStageId.value = ''
  selectedCategoryId.value = ''
  selectedMessengerId.value = ''
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
  if (!canSubmit.value) return

  uploading.value = true
  errorMessage.value = ''

  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value!)
    formData.append('stage_id', selectedStageId.value)
    formData.append('origin_office_id', selectedOriginOfficeId.value)
    formData.append('category_id', selectedCategoryId.value)

    if (isExcelFile.value && (manualTitle.value || manualDescription.value)) {
      formData.append('manual_title', manualTitle.value)
      formData.append('manual_description', manualDescription.value)
    }

    const trackingCode = currentTrackingId.value || generateTrackingId()
    currentTrackingId.value = trackingCode

    let qrDataUrl = ''
    try { qrDataUrl = await QRCode.toDataURL(trackingCode, { margin: 1, width: 320 }) } catch { /* non-fatal */ }

    if (selectedStrategy.value === 'embedded') {
      await printEmbeddedDocument(selectedFile.value!, qrDataUrl)
    } else {
      await printStandaloneDocument(selectedFile.value!, qrDataUrl)
    }

    formData.append('qr_code_data', trackingCode)
    formData.append('user_id',          String(auth.user?.user_id ?? ''))
    formData.append('org_id',           String(auth.user?.org_id ?? ''))
    
    const res = await $fetch<{ success: boolean; data?: any; metadata?: any }>('/api/documents/upload', {
      method: 'POST',
      body: formData,
    })

    if (res.success) {
      if (res.data?.title || res.data?.description) {
        aiAnalysis.value = { title: res.data.title, description: res.data.description }
      }

      const newDocumentId = res.metadata?.id
      const newDocumentTitle = res.metadata?.title || 'Document'

      if (newDocumentId && selectedMessengerId.value) {
        try {
          await $fetch('/api/tracking/assign-liaison', {
            method: 'POST',
            body: { document_id: newDocumentId, liaison_user_id: selectedMessengerId.value },
          })
          lastUploadedTitle.value = newDocumentTitle
          lastUploadedQrPayload.value = buildDocumentTrackQrPayload(newDocumentId)
          showAssignedQr.value = true
        } catch (assignErr: any) {
          console.error('Failed to assign messenger:', assignErr)
          errorMessage.value = `Document saved, but assigning the messenger failed: ${assignErr?.data?.message || 'please assign one from the document view.'}`
        }
      }

      emit('uploaded')
      clearFile()
      // selectedOriginOfficeId is computed, no need to reset
      selectedStageId.value = ''
      selectedCategoryId.value = ''
      selectedMessengerId.value = ''
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
