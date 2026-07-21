<template>
  <section class="w-full space-y-6 pb-24 lg:pb-8" :class="isDark ? 'text-white' : 'text-gray-900'">

    <!-- ── Page Header ──────────────────────────────────────────────── -->
    <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div class="mb-3 h-1 w-14 rounded-full bg-candy-orange" />
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Local Route Builder</h1>
        <p class="mt-1 text-sm" :class="mutedText">
          Build custom routing sequences scoped to your sub-office branches
        </p>
      </div>

      <div class="flex items-center gap-2">
        <!-- Scope toggle -->
        <div class="flex items-center rounded-xl border p-1 text-xs font-semibold" :class="glassSurface">
          <button
            v-for="opt in scopeOptions"
            :key="opt.value"
            type="button"
            class="rounded-lg px-3 py-1.5 transition-all"
            :class="scopeMode === opt.value
              ? 'bg-candy-orange text-white shadow-sm'
              : isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-800'"
            @click="scopeMode = opt.value"
          >
            {{ opt.label }}
          </button>
        </div>

        <button
          type="button"
          class="inline-flex min-h-11 items-center gap-2 rounded-xl bg-candy-orange px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-candy-orange/25 transition-all duration-200 hover:bg-[#e95a0b] active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-candy-orange/50"
          @click="openDrawer"
        >
          <Icon name="ph:plus-bold" class="h-4 w-4" />
          Create Route
        </button>
      </div>
    </div>

    <!-- ── Scope Info Bar ────────────────────────────────────────────── -->
    <div class="flex flex-wrap items-center gap-3">
      <div
        class="inline-flex items-center gap-2.5 rounded-xl border px-4 py-2 text-sm backdrop-blur-sm"
        :class="glassSurface"
      >
        <Icon name="ph:shield-check-fill" class="h-4 w-4 text-candy-orange" />
        <span :class="mutedText">
          Showing
          <span class="font-semibold" :class="isDark ? 'text-gray-200' : 'text-gray-700'">
            {{ scopeMode === 'global' ? 'org-wide global' : scopeMode === 'local' ? 'my local' : 'all' }}
          </span>
          routes · {{ filteredStages.length }} template{{ filteredStages.length === 1 ? '' : 's' }}
        </span>
      </div>

      <div class="flex flex-wrap gap-2">
        <button
          v-for="office in myOffices"
          :key="office.id"
          type="button"
          class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition"
          :class="activeOfficeFilter === String(office.id)
            ? 'border-candy-orange/50 bg-candy-orange/10 text-candy-orange'
            : isDark ? 'border-white/10 text-gray-400 hover:border-candy-orange/30 hover:text-candy-orange' : 'border-gray-200 text-gray-500 hover:border-candy-orange/40 hover:text-candy-orange'"
          @click="toggleOfficeFilter(String(office.id))"
        >
          <Icon name="ph:buildings-fill" class="h-3 w-3" />
          {{ office.name }}
        </button>
      </div>
    </div>

    <!-- ── Loading ────────────────────────────────────────────────────── -->
    <div v-if="loading" class="space-y-4">
      <div
        v-for="n in 3"
        :key="n"
        class="h-32 animate-pulse rounded-2xl border"
        :class="isDark ? 'bg-white/5 border-white/5' : 'bg-gray-100 border-gray-200'"
      />
    </div>

    <!-- ── Stage Cards ────────────────────────────────────────────────── -->
    <div v-else-if="filteredStages.length" class="space-y-4">
      <article
        v-for="stage in filteredStages"
        :key="stage.stage_id"
        class="overflow-hidden rounded-2xl border shadow-card backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
        :class="[cardSurface, isDropTarget === stage.stage_id ? 'ring-2 ring-candy-orange/50 border-candy-orange' : '']"
        @dragover.prevent="isDropTarget = stage.stage_id"
        @dragleave="isDropTarget = null"
        @drop.prevent="handleDrop(stage.stage_id)"
      >
        <!-- Stage header -->
        <header class="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between" :class="borderClass">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-candy-orange text-sm font-bold text-white shadow-sm shadow-candy-orange/30">
              {{ stage.step_number }}
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h2 class="text-base font-bold">{{ stage.name }}</h2>
                <span
                  class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                  :class="stage.scope === 'local'
                    ? 'bg-candy-orange/15 text-candy-orange'
                    : isDark ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-500'"
                >
                  {{ stage.scope === 'local' ? stage.office_name || 'Local' : 'Global' }}
                </span>
              </div>
              <p class="text-xs" :class="mutedText">
                {{ getStepCount(stage.stage_id) }} checkpoint{{ getStepCount(stage.stage_id) === 1 ? '' : 's' }} mapped
              </p>
            </div>
          </div>

          <!-- Stage actions -->
          <div class="flex items-center gap-1">
            <button
              v-if="stage.scope === 'local'"
              type="button"
              class="inline-flex h-9 w-9 items-center justify-center rounded-xl transition hover:bg-candy-orange/10 hover:text-candy-orange"
              :class="mutedText"
              title="Move up"
              @click="moveStage(stage.stage_id, -1)"
            >
              <Icon name="ph:arrow-up-bold" class="h-4 w-4" />
            </button>
            <button
              v-if="stage.scope === 'local'"
              type="button"
              class="inline-flex h-9 w-9 items-center justify-center rounded-xl transition hover:bg-candy-orange/10 hover:text-candy-orange"
              :class="mutedText"
              title="Move down"
              @click="moveStage(stage.stage_id, 1)"
            >
              <Icon name="ph:arrow-down-bold" class="h-4 w-4" />
            </button>
            <button
              v-if="stage.scope === 'local'"
              type="button"
              class="inline-flex h-9 w-9 items-center justify-center rounded-xl text-red-500 transition hover:bg-red-500/10"
              title="Delete route"
              @click="handleDeleteStage(stage.stage_id)"
            >
              <Icon name="ph:trash-bold" class="h-4 w-4" />
            </button>
          </div>
        </header>

        <!-- Route flow -->
        <div class="p-5">
          <div class="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-candy-orange">
            <span class="h-px flex-1 bg-candy-orange/20" />
            Flow Path
            <span class="h-px flex-1 bg-candy-orange/20" />
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <template v-for="(step, i) in getSteps(stage.stage_id)" :key="`${step.office_id}-${i}`">
              <div
                class="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition"
                :class="isDark ? 'border-white/10 bg-white/[0.04]' : 'border-gray-200 bg-gray-50'"
              >
                <div class="flex h-6 w-6 flex-none items-center justify-center rounded-lg bg-candy-orange text-[10px] font-bold text-white">
                  {{ step.step_number }}
                </div>
                <span class="font-semibold">{{ getOfficeName(step.office_id) }}</span>

                <button
                  v-if="stage.scope === 'local'"
                  type="button"
                  class="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-red-500 transition hover:bg-red-500/10"
                  @click="removeStepFromStage(stage.stage_id, step.office_id, i)"
                >
                  <Icon name="ph:x-bold" class="h-3 w-3" />
                </button>
              </div>

              <Icon
                v-if="i < getSteps(stage.stage_id).length - 1"
                name="ph:arrow-right-bold"
                class="h-3.5 w-3.5 flex-none text-candy-orange/50"
              />
            </template>

            <div
              v-if="!getSteps(stage.stage_id).length"
              class="rounded-xl border border-dashed p-4 text-center text-sm w-full"
              :class="[isDark ? 'border-white/10' : 'border-gray-200', mutedText]"
            >
              Drag an office here or use "Add to Route" from the sidebar.
            </div>
          </div>
        </div>
      </article>
    </div>

    <!-- ── Empty State ────────────────────────────────────────────────── -->
    <div
      v-else
      class="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed px-6 text-center"
      :class="isDark ? 'border-white/10 bg-white/[0.02]' : 'border-gray-200 bg-gray-50'"
    >
      <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-candy-orange/10">
        <Icon name="ph:path-bold" class="h-8 w-8 text-candy-orange/60" />
      </div>
      <p class="font-bold" :class="isDark ? 'text-gray-200' : 'text-gray-800'">No route templates</p>
      <p class="mt-1 text-sm" :class="mutedText">
        {{ scopeMode === 'local' ? 'Create a local route for one of your sub-offices.' : 'No routes exist yet.' }}
      </p>
      <div class="mt-5 flex items-center gap-3">
        <button
          v-if="scopeMode === 'local' && !myOffices.length"
          type="button"
          class="inline-flex items-center gap-2 rounded-xl bg-candy-orange/10 px-4 py-2 text-sm font-semibold text-candy-orange transition hover:bg-candy-orange/20"
          @click="openTableDrawer"
        >
          <Icon name="ph:desk-bold" class="h-4 w-4" />
          Create Office Desk
        </button>
        <button
          v-if="myOffices.length || scopeMode !== 'local'"
          type="button"
          class="inline-flex items-center gap-2 rounded-xl bg-candy-orange px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-candy-orange/25 transition hover:bg-[#e95a0b]"
          @click="openDrawer"
        >
          <Icon name="ph:plus-bold" class="h-4 w-4" />
          Create Route
        </button>
      </div>
    </div>

    <!-- ── Create Route Drawer ───────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="drawer-fade">
        <div v-if="drawerOpen" class="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm" @click="closeDrawer" />
      </Transition>

      <Transition name="drawer-slide">
        <form
          v-if="drawerOpen"
          class="fixed bottom-0 right-0 top-0 z-[90] flex w-full max-w-xl flex-col border-l shadow-2xl"
          :class="isDark ? 'bg-[#111111]/95 backdrop-blur-xl border-white/10' : 'bg-white border-gray-200'"
          @submit.prevent="handleCreateStage"
        >
          <!-- Drawer header -->
          <header class="flex items-start justify-between gap-4 border-b px-6 py-5" :class="isDark ? 'border-white/10' : 'border-gray-200'">
            <div>
              <div class="mb-1 h-0.5 w-8 rounded-full bg-candy-orange" />
              <p class="text-[10px] font-bold uppercase tracking-widest text-candy-orange">Route Template</p>
              <h2 class="mt-1 text-xl font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">
                {{ scopeMode === 'local' ? 'Create Local Route' : 'Create Route' }}
              </h2>
              <p class="mt-0.5 text-xs" :class="mutedText">
                {{ scopeMode === 'local' ? 'Scoped to your selected office branch' : 'Organisation-wide routing' }}
              </p>
            </div>
            <button type="button" class="inline-flex h-9 w-9 items-center justify-center rounded-xl transition" :class="isDark ? 'text-gray-400 hover:bg-white/5' : 'text-gray-400 hover:bg-gray-100'" @click="closeDrawer">
              <Icon name="ph:x-bold" class="h-4 w-4" />
            </button>
          </header>

          <!-- Drawer body -->
          <div class="flex-1 space-y-6 overflow-y-auto px-6 py-6">

            <!-- Route name -->
            <label class="block">
              <span class="text-sm font-semibold" :class="isDark ? 'text-gray-200' : 'text-gray-800'">
                Route Name <span class="text-red-500">*</span>
              </span>
              <input
                v-model.trim="stageForm.name"
                type="text"
                placeholder="e.g. HR Document Review"
                class="mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-candy-orange"
                :class="inputClass"
                required
              />
            </label>

            <!-- Owning office (mandatory — sets office_id) -->
            <label class="block">
              <span class="text-sm font-semibold" :class="isDark ? 'text-gray-200' : 'text-gray-800'">
                Owning Office <span class="text-red-500">*</span>
              </span>
              <p class="mt-0.5 text-xs" :class="mutedText">This route will be scoped to the selected sub-branch</p>
              <select
                v-model="stageForm.office_id"
                class="mt-2 w-full rounded-xl border px-3 py-3 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-candy-orange"
                :class="inputClass"
                required
              >
                <option value="">Select your office…</option>
                <option v-for="o in myOffices" :key="o.id" :value="String(o.id)">{{ o.name }}</option>
              </select>
            </label>

            <!-- Available offices (route checkpoints from org pool) -->
            <section>
              <div class="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 class="text-sm font-semibold" :class="isDark ? 'text-gray-200' : 'text-gray-800'">Available Checkpoints</h3>
                  <p class="mt-0.5 text-xs" :class="mutedText">Click or drag offices to build the sequence</p>
                </div>
                <Icon name="ph:buildings" class="h-4 w-4 text-candy-orange" />
              </div>

              <div class="space-y-2">
                <button
                  v-for="office in allOffices"
                  :key="office.id"
                  type="button"
                  draggable="true"
                  class="flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition hover:border-candy-orange/50 hover:bg-candy-orange/5"
                  :class="isDark ? 'border-white/10 bg-white/[0.03]' : 'border-gray-200 bg-gray-50'"
                  @click="addCheckpoint(office)"
                  @dragstart="drawerDragOffice = office"
                  @dragend="drawerDragOffice = null"
                >
                  <div class="min-w-0">
                    <span class="truncate font-semibold">{{ office.name }}</span>
                    <span v-if="isMyOffice(office.id)" class="ml-2 rounded-full bg-candy-orange/10 px-1.5 py-0.5 text-[10px] font-bold text-candy-orange">Mine</span>
                  </div>
                  <Icon name="ph:plus-circle" class="h-4 w-4 flex-none text-candy-orange" />
                </button>

                <div
                  v-if="!allOffices.length"
                  class="rounded-xl border border-dashed p-4 text-center text-xs"
                  :class="[isDark ? 'border-white/10' : 'border-gray-200', mutedText]"
                >
                  No offices found in your organisation.
                </div>
              </div>
            </section>

            <!-- Route sequence drop zone -->
            <section>
              <div class="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 class="text-sm font-semibold" :class="isDark ? 'text-gray-200' : 'text-gray-800'">Route Sequence</h3>
                  <p class="mt-0.5 text-xs" :class="mutedText">
                    {{ selectedCheckpoints.length }} checkpoint{{ selectedCheckpoints.length === 1 ? '' : 's' }} in order
                  </p>
                </div>
                <Icon name="ph:path-bold" class="h-4 w-4 text-candy-orange" />
              </div>

              <div
                class="min-h-32 space-y-2 rounded-xl border p-3 transition-all"
                :class="[
                  isDark ? 'border-white/10 bg-white/[0.02]' : 'border-gray-200 bg-gray-50',
                  isDropZoneActive ? 'border-candy-orange ring-2 ring-candy-orange/30 bg-candy-orange/5' : '',
                ]"
                @dragover.prevent="isDropZoneActive = true"
                @dragleave="isDropZoneActive = false"
                @drop.prevent="handleDropZone"
              >
                <div
                  v-for="(cp, i) in selectedCheckpoints"
                  :key="`${cp.id}-${i}`"
                  draggable="true"
                  class="flex items-center gap-3 rounded-xl border p-3 transition"
                  :class="isDark ? 'border-white/10 bg-[#1A1A1A]' : 'border-gray-200 bg-white'"
                  @dragstart="dragIndex = i"
                  @dragend="dragIndex = null"
                  @dragover.prevent
                  @drop.prevent="handleSeqItemDrop(i)"
                >
                  <Icon name="ph:dots-six-vertical-bold" class="h-4 w-4 flex-none cursor-grab text-candy-orange" />
                  <div class="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-candy-orange text-[11px] font-bold text-white">
                    {{ i + 1 }}
                  </div>
                  <span class="flex-1 truncate text-sm font-semibold">{{ cp.name }}</span>
                  <div class="flex items-center gap-1">
                    <button type="button" class="inline-flex h-7 w-7 items-center justify-center rounded-lg transition hover:bg-candy-orange/10 hover:text-candy-orange" :disabled="i === 0" @click="moveCheckpoint(i, i - 1)">
                      <Icon name="ph:caret-up-bold" class="h-3.5 w-3.5" />
                    </button>
                    <button type="button" class="inline-flex h-7 w-7 items-center justify-center rounded-lg transition hover:bg-candy-orange/10 hover:text-candy-orange" :disabled="i === selectedCheckpoints.length - 1" @click="moveCheckpoint(i, i + 1)">
                      <Icon name="ph:caret-down-bold" class="h-3.5 w-3.5" />
                    </button>
                    <button type="button" class="inline-flex h-7 w-7 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-500/10" @click="removeCheckpoint(i)">
                      <Icon name="ph:x-bold" class="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div
                  v-if="!selectedCheckpoints.length"
                  class="rounded-xl border border-dashed p-6 text-center text-xs"
                  :class="[isDark ? 'border-white/10' : 'border-gray-200', mutedText]"
                >
                  Drop or click offices above to build the route.
                </div>
              </div>
            </section>
          </div>

          <!-- Drawer footer -->
          <footer class="flex justify-end gap-3 border-t px-6 py-4" :class="isDark ? 'border-white/10' : 'border-gray-200'">
            <button
              type="button"
              class="rounded-xl border px-4 py-2.5 text-sm font-semibold transition"
              :class="isDark ? 'border-white/10 text-gray-300 hover:bg-white/5' : 'border-gray-200 text-gray-700 hover:bg-gray-50'"
              @click="closeDrawer"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="!stageForm.name || !stageForm.office_id || creating"
              class="inline-flex items-center gap-2 rounded-xl bg-candy-orange px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-candy-orange/25 transition hover:bg-[#e95a0b] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon v-if="creating" name="ph:spinner-gap" class="h-4 w-4 animate-spin" />
              {{ creating ? 'Creating…' : 'Create Route' }}
            </button>
          </footer>
        </form>
      </Transition>
    </Teleport>

    <!-- Table Drawer -->
    <Teleport to="body">
      <Transition name="drawer-fade">
        <div v-if="tableDrawerOpen" class="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm" @click="closeTableDrawer" />
      </Transition>

      <Transition name="drawer-slide">
        <form
          v-if="tableDrawerOpen"
          class="fixed bottom-0 right-0 top-0 z-[90] flex w-full max-w-sm flex-col border-l shadow-2xl"
          :class="isDark ? 'bg-[#111111]/95 backdrop-blur-xl border-white/10' : 'bg-white border-gray-200'"
          @submit.prevent="handleCreateTable"
        >
          <header class="flex items-start justify-between gap-4 border-b px-6 py-5" :class="isDark ? 'border-white/10' : 'border-gray-200'">
            <div>
              <div class="mb-1 h-0.5 w-8 rounded-full bg-candy-orange" />
              <h2 class="mt-1 text-xl font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">Create Desk</h2>
            </div>
            <button type="button" class="inline-flex h-9 w-9 items-center justify-center rounded-xl transition" :class="isDark ? 'text-gray-400 hover:bg-white/5' : 'text-gray-400 hover:bg-gray-100'" @click="closeTableDrawer">
              <Icon name="ph:x-bold" class="h-4 w-4" />
            </button>
          </header>

          <div class="flex-1 space-y-6 overflow-y-auto px-6 py-6">
            <label class="block">
              <span class="text-sm font-semibold" :class="isDark ? 'text-gray-200' : 'text-gray-800'">Desk/Table Name <span class="text-red-500">*</span></span>
              <input v-model.trim="tableForm.name" type="text" placeholder="e.g. Reception Desk" class="mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-candy-orange" :class="inputClass" required />
            </label>
          </div>

          <footer class="border-t px-6 py-5" :class="isDark ? 'border-white/10 bg-[#111111]' : 'border-gray-200 bg-gray-50'">
            <div class="flex items-center justify-end gap-3">
              <button type="button" class="rounded-xl px-5 py-2.5 text-sm font-semibold transition" :class="isDark ? 'text-gray-400 hover:bg-white/5 hover:text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'" @click="closeTableDrawer">Cancel</button>
              <button type="submit" :disabled="creatingTable" class="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-candy-orange px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-candy-orange/25 transition-all hover:bg-[#e95a0b] focus:outline-none focus:ring-2 focus:ring-candy-orange/50 disabled:opacity-50">
                <Icon v-if="creatingTable" name="ph:spinner-gap-bold" class="h-4 w-4 animate-spin" />
                <Icon v-else name="ph:check-bold" class="h-4 w-4" />
                Create
              </button>
            </div>
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
const stages         = ref<StageRecord[]>([])
const stageSteps     = ref<Record<number, StageStep[]>>({})
const myOffices      = ref<OfficeRecord[]>([])
const loading        = ref(false)
const creating       = ref(false)
const drawerOpen     = ref(false)
const isDropTarget   = ref<number | null>(null)
const isDropZoneActive = ref(false)
const drawerDragOffice = ref<OfficeRecord | null>(null)
const dragIndex      = ref<number | null>(null)
const activeOfficeFilter = ref<string | null>(null)
const scopeMode      = ref<'all' | 'global' | 'local'>('all')

const scopeOptions = [
  { label: 'All',    value: 'all' },
  { label: 'Global', value: 'global' },
  { label: 'Local',  value: 'local' },
]

const stageForm = reactive({
  name: '',
  office_id: '',
})

const selectedCheckpoints = ref<OfficeRecord[]>([])

// ── Computed ───────────────────────────────────────────────────────────
const allOffices = computed(() => {
  const storeOffices = officeStore.offices as unknown as OfficeRecord[]
  if (scopeMode.value === 'local') {
    // Hide global organization offices (only show offices that have a parent, i.e., sub-offices)
    return storeOffices.filter(o => o.parent_office_id)
  }
  return storeOffices
})

const filteredStages = computed(() => {
  let list = [...stages.value]
  if (scopeMode.value === 'global') list = list.filter((s) => !s.office_id)
  if (scopeMode.value === 'local')  list = list.filter((s) => !!s.office_id)
  if (activeOfficeFilter.value) {
    list = list.filter((s) => s.office_id && String(s.office_id) === activeOfficeFilter.value)
  }
  return list
})

// ── Theming ────────────────────────────────────────────────────────────
const glassSurface = computed(() =>
  isDark.value ? 'border-white/10 bg-white/[0.04]' : 'border-gray-200 bg-white'
)
const cardSurface = computed(() =>
  isDark.value ? 'border-white/10 bg-[#1A1A1A] shadow-xl shadow-black/30' : 'border-gray-200 bg-white shadow-card'
)
const borderClass = computed(() => isDark.value ? 'border-white/5' : 'border-gray-100')
const mutedText   = computed(() => isDark.value ? 'text-gray-400' : 'text-gray-500')
const inputClass  = computed(() =>
  isDark.value
    ? 'border-white/10 bg-onyx-black text-white placeholder:text-gray-500'
    : 'border-gray-200 bg-white text-gray-900 placeholder:text-gray-400'
)

// ── Helpers ────────────────────────────────────────────────────────────
const getSteps = (stageId: number): StageStep[] => stageSteps.value[stageId] ?? []
const getStepCount = (stageId: number) => getSteps(stageId).length

const getOfficeName = (id: string) =>
  allOffices.value.find((o) => String(o.id) === String(id))?.name || 'Unknown office'

const isMyOffice = (id: string) => myOffices.value.some((o) => String(o.id) === String(id))

const toggleOfficeFilter = (id: string) => {
  activeOfficeFilter.value = activeOfficeFilter.value === id ? null : id
  if (activeOfficeFilter.value) scopeMode.value = 'local'
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

    // Fetch steps for each stage
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

// ── Drawer ─────────────────────────────────────────────────────────────
const openDrawer = () => {
  stageForm.name = ''
  stageForm.office_id = myOffices.value[0]?.id ? String(myOffices.value[0].id) : ''
  selectedCheckpoints.value = []
  drawerOpen.value = true
}

const closeDrawer = () => {
  drawerOpen.value = false
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

const handleDropZone = () => {
  if (drawerDragOffice.value && dragIndex.value === null) {
    addCheckpoint(drawerDragOffice.value)
  }
  isDropZoneActive.value = false
  drawerDragOffice.value = null
}

const handleSeqItemDrop = (targetIdx: number) => {
  if (drawerDragOffice.value && dragIndex.value === null) {
    selectedCheckpoints.value.splice(targetIdx, 0, { ...drawerDragOffice.value })
    drawerDragOffice.value = null
    return
  }
  if (dragIndex.value !== null && dragIndex.value !== targetIdx) {
    moveCheckpoint(dragIndex.value, targetIdx)
  }
  dragIndex.value = null
}

// ── Inline drag-drop on existing stages ───────────────────────────────
const handleDrop = (stageId: number) => {
  // Only allow dropping onto local (own) stages
  const stage = stages.value.find((s) => s.stage_id === stageId)
  if (!stage || stage.scope !== 'local') { isDropTarget.value = null; return }
  // (Would need API to persist — for now just a visual placeholder)
  isDropTarget.value = null
}

// ── Remove a step from an existing stage ──────────────────────────────
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

// ── Move stages ────────────────────────────────────────────────────────
const moveStage = (stageId: number, dir: -1 | 1) => {
  const list = filteredStages.value.map((s) => s.stage_id)
  const idx  = list.indexOf(stageId)
  const next = idx + dir
  if (idx < 0 || next < 0 || next >= list.length) return
  ;[list[idx], list[next]] = [list[next], list[idx]]
  // Optimistic reorder
  const updated = [...stages.value].sort(
    (a, b) => list.indexOf(a.stage_id) - list.indexOf(b.stage_id),
  )
  stages.value = updated
}

// ── Create stage ───────────────────────────────────────────────────────
const handleCreateStage = async () => {
  if (!stageForm.name.trim() || !stageForm.office_id || creating.value) return
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
  } catch (err) {
    console.error('[EmployeeStages] create error:', err)
  } finally {
    creating.value = false
  }
}

// ── Delete stage ───────────────────────────────────────────────────────
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
