<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-[100] flex items-start justify-center pt-24 pb-4 px-4 bg-black/40 backdrop-blur-xl"
        @click.self="$emit('close')"
      >
        <div 
          class="w-full max-w-2xl overflow-hidden rounded-2xl border shadow-2xl transition-all"
          :class="isDark ? 'bg-onyx-black/80 border-white/10' : 'bg-white/80 border-gray-200'"
        >
          <!-- Search Input -->
          <div class="flex items-center px-4 py-4 border-b" :class="isDark ? 'border-white/10' : 'border-gray-200'">
            <Icon 
              name="ph:sparkle-fill" 
              class="h-6 w-6 text-candy-orange mr-3 shrink-0" 
              :class="{ 'animate-pulse opacity-70': isSearching }"
            />
            <input
              ref="searchInput"
              v-model="query"
              type="text"
              class="w-full bg-transparent text-lg outline-none"
              :class="isDark ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'"
              placeholder="Describe what you're looking for..."
              @keydown.enter="handleSearch"
              @keydown.esc="$emit('close')"
            />
            <div v-if="isSearching" class="ml-3 shrink-0">
              <Icon name="ph:spinner-gap" class="h-5 w-5 animate-spin text-candy-orange" />
            </div>
            <button v-else-if="query" @click="query = ''" class="ml-3 text-gray-400 hover:text-gray-600 transition">
              <Icon name="ph:x-circle-fill" class="h-5 w-5" />
            </button>
            <div class="ml-3 rounded px-2 py-0.5 text-xs font-semibold hidden sm:block"
                 :class="isDark ? 'bg-white/10 text-gray-400' : 'bg-gray-100 text-gray-500'">
              ENTER
            </div>
          </div>

          <!-- Quick instructions / Loading state -->
          <div v-if="isSearching" class="p-8 text-center">
            <div class="w-12 h-12 rounded-full bg-candy-orange/10 flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Icon name="ph:brain-fill" class="h-6 w-6 text-candy-orange" />
            </div>
            <h3 class="text-lg font-medium" :class="isDark ? 'text-white' : 'text-gray-900'">Analyzing Intent</h3>
            <p class="text-sm mt-1" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
              Scanning documents using semantic search...
            </p>
          </div>

          <div v-else-if="!hasSearched" class="p-6">
            <h3 class="text-sm font-medium mb-3 uppercase tracking-wider" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
              Natural Discovery
            </h3>
            <div class="space-y-3">
              <div 
                v-for="suggestion in suggestions" 
                :key="suggestion"
                class="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors"
                :class="isDark ? 'hover:bg-white/5 text-gray-300' : 'hover:bg-gray-50 text-gray-700'"
                @click="query = suggestion; handleSearch()"
              >
                <Icon name="ph:magnifying-glass" class="h-4 w-4 opacity-50" />
                <span class="text-sm">{{ suggestion }}</span>
              </div>
            </div>
          </div>

          <!-- Error -->
          <div v-else-if="error" class="p-6 text-center text-red-500">
            <Icon name="ph:warning-circle" class="h-8 w-8 mx-auto mb-2" />
            <p>{{ error }}</p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'

const props = defineProps<{
  isOpen: boolean
  documents: Array<any>
}>()

const emit = defineEmits(['close', 'results'])

const { isDark } = useTheme()
const searchInput = ref<HTMLInputElement | null>(null)
const query = ref('')
const isSearching = ref(false)
const hasSearched = ref(false)
const error = ref('')

const suggestions = [
  "Find the Q3 financial report",
  "Show me documents uploaded by John",
  "Any marketing assets from last month?",
  "Urgent pending files that need approval"
]

watch(() => props.isOpen, (val) => {
  if (val) {
    query.value = ''
    hasSearched.value = false
    error.value = ''
    nextTick(() => {
      searchInput.value?.focus()
    })
  }
})

async function handleSearch() {
  if (!query.value.trim()) return

  isSearching.value = true
  hasSearched.value = true
  error.value = ''

  try {
    const res = await $fetch('/api/documents/semantic-search', {
      method: 'POST',
      body: {
        query: query.value,
        documents: props.documents
      }
    })

    if (res && Array.isArray(res.matches)) {
      emit('results', res.matches, query.value)
      emit('close')
    } else {
      error.value = 'Failed to interpret results.'
    }
  } catch (err: any) {
    console.error(err)
    error.value = err?.data?.message || err.message || 'An error occurred while searching.'
  } finally {
    isSearching.value = false
  }
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, backdrop-filter 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  backdrop-filter: blur(0px);
}
</style>
