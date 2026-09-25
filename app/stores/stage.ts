import { defineStore } from 'pinia'
import { useAuthStore } from './auth'

export interface StageRecord {
  stage_id: number
  name: string
  org_id: string | number
  step_number: number
  created_at?: string
  workflow_items?: StageOfficeSequenceItem[]
}

export interface StageOfficeSequenceItem {
  office_id: string | number
  step_number: number
}

export interface WorkflowItemPayload {
  office_id: string | number
  step_number: number
}

export interface CreateStagePayload {
  stage_name: string
  workflow_items: WorkflowItemPayload[]
}

interface StageState {
  stages: StageRecord[]
  stageOfficeSequences: Record<number, StageOfficeSequenceItem[]>
  loading: boolean
}

export const useStageStore = defineStore('stage', {
  state: (): StageState => ({
    stages: [],
    stageOfficeSequences: {},
    loading: false,
  }),

  getters: {
    currentOrgIdRaw(): string | null {
      const authStore = useAuthStore()
      const orgId = authStore.currentOrg?.org_id ?? authStore.user?.org_id
      if (orgId == null || orgId === '') return null
      return String(orgId)
    },

    sortedStages(state): StageRecord[] {
      return [...state.stages].sort((a, b) => a.step_number - b.step_number)
    },
  },

  actions: {
    hydrateStageOfficeSequences(stages: StageRecord[]) {
      const sequences: Record<number, StageOfficeSequenceItem[]> = {}

      for (const stage of stages) {
        sequences[stage.stage_id] = (stage.workflow_items || []).map((item) => ({
          office_id: item.office_id,
          step_number: item.step_number,
        }))
      }

      this.stageOfficeSequences = sequences
    },

    async fetchStages() {
      const orgId = this.currentOrgIdRaw
      if (!orgId) return []

      this.loading = true
      try {
        const res: any = await $fetch('/api/stages', {
          params: { orgId },
        })

        const rows = Array.isArray(res?.data) ? res.data : []
        this.stages = rows
        this.hydrateStageOfficeSequences(rows)
        return this.stages
      } catch (error) {
        console.error('Error fetching stages:', error)
        return []
      } finally {
        this.loading = false
      }
    },

    async createStage(payload: CreateStagePayload) {
      const org_id = this.currentOrgIdRaw
      if (!org_id) return { success: false, error: 'Missing organization ID' }

      const trimmedName = payload.stage_name?.trim()
      if (!trimmedName) {
        return { success: false, error: 'Stage name is required' }
      }

      const body = {
        stage_name: trimmedName,
        org_id,
        workflow_items: payload.workflow_items || [],
      }

      try {
        const res: any = await $fetch('/api/stages', {
          method: 'POST',
          body,
        })

        if (res?.status === 200 || res?.status === 201 || res?.success) {
          const stage = res.data?.stage
          const workflowItems: StageOfficeSequenceItem[] = (res.data?.workflow_items || []).map(
            (item: StageOfficeSequenceItem) => ({
              office_id: item.office_id,
              step_number: item.step_number,
            })
          )

          if (stage?.stage_id) {
            this.stages.push({ ...stage, workflow_items: workflowItems })
            this.stageOfficeSequences[stage.stage_id] = workflowItems
          } else {
            await this.fetchStages()
          }

          return { success: true, data: res.data }
        }

        return {
          success: false,
          error: res?.message || res || 'Failed to create stage',
        }
      } catch (error: any) {
        console.error('Error creating stage:', error)
        return { success: false, error: error?.data?.message || 'Failed to create stage' }
      }
    },

    async updateStage(stageId: number, payload: { name?: string; step_number?: number }) {
      try {
        const res: any = await $fetch('/api/stages', {
          method: 'PUT',
          body: {
            stage_id: stageId,
            ...payload,
          },
        })

        if (res?.status === 200 || res?.success) {
          await this.fetchStages()
          return { success: true, data: res.data }
        }

        return { success: false, error: res }
      } catch (error) {
        console.error('Error updating stage:', error)
        return { success: false, error }
      }
    },

    async deleteStage(stageId: number) {
      try {
        const res: any = await $fetch('/api/stages', {
          method: 'DELETE',
          params: { stage_id: stageId },
        })

        if (res?.status === 200 || res?.success) {
          this.stages = this.stages.filter((stage) => stage.stage_id !== stageId)
          delete this.stageOfficeSequences[stageId]
          return { success: true }
        }

        return { success: false, error: res }
      } catch (error) {
        console.error('Error deleting stage:', error)
        return { success: false, error }
      }
    },

    async reorderStages(orderedStageIds: number[]) {
      const updates = orderedStageIds.map((stageId, index) => (
        this.updateStage(stageId, { step_number: index + 1 })
      ))

      await Promise.all(updates)
      return { success: true }
    },

    addOfficeToStage(stageId: number, officeId: number | string) {
      const current = this.stageOfficeSequences[stageId] || []
      const nextStep = current.length + 1

      this.stageOfficeSequences[stageId] = [
        ...current,
        {
          office_id: officeId,
          step_number: nextStep,
        },
      ]

      this.recalculateOfficeSequence(stageId)
    },

    removeOfficeFromStage(stageId: number, officeId: number | string, occurrenceIndex: number) {
      const current = this.stageOfficeSequences[stageId] || []
      let seen = -1

      this.stageOfficeSequences[stageId] = current.filter((item) => {
        if (String(item.office_id) !== String(officeId)) return true
        seen += 1
        return seen !== occurrenceIndex
      })

      this.recalculateOfficeSequence(stageId)
    },

    moveOfficeInStage(stageId: number, fromIndex: number, toIndex: number) {
      const current = [...(this.stageOfficeSequences[stageId] || [])]
      if (toIndex < 0 || toIndex >= current.length) return

      const [item] = current.splice(fromIndex, 1)
      current.splice(toIndex, 0, item)
      this.stageOfficeSequences[stageId] = current
      this.recalculateOfficeSequence(stageId)
    },

    recalculateOfficeSequence(stageId: number) {
      this.stageOfficeSequences[stageId] = (this.stageOfficeSequences[stageId] || []).map((item, index) => ({
        ...item,
        step_number: index + 1,
      }))
    },
  },
})
