<template>
  <section class="w-full space-y-6 pb-24 lg:pb-8" :class="isDark ? 'text-white' : 'text-onyx-black'">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <div class="mb-3 h-1 w-14 rounded-none bg-candy-orange"></div>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Sequential Stage Builder</h1>
        <p class="mt-1 text-sm" :class="mutedTextClass">
          {{ organizationLabel }} / asynchronous office milestones
        </p>
      </div>

      <button
        type="button"
        class="inline-flex min-h-11 items-center justify-center gap-2 rounded-none bg-candy-orange px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-candy-orange/20 transition hover:bg-[#e95a0b] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-candy-orange"
        @click="openStageDrawer"
      >
        <Icon name="ph:plus-bold" class="h-4 w-4" />
        Create Stage
      </button>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
      <aside class="w-full">
        <article class="rounded-none border p-5 shadow-card" :class="surfaceClass">
          <div class="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 class="text-base font-semibold">Available Offices</h2>
              <p class="mt-1 text-xs" :class="mutedTextClass">
                Offices can be reused across multiple stages.
              </p>
            </div>
            <Icon name="ph:buildings" class="h-5 w-5 text-candy-orange" />
          </div>

          <div class="space-y-3">
            <div
              v-for="office in officeStore.offices"
              :key="office.id"
              class="w-full rounded-none border p-3 transition hover:border-candy-orange/70"
              :class="isDark ? 'border-onyx-border bg-onyx-black/40' : 'border-gray-200 bg-gray-50'"
              draggable="true"
              @dragstart="draggedOfficeId = office.id"
              @dragend="draggedOfficeId = null"
            >
              <div class="w-full flex items-center justify-between gap-3">
                <div class="min-w-0">
                  <p class="truncate text-sm font-semibold">{{ office.name }}</p>
                  <p class="mt-1 truncate text-xs" :class="mutedTextClass">
                    {{ getUserName(office.assigned_user) }}
                  </p>
                </div>
                <Icon name="ph:dots-six-vertical-bold" class="mt-0.5 h-4 w-4 flex-none text-candy-orange" />
              </div>

              <div class="mt-3 grid grid-cols-1 gap-2">
                <button
                  v-for="stage in sortedStages"
                  :key="stage.stage_id"
                  type="button"
                  class="rounded-none border px-2.5 py-2 text-left text-xs font-semibold transition hover:border-candy-orange hover:text-candy-orange"
                  :class="isDark ? 'border-onyx-border bg-onyx-card' : 'border-gray-200 bg-white'"
                  @click="stageStore.addOfficeToStage(stage.stage_id, office.id)"
                >
                  Add to {{ stage.name }}
                </button>
              </div>
            </div>

            <div v-if="!officeStore.offices.length" class="rounded-none border border-dashed p-6 text-center text-sm" :class="[borderClass, mutedTextClass]">
              Create offices first, then map them into stage timelines.
            </div>
          </div>
        </article>
      </aside>

      <div class="w-full space-y-5 lg:col-span-2">
        <article
          v-for="stage in sortedStages"
          :key="stage.stage_id"
          class="rounded-none border shadow-card transition"
          :class="[surfaceClass, dropTargetStageId === stage.stage_id ? 'border-candy-orange ring-2 ring-candy-orange/30' : '']"
          @dragover.prevent="dropTargetStageId = stage.stage_id"
          @dragleave="dropTargetStageId = null"
          @drop.prevent="handleDrop(stage.stage_id)"
        >
          <header class="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between" :class="borderClass">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-none bg-candy-orange text-sm font-bold text-white">
                {{ stage.step_number }}
              </div>
              <div>
                <h2 class="text-lg font-bold">{{ stage.name }}</h2>
                <p class="text-xs" :class="mutedTextClass">
                  {{ getStageSequence(stage.stage_id).length }} office milestones mapped
                </p>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <button
                type="button"
                class="inline-flex h-9 w-9 items-center justify-center rounded-none transition hover:bg-candy-orange/10 hover:text-candy-orange"
                title="Move stage up"
                @click="moveStage(stage.stage_id, -1)"
              >
                <Icon name="ph:arrow-up-bold" class="h-4 w-4" />
              </button>
              <button
                type="button"
                class="inline-flex h-9 w-9 items-center justify-center rounded-none transition hover:bg-candy-orange/10 hover:text-candy-orange"
                title="Move stage down"
                @click="moveStage(stage.stage_id, 1)"
              >
                <Icon name="ph:arrow-down-bold" class="h-4 w-4" />
              </button>
              <button
                type="button"
                class="inline-flex h-9 w-9 items-center justify-center rounded-none text-red-500 transition hover:bg-red-500/10"
                title="Delete stage"
                @click="handleDeleteStage(stage.stage_id)"
              >
                <Icon name="ph:trash" class="h-4 w-4" />
              </button>
            </div>
          </header>

          <div class="p-5">
            <div class="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-candy-orange">
              <span class="h-px flex-1 bg-candy-orange/30"></span>
              Flow path
              <span class="h-px flex-1 bg-candy-orange/30"></span>
            </div>

            <div class="space-y-3">
              <div
                v-for="(item, index) in getStageSequence(stage.stage_id)"
                :key="`${item.office_id}-${index}`"
                class="w-full flex flex-col gap-3 rounded-none border p-3 transition sm:flex-row sm:items-center sm:justify-between"
                :class="isDark ? 'border-onyx-border bg-onyx-black/50' : 'border-gray-200 bg-gray-50'"
              >
                <div class="flex min-w-0 flex-1 items-center gap-3">
                  <div class="flex h-8 w-8 flex-none items-center justify-center rounded-none bg-candy-orange text-xs font-bold text-white">
                    {{ item.step_number }}
                  </div>
                  <div class="min-w-0">
                    <p class="truncate text-sm font-semibold">{{ getOfficeName(item.office_id) }}</p>
                    <p class="text-xs" :class="mutedTextClass">
                      Stage sequence step {{ item.step_number }}
                    </p>
                  </div>
                </div>

                <div class="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    class="inline-flex h-9 w-9 items-center justify-center rounded-none transition hover:bg-candy-orange/10 hover:text-candy-orange"
                    :disabled="index === 0"
                    @click="stageStore.moveOfficeInStage(stage.stage_id, index, index - 1)"
                  >
                    <Icon name="ph:caret-up-bold" class="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    class="inline-flex h-9 w-9 items-center justify-center rounded-none transition hover:bg-candy-orange/10 hover:text-candy-orange"
                    :disabled="index === getStageSequence(stage.stage_id).length - 1"
                    @click="stageStore.moveOfficeInStage(stage.stage_id, index, index + 1)"
                  >
                    <Icon name="ph:caret-down-bold" class="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    class="inline-flex h-9 w-9 items-center justify-center rounded-none text-red-500 transition hover:bg-red-500/10"
                    @click="stageStore.removeOfficeFromStage(stage.stage_id, item.office_id, getOccurrenceIndex(stage.stage_id, item.office_id, index))"
                  >
                    <Icon name="ph:x-bold" class="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div
                v-if="!getStageSequence(stage.stage_id).length"
                class="rounded-none border border-dashed p-8 text-center text-sm transition"
                :class="dropTargetStageId === stage.stage_id ? 'border-candy-orange bg-candy-orange/10 text-candy-orange' : [borderClass, mutedTextClass]"
              >
                Drag an office here or use an Add button from the office pool.
              </div>
            </div>
          </div>
        </article>

        <div v-if="!sortedStages.length" class="rounded-none border border-dashed p-10 text-center" :class="[surfaceClass, borderClass]">
          <Icon name="ph:path-bold" class="mx-auto mb-3 h-12 w-12 text-candy-orange" />
          <h2 class="text-lg font-bold">No stages yet</h2>
          <p class="mt-1 text-sm" :class="mutedTextClass">
            Create a stage, then build its office route sequence before saving.
          </p>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <Transition name="drawer-fade">
        <div v-if="isStageDrawerOpen" class="fixed inset-0 z-[80] bg-black/55 backdrop-blur-sm" @click="closeStageDrawer"></div>
      </Transition>

      <Transition name="drawer-slide">
        <form
          v-if="isStageDrawerOpen"
          class="fixed bottom-0 right-0 top-0 z-[90] flex w-full max-w-xl flex-col border-l shadow-2xl"
          :class="surfaceClass"
          @submit.prevent="handleCreateStage"
        >
          <header class="border-b px-5 py-5" :class="borderClass">
            <p class="text-xs font-semibold uppercase tracking-wide text-candy-orange">Workflow</p>
            <h2 class="mt-1 text-xl font-bold">Create Stage</h2>
            <p class="mt-1 text-xs" :class="mutedTextClass">
              Step order is computed automatically from your route sequence.
            </p>
          </header>

          <div class="flex-1 space-y-6 overflow-y-auto px-5 py-5">
            <label class="block">
              <span class="text-sm font-semibold">Stage Name</span>
              <input
                v-model.trim="stageForm.name"
                type="text"
                placeholder="e.g. Quality Review"
                class="mt-2 w-full rounded-none border px-4 py-3 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-candy-orange"
                :class="inputClass"
                required
              />
            </label>

            <section>
              <div class="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 class="text-sm font-semibold">Available Offices</h3>
                  <p class="mt-1 text-xs" :class="mutedTextClass">
                    Click or drag an office into the route sequence below.
                  </p>
                </div>
                <Icon name="ph:buildings" class="h-4 w-4 text-candy-orange" />
              </div>

              <div class="space-y-2">
                <button
                  v-for="office in officeStore.offices"
                  :key="office.id"
                  type="button"
                  draggable="true"
                  class="flex w-full items-center justify-between gap-3 rounded-none border px-3 py-2.5 text-left text-sm transition hover:border-candy-orange/70 hover:bg-candy-orange/5"
                  :class="isDark ? 'border-onyx-border bg-onyx-black/40' : 'border-gray-200 bg-gray-50'"
                  @click="addOfficeToWorkflow(office)"
                  @dragstart="handleDrawerPoolDragStart(office)"
                  @dragend="clearDrawerDragState"
                >
                  <span class="truncate font-semibold">{{ office.name }}</span>
                  <Icon name="ph:plus-circle" class="h-4 w-4 flex-none text-candy-orange" />
                </button>

                <div
                  v-if="!officeStore.offices.length"
                  class="rounded-none border border-dashed p-4 text-center text-xs"
                  :class="[borderClass, mutedTextClass]"
                >
                  No offices available. Create offices first.
                </div>
              </div>
            </section>

            <section>
              <div class="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 class="text-sm font-semibold">Selected Route Sequence</h3>
                  <p class="mt-1 text-xs" :class="mutedTextClass">
                    {{ selectedWorkflowOffices.length }} milestone{{ selectedWorkflowOffices.length === 1 ? '' : 's' }} in order
                  </p>
                </div>
                <Icon name="ph:path-bold" class="h-4 w-4 text-candy-orange" />
              </div>

              <div
                class="min-h-32 space-y-2 rounded-none border p-3 transition"
                :class="[
                  isDark ? 'border-onyx-border bg-onyx-black/30' : 'border-gray-200 bg-gray-50',
                  isWorkflowDropTarget ? 'border-candy-orange ring-2 ring-candy-orange/30' : '',
                ]"
                @dragover.prevent="isWorkflowDropTarget = true"
                @dragleave="isWorkflowDropTarget = false"
                @drop.prevent="handleWorkflowDrop"
              >
                <div
                  v-for="(item, index) in selectedWorkflowOffices"
                  :key="`${item.id}-${index}`"
                  draggable="true"
                  class="flex items-center gap-3 rounded-none border p-3 transition"
                  :class="isDark ? 'border-onyx-border bg-onyx-card' : 'border-gray-200 bg-white'"
                  @dragstart="workflowDragIndex = index"
                  @dragend="clearDrawerDragState"
                  @dragover.prevent
                  @drop.prevent="handleWorkflowItemDrop(index)"
                >
                  <Icon name="ph:dots-six-vertical-bold" class="h-4 w-4 flex-none cursor-grab text-candy-orange" />

                  <div class="flex h-8 w-8 flex-none items-center justify-center rounded-none bg-candy-orange text-xs font-bold text-white">
                    {{ item.step_number }}
                  </div>

                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-semibold">{{ item.name }}</p>
                    <p class="text-xs" :class="mutedTextClass">Auto step {{ item.step_number }}</p>
                  </div>

                  <div class="flex items-center gap-1">
                    <button
                      type="button"
                      class="inline-flex h-8 w-8 items-center justify-center rounded-none transition hover:bg-candy-orange/10 hover:text-candy-orange"
                      :disabled="index === 0"
                      title="Move up"
                      @click="moveOfficeInWorkflow(index, index - 1)"
                    >
                      <Icon name="ph:caret-up-bold" class="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      class="inline-flex h-8 w-8 items-center justify-center rounded-none transition hover:bg-candy-orange/10 hover:text-candy-orange"
                      :disabled="index === selectedWorkflowOffices.length - 1"
                      title="Move down"
                      @click="moveOfficeInWorkflow(index, index + 1)"
                    >
                      <Icon name="ph:caret-down-bold" class="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      class="inline-flex h-8 w-8 items-center justify-center rounded-none text-red-500 transition hover:bg-red-500/10"
                      title="Remove"
                      @click="removeOfficeFromWorkflow(index)"
                    >
                      <Icon name="ph:x-bold" class="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div
                  v-if="!selectedWorkflowOffices.length"
                  class="rounded-none border border-dashed p-6 text-center text-xs"
                  :class="[borderClass, mutedTextClass]"
                >
                  Drop or click offices above to build the route sequence.
                </div>
              </div>
            </section>
          </div>

          <footer class="flex justify-end gap-3 border-t px-5 py-4" :class="borderClass">
            <button
              type="button"
              class="rounded-none border px-4 py-2.5 text-sm font-semibold transition hover:bg-black/5 dark:hover:bg-white/5"
              :class="borderClass"
              @click="closeStageDrawer"
            >
              Cancel
            </button>
            <button type="submit" class="rounded-none bg-candy-orange px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e95a0b]">
              Create Stage
            </button>
          </footer>
        </form>
      </Transition>
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useOfficeStore } from '~/stores/office'
import { useStageStore } from '~/stores/stage'

const authStore = useAuthStore()
const officeStore = useOfficeStore()
const stageStore = useStageStore()
const { isDark } = useTheme()

const draggedOfficeId = ref<number | null>(null)
const dropTargetStageId = ref<number | null>(null)
const isStageDrawerOpen = ref(false)
const isWorkflowDropTarget = ref(false)
const workflowDragIndex = ref<number | null>(null)
const drawerPoolOffice = ref<{ id: number; name: string } | null>(null)

interface WorkflowOffice {
  id: string
  name: string
  step_number: number
}

const selectedWorkflowOffices = ref<WorkflowOffice[]>([])

const stageForm = reactive({
  name: '',
})

const fallbackOrg = {
  org_id: 101,
  name: 'FlowVision Operations',
  code: 'FV-OPS',
}

const currentOrgName = computed(() => authStore.currentOrg?.name || fallbackOrg.name)
const currentOrgCode = computed(() => authStore.currentOrg?.code || fallbackOrg.code)
const organizationLabel = computed(() => `${currentOrgName.value} / ${currentOrgCode.value}`)
const sortedStages = computed(() => stageStore.sortedStages)

const surfaceClass = computed(() => (
  isDark.value ? 'border-onyx-border bg-[#1A1A1A] shadow-onyx-card' : 'border-gray-200 bg-white'
))
const borderClass = computed(() => (isDark.value ? 'border-onyx-border' : 'border-gray-200'))
const mutedTextClass = computed(() => (isDark.value ? 'text-gray-400' : 'text-gray-500'))
const inputClass = computed(() => (
  isDark.value
    ? 'border-onyx-border bg-onyx-black text-white placeholder:text-gray-500'
    : 'border-gray-200 bg-white text-onyx-black placeholder:text-gray-400'
))

const openStageDrawer = () => {
  stageForm.name = ''
  selectedWorkflowOffices.value = []
  clearDrawerDragState()
  isStageDrawerOpen.value = true
}

const closeStageDrawer = () => {
  isStageDrawerOpen.value = false
  selectedWorkflowOffices.value = []
  clearDrawerDragState()
}

const clearDrawerDragState = () => {
  workflowDragIndex.value = null
  drawerPoolOffice.value = null
  isWorkflowDropTarget.value = false
}

const recalculateWorkflowSteps = () => {
  selectedWorkflowOffices.value = selectedWorkflowOffices.value.map((item, index) => ({
    ...item,
    step_number: index + 1,
  }))
}

const addOfficeToWorkflow = (office: { id: number | string; name: string }) => {
  selectedWorkflowOffices.value.push({
    id: String(office.id),
    name: office.name,
    step_number: selectedWorkflowOffices.value.length + 1,
  })
  recalculateWorkflowSteps()
}

const removeOfficeFromWorkflow = (index: number) => {
  selectedWorkflowOffices.value.splice(index, 1)
  recalculateWorkflowSteps()
}

const moveOfficeInWorkflow = (fromIndex: number, toIndex: number) => {
  if (toIndex < 0 || toIndex >= selectedWorkflowOffices.value.length) return

  const items = [...selectedWorkflowOffices.value]
  const [item] = items.splice(fromIndex, 1)
  items.splice(toIndex, 0, item)
  selectedWorkflowOffices.value = items
  recalculateWorkflowSteps()
}

const handleDrawerPoolDragStart = (office: { id: number; name: string }) => {
  drawerPoolOffice.value = office
  workflowDragIndex.value = null
}

const handleWorkflowDrop = () => {
  if (workflowDragIndex.value !== null) return

  if (drawerPoolOffice.value) {
    addOfficeToWorkflow(drawerPoolOffice.value)
  }

  clearDrawerDragState()
}

const handleWorkflowItemDrop = (targetIndex: number) => {
  if (drawerPoolOffice.value) {
    selectedWorkflowOffices.value.splice(targetIndex, 0, {
      id: String(drawerPoolOffice.value.id),
      name: drawerPoolOffice.value.name,
      step_number: targetIndex + 1,
    })
    recalculateWorkflowSteps()
    clearDrawerDragState()
    return
  }

  if (workflowDragIndex.value === null || workflowDragIndex.value === targetIndex) {
    clearDrawerDragState()
    return
  }

  moveOfficeInWorkflow(workflowDragIndex.value, targetIndex)
  clearDrawerDragState()
}

const handleCreateStage = async () => {
  if (!stageForm.name.trim()) return

  const workflow_items = selectedWorkflowOffices.value.map((item) => ({
    office_id: item.id,
    step_number: item.step_number,
  }))

  const res = await stageStore.createStage({
    stage_name: stageForm.name.trim(),
    workflow_items,
  })

  if (res?.success) {
    closeStageDrawer()
    return
  }

  console.error('Create stage failed:', res?.error)
}

const handleDeleteStage = async (stageId: number) => {
  if (confirm('Delete this stage and its local office sequence?')) {
    await stageStore.deleteStage(stageId)
  }
}

const handleDrop = (stageId: number) => {
  if (draggedOfficeId.value !== null) {
    stageStore.addOfficeToStage(stageId, draggedOfficeId.value)
  }

  draggedOfficeId.value = null
  dropTargetStageId.value = null
}

const moveStage = async (stageId: number, direction: -1 | 1) => {
  const ordered = sortedStages.value.map((stage) => stage.stage_id)
  const index = ordered.indexOf(stageId)
  const nextIndex = index + direction

  if (index < 0 || nextIndex < 0 || nextIndex >= ordered.length) return

  const [item] = ordered.splice(index, 1)
  ordered.splice(nextIndex, 0, item)
  await stageStore.reorderStages(ordered)
}

const getStageSequence = (stageId: number) => {
  return stageStore.stageOfficeSequences[stageId] || []
}

const getOfficeName = (officeId: string | number) => {
  return officeStore.offices.find((office) => String(office.id) === String(officeId))?.name || 'Unknown office'
}

const getUserName = (userId: string | number) => {
  return officeStore.usersUnderOrg.find((user) => String(user.user_id) === String(userId))?.full_name || 'Unassigned'
}

const getOccurrenceIndex = (stageId: number, officeId: number, itemIndex: number) => {
  return getStageSequence(stageId)
    .slice(0, itemIndex + 1)
    .filter((item) => item.office_id === officeId).length - 1
}

onMounted(async () => {
  if (authStore.isLoggedIn && !authStore.currentOrg) {
    await authStore.fetchMyOrg()
  }

  await Promise.all([
    officeStore.fetchOffices(),
    officeStore.fetchUsersUnderOrg(),
    stageStore.fetchStages(),
  ])
})
</script>

<style scoped>
.drawer-fade-enter-active,
.drawer-fade-leave-active {
  transition: opacity 0.2s ease;
}

.drawer-fade-enter-from,
.drawer-fade-leave-to {
  opacity: 0;
}

.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition: transform 0.28s ease;
}

.drawer-slide-enter-from,
.drawer-slide-leave-to {
  transform: translateX(100%);
}
</style>
