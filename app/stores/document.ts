import { defineStore } from 'pinia'
import { useAuthStore } from './auth'

export interface DocumentRecord {
  id: string
  org_id: string | number
  office_id: string | number | null
  stage_id: string | number | null
  user_id: string | number
  title: string
  description: string
  status: string
  tracking_status?: string
  qr_code_data?: string
  mysql_storage_id?: number | null
  uploader_name?: string | null
  created_at?: string
  priority?: string
}

interface DocumentState {
  documents: DocumentRecord[]
  loading: boolean
  uploading: boolean
  registering: boolean
  lastAnalysis: { title: string; description: string } | null
}

const ALLOWED_ROLES = ['client', 'employee']

export const useDocumentStore = defineStore('document', {
  state: (): DocumentState => ({
    documents: [],
    loading: false,
    uploading: false,
    registering: false,
    lastAnalysis: null,
  }),

  getters: {
    currentOrgIdRaw(): string | null {
      const authStore = useAuthStore()
      const orgId = authStore.currentOrg?.org_id ?? authStore.user?.org_id
      if (orgId == null || orgId === '') return null
      return String(orgId)
    },

    canUploadDocuments(): boolean {
      const authStore = useAuthStore()
      const role = authStore.user?.role
      return !!authStore.isLoggedIn && !!role && ALLOWED_ROLES.includes(role)
    },
  },

  actions: {
    async fetchDocuments() {
      const orgId = this.currentOrgIdRaw
      if (!orgId) {
        console.warn('[Document Store]: skipped fetch — no org_id')
        return []
      }

      this.loading = true
      try {
        const res: any = await $fetch('/api/documents', {
          params: { orgId },
        })
        this.documents = res?.data ?? []
        return this.documents
      } catch (error) {
        console.error('Error fetching documents:', error)
        return []
      } finally {
        this.loading = false
      }
    },

    async registerDocument(options: {
      title: string
      description?: string
      priority: 'High' | 'Medium' | 'Low'
      stageId: string | number
      originOfficeId?: string | null
    }) {
      if (!this.canUploadDocuments) {
        return { success: false, error: 'You are not permitted to register documents.' }
      }

      const org_id = this.currentOrgIdRaw
      if (!org_id) {
        return { success: false, error: 'Missing organization ID.' }
      }

      const { title, description = '', priority, stageId, originOfficeId = null } = options

      if (!title?.trim()) {
        return { success: false, error: 'Title is required.' }
      }
      if (!stageId) {
        return { success: false, error: 'Target route is required.' }
      }

      this.registering = true
      try {
        const res: any = await $fetch('/api/documents/register', {
          method: 'POST',
          body: {
            title: title.trim(),
            description: description.trim(),
            priority,
            stage_id: String(stageId),
            origin_office_id: originOfficeId ? String(originOfficeId) : null,
          },
        })

        if (res?.success && res.metadata) {
          const record = { ...res.metadata, priority: res.scope?.priority ?? priority }
          this.documents.unshift(record)
          return { success: true, data: record }
        }

        return { success: false, error: res?.message || 'Registration failed' }
      } catch (error: any) {
        console.error('Error registering document:', error)
        return {
          success: false,
          error: error?.data?.message || error?.message || 'Registration failed',
        }
      } finally {
        this.registering = false
      }
    },

    async uploadDocument(
      file: File,
      options?: {
        officeId?: string | number | null
        stageId?: string | number | null
        qrCode?: string | null
        printStrategy?: string | null
        stickerSize?: string | null
      }
    ) {
      if (!this.canUploadDocuments) {
        return { success: false, error: 'You are not permitted to upload documents.' }
      }

      const org_id = this.currentOrgIdRaw
      if (!org_id) {
        return { success: false, error: 'Missing organization ID.' }
      }

      if (!file) {
        return { success: false, error: 'No file selected.' }
      }

      const {
        officeId = null,
        stageId = null,
        qrCode = null,
        printStrategy = null,
        stickerSize = null,
      } = options || {}

      const formData = new FormData()
      formData.append('file', file)
      formData.append('org_id', org_id)
      if (officeId != null && officeId !== '') {
        formData.append('office_id', String(officeId))
      }
      if (stageId != null && stageId !== '') {
        formData.append('stage_id', String(stageId))
      }
      if (qrCode != null && qrCode !== '') {
        formData.append('qr_code_data', String(qrCode))
      }
      if (printStrategy != null && printStrategy !== '') {
        formData.append('print_strategy', String(printStrategy))
      }
      if (stickerSize != null && stickerSize !== '') {
        formData.append('sticker_size', String(stickerSize))
      }

      this.uploading = true
      try {
        const res: any = await $fetch('/api/documents/upload', {
          method: 'POST',
          body: formData,
        })

        if (res?.success && res.metadata) {
          this.documents.unshift(res.metadata)
          this.lastAnalysis = {
            title: res.metadata.title,
            description: res.metadata.description,
          }
          return { success: true, data: res.metadata }
        }

        return { success: false, error: res?.message || 'Upload failed' }
      } catch (error: any) {
        console.error('Error uploading document:', error)
        return {
          success: false,
          error: error?.data?.message || error?.message || 'Upload failed',
        }
      } finally {
        this.uploading = false
      }
    },

    clearLastAnalysis() {
      this.lastAnalysis = null
    },
  },
})
