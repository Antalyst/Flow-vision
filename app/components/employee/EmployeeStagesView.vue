<template>
  <section class="w-full space-y-6 pb-24 lg:pb-12 font-dashboard" :class="isDark ? 'text-white-pure' : 'text-gray-900'">

    <!-- ── Page Header ──────────────────────────────────────────────── -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <span class="h-2 w-2 rounded-full bg-candy-orange animate-pulse" />
          <span class="text-xs font-bold uppercase tracking-wider text-candy-orange">Document Operations</span>
        </div>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Workflow Steps</h1>
        <p class="mt-1 text-sm" :class="mutedText">
          Define and order the sequential checkpoints documents move through across your offices
        </p>
      </div>

      <div class="flex items-center gap-3">
        <!-- Create Route primary button -->
        <button
          type="button"
          class="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-candy-orange px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-candy-hover active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-candy-orange/30"
          @click="openDrawer"
        >
          <Icon name="ph:plus-bold" class="h-4 w-4" />
          <span>Create Route</span>
        </button>
      </div>
    </div>

    <!-- ── KPI Summary Cards ────────────────────────────────────────── -->
    <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <!-- Total Routes -->
      <div
        class="flex flex-col justify-between rounded-2xl border p-4 transition-all duration-200"
        :class="cardSurface"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold" :class="mutedText">Total Routes</span>
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-candy-orange/10 text-candy-orange">
            <Icon name="ph:git-fork-light" class="h-4 w-4" />
          </div>
        </div>
        <div class="mt-3 flex items-baseline gap-2">
          <span class="text-2xl font-bold tracking-tight">{{ totalStagesCount }}</span>
          <span class="text-xs" :class="mutedText">configured</span>
        </div>
      </div>

      <!-- Local Office Routes -->
      <div
        class="flex flex-col justify-between rounded-2xl border p-4 transition-all duration-200"
        :class="cardSurface"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold" :class="mutedText">Local Office Routes</span>
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Icon name="ph:buildings-light" class="h-4 w-4" />
          </div>
        </div>
        <div class="mt-3 flex items-baseline gap-2">
          <span class="text-2xl font-bold tracking-tight">{{ localStagesCount }}</span>
          <span class="text-xs text-emerald-600 dark:text-emerald-400 font-medium">branch routes</span>
        </div>
      </div>

      <!-- Global Routes -->
      <div
        class="flex flex-col justify-between rounded-2xl border p-4 transition-all duration-200"
        :class="cardSurface"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold" :class="mutedText">Organisation Routes</span>
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Icon name="ph:globe-hemisphere-west-light" class="h-4 w-4" />
          </div>
        </div>
        <div class="mt-3 flex items-baseline gap-2">
          <span class="text-2xl font-bold tracking-tight">{{ globalStagesCount }}</span>
          <span class="text-xs text-blue-600 dark:text-blue-400 font-medium">org-wide templates</span>
        </div>
      </div>

      <!-- Total Checkpoints Mapped -->
      <div
        class="flex flex-col justify-between rounded-2xl border p-4 transition-all duration-200"
        :class="cardSurface"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold" :class="mutedText">Checkpoints Mapped</span>
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Icon name="ph:map-pin-line-light" class="h-4 w-4" />
          </div>
        </div>
        <div class="mt-3 flex items-baseline gap-2">
          <span class="text-2xl font-bold tracking-tight">{{ totalCheckpointsCount }}</span>
          <span class="text-xs text-amber-600 dark:text-amber-400 font-medium">office stops</span>
        </div>
      </div>
    </div>

    <!-- ── Filter & Search Control Bar ──────────────────────────────── -->
    <div
      class="flex flex-col gap-3 rounded-2xl border p-3.5 sm:flex-row sm:items-center sm:justify-between"
      :class="cardSurface"
    >
      <div class="flex flex-wrap items-center gap-2">
        <!-- Office Filter Pills (narrows the Local Routes column) -->
        <div class="flex flex-wrap items-center gap-1.5">
          <button
            v-for="office in myOffices"
            :key="office.id"
            type="button"
            class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors"
            :class="activeOfficeFilter === String(office.id)
              ? 'border-candy-orange bg-candy-orange/10 text-candy-orange'
              : isDark ? 'border-onyx-border bg-onyx-card text-gray-400 hover:border-candy-orange/60 hover:text-white' : 'border-gray-200 bg-white text-gray-600 hover:border-candy-orange/60 hover:text-gray-900'"
            @click="toggleOfficeFilter(String(office.id))"
          >
            <Icon name="ph:buildings-light" class="h-3.5 w-3.5" />
            <span>{{ formatOfficeName(office.name) }}</span>
          </button>
        </div>
      </div>

      <!-- Search Input -->
      <div class="relative min-w-[200px] sm:w-64">
        <Icon name="ph:magnifying-glass-light" class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white-muted" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search routes or offices…"
          class="w-full rounded-xl border py-2 pl-9 pr-8 text-xs outline-none transition-colors focus:border-candy-orange"
          :class="inputClass"
        />
        <button
          v-if="searchQuery"
          type="button"
          class="absolute right-2.5 top-1/2 -translate-y-1/2 text-white-muted hover:text-gray-700 dark:hover:text-white"
          @click="searchQuery = ''"
        >
          <Icon name="ph:x-circle-fill" class="h-3.5 w-3.5" />
        </button>
      </div>
    </div>

    <!-- ── Active Filter Summary Tag ────────────────────────────────── -->
    <div v-if="activeOfficeFilter || searchQuery" class="flex items-center justify-between text-xs" :class="mutedText">
      <span>
        Filtering by
        <span v-if="activeOfficeFilter" class="font-semibold" :class="isDark ? 'text-white' : 'text-gray-800'">office</span>
        <span v-if="searchQuery"> matching "<strong class="text-candy-orange">{{ searchQuery }}</strong>"</span>
      </span>
      <button
        type="button"
        class="text-candy-orange hover:underline font-semibold"
        @click="resetFilters"
      >
        Clear filters
      </button>
    </div>

    <!-- ── Loading Skeleton ─────────────────────────────────────────── -->
    <div v-if="loading" class="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div v-for="n in 3" :key="n" class="space-y-3">
        <div class="h-[72px] animate-pulse rounded-2xl border" :class="isDark ? 'bg-onyx-card border-onyx-border' : 'bg-white border-gray-200'" />
        <div class="h-9 animate-pulse rounded-xl" :class="isDark ? 'bg-white/[0.06]' : 'bg-gray-100'" />
        <div v-for="m in 2" :key="m" class="h-24 animate-pulse rounded-2xl border" :class="isDark ? 'bg-onyx-card border-onyx-border' : 'bg-white border-gray-200'" />
      </div>
    </div>

    <!-- ── 3-Column Route Board (All / Global / Local) ─────────────────── -->
    <div v-else class="grid min-h-0 grid-cols-1 gap-4 lg:grid-cols-3">
      <section v-for="col in stageColumns" :key="col.id" class="flex min-h-[200px] flex-col gap-3">

        <!-- KPI card -->
        <div class="flex items-center gap-3 rounded-2xl border p-4" :class="cardSurface">
          <div class="flex h-10 w-10 flex-none items-center justify-center rounded-lg" :class="[col.accent.chip, col.accent.text]">
            <Icon :name="col.icon" class="h-5 w-5" />
          </div>
          <div class="min-w-0">
            <p class="text-2xl font-bold tracking-tight">{{ col.count }}</p>
            <p class="truncate text-xs font-medium" :class="mutedText">{{ col.label }}</p>
          </div>
        </div>

        <!-- General info / column header bar -->
        <div class="flex items-center justify-between gap-2 rounded-xl px-4 py-2.5" :class="isDark ? 'bg-white/[0.06]' : 'bg-gray-100'">
          <span class="truncate text-xs" :class="mutedText">{{ col.blurb }}</span>
          <span class="flex-none text-xs font-semibold tabular-nums" :class="col.accent.text">{{ col.list.length }}</span>
        </div>

        <!-- Route cards (scrollable) -->
        <div class="overflow-y-auto pr-1 lg:h-[calc(100vh-24rem)]">
          <div class="flex flex-col gap-3">
            <article
              v-for="stage in col.list"
              :key="`${col.id}-${stage.stage_id}`"
              class="overflow-hidden rounded-2xl border shadow-sm transition-shadow hover:shadow-card"
              :class="cardSurface"
            >
              <!-- Stage Card Header -->
              <header class="flex items-start justify-between gap-2 border-b px-4 py-3" :class="borderClass">
                <div class="flex items-start gap-2.5 min-w-0">
                  <div class="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-candy-orange text-xs font-bold text-white shadow-sm">
                    {{ stage.step_number }}
                  </div>
                  <div class="min-w-0">
                    <h2 class="truncate text-sm font-bold tracking-tight" :class="isDark ? 'text-white' : 'text-gray-900'">
                      {{ stage.name }}
                    </h2>
                    <span
                      class="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                      :class="stage.scope === 'local'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'"
                    >
                      <Icon :name="stage.scope === 'local' ? 'ph:buildings-light' : 'ph:globe-hemisphere-west-light'" class="h-2.5 w-2.5" />
                      {{ stage.scope === 'local' ? formatOfficeName(stage.office_name) || 'Local Office' : 'Organisation' }}
                    </span>
                  </div>
                </div>

                <!-- Stage Actions -->
                <div v-if="stage.scope === 'local'" class="flex flex-none items-center gap-0.5">
                  <button
                    type="button"
                    class="inline-flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
                    title="Move up in order"
                    @click="moveStage(stage.stage_id, -1)"
                  >
                    <Icon name="ph:arrow-up-bold" class="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    class="inline-flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
                    title="Move down in order"
                    @click="moveStage(stage.stage_id, 1)"
                  >
                    <Icon name="ph:arrow-down-bold" class="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    class="inline-flex h-7 w-7 items-center justify-center rounded-lg text-danger transition-colors hover:bg-danger/10"
                    title="Delete route"
                    @click="handleDeleteStage(stage.stage_id)"
                  >
                    <Icon name="ph:trash-light" class="h-3.5 w-3.5" />
                  </button>
                </div>
              </header>

              <!-- Route Flow Path Container -->
              <div class="p-4">
                <p class="mb-2.5 text-[11px] font-semibold uppercase tracking-wider" :class="mutedText">
                  {{ getStepCount(stage.stage_id) }} checkpoint{{ getStepCount(stage.stage_id) === 1 ? '' : 's' }}
                </p>

                <div class="flex flex-wrap items-center gap-2">
                  <template v-for="(step, i) in getSteps(stage.stage_id)" :key="`${step.office_id}-${i}`">
                    <!-- Step Badge Pill -->
                    <div
                      class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium"
                      :class="isDark ? 'border-onyx-border bg-onyx-black/80 text-gray-200' : 'border-gray-200/90 bg-gray-50/80 text-gray-800'"
                    >
                      <div class="flex h-4 w-4 flex-none items-center justify-center rounded-full bg-candy-orange text-[10px] font-bold text-white">
                        {{ step.step_number }}
                      </div>
                      <span>{{ formatOfficeName(getOfficeName(step.office_id)) }}</span>
                      <button
                        v-if="stage.scope === 'local'"
                        type="button"
                        class="ml-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-gray-400 hover:bg-danger hover:text-white transition-colors"
                        title="Remove checkpoint"
                        @click="removeStepFromStage(stage.stage_id, step.office_id, i)"
                      >
                        <Icon name="ph:x-bold" class="h-2 w-2" />
                      </button>
                    </div>

                    <Icon
                      v-if="i < getSteps(stage.stage_id).length - 1"
                      name="ph:caret-right-bold"
                      class="h-3.5 w-3.5 flex-none text-candy-orange/70"
                    />
                  </template>

                  <!-- Empty checkpoints state -->
                  <div
                    v-if="!getSteps(stage.stage_id).length"
                    class="w-full rounded-xl border border-dashed py-2.5 px-3 text-center text-[11px]"
                    :class="isDark ? 'border-onyx-border text-gray-500' : 'border-gray-200 text-gray-500'"
                  >
                    No checkpoints mapped yet.
                  </div>
                </div>
              </div>
            </article>

            <!-- Empty column state -->
            <div
              v-if="!col.list.length"
              class="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-3 py-10 text-center"
              :class="isDark ? 'border-onyx-border' : 'border-gray-200'"
            >
              <Icon :name="col.icon" class="h-6 w-6 opacity-15" />
              <p class="text-xs font-medium" :class="mutedText">
                {{ searchQuery ? `No routes matching "${searchQuery}"` : 'No routes here yet' }}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- ── Create Route Drawer ───────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="drawer-fade">
        <div v-if="drawerOpen" class="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm" @click="closeDrawer" />
      </Transition>

      <Transition name="drawer-slide">
        <form
          v-if="drawerOpen"
          class="fixed bottom-0 right-0 top-0 z-[90] flex w-full max-w-lg flex-col border-l shadow-2xl font-dashboard"
          :class="isDark ? 'bg-onyx-card border-onyx-border text-white' : 'bg-white-pure border-gray-200 text-gray-900'"
          @submit.prevent="handleCreateStage"
        >
          <!-- Drawer Header -->
          <header class="flex items-start justify-between gap-4 border-b px-6 py-5" :class="isDark ? 'border-onyx-border' : 'border-gray-200'">
            <div>
              <div class="mb-2 h-1 w-10 rounded-full bg-candy-orange" />
              <h2 class="text-xl font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">
                Create Local Route
              </h2>
              <p class="mt-1 text-xs" :class="mutedText">
                Configure document checkpoints and initial step sequence
              </p>
            </div>

            <button
              type="button"
              class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-white/10 dark:hover:text-white"
              @click="closeDrawer"
            >
              <Icon name="ph:x-bold" class="h-4 w-4" />
            </button>
          </header>

          <!-- Drawer Body -->
          <div class="flex-1 space-y-6 overflow-y-auto px-6 py-6">

            <!-- Route Name -->
            <div class="space-y-1.5">
              <label class="block text-xs font-bold uppercase tracking-wider" :class="isDark ? 'text-gray-200' : 'text-gray-700'">
                Route Name <span class="text-danger">*</span>
              </label>
              <input
                v-model.trim="stageForm.name"
                type="text"
                placeholder="e.g. Standard Clearance Workflow"
                class="w-full rounded-xl border px-4 py-2.5 text-xs outline-none transition-colors focus:border-candy-orange"
                :class="inputClass"
                required
              />
            </div>

            <!-- Owning Office -->
            <div class="space-y-1.5">
              <label class="block text-xs font-bold uppercase tracking-wider" :class="isDark ? 'text-gray-200' : 'text-gray-700'">
                Owning Office <span class="text-danger">*</span>
              </label>
              <select
                v-model="stageForm.office_id"
                class="w-full rounded-xl border px-3.5 py-2.5 text-xs outline-none transition-colors focus:border-candy-orange"
                :class="inputClass"
                required
              >
                <option value="">Select office branch…</option>
                <option v-for="o in myOffices" :key="o.id" :value="String(o.id)">{{ formatOfficeName(o.name) }}</option>
              </select>
            </div>

            <!-- Available Checkpoints Pool -->
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold uppercase tracking-wider" :class="isDark ? 'text-gray-200' : 'text-gray-700'">
                  Available Checkpoints
                </span>
                <span class="text-[11px]" :class="mutedText">Click to add to route sequence</span>
              </div>

              <div class="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                <button
                  v-for="office in allOffices"
                  :key="office.id"
                  type="button"
                  class="flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-2 text-left text-xs transition-colors hover:border-candy-orange"
                  :class="isDark ? 'border-onyx-border bg-onyx-black/60 hover:bg-onyx-black' : 'border-gray-200 bg-gray-50 hover:bg-white'"
                  @click="addCheckpoint(office)"
                >
                  <span class="truncate font-semibold">{{ formatOfficeName(office.name) }}</span>
                  <div class="flex items-center gap-1 text-candy-orange">
                    <span class="text-[11px] font-bold">Add</span>
                    <Icon name="ph:plus-circle-fill" class="h-4 w-4" />
                  </div>
                </button>

                <div v-if="!allOffices.length" class="rounded-xl border border-dashed p-4 text-center text-xs" :class="mutedText">
                  No offices available in organisation.
                </div>
              </div>
            </div>

            <!-- Route Sequence Reorder List -->
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold uppercase tracking-wider" :class="isDark ? 'text-gray-200' : 'text-gray-700'">
                  Route Sequence ({{ selectedCheckpoints.length }})
                </span>
                <span class="text-[11px]" :class="mutedText">Order checkpoints from start to finish</span>
              </div>

              <div
                class="min-h-[120px] space-y-2 rounded-2xl border p-3"
                :class="isDark ? 'border-onyx-border bg-onyx-black/40' : 'border-gray-200 bg-gray-50/50'"
              >
                <div
                  v-for="(cp, i) in selectedCheckpoints"
                  :key="`${cp.id}-${i}`"
                  class="flex items-center gap-2.5 rounded-xl border p-2.5 shadow-2xs transition-colors"
                  :class="isDark ? 'border-onyx-border bg-onyx-black' : 'border-gray-200 bg-white'"
                >
                  <div class="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-candy-orange text-xs font-bold text-white">
                    {{ i + 1 }}
                  </div>
                  <span class="flex-1 truncate text-xs font-semibold">{{ formatOfficeName(cp.name) }}</span>

                  <div class="flex items-center gap-1">
                    <button
                      type="button"
                      class="inline-flex h-6 w-6 items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-30"
                      :disabled="i === 0"
                      @click="moveCheckpoint(i, i - 1)"
                    >
                      <Icon name="ph:caret-up-bold" class="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      class="inline-flex h-6 w-6 items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-30"
                      :disabled="i === selectedCheckpoints.length - 1"
                      @click="moveCheckpoint(i, i + 1)"
                    >
                      <Icon name="ph:caret-down-bold" class="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      class="inline-flex h-6 w-6 items-center justify-center rounded-lg text-danger hover:bg-danger/10"
                      @click="removeCheckpoint(i)"
                    >
                      <Icon name="ph:x-bold" class="h-3 w-3" />
                    </button>
                  </div>
                </div>

                <div v-if="!selectedCheckpoints.length" class="py-6 text-center text-xs" :class="mutedText">
                  No checkpoints added yet. Click offices above to build flow sequence.
                </div>
              </div>
            </div>

          </div>

          <p v-if="createStageError" class="mx-6 mb-3 rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-xs font-medium text-danger">
            {{ createStageError }}
          </p>

          <!-- Drawer Footer -->
          <footer class="flex justify-end gap-3 border-t px-6 py-4" :class="isDark ? 'border-onyx-border' : 'border-gray-200'">
            <button
              type="button"
              class="rounded-xl border px-4 py-2 text-xs font-semibold transition-colors"
              :class="isDark ? 'border-onyx-border text-gray-300 hover:bg-white/5' : 'border-gray-200 text-gray-700 hover:bg-gray-50'"
              @click="closeDrawer"
            >
              Cancel
            </button>

            <button
              type="submit"
              :disabled="!stageForm.name || !stageForm.office_id || !selectedCheckpoints.length || creating"
              class="inline-flex items-center gap-2 rounded-xl bg-candy-orange px-5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-candy-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon v-if="creating" name="ph:spinner-gap-light" class="h-3.5 w-3.5 animate-spin" />
              <span>{{ creating ? 'Creating…' : 'Create Route' }}</span>
            </button>
          </footer>
        </form>
      </Transition>
    </Teleport>

  </section>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useOfficeStore } from '~/stores/office'

const auth        = useAuthStore()
const officeStore = useOfficeStore()
const { isDark }  = useTheme()

// ── Types ──────────────────────────────────────────────────────────────
interface StageRecord {
  stage_id: number
  name: string
  org_id: string
  step_number: number
  office_id?: string | null
  scope?: 'global' | 'local'
  office_name?: string
}

interface StageStep {
  id?: number
  stage_id: number
  office_id: string
  step_number: number
}

interface OfficeRecord {
  id: string
  name: string
  org_id?: string
}

// ── State ──────────────────────────────────────────────────────────────
const stages             = ref<StageRecord[]>([])
const stageSteps         = ref<Record<number, StageStep[]>>({})
const myOffices          = ref<OfficeRecord[]>([])
const loading            = ref(false)
const creating           = ref(false)
const drawerOpen         = ref(false)
const activeOfficeFilter = ref<string | null>(null)
const searchQuery        = ref('')

const stageForm = reactive({
  name: '',
  office_id: '',
})

const selectedCheckpoints = ref<OfficeRecord[]>([])

// ── Computed ───────────────────────────────────────────────────────────
// Route creation is always local (Owning Office is required), so the checkpoint
// pool is always branch offices — matches what "Owning Office" already offers.
const allOffices = computed(() =>
  (officeStore.offices as unknown as OfficeRecord[]).filter((o) => (o as any).parent_office_id)
)

const totalStagesCount = computed(() => stages.value.length)
const globalStagesCount = computed(() => stages.value.filter(s => !s.office_id).length)
const localStagesCount = computed(() => stages.value.filter(s => !!s.office_id).length)
const totalCheckpointsCount = computed(() => {
  return Object.values(stageSteps.value).reduce((acc, steps) => acc + steps.length, 0)
})

// Search applies across all three columns; the office pill narrows Local Routes only.
const searchedStages = computed(() => {
  let list = [...stages.value]
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    list = list.filter((s) => {
      const matchName = s.name.toLowerCase().includes(query)
      const matchOffice = (s.office_name || '').toLowerCase().includes(query)
      const steps = getSteps(s.stage_id)
      const matchStepOffice = steps.some((st) => getOfficeName(st.office_id).toLowerCase().includes(query))
      return matchName || matchOffice || matchStepOffice
    })
  }
  return list
})

const allRoutesList    = computed(() => searchedStages.value)
const globalRoutesList = computed(() => searchedStages.value.filter((s) => !s.office_id))
const localRoutesList  = computed(() => {
  let list = searchedStages.value.filter((s) => !!s.office_id)
  if (activeOfficeFilter.value) {
    list = list.filter((s) => String(s.office_id) === activeOfficeFilter.value)
  }
  return list
})

// ── 3-column route board (All / Global / Local) ─────────────────────────
const stageColumns = computed(() => [
  {
    id: 'all', label: 'All Routes', icon: 'ph:git-fork-light',
    count: totalStagesCount.value, list: allRoutesList.value,
    blurb: 'Every configured route across your organisation.',
    accent: { text: 'text-candy-orange', chip: 'bg-candy-orange/10' },
  },
  {
    id: 'global', label: 'Global Routes', icon: 'ph:globe-hemisphere-west-light',
    count: globalStagesCount.value, list: globalRoutesList.value,
    blurb: 'Organisation-wide templates set by your Client Admin.',
    accent: { text: 'text-blue-600 dark:text-blue-400', chip: 'bg-blue-500/10' },
  },
  {
    id: 'local', label: 'Local Routes', icon: 'ph:buildings-light',
    count: localStagesCount.value, list: localRoutesList.value,
    blurb: 'Branch-specific routes for your assigned offices.',
    accent: { text: 'text-emerald-600 dark:text-emerald-400', chip: 'bg-emerald-500/10' },
  },
])

// ── Theming Tokens ──────────────────────────────────────────────────────
const cardSurface = computed(() =>
  isDark.value ? 'bg-onyx-card border-onyx-border' : 'bg-white-pure border-gray-200/80'
)
const borderClass = computed(() => isDark.value ? 'border-onyx-border' : 'border-gray-100')
const mutedText   = computed(() => isDark.value ? 'text-gray-400' : 'text-white-muted')
const inputClass  = computed(() =>
  isDark.value
    ? 'border-onyx-border bg-onyx-black text-white placeholder:text-gray-500'
    : 'border-gray-200 bg-white text-gray-900 placeholder:text-gray-400'
)

// ── Helpers ────────────────────────────────────────────────────────────
const getSteps = (stageId: number): StageStep[] => stageSteps.value[stageId] ?? []
const getStepCount = (stageId: number) => getSteps(stageId).length

const getOfficeName = (id: string) =>
  allOffices.value.find((o) => String(o.id) === String(id))?.name || 'Unknown office'

const toggleOfficeFilter = (id: string) => {
  activeOfficeFilter.value = activeOfficeFilter.value === id ? null : id
}

const formatOfficeName = (val?: string | null) => {
  if (!val) return '—'
  return val.replace(/\s*\(OFF-[A-Z0-9]+\)\s*/i, '').trim()
}

const resetFilters = () => {
  activeOfficeFilter.value = null
  searchQuery.value = ''
}

// ── Data fetching ──────────────────────────────────────────────────────
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

const fetchStages = async () => {
  const orgId = auth.user?.org_id
  if (!orgId) return

  loading.value = true
  try {
    const res = await $fetch<{ success: boolean; data: StageRecord[] }>('/api/stages', {
      params: { orgId, scope: 'all' },
    })
    stages.value = res.data ?? []

    await Promise.all(
      stages.value.map(async (stage) => {
        try {
          const stepsRes = await $fetch<{ success: boolean; data: StageStep[] }>('/api/stage-steps', {
            params: { stageId: stage.stage_id },
          })
          stageSteps.value = { ...stageSteps.value, [stage.stage_id]: stepsRes.data ?? [] }
        } catch { /* silent */ }
      })
    )
  } catch (err) {
    console.error('[EmployeeStages] fetch error:', err)
  } finally {
    loading.value = false
  }
}

// ── Drawer Management ──────────────────────────────────────────────────
const openDrawer = () => {
  stageForm.name = ''
  stageForm.office_id = myOffices.value[0]?.id ? String(myOffices.value[0].id) : ''
  selectedCheckpoints.value = []
  createStageError.value = ''
  drawerOpen.value = true
}

const closeDrawer = () => {
  drawerOpen.value = false
  createStageError.value = ''
}

// ── Checkpoint management ──────────────────────────────────────────────
const addCheckpoint = (office: OfficeRecord) => {
  selectedCheckpoints.value = [
    ...selectedCheckpoints.value,
    { ...office },
  ]
}

const removeCheckpoint = (index: number) => {
  selectedCheckpoints.value.splice(index, 1)
}

const moveCheckpoint = (from: number, to: number) => {
  if (to < 0 || to >= selectedCheckpoints.value.length) return
  const items = [...selectedCheckpoints.value]
  const [item] = items.splice(from, 1)
  items.splice(to, 0, item)
  selectedCheckpoints.value = items
}

// ── Remove step from stage ─────────────────────────────────────────────
const removeStepFromStage = async (stageId: number, officeId: string, stepIndex: number) => {
  if (!confirm('Remove this checkpoint from the route?')) return
  try {
    const steps = getSteps(stageId)
    const step  = steps[stepIndex]
    if (!step?.id) return
    await $fetch(`/api/stage-steps/${step.id}`, { method: 'DELETE' })
    stageSteps.value = {
      ...stageSteps.value,
      [stageId]: steps.filter((_, i) => i !== stepIndex),
    }
  } catch (err) {
    console.error('[EmployeeStages] removeStep error:', err)
  }
}

// ── Reorder stage position (within local routes only — the only reorderable scope) ──
const moveStage = (stageId: number, dir: -1 | 1) => {
  const localIds = stages.value.filter((s) => !!s.office_id).map((s) => s.stage_id)
  const idx  = localIds.indexOf(stageId)
  const next = idx + dir
  if (idx < 0 || next < 0 || next >= localIds.length) return
  ;[localIds[idx], localIds[next]] = [localIds[next], localIds[idx]]

  const localById = new Map(stages.value.filter((s) => !!s.office_id).map((s) => [s.stage_id, s]))
  let li = 0
  stages.value = stages.value.map((s) => (s.office_id ? localById.get(localIds[li++])! : s))
}

// ── Create Stage API ───────────────────────────────────────────────────
const createStageError = ref('')

const handleCreateStage = async () => {
  createStageError.value = ''

  if (!stageForm.name.trim() || !stageForm.office_id) return
  if (!selectedCheckpoints.value.length) {
    createStageError.value = 'Add at least one office stop before creating this route.'
    return
  }
  if (creating.value) return

  creating.value = true

  try {
    const workflow_items = selectedCheckpoints.value.map((cp, i) => ({
      office_id:   String(cp.id),
      step_number: i + 1,
    }))

    const res = await $fetch<{ success: boolean; data?: StageRecord }>('/api/stages', {
      method: 'POST',
      body: {
        stage_name:    stageForm.name.trim(),
        org_id:        auth.user?.org_id,
        office_id:     stageForm.office_id,
        workflow_items,
      },
    })

    if (res?.success) {
      closeDrawer()
      await fetchStages()
    }
  } catch (err: any) {
    console.error('[EmployeeStages] create error:', err)
    createStageError.value = err?.data?.message || 'Failed to create route'
  } finally {
    creating.value = false
  }
}

// ── Delete Stage API ───────────────────────────────────────────────────
const handleDeleteStage = async (stageId: number) => {
  if (!confirm('Delete this route template? This cannot be undone.')) return
  try {
    await $fetch(`/api/stages/${stageId}`, { method: 'DELETE' })
    stages.value = stages.value.filter((s) => s.stage_id !== stageId)
  } catch (err) {
    console.error('[EmployeeStages] delete error:', err)
  }
}

onMounted(async () => {
  if (auth.isLoggedIn && !auth.currentOrg) await auth.fetchMyOrg()
  await Promise.all([
    officeStore.fetchOffices(),
    fetchMyOffices(),
    fetchStages(),
  ])
})
</script>

<style scoped>
.drawer-fade-enter-active, .drawer-fade-leave-active { transition: opacity 0.2s ease; }
.drawer-fade-enter-from, .drawer-fade-leave-to { opacity: 0; }

.drawer-slide-enter-active, .drawer-slide-leave-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.drawer-slide-enter-from, .drawer-slide-leave-to { transform: translateX(100%); }
</style>

