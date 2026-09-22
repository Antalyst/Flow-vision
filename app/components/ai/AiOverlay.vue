<template>
  <div v-if="showOverlayButton">
    <!-- Floating Action Button -->
    <button
      @click="isOpen = true"
      class="fixed bottom-24 right-4 md:bottom-10 md:right-10 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-candy-orange text-white shadow-lg transition-colors duration-200 hover:bg-candy-hover active:scale-95 group"
      aria-label="Ask FlowVision AI"
    >
      <Icon name="ph:sparkle-fill" class="h-5 w-5" />
    </button>

    <!-- Overlay Wrapper -->
    <Teleport to="body">
      <!-- Backdrop blur -->
      <Transition name="ai-backdrop">
        <div v-if="isOpen" class="fixed inset-0 z-[60] bg-black/10 dark:bg-black/30 backdrop-blur-md" @click="isOpen = false"></div>
      </Transition>

      <!-- Modal Window -->
      <Transition name="ai-modal">
        <div v-if="isOpen" class="fixed inset-0 z-[70] flex flex-col justify-end md:items-center md:justify-center pointer-events-none px-2 pb-2 md:p-8">
          
          <div class="relative w-full max-w-7xl h-[95vh] md:h-[85vh] max-h-[1000px] pointer-events-auto flex flex-col mx-auto group/overlay">
            
            <!-- Moving Circular Glows (Fluid Blobs - Balanced) -->
            <div class="absolute -inset-10 -z-10 pointer-events-none opacity-50 dark:opacity-30 mix-blend-screen dark:mix-blend-lighten overflow-visible">
              <div class="absolute top-[10%] left-[20%] w-[40%] h-[50%] blur-[100px] md:blur-[140px] fluid-blob" :class="blobClass[0]"></div>
              <div class="absolute bottom-[10%] right-[20%] w-[50%] h-[40%] blur-[100px] md:blur-[140px] fluid-blob-reverse" :class="blobClass[1]"></div>
              <div class="absolute top-[20%] left-[40%] w-[35%] h-[35%] blur-[120px] md:blur-[160px] fluid-blob" :class="blobClass[2]" style="animation-delay: -5s;"></div>
            </div>

            <!-- The Glassmorphic Window (No borders, ultra smooth) -->
            <div class="relative flex-1 flex flex-col w-full h-full bg-white/40 dark:bg-[#0c0c0e]/50 backdrop-blur-3xl rounded-3xl md:rounded-[2.5rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden transition-all">
              
              <!-- System-like Header -->
              <div class="flex-none flex items-center justify-between px-6 py-4 bg-transparent">
                <div class="flex items-center gap-3">
                  <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-candy-orange/15 text-candy-orange">
                    <Icon name="ph:sparkle-fill" class="h-4 w-4" />
                  </div>
                  <span class="font-bold text-gray-900 dark:text-white tracking-tight text-sm uppercase tracking-wide">FlowVision Assistant</span>
                </div>
                <button @click="isOpen = false" class="p-2 -mr-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-gray-600 dark:text-gray-300">
                  <Icon name="ph:x" class="h-5 w-5" />
                </button>
              </div>
              
              <!-- Workspace Integration (Overriding internal backgrounds for full glass effect) -->
              <div class="flex-1 min-h-0 relative ai-workspace-glass-overrides">
                <AiCanvasWorkspace :role-context="role" :scope="scope" />
              </div>

            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from '#imports'
import AiCanvasWorkspace from '~/components/ai/AiCanvasWorkspace.vue'

const props = defineProps({
  role: {
    type: String,
    default: 'client'
  },
  scope: {
    type: String,
    default: 'GLOBAL'
  }
})

const route = useRoute()
const isOpen = ref(false)

const showOverlayButton = computed(() => {
  const aiPath = `/${props.role}/ai`
  return route.path !== aiPath && !route.path.startsWith(`${aiPath}/`)
})

const blobClass = ['bg-candy-orange/30', 'bg-candy-orange/15', 'bg-candy-orange/10']
</script>

<style scoped>
/* Glassmorphism overrides for AiCanvasWorkspace to remove solid colors */
.ai-workspace-glass-overrides :deep(> div) {
  height: 100% !important;
  max-height: 100% !important;
  background: transparent !important;
  border-radius: 0 !important;
}
.ai-workspace-glass-overrides :deep(aside) {
  background: rgba(255, 255, 255, 0.15) !important;
  border-right: none !important;
}
:root.dark .ai-workspace-glass-overrides :deep(aside) {
  background: rgba(0, 0, 0, 0.2) !important;
}

/* Fluid Blob Animations */
.fluid-blob {
  border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%;
  animation: blob-spin 12s linear infinite;
}
.fluid-blob-reverse {
  border-radius: 60% 40% 30% 70% / 50% 60% 50% 40%;
  animation: blob-spin-reverse 15s linear infinite;
}

@keyframes blob-spin {
  0% { transform: rotate(0deg) scale(1); }
  50% { transform: rotate(180deg) scale(1.1); border-radius: 60% 40% 30% 70% / 50% 60% 50% 40%; }
  100% { transform: rotate(360deg) scale(1); }
}

@keyframes blob-spin-reverse {
  0% { transform: rotate(0deg) scale(1); }
  50% { transform: rotate(-180deg) scale(1.15); border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%; }
  100% { transform: rotate(-360deg) scale(1); }
}

/* Modal transitions */
.ai-backdrop-enter-active,
.ai-backdrop-leave-active {
  transition: opacity 0.4s ease;
}
.ai-backdrop-enter-from,
.ai-backdrop-leave-to {
  opacity: 0;
}

.ai-modal-enter-active,
.ai-modal-leave-active {
  transition: all 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}
.ai-modal-enter-from,
.ai-modal-leave-to {
  opacity: 0;
  transform: scale(0.96) translateY(20px);
}

@media (max-width: 768px) {
  .ai-modal-enter-from,
  .ai-modal-leave-to {
    opacity: 0;
    transform: translateY(100%);
  }
}
</style>
