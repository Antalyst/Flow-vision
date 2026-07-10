<template>
  <div v-if="showOverlayButton">
    <!-- Floating Action Button -->
    <button
      @click="isOpen = true"
      class="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-[0_0_20px_rgba(249,115,22,0.4)] hover:shadow-[0_0_35px_rgba(249,115,22,0.6)] hover:scale-105 active:scale-95 transition-all duration-300 group"
      aria-label="Open FlowVision Intelligence"
    >
      <Icon name="ph:sparkle-fill" class="h-6 w-6 transition-transform duration-500 group-hover:rotate-12" />
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
              <div class="absolute top-[10%] left-[20%] w-[40%] h-[50%] bg-orange-500/30 blur-[100px] md:blur-[140px] fluid-blob"></div>
              <div class="absolute bottom-[10%] right-[20%] w-[50%] h-[40%] bg-amber-400/20 blur-[100px] md:blur-[140px] fluid-blob-reverse"></div>
              <div class="absolute top-[20%] left-[40%] w-[35%] h-[35%] bg-rose-500/20 blur-[120px] md:blur-[160px] fluid-blob" style="animation-delay: -5s;"></div>
            </div>

            <!-- The Glassmorphic Window (No borders, ultra smooth) -->
            <div class="relative flex-1 flex flex-col w-full h-full bg-white/40 dark:bg-[#0c0c0e]/50 backdrop-blur-3xl rounded-3xl md:rounded-[2.5rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden transition-all">
              
              <!-- System-like Header -->
              <div class="flex-none flex items-center justify-between px-6 py-4 bg-transparent">
                <div class="flex items-center gap-3">
                  <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500/20 text-orange-600 dark:text-orange-400">
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
                <AiCanvasWorkspace role-context="client" scope="GLOBAL" />
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

const route = useRoute()
const isOpen = ref(false)

const showOverlayButton = computed(() => {
  return route.path !== '/client/ai' && !route.path.startsWith('/client/ai/')
})
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
