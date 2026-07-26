import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useSupabaseClient } from '#imports'
import { useAuthStore } from './auth'

export interface DocumentCategory {
  id: string
  org_id: string
  name: string
  created_at: string
}

export const useCategoriesStore = defineStore('categories', () => {
  const client = useSupabaseClient()
  const auth = useAuthStore()

  const categories = ref<DocumentCategory[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchCategories = async () => {
    loading.value = true
    error.value = null
    try {
      const { data, error: fetchErr } = await client
        .from('document_categories')
        .select('*')
        .order('name', { ascending: true })

      if (fetchErr) throw fetchErr
      categories.value = data || []
    } catch (err: any) {
      error.value = err.message || 'Failed to load categories'
      console.error('[Categories Store] fetchCategories error:', err)
    } finally {
      loading.value = false
    }
  }

  const addCategory = async (name: string) => {
    loading.value = true
    error.value = null
    try {
      if (!auth.currentOrg?.org_id) throw new Error('No active organization context.')
      const { data, error: insertErr } = await client
        .from('document_categories')
        .insert({
          org_id: auth.currentOrg.org_id,
          name: name.trim()
        })
        .select()
        .single()

      if (insertErr) throw insertErr
      categories.value.push(data)
      // Re-sort alphabetically
      categories.value.sort((a, b) => a.name.localeCompare(b.name))
    } catch (err: any) {
      error.value = err.message || 'Failed to add category'
      console.error('[Categories Store] addCategory error:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteCategory = async (id: string) => {
    loading.value = true
    error.value = null
    try {
      const { error: deleteErr } = await client
        .from('document_categories')
        .delete()
        .eq('id', id)

      if (deleteErr) throw deleteErr
      categories.value = categories.value.filter(c => c.id !== id)
    } catch (err: any) {
      error.value = err.message || 'Failed to delete category'
      console.error('[Categories Store] deleteCategory error:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    categories,
    loading,
    error,
    fetchCategories,
    addCategory,
    deleteCategory
  }
})
