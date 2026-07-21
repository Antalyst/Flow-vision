import { defineStore } from 'pinia'
import { useAuthStore } from './auth'

export interface OfficeRecord {
  id: number
  name: string
  assigned_user: string | number
  org_name: string
  org_id: string | number
  stage_id: number | null
  created_at: string
}

export interface UserOption {
  user_id: string | number
  full_name: string
  email: string
  org_id: string | number
  role: string
}

interface OfficeState {
  offices: OfficeRecord[]
  usersUnderOrg: UserOption[]
  loading: boolean
}

export const useOfficeStore = defineStore('office', {
  state: (): OfficeState => ({
    offices: [],
    usersUnderOrg: [],
    loading: false
  }),

  getters: {
    currentOrgId(): number | null {
      const raw = this.currentOrgIdRaw
      if (raw == null) return null
      const parsed = Number(raw)
      return Number.isFinite(parsed) ? parsed : null
    },

    currentOrgIdRaw(): string | null {
      const authStore = useAuthStore()
      const orgId = authStore.currentOrg?.org_id ?? authStore.user?.org_id
      if (orgId == null || orgId === '') return null
      return String(orgId)
    }
  },

  actions: {
    async fetchOffices() {
      const orgId = this.currentOrgIdRaw
      if (!orgId) {
        console.warn('[Frontend Store Offices]: skipped fetch — no org_id')
        return []
      }

      this.loading = true
      try {
        const res: any = await $fetch('/api/office', {
          params: { orgId },
        })
        this.offices = res?.data ?? []
        console.log('[Frontend Store Offices]:', this.offices)
        return this.offices
      } catch (error) {
        console.error('Error fetching offices:', error)
        return []
      } finally {
        this.loading = false
      }
    },

    async createOffice(name: string, assignedUserId: string | number) {
      const org_id = this.currentOrgIdRaw
      const trimmedName = name?.trim()

      if (!org_id) {
        return { success: false, error: 'Missing organization ID' }
      }
      if (!trimmedName || assignedUserId == null || assignedUserId === '') {
        return { success: false, error: 'Office name and assigned user are required' }
      }

      try {
        const res: any = await $fetch('/api/office', {
          method: 'POST',
          body: {
            name: trimmedName,
            user_id: assignedUserId,
            org_id,
            stage_id: null,
          },
        })

        if (res?.status === 200 || res?.success) {
          await this.fetchOffices()
          return { success: true, data: res.data }
        }

        return {
          success: false,
          error: res?.message || res || 'Failed to create office',
        }
      } catch (error) {
        console.error('Error creating office:', error)
        return { success: false, error }
      }
    },

    async updateOffice(id: number, payload: { name?: string; assigned_user?: string | number; stage_id?: number | null }) {
      try {
        const res: any = await $fetch('/api/office', {
          method: 'PUT',
          body: {
            id,
            ...payload
          }
        })
        if (res?.success) {
          await this.fetchOffices()
          return { success: true, data: res.data }
        }
        return { success: false, error: res }
      } catch (error) {
        console.error('Error updating office:', error)
        return { success: false, error }
      }
    },

    async deleteOffice(id: number) {
      try {
        const res: any = await $fetch(`/api/office`, {
          method: 'DELETE',
          params: { id }
        })
        if (res?.success) {
          this.offices = this.offices.filter(o => o.id !== id)
          return { success: true }
        }
        return { success: false }
      } catch (error) {
        console.error('Error deleting office:', error)
        return { success: false, error }
      }
    },

    async fetchUsersUnderOrg() {
      const org_id = this.currentOrgIdRaw
      if (!org_id) return []

      try {
        const res: any = await $fetch('/api/users/getUserUnderOrg', {
          method: 'POST',
          body: { org_id }
        })
        if (res?.success) {
          this.usersUnderOrg = res.data || []
        }
        return this.usersUnderOrg
      } catch (error) {
        console.error('Error fetching users under organization:', error)
        return []
      }
    }
  }
})