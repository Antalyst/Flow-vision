<template>
  <div class="h-full flex flex-col p-4 md:p-6 lg:p-8">
    
    <!-- LIST VIEW (Always Visible) -->
    <div class="flex flex-col h-full gap-6">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">My Documents</h1>
          <p class="text-sm md:text-base text-gray-500 mt-1">Track and manage all your active applications and requests.</p>
        </div>
        <button class="bg-candy-orange hover:bg-candy-orange/90 text-white px-4 py-2 font-medium transition-colors flex items-center gap-2 w-full md:w-auto justify-center shadow-sm rounded-none border border-candy-orange">
          <Icon name="ph:plus-bold" class="w-4 h-4" />
          <span>New Application</span>
        </button>
      </div>

      <!-- Document List (Grid) -->
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 overflow-y-auto pb-8">
        <div v-for="doc in documentList" :key="doc.id" 
             @click="selectDocument(doc)"
             class="group bg-white dark:bg-onyx-card border p-5 cursor-pointer transition-all duration-300 hover:border-candy-orange/50 hover:shadow-lg dark:hover:shadow-[0_0_30px_-10px_rgba(244,125,47,0.15)] relative overflow-hidden rounded-none"
             :class="isDark ? 'border-onyx-border' : 'border-gray-200'">
          
          <!-- Hover accent -->
          <div class="absolute left-0 top-0 bottom-0 w-1 bg-candy-orange scale-y-0 group-hover:scale-y-100 transition-transform origin-top"></div>
          
          <div class="flex justify-between items-start mb-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-gray-50 dark:bg-onyx-black flex items-center justify-center border rounded-none" :class="isDark ? 'border-onyx-border' : 'border-gray-100'">
                <Icon :name="doc.icon" class="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-candy-orange transition-colors" />
              </div>
              <div>
                <p class="text-[10px] font-bold uppercase tracking-wider text-gray-400">{{ doc.id }}</p>
                <h3 class="font-bold text-gray-900 dark:text-white leading-tight mt-0.5">{{ doc.title }}</h3>
              </div>
            </div>
          </div>
          
          <div class="flex items-center justify-between mt-6">
            <div class="flex flex-col">
              <span class="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Status</span>
              <span class="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider w-fit rounded-none border" :class="docBadgeClass(doc.status)">
                {{ doc.statusLabel }}
              </span>
            </div>
            <div class="flex flex-col text-right">
              <span class="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Last Update</span>
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ doc.lastUpdate }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- DETAILS DRAWER -->
    <div v-if="selectedDocument" class="fixed inset-0 z-[1000] flex">
      <!-- Backdrop -->
      <Transition name="fade" appear>
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="selectedDocument = null"></div>
      </Transition>

      <!-- Sliding Drawer -->
      <Transition name="slide-right" appear>
        <div 
             class="absolute right-0 top-0 bottom-0 w-full md:w-[600px] lg:w-[800px] flex flex-col shadow-2xl border-l"
             :class="isDark ? 'bg-onyx-black border-onyx-border' : 'bg-white border-gray-200'">
          
          <!-- Drawer Header -->
          <div class="p-6 border-b flex items-center justify-between bg-white dark:bg-onyx-card" :class="isDark ? 'border-onyx-border' : 'border-gray-200'">
            <div>
              <div class="flex items-center gap-3 mb-1">
                <h2 class="text-2xl font-bold text-gray-900 dark:text-white">{{ selectedDocument.title }}</h2>
                <span class="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-none border" :class="docBadgeClass(selectedDocument.status)">
                  {{ selectedDocument.statusLabel }}
                </span>
              </div>
              <p class="text-sm text-gray-500 font-mono text-candy-orange">{{ selectedDocument.id }}</p>
            </div>
            <button @click="selectedDocument = null" class="p-2 hover:bg-gray-100 dark:hover:bg-onyx-black/50 transition text-gray-500 rounded-none border border-transparent">
              <Icon name="ph:x-bold" class="w-6 h-6" />
            </button>
          </div>

          <!-- Drawer Content (Scrollable) -->
          <div class="flex-1 overflow-y-auto p-6 space-y-6 relative z-10">
            
            <!-- Document Meta Info & QR -->
            <section class="border bg-white dark:bg-onyx-card p-6 rounded-none flex flex-col md:flex-row gap-6" :class="isDark ? 'border-onyx-border' : 'border-gray-200'">
              <div class="flex-1">
                <h3 class="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-widest mb-3">Document Information</h3>
                <p class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                  This document is an official application submitted via the LGU citizen portal. It requires sequential clearance across multiple departments to finalize processing.
                </p>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <span class="text-[10px] uppercase tracking-wider text-gray-500 block mb-1">Submission Date</span>
                    <span class="text-sm font-medium text-gray-900 dark:text-white">Oct 12, 2023</span>
                  </div>
                  <div>
                    <span class="text-[10px] uppercase tracking-wider text-gray-500 block mb-1">Applicant</span>
                    <span class="text-sm font-medium text-gray-900 dark:text-white">Juan Dela Cruz</span>
                  </div>
                </div>
              </div>
              <div class="flex flex-col items-center justify-center gap-2 pl-0 md:pl-6 border-t md:border-t-0 md:border-l pt-6 md:pt-0" :class="isDark ? 'border-onyx-border' : 'border-gray-200'">
                <div class="w-24 h-24 bg-white border-4 border-gray-900 flex items-center justify-center p-2 rounded-none">
                  <Icon name="ph:qr-code-light" class="w-full h-full text-gray-900" />
                </div>
                <span class="text-[10px] font-bold uppercase tracking-wider text-gray-500">Scan for Verification</span>
              </div>
            </section>

            <!-- Live Routing Map -->
            <section class="border bg-white dark:bg-onyx-card p-6 rounded-none" :class="isDark ? 'border-onyx-border' : 'border-gray-200'">
              <h3 class="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-widest mb-4">Processing Route</h3>
              
              <div class="relative overflow-hidden border rounded-none" :class="isDark ? 'border-onyx-border' : 'border-gray-200'">
                <div class="p-4 bg-gray-50 dark:bg-onyx-black/50">
                  <div class="flex items-center gap-2 mb-2">
                    <div class="w-2 h-2 bg-candy-orange animate-pulse rounded-none"></div>
                    <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-candy-orange">Live Transit Status</p>
                  </div>
                  <p class="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                    Document is currently actively transiting the mesh network. Real-time trajectory predicts arrival at next office shortly.
                  </p>
                </div>

                <div class="relative p-6 pt-8 overflow-hidden bg-white dark:bg-onyx-card border-t" :class="isDark ? 'border-onyx-border' : 'border-gray-200'">
                  <div class="absolute left-6 top-8 bottom-8 w-1 bg-gray-200 dark:bg-white/10 hidden sm:block"></div>
                  <div class="absolute left-6 top-8 w-1 bg-gradient-to-b from-candy-orange via-amber-500 to-transparent shadow-[0_0_10px_#f47d2f] hidden sm:block h-[60%]"></div>
                  
                  <div class="flex flex-col gap-6">
                    <div v-for="(node, idx) in nodeMap" :key="node.label" class="relative flex flex-col sm:flex-row gap-4 sm:gap-6 items-start group">
                      <div class="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-full bg-gray-200 dark:bg-white/10 sm:hidden"></div>
                      
                      <div class="relative z-10 flex-none bg-white dark:bg-onyx-card border-[3px] w-4 h-4 mt-1 ml-[-6px] sm:ml-[22px] transition-colors duration-500 rounded-none rotate-45"
                           :class="[idx <= 1 ? 'border-candy-orange shadow-[0_0_15px_rgba(244,125,47,0.5)]' : (isDark ? 'border-gray-700' : 'border-gray-300')]"></div>
                      
                      <div class="flex-1 w-full bg-gray-50 dark:bg-onyx-black/40 p-4 border transition-all duration-300 group-hover:border-candy-orange/50 rounded-none"
                           :class="isDark ? 'border-onyx-border' : 'border-gray-200'">
                        <p class="text-[10px] font-bold uppercase tracking-widest text-candy-orange mb-1">{{ node.code }}</p>
                        <h4 class="text-base font-bold text-gray-900 dark:text-white mb-1">{{ node.label }}</h4>
                        <p class="text-xs text-gray-500 dark:text-gray-400">{{ node.detail }}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <!-- Zero-Ambiguity Audit Log -->
            <section class="border bg-white dark:bg-onyx-card p-6 rounded-none" :class="isDark ? 'border-onyx-border' : 'border-gray-200'">
              <div class="mb-4 flex items-center justify-between">
                <div>
                  <h3 class="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-widest">Zero-Ambiguity Audit Log</h3>
                  <p class="text-[10px] uppercase tracking-widest text-gray-500 mt-1">Immutable Ledger</p>
                </div>
                <Icon name="ph:shield-check-fill" class="w-6 h-6 text-emerald-500" />
              </div>

              <div class="flex flex-col gap-3">
                <div v-for="(log, idx) in auditLog" :key="idx"
                     class="border p-4 transition-all duration-300 hover:border-gray-300 dark:hover:border-gray-600 rounded-none"
                     :class="isDark ? 'bg-onyx-black/40 border-onyx-border' : 'bg-gray-50 border-gray-100'">
                  <div class="flex justify-between items-start mb-3 gap-2">
                    <div class="flex items-center gap-3">
                      <div class="w-2.5 h-2.5 rounded-none rotate-45" :class="statusRingClass(log.status)"></div>
                      <h4 class="font-bold text-sm text-gray-900 dark:text-white">{{ log.title }}</h4>
                    </div>
                    <span class="px-2 py-0.5 text-[9px] font-bold border uppercase tracking-wider whitespace-nowrap rounded-none" :class="statusBadgeClass(log.status)">
                      {{ log.status }}
                    </span>
                  </div>
                  
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-y-3 mt-4 border-t pt-3" :class="isDark ? 'border-onyx-border' : 'border-gray-200'">
                    <div>
                      <p class="text-[9px] uppercase tracking-wider text-gray-500">Identity Binding</p>
                      <p class="text-xs text-gray-700 dark:text-gray-300 mt-0.5 font-mono truncate pr-2" :title="log.binding">{{ log.binding }}</p>
                    </div>
                    <div>
                      <p class="text-[9px] uppercase tracking-wider text-gray-500">Telemetry (GPS)</p>
                      <p class="text-xs text-gray-700 dark:text-gray-300 mt-0.5 font-mono">{{ log.gps }}</p>
                    </div>
                    <div class="sm:col-span-2">
                      <p class="text-[9px] uppercase tracking-wider text-gray-500">Network Time</p>
                      <p class="text-xs text-gray-700 dark:text-gray-300 mt-0.5 font-mono">{{ log.time }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted, watch } from 'vue'
import { useTheme } from '~/composables/useTheme'

const { isDark } = useTheme()

type AuditStatus = 'CLEARED' | 'ACTIVE' | 'PENDING'
type DocStatus = 'processing' | 'completed' | 'attention'

definePageMeta({ layout: 'public-dashboard' })

useSeoMeta({
  title: 'My Documents - FlowVision',
  description: 'View the live status, location, and cryptographic audit trail of your documents processed through the LGU. Check real-time progress instantly.',
})

// Mock Document List
const documentList = ref([
  {
    id: 'PKG-0x8F2A',
    title: 'Business Permit Renewal 2024',
    icon: 'ph:briefcase-bold',
    status: 'processing' as DocStatus,
    statusLabel: 'In Transit',
    lastUpdate: '10 min ago'
  },
  {
    id: 'PKG-0x9C4B',
    title: 'Building Construction Permit',
    icon: 'ph:buildings-bold',
    status: 'attention' as DocStatus,
    statusLabel: 'Action Required',
    lastUpdate: '2 hours ago'
  },
  {
    id: 'PKG-0x1A2C',
    title: 'Barangay Clearance Request',
    icon: 'ph:file-text-bold',
    status: 'completed' as DocStatus,
    statusLabel: 'Completed',
    lastUpdate: 'Oct 24, 2023'
  },
  {
    id: 'PKG-0x3F9E',
    title: 'Zoning Certification',
    icon: 'ph:map-trifold-bold',
    status: 'completed' as DocStatus,
    statusLabel: 'Completed',
    lastUpdate: 'Sep 12, 2023'
  }
])

const selectedDocument = ref<any>(null)

const selectDocument = (doc: any) => {
  selectedDocument.value = doc
  if (typeof document !== 'undefined') {
    document.body.style.overflow = 'hidden'
  }
}

watch(selectedDocument, (newVal) => {
  if (!newVal && typeof document !== 'undefined') {
    document.body.style.overflow = ''
  }
})

onUnmounted(() => {
  if (typeof document !== 'undefined') {
    document.body.style.overflow = ''
  }
})

const docBadgeClass = (status: DocStatus | AuditStatus) => {
  switch(status) {
    case 'processing': return 'bg-candy-orange/10 text-candy-orange border-candy-orange/20'
    case 'attention': return 'bg-red-500/10 text-red-500 border-red-500/20'
    case 'completed': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
    
    // Audit Statuses
    case 'CLEARED': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
    case 'ACTIVE': return 'bg-candy-orange text-white border-candy-orange shadow-[0_0_10px_rgba(244,125,47,0.3)]'
    case 'PENDING': return 'bg-transparent text-gray-500 dark:text-gray-400 border-gray-300 dark:border-white/10'
    default: return 'bg-gray-100 text-gray-600 border-gray-200'
  }
}

// Telemetry & Node Mock Data
const nodeMap = [
  { label: 'Business Permit Office', code: 'INTAKE NODE', detail: 'Application received and verified.' },
  { label: 'Treasury Office', code: 'PAYMENT', detail: 'Processing of fees and routing.' },
  { label: 'Mayor\'s Office', code: 'APPROVAL', detail: 'Awaiting final signature.' },
] as const

const auditLog = [
  { title: 'Application Submitted', status: 'CLEARED' as AuditStatus, binding: 'Binding 0x8F2A-441C-90E1', gps: '10.5333 N, 122.8333 E', time: '09:12 SGT' },
  { title: 'Fee Assessment', status: 'ACTIVE' as AuditStatus, binding: 'Binding 0x2C90-7A0F-1D77', gps: '10.5379 N, 122.8381 E', time: '10:38 SGT' },
  { title: 'Final Approval', status: 'PENDING' as AuditStatus, binding: 'Awaiting signature cryptographic seal', gps: '10.5415 N, 122.8420 E', time: 'Pending' },
] as const

const statusRingClass = (status: AuditStatus) => ({
  CLEARED: 'bg-emerald-500',
  ACTIVE: 'bg-candy-orange shadow-[0_0_15px_rgba(244,125,47,0.7)]',
  PENDING: 'bg-gray-300 dark:bg-white/20',
}[status])
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-right-enter-from,
.slide-right-leave-to {
  transform: translateX(100%);
}
.slide-right-enter-to,
.slide-right-leave-from {
  transform: translateX(0);
}
</style>
