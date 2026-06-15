<template>
  <section
    class="w-full max-w-[1800px] mx-auto space-y-6 pb-24 lg:pb-8"
    :class="isDark ? 'text-white' : 'text-gray-900'"
  >

    <!-- ══════════════════════════════════════════════════════════════════ -->
    <!-- A. Header + Scope Toggle                                          -->
    <!-- ══════════════════════════════════════════════════════════════════ -->
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <!-- Title -->
      <div>
        <div class="mb-3 h-1 w-14 rounded-full bg-rich-orange" />
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Document Management</h1>
        <p class="mt-1 text-sm" :class="mutedText">
          {{
            currentScope === 'LOCAL'
              ? 'Documents scoped to your sub-office branches.'
              : 'Organisation-wide document stream and analytics.'
          }}
        </p>
      </div>

      <!-- Right: toggle + upload button -->
      <div class="flex flex-wrap items-center gap-3">

        <!-- ── Premium Perspective Toggle ─────────────────────────── -->
        <div
          class="relative flex items-center gap-1 rounded-2xl border p-1.5"
          :class="isDark
            ? 'bg-white/[0.04] border-white/10 backdrop-blur-md'
            : 'bg-white border-gray-200 shadow-sm'"
        >
          <div
            class="absolute inset-y-1.5 rounded-xl bg-rich-orange shadow-lg shadow-rich-orange/30 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
            :style="indicatorStyle"
          />
          <button
            v-for="opt in scopeOptions"
            :key="opt.value"
            :ref="(el) => setTabRef(el, opt.value)"
            type="button"
            class="relative z-10 flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors duration-200 select-none"
            :class="currentScope === opt.value
              ? 'text-white'
              : isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'"
            @click="setScope(opt.value)"
          >
            <Icon :name="opt.icon" class="h-3.5 w-3.5 flex-none" />
            <span class="whitespace-nowrap">{{ opt.label }}</span>
          </button>
        </div>

        <!-- Upload -->
        <button
          type="button"
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-rich-orange px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rich-orange/25 transition-all hover:bg-[#e95a0b] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-rich-orange/50"
          @click="isUploadOpen = true"
        >
          <Icon name="ph:upload-simple-bold" class="h-4 w-4" />
          Upload Document
        </button>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════════════ -->
    <!-- B. Scope Context Banner                                           -->
    <!-- ══════════════════════════════════════════════════════════════════ -->
    <Transition name="scope-fade" mode="out-in">
      <div
        :key="currentScope"
        class="flex items-center gap-3 rounded-xl border px-4 py-3 text-sm"
        :class="currentScope === 'LOCAL'
          ? isDark ? 'border-rich-orange/20 bg-rich-orange/5' : 'border-orange-200 bg-orange-50'
          : isDark ? 'border-white/10 bg-white/[0.03]' : 'border-gray-200 bg-gray-50'"
      >
        <div class="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-rich-orange/10">
          <Icon
            :name="currentScope === 'LOCAL' ? 'ph:buildings-fill' : 'ph:globe-hemisphere-west-fill'"
            class="h-4 w-4 text-rich-orange"
          />
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-[11px] font-bold uppercase tracking-widest text-rich-orange">
            {{ currentScope === 'LOCAL' ? 'Small Picture — Office View' : 'Big Picture — Organisation View' }}
          </p>
          <p class="mt-0.5 text-xs" :class="mutedText">
            {{
              currentScope === 'LOCAL'
                ? `Showing documents scoped to your ${myOffices.length} sub-office${myOffices.length !== 1 ? 's' : ''}.`
                : `Showing all ${docs.length} documents across the entire organisation.`
            }}
          </p>
        </div>
        <span
          class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border-rich-orange/30 text-rich-orange"
        >
          <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-rich-orange" />
          Live
        </span>
      </div>
    </Transition>

    <!-- ══════════════════════════════════════════════════════════════════ -->
    <!-- C. KPI Cards                                                      -->
    <!-- ══════════════════════════════════════════════════════════════════ -->
    <Transition name="scope-fade" mode="out-in">
      <div :key="`kpi-${currentScope}`" class="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div
          v-for="(card, i) in kpiCards"
          :key="card.label"
          class="flex items-start gap-4 rounded-xl border p-5 backdrop-blur-sm transition-all"
          :class="glassSurface"
          :style="{ transitionDelay: `${i * 40}ms` }"
        >
          <span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl" :class="card.iconBg">
            <Icon :name="card.icon" class="h-5 w-5" :class="card.iconColor" />
          </span>
          <div class="min-w-0">
            <p class="text-[10px] font-bold uppercase tracking-wider" :class="mutedText">{{ card.label }}</p>
            <p class="mt-1 text-2xl font-bold">
              <span v-if="loading" class="inline-block h-6 w-12 animate-pulse rounded-lg" :class="isDark ? 'bg-white/10' : 'bg-gray-200'" />
              <span v-else>{{ card.value }}</span>
            </p>
            <p class="mt-0.5 text-[10px]" :class="card.trendColor">{{ card.trend }}</p>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ══════════════════════════════════════════════════════════════════ -->
    <!-- D. Filter & Search Bar                                            -->
    <!-- ══════════════════════════════════════════════════════════════════ -->
    <div
      class="flex flex-col gap-3 rounded-xl border p-4 backdrop-blur-sm sm:flex-row sm:items-center"
      :class="glassSurface"
    >
      <!-- Search -->
      <div
        class="flex flex-1 items-center gap-2 rounded-xl border px-3 py-2.5 transition-all"
        :class="isDark ? 'border-white/10 bg-rich-black/40 focus-within:border-rich-orange' : 'border-gray-200 bg-gray-50 focus-within:border-rich-orange'"
      >
        <Icon name="ph:magnifying-glass" class="h-4 w-4 flex-none" :class="mutedText" />
        <input
          v-model="search"
          type="search"
          placeholder="Search by title or description…"
          class="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-gray-400"
        />
      </div>

      <!-- Office filter -->
      <select
        v-model="officeFilter"
        class="rounded-xl border px-3 py-2.5 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-rich-orange sm:w-56"
        :class="inputClass"
      >
        <option value="all">All My Offices</option>
        <option value="own">My Uploads Only</option>
        <option v-for="o in myOffices" :key="o.id" :value="String(o.id)">{{ o.name }}</option>
      </select>

      <!-- Status filter -->
      <select
        v-model="statusFilter"
        class="rounded-xl border px-3 py-2.5 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-rich-orange sm:w-44"
        :class="inputClass"
      >
        <option value="all">All Statuses</option>
        <option value="Pending">Pending</option>
        <option value="Processing">Processing</option>
        <option value="Approved">Approved</option>
        <option value="Rejected">Rejected</option>
      </select>

      <!-- Tracking filter -->
      <select
        v-model="trackingFilter"
        class="rounded-xl border px-3 py-2.5 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-rich-orange sm:w-44"
        :class="inputClass"
      >
        <option value="all">All Tracking</option>
        <option value="CREATED">Created</option>
        <option value="PICKED_UP">Picked Up</option>
        <option value="IN_TRANSIT">In Transit</option>
        <option value="ARRIVED_AT_OFFICE">At Office</option>
        <option value="COMPLETED">Completed</option>
      </select>
    </div>

    <!-- ══════════════════════════════════════════════════════════════════ -->
    <!-- E. Documents Table                                                -->
    <!-- ══════════════════════════════════════════════════════════════════ -->
    <article
      class="overflow-hidden rounded-xl border shadow-card backdrop-blur-sm"
      :class="cardSurface"
    >
      <!-- Table header row -->
      <div class="flex items-center justify-between border-b px-5 py-4" :class="borderClass">
        <div>
          <h2 class="text-base font-bold">
            {{ currentScope === 'LOCAL' ? 'Isolated Document Ledger' : 'Organisation Document Directory' }}
          </h2>
          <p class="mt-0.5 text-xs" :class="mutedText">
            {{ filtered.length }} document{{ filtered.length === 1 ? '' : 's' }} in scope
          </p>
        </div>
        <div class="flex items-center gap-2">
          <span
            class="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase"
            :class="currentScope === 'LOCAL'
              ? 'border-rich-orange/30 bg-rich-orange/5 text-rich-orange'
              : isDark ? 'border-white/10 bg-white/5 text-gray-400' : 'border-gray-200 bg-gray-50 text-gray-500'"
          >
            <Icon :name="currentScope === 'LOCAL' ? 'ph:buildings-fill' : 'ph:globe-hemisphere-west-fill'" class="h-3 w-3" />
            {{ currentScope === 'LOCAL' ? 'Office Scope' : 'Org Scope' }}
          </span>
          <Icon name="ph:files-fill" class="h-5 w-5 text-rich-orange" />
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full text-left text-sm">
          <thead :class="isDark ? 'bg-rich-black/50 text-gray-400' : 'bg-gray-50 text-gray-500'">
            <tr>
              <th class="px-5 py-3 text-xs font-semibold uppercase tracking-wide">Document</th>
              <th class="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide">Office</th>
              <th class="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide">Origin</th>
              <th class="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide">Source</th>
              <th class="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide">Tracking</th>
              <th class="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide">Date</th>
              <th class="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide">Status</th>
            </tr>
          </thead>
          <tbody>
            <!-- Loading skeleton -->
            <template v-if="loading">
              <tr v-for="n in 5" :key="n" class="border-t" :class="borderClass">
                <td class="px-5 py-4">
                  <div class="h-4 w-48 animate-pulse rounded-lg" :class="isDark ? 'bg-white/10' : 'bg-gray-200'" />
                  <div class="mt-1 h-3 w-32 animate-pulse rounded-lg" :class="isDark ? 'bg-white/5' : 'bg-gray-100'" />
                </td>
                <td v-for="k in 6" :key="k" class="px-5 py-4">
                  <div class="h-4 w-20 animate-pulse rounded-lg" :class="isDark ? 'bg-white/10' : 'bg-gray-200'" />
                </td>
              </tr>
            </template>

            <!-- Rows -->
            <template v-else-if="filtered.length">
              <tr
                v-for="doc in filtered"
                :key="doc.id"
                class="cursor-pointer border-t transition-colors duration-150"
                :class="[borderClass, isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-gray-50']"
                @click="openDetail(doc)"
              >
                <!-- Document title + desc -->
                <td class="min-w-72 px-5 py-4">
                  <div class="flex items-start gap-2">
                    <div
                      v-if="doc.is_own_upload"
                      class="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-rich-orange/15"
                      title="Your upload"
                    >
                      <Icon name="ph:user-fill" class="h-2.5 w-2.5 text-rich-orange" />
                    </div>
                    <div class="min-w-0">
                      <p class="font-semibold">{{ doc.title }}</p>
                      <p class="mt-0.5 line-clamp-1 max-w-xs text-xs" :class="mutedText">
                        {{ doc.description || '—' }}
                      </p>
                    </div>
                  </div>
                </td>

                <!-- Current office -->
                <td class="whitespace-nowrap px-5 py-4 text-xs">
                  <span
                    class="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-semibold"
                    :class="isDark ? 'border-white/10 bg-white/5 text-gray-300' : 'border-gray-200 bg-gray-50 text-gray-700'"
                  >
                    <Icon name="ph:buildings-fill" class="h-3 w-3 text-rich-orange" />
                    {{ doc.office_label || doc.current_label || 'Unassigned' }}
                  </span>
                </td>

                <!-- Origin office -->
                <td class="whitespace-nowrap px-5 py-4 text-xs" :class="mutedText">
                  {{ doc.origin_label || '—' }}
                </td>

                <!-- Source badge -->
                <td class="whitespace-nowrap px-5 py-4">
                  <span
                    class="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold"
                    :class="doc.is_own_upload
                      ? 'bg-rich-orange/10 text-rich-orange border-rich-orange/20'
                      : isDark ? 'bg-white/5 border-white/10 text-gray-400' : 'bg-gray-100 border-gray-200 text-gray-600'"
                  >
                    {{ doc.is_own_upload ? 'My Upload' : 'Routed In' }}
                  </span>
                </td>

                <!-- Tracking status -->
                <td class="whitespace-nowrap px-5 py-4">
                  <span
                    class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold"
                    :class="trackingClass(doc.tracking_status)"
                  >
                    <span class="h-1.5 w-1.5 rounded-full bg-current" :class="doc.tracking_status === 'IN_TRANSIT' ? 'animate-pulse' : ''" />
                    {{ trackingLabel(doc.tracking_status) }}
                  </span>
                </td>

                <!-- Date -->
                <td class="whitespace-nowrap px-5 py-4 text-xs" :class="mutedText">
                  {{ fmtDate(doc.created_at) }}
                </td>

                <!-- Approval status -->
                <td class="whitespace-nowrap px-5 py-4">
                  <span
                    class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold"
                    :class="statusClass(doc.status)"
                  >
                    <span class="h-1.5 w-1.5 rounded-full bg-current" :class="doc.status === 'Pending' ? 'animate-pulse' : ''" />
                    {{ doc.status || 'Pending' }}
                  </span>
                </td>
              </tr>
            </template>

            <!-- Empty -->
            <tr v-else>
              <td colspan="7" class="px-5 py-16 text-center">
                <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rich-orange/10">
                  <Icon name="ph:file-dashed" class="h-8 w-8 text-rich-orange" />
                </div>
                <p class="font-bold">No documents in scope.</p>
                <p class="mt-1 text-xs" :class="mutedText">
                  {{
                    currentScope === 'LOCAL'
                      ? 'Upload a document from your office or adjust the office filter.'
                      : 'No organisation documents found. Try adjusting the search.'
                  }}
                </p>
                <button
                  type="button"
                  class="mt-4 inline-flex items-center gap-2 rounded-xl bg-rich-orange px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rich-orange/25 transition hover:bg-[#e95a0b]"
                  @click="isUploadOpen = true"
                >
                  <Icon name="ph:upload-simple-bold" class="h-4 w-4" />
                  Upload Document
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>

    <!-- ══════════════════════════════════════════════════════════════════ -->
    <!-- F. Document Detail Drawer (60% right-slide panel)                 -->
    <!-- ══════════════════════════════════════════════════════════════════ -->
    <Teleport to="body">
      <Transition name="drawer-fade">
        <div
          v-if="selectedDoc"
          class="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
          @click="selectedDoc = null"
        />
      </Transition>

      <Transition name="drawer-slide">
        <aside
          v-if="selectedDoc"
          class="fixed bottom-0 right-0 top-0 z-[90] flex w-full lg:w-[60%] lg:max-w-4xl flex-col border-l shadow-2xl"
          :class="isDark ? 'bg-[#111111]/95 backdrop-blur-xl border-white/10' : 'bg-white border-gray-200'"
        >
          <!-- Header -->
          <header class="flex items-start justify-between gap-4 border-b px-6 py-5" :class="isDark ? 'border-white/10' : 'border-gray-200'">
            <div class="min-w-0">
              <div class="mb-1 h-0.5 w-8 rounded-full bg-rich-orange" />
              <p class="text-[10px] font-bold uppercase tracking-widest text-rich-orange">Document Detail</p>
              <h2 class="mt-1 truncate text-lg font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">
                {{ selectedDoc.title }}
              </h2>
            </div>
            <button
              type="button"
              class="inline-flex h-9 w-9 flex-none items-center justify-center rounded-xl transition"
              :class="isDark ? 'text-gray-400 hover:bg-white/5' : 'text-gray-400 hover:bg-gray-100'"
              @click="selectedDoc = null"
            >
              <Icon name="ph:x-bold" class="h-4 w-4" />
            </button>
          </header>

          <div class="flex min-h-0 flex-1 flex-col overflow-hidden">

          <div class="flex-1 space-y-5 overflow-y-auto px-6 py-6">

            <!-- Status badges -->
            <div class="flex flex-wrap gap-2">
              <span class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold" :class="trackingClass(selectedDoc.tracking_status)">
                <span class="h-1.5 w-1.5 rounded-full bg-current" :class="selectedDoc.tracking_status === 'IN_TRANSIT' ? 'animate-pulse' : ''" />
                {{ trackingLabel(selectedDoc.tracking_status) }}
              </span>
              <span class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold" :class="statusClass(selectedDoc.status)">
                <span class="h-1.5 w-1.5 rounded-full bg-current" :class="selectedDoc.status === 'Pending' ? 'animate-pulse' : ''" />
                {{ selectedDoc.status || 'Pending' }}
              </span>
              <span
                class="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold"
                :class="selectedDoc.is_own_upload
                  ? 'bg-rich-orange/10 border-rich-orange/20 text-rich-orange'
                  : isDark ? 'bg-white/5 border-white/10 text-gray-400' : 'bg-gray-100 border-gray-200 text-gray-600'"
              >
                {{ selectedDoc.is_own_upload ? 'My Upload' : 'Routed In' }}
              </span>
            </div>

            <!-- Meta grid -->
            <div class="grid grid-cols-2 gap-3">
              <div class="rounded-xl border p-3" :class="metaCell">
                <p class="text-[10px] font-bold uppercase tracking-wider text-rich-orange">Current Office</p>
                <p class="mt-1 text-sm font-semibold">{{ selectedDoc.office_label || selectedDoc.current_label || 'Unassigned' }}</p>
              </div>
              <div class="rounded-xl border p-3" :class="metaCell">
                <p class="text-[10px] font-bold uppercase tracking-wider text-rich-orange">Registered</p>
                <p class="mt-1 text-sm font-semibold">{{ fmtDate(selectedDoc.created_at) }}</p>
              </div>
              <div v-if="selectedDoc.origin_label" class="rounded-xl border p-3" :class="metaCell">
                <p class="text-[10px] font-bold uppercase tracking-wider text-rich-orange">Origin Office</p>
                <p class="mt-1 text-sm font-semibold">{{ selectedDoc.origin_label }}</p>
              </div>
              <div class="rounded-xl border p-3" :class="metaCell" :class-list="selectedDoc.origin_label ? '' : 'col-span-2'">
                <p class="text-[10px] font-bold uppercase tracking-wider text-rich-orange">Stage / Route</p>
                <p class="mt-1 text-sm font-semibold">{{ detailStageName || 'Unassigned' }}</p>
              </div>
            </div>

            <!-- Description -->
            <div v-if="selectedDoc.description" class="rounded-xl border p-4" :class="metaCell">
              <p class="mb-2 text-[10px] font-bold uppercase tracking-wider text-rich-orange">Description</p>
              <p class="text-sm leading-relaxed" :class="mutedText">{{ selectedDoc.description }}</p>
            </div>

            <!-- QR Code block -->
            <div class="rounded-xl border p-4" :class="isDark ? 'border-white/10 bg-[#0a0a0a]' : 'border-gray-200 bg-gray-50'">
              <p class="mb-3 text-[10px] font-bold uppercase tracking-wider text-rich-orange">QR Tracking Code</p>
              <div class="flex items-center gap-4">
                <div class="flex h-[110px] w-[110px] flex-none items-center justify-center rounded-xl bg-white p-2 shadow-sm">
                  <img v-if="detailQrUrl" :src="detailQrUrl" alt="Document QR" class="h-full w-full" />
                  <Icon v-else name="ph:qr-code" class="h-10 w-10 text-gray-300" />
                </div>
                <div class="min-w-0">
                  <p class="break-all font-mono text-sm" :class="isDark ? 'text-gray-200' : 'text-gray-800'">
                    {{ selectedDoc.qr_code_data || 'N/A' }}
                  </p>
                  <p class="mt-2 text-xs" :class="mutedText">
                    Scan to link physical hard-copy to this digital record.
                  </p>
                </div>
              </div>
            </div>

            <!-- ── Workflow Tracker ────────────────────────────────────── -->
            <section>
              <div class="mb-4 flex items-center gap-2 text-sm font-semibold text-rich-orange">
                <Icon name="ph:path" class="h-4 w-4" />
                Fulfillment Pipeline
              </div>

              <!-- Pipeline progress bar -->
              <div v-if="detailSteps.length" class="mb-4">
                <div class="mb-1.5 flex items-center justify-between text-[10px] font-semibold" :class="mutedText">
                  <span>Progress</span>
                  <span>{{ detailProgressPct }}%</span>
                </div>
                <div class="h-1.5 w-full overflow-hidden rounded-full" :class="isDark ? 'bg-white/10' : 'bg-gray-200'">
                  <div
                    class="h-full rounded-full bg-rich-orange transition-all duration-700"
                    :style="{ width: `${detailProgressPct}%` }"
                  />
                </div>
              </div>

              <!-- Step nodes -->
              <div v-if="detailSteps.length" class="relative space-y-0">
                <div
                  v-for="(step, idx) in detailSteps"
                  :key="`${step.office_id}-${idx}`"
                  class="relative flex gap-4 pb-6 last:pb-0"
                >
                  <!-- Connector line -->
                  <div
                    v-if="idx < detailSteps.length - 1"
                    class="absolute left-[15px] top-8 h-full w-0.5"
                    :class="isStepDone(step) ? 'bg-rich-orange' : isDark ? 'bg-white/10' : 'bg-gray-200'"
                  />

                  <!-- Node circle -->
                  <div
                    class="relative z-10 flex h-8 w-8 flex-none items-center justify-center rounded-full border text-xs font-bold transition"
                    :class="stepNodeClass(step)"
                  >
                    <Icon v-if="isStepDone(step)" name="ph:check-bold" class="h-4 w-4" />
                    <span v-else>{{ step.step_number }}</span>
                  </div>

                  <!-- Step content -->
                  <div class="min-w-0 flex-1 pt-1">
                    <p class="text-sm font-semibold" :class="isStepUpcoming(step) ? mutedText : isDark ? 'text-white' : 'text-gray-900'">
                      {{ step.office_name }}
                    </p>
                    <p class="mt-0.5 text-xs" :class="stepLabelClass(step)">
                      {{ stepStateLabel(step) }} · Step {{ step.step_number }}
                    </p>
                  </div>
                </div>
              </div>

              <div
                v-else
                class="rounded-xl border border-dashed p-6 text-center text-sm"
                :class="isDark ? 'border-white/10 text-gray-500' : 'border-gray-200 text-gray-400'"
              >
                No workflow steps mapped to this document's stage.
              </div>
            </section>

          </div>

          <!-- ── Contextual Issue Chat ───────────────────────────────── -->
          <DocumentIssueChatPanel
            :document="selectedDoc"
            :offices="myOffices"
            @updated="handleIssueUpdated"
          />

          </div>
        </aside>
      </Transition>
    </Teleport>

    <!-- ══════════════════════════════════════════════════════════════════ -->
    <!-- G. Upload Modal                                                   -->
    <!-- ══════════════════════════════════════════════════════════════════ -->
    <EmployeeDocUploadModal
      :is-open="isUploadOpen"
      :offices="myOffices"
      :scope="currentScope"
      @close="isUploadOpen = false"
      @uploaded="handleUploadSuccess"
    />

  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import QRCode from 'qrcode'
import { useAuthStore } from '~/stores/auth'
import { useStageStore } from '~/stores/stage'
import EmployeeDocUploadModal from './EmployeeDocUploadModal.vue'
import DocumentIssueChatPanel from './DocumentIssueChatPanel.vue'

// ── Types ─────────────────────────────────────────────────────────────
type Scope = 'LOCAL' | 'GLOBAL'

interface LedgerDoc {
  id: string
  title: string
  description?: string
  status: string
  tracking_status?: string
  qr_code_data?: string
  office_id?: string
  stage_id?: string | number
  origin_office_id?: string
  current_office_id?: string
  created_at: string
  user_id: string
  office_label?: string
  origin_label?: string
  current_label?: string
  is_own_upload: boolean
}

interface OfficeRecord { id: string; name: string; code?: string }
interface StageStep    { office_id: string | number; step_number: number; office_name: string }

// ── Stores & composables ──────────────────────────────────────────────
const auth       = useAuthStore()
const stageStore = useStageStore()
const { isDark } = useTheme()

// ── Reactive state ────────────────────────────────────────────────────
const currentScope  = ref<Scope>('LOCAL')
const docs          = ref<LedgerDoc[]>([])
const myOffices     = ref<OfficeRecord[]>([])
const loading       = ref(false)
const isUploadOpen  = ref(false)
const selectedDoc   = ref<LedgerDoc | null>(null)
const search        = ref('')
const officeFilter  = ref<string>('all')
const statusFilter  = ref<string>('all')
const trackingFilter = ref<string>('all')
const detailQrUrl   = ref('')

// ── Scope toggle refs (same pattern as dashboard.vue) ─────────────────
const scopeOptions = [
  { value: 'LOCAL' as Scope,  label: 'Office View',  icon: 'ph:buildings-fill' },
  { value: 'GLOBAL' as Scope, label: 'Org View',     icon: 'ph:globe-hemisphere-west-fill' },
]
const tabRefs = ref<Record<string, HTMLElement | null>>({})
const indicatorStyle = ref({ left: '6px', width: '120px' })

const setTabRef = (el: any, value: Scope) => {
  tabRefs.value[value] = el as HTMLElement | null
}

const updateIndicator = () => {
  const el = tabRefs.value[currentScope.value]
  if (!el) return
  indicatorStyle.value = { left: `${el.offsetLeft}px`, width: `${el.offsetWidth}px` }
}

const setScope = (scope: Scope) => {
  currentScope.value = scope
  nextTick(updateIndicator)
}

watch(currentScope, () => reloadData())

onMounted(() => {
  nextTick(updateIndicator)
})

// ── Theming ───────────────────────────────────────────────────────────
const glassSurface = computed(() =>
  isDark.value ? 'border-white/10 bg-white/[0.04]' : 'border-gray-200 bg-white'
)
const cardSurface = computed(() =>
  isDark.value ? 'border-white/10 bg-[#1A1A1A] shadow-xl shadow-black/30' : 'border-gray-200 bg-white shadow-card'
)
const borderClass  = computed(() => isDark.value ? 'border-white/5' : 'border-gray-100')
const mutedText    = computed(() => isDark.value ? 'text-gray-400' : 'text-gray-500')
const inputClass   = computed(() =>
  isDark.value
    ? 'border-white/10 bg-rich-black text-white placeholder:text-gray-500'
    : 'border-gray-200 bg-white text-gray-900 placeholder:text-gray-400'
)
const metaCell = computed(() =>
  isDark.value ? 'border-white/10 bg-white/[0.03]' : 'border-gray-200 bg-gray-50'
)

// ── KPI cards ─────────────────────────────────────────────────────────
const kpiCards = computed(() => [
  {
    label: 'Total Docs',
    value: docs.value.length,
    icon: 'ph:files-fill',
    iconBg: 'bg-rich-orange/10',
    iconColor: 'text-rich-orange',
    trend: currentScope.value === 'LOCAL' ? 'In your offices' : 'Org-wide',
    trendColor: 'text-rich-orange',
  },
  {
    label: 'My Uploads',
    value: docs.value.filter((d) => d.is_own_upload).length,
    icon: 'ph:user-fill',
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-400',
    trend: 'Registered by you',
    trendColor: isDark.value ? 'text-gray-500' : 'text-gray-400',
  },
  {
    label: 'In Transit',
    value: docs.value.filter((d) => d.tracking_status === 'IN_TRANSIT').length,
    icon: 'ph:van-fill',
    iconBg: 'bg-purple-500/10',
    iconColor: 'text-purple-400',
    trend: 'Moving now',
    trendColor: 'text-purple-400',
  },
  {
    label: 'Completed',
    value: docs.value.filter((d) => d.tracking_status === 'COMPLETED').length,
    icon: 'ph:check-circle-fill',
    iconBg: 'bg-green-500/10',
    iconColor: 'text-green-400',
    trend: 'Fully delivered',
    trendColor: 'text-green-400',
  },
])

// ── Filtered docs ─────────────────────────────────────────────────────
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return docs.value.filter((doc) => {
    if (officeFilter.value === 'own' && !doc.is_own_upload) return false
    if (officeFilter.value !== 'all' && officeFilter.value !== 'own') {
      const docOff = String(doc.office_id ?? doc.current_office_id ?? '')
      const ori    = String(doc.origin_office_id ?? '')
      if (docOff !== officeFilter.value && ori !== officeFilter.value) return false
    }
    if (statusFilter.value !== 'all' && doc.status !== statusFilter.value) return false
    if (trackingFilter.value !== 'all' && (doc.tracking_status || 'CREATED') !== trackingFilter.value) return false
    if (q && !doc.title?.toLowerCase().includes(q) && !doc.description?.toLowerCase().includes(q)) return false
    return true
  })
})

// ── Detail drawer computed ────────────────────────────────────────────
const detailStageName = computed(() => {
  const id = selectedDoc.value?.stage_id
  if (id == null) return ''
  return stageStore.stages.find((s) => String(s.stage_id) === String(id))?.name || ''
})

const detailSteps = computed<(StageStep & { office_name: string })[]>(() => {
  const id = selectedDoc.value?.stage_id
  if (id == null) return []
  const seq = (stageStore.stageOfficeSequences as any)[id as number] || []
  return [...seq]
    .sort((a: StageStep, b: StageStep) => a.step_number - b.step_number)
    .map((step: StageStep) => ({
      ...step,
      office_name: resolveOfficeName(step.office_id),
    }))
})

const resolveOfficeName = (officeId: string | number | null | undefined) => {
  if (officeId == null) return 'Unknown Office'
  const found = myOffices.value.find((o) => String(o.id) === String(officeId))
  return found?.name || `Office ${String(officeId).slice(0, 6)}`
}

const currentStepNumber = computed(() => {
  const officeId = selectedDoc.value?.current_office_id || selectedDoc.value?.office_id
  return (
    detailSteps.value.find((s) => String(s.office_id) === String(officeId))?.step_number ||
    detailSteps.value[0]?.step_number ||
    0
  )
})

const detailProgressPct = computed(() => {
  const total = detailSteps.value.length
  if (!total) return 0
  const done = detailSteps.value.filter((s) => isStepDone(s)).length
  return Math.round((done / total) * 100)
})

const isStepDone     = (step: StageStep) => step.step_number < currentStepNumber.value
const isStepCurrent  = (step: StageStep) => step.step_number === currentStepNumber.value
const isStepUpcoming = (step: StageStep) => step.step_number > currentStepNumber.value

const stepNodeClass = (step: StageStep) => {
  if (isStepDone(step))    return 'bg-rich-orange text-white border-rich-orange'
  if (isStepCurrent(step)) return 'border-rich-orange/40 text-rich-orange bg-rich-orange/10 animate-pulse'
  return isDark.value ? 'border-white/10 text-gray-500' : 'border-gray-200 text-gray-400'
}

const stepLabelClass = (step: StageStep) => {
  if (isStepDone(step) || isStepCurrent(step)) return 'text-rich-orange'
  return isDark.value ? 'text-gray-500' : 'text-gray-400'
}

const stepStateLabel = (step: StageStep) => {
  if (isStepDone(step))    return 'Completed'
  if (isStepCurrent(step)) return 'Current Checkpoint'
  return 'Upcoming'
}

// ── Badge helpers ─────────────────────────────────────────────────────
const statusClass = (s: string) => {
  switch ((s || 'Pending').toLowerCase()) {
    case 'approved':   return 'text-green-500 border-green-500/30 bg-green-500/10'
    case 'rejected':   return 'text-red-500 border-red-500/30 bg-red-500/10'
    case 'processing': return 'text-blue-400 border-blue-400/30 bg-blue-400/10'
    case 'in review':  return 'text-blue-400 border-blue-400/30 bg-blue-400/10'
    default:           return 'text-rich-orange border-rich-orange/30 bg-rich-orange/10'
  }
}

const trackingClass = (s?: string) => {
  switch (s) {
    case 'COMPLETED':         return 'text-green-500 border-green-500/30 bg-green-500/10'
    case 'IN_TRANSIT':        return 'text-blue-400 border-blue-400/30 bg-blue-400/10'
    case 'PICKED_UP':         return 'text-purple-400 border-purple-400/30 bg-purple-400/10'
    case 'ARRIVED_AT_OFFICE': return 'text-teal-400 border-teal-400/30 bg-teal-400/10'
    case 'DISCREPANCY_REPORTED': return 'text-amber-400 border-amber-400/30 bg-amber-400/10'
    default:                  return 'text-rich-orange border-rich-orange/30 bg-rich-orange/10'
  }
}

const trackingLabel = (s?: string) => {
  switch (s) {
    case 'COMPLETED':         return 'Completed'
    case 'IN_TRANSIT':        return 'In Transit'
    case 'PICKED_UP':         return 'Picked Up'
    case 'ARRIVED_AT_OFFICE': return 'At Office'
    case 'DISCREPANCY_REPORTED': return 'Discrepancy'
    default:                  return 'Created'
  }
}

const fmtDate = (v?: string) => {
  if (!v) return '-'
  return new Intl.DateTimeFormat('en', { month: 'short', day: '2-digit', year: 'numeric' }).format(new Date(v))
}

// ── Detail drawer open ────────────────────────────────────────────────
const openDetail = async (doc: LedgerDoc) => {
  selectedDoc.value = doc
  detailQrUrl.value = ''
  if (doc.qr_code_data) {
    try {
      detailQrUrl.value = await QRCode.toDataURL(doc.qr_code_data, { margin: 1, width: 200 })
    } catch { /* non-fatal */ }
  }
  if (!stageStore.stages.length) stageStore.fetchStages()
}

// ── Data fetching ─────────────────────────────────────────────────────
const fetchDocs = async () => {
  const orgId  = auth.user?.org_id
  const userId = auth.user?.user_id
  if (!orgId || !userId) return
  loading.value = true
  try {
    const res = await $fetch<{ success: boolean; data: LedgerDoc[] }>('/api/employee/ledger', {
      params: { orgId, userId, scope: currentScope.value, limit: 200 },
    })
    docs.value = res.data ?? []
  } catch (err) {
    console.error('[EmployeeDocs] fetchDocs:', err)
  } finally {
    loading.value = false
  }
}

const fetchMyOffices = async () => {
  const orgId  = auth.user?.org_id
  const userId = auth.user?.user_id
  if (!orgId || !userId) return
  try {
    const res = await $fetch<{ success: boolean; data: OfficeRecord[] }>('/api/employee/my-offices', {
      params: { orgId, userId },
    })
    myOffices.value = res.data ?? []
  } catch { /* silent */ }
}

const reloadData = () => {
  fetchDocs()
}

const handleUploadSuccess = () => {
  isUploadOpen.value = false
  fetchDocs()
}

const handleIssueUpdated = (payload: { tracking_status: string; issueClosed?: boolean }) => {
  if (selectedDoc.value) {
    selectedDoc.value = {
      ...selectedDoc.value,
      tracking_status: payload.tracking_status,
    }
  }
  const idx = docs.value.findIndex((d) => d.id === selectedDoc.value?.id)
  if (idx !== -1) {
    docs.value[idx] = {
      ...docs.value[idx],
      tracking_status: payload.tracking_status,
    }
  }
}

onMounted(async () => {
  if (auth.isLoggedIn && !auth.currentOrg) await auth.fetchMyOrg()
  await Promise.all([fetchMyOffices(), fetchDocs(), stageStore.fetchStages()])
  nextTick(updateIndicator)
})
</script>

<style scoped>
/* Scope toggle transition */
.scope-fade-enter-active, .scope-fade-leave-active { transition: opacity 0.25s ease, transform 0.25s ease; }
.scope-fade-enter-from, .scope-fade-leave-to { opacity: 0; transform: translateY(4px); }

/* Detail / upload drawer */
.drawer-fade-enter-active, .drawer-fade-leave-active { transition: opacity 0.2s ease; }
.drawer-fade-enter-from, .drawer-fade-leave-to       { opacity: 0; }
.drawer-slide-enter-active, .drawer-slide-leave-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.drawer-slide-enter-from, .drawer-slide-leave-to { transform: translateX(100%); }
</style>
