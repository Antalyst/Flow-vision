<template>
  <div class="min-h-screen text-onyx-black dark:text-white-pure selection:bg-candy-orange/30 overflow-x-hidden relative">
    
    <!-- Abstract Background Element -->
    <div class="absolute inset-0 z-0 pointer-events-none opacity-20 dark:opacity-30 mix-blend-overlay">
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-candy-orange/20 via-transparent to-transparent opacity-50 blur-3xl"></div>
      <div class="absolute w-full h-full" style="background-image: radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px); background-size: 40px 40px;"></div>
    </div>

    <!-- Hero Search Section -->
    <section class="relative z-10 mx-auto max-w-5xl px-6 pt-32 pb-16 flex flex-col items-center text-center">
      <div class="search-hero-eyebrow opacity-0 translate-y-4 inline-flex items-center gap-2 rounded-full border border-candy-orange/40 bg-candy-orange/10 px-4 py-1.5 font-dashboard text-xs font-bold uppercase tracking-widest text-candy-orange backdrop-blur-md mb-6 shadow-[0_0_15px_rgba(244,125,47,0.3)]">
        <Icon name="ph:radar-fill" class="h-4 w-4 animate-spin-slow" />
        Live Telemetry Uplink
      </div>
      
      <h1 class="search-hero-title opacity-0 translate-y-8 font-primary text-5xl font-extrabold tracking-tight md:text-7xl mb-12 text-white">
        Global <span class="text-transparent bg-clip-text bg-gradient-to-r from-candy-orange to-amber-500">Tracking.</span>
      </h1>
      
      <form class="search-form opacity-0 translate-y-8 w-full max-w-3xl relative group" @submit.prevent="simulateTracking">
        <label for="document-search" class="sr-only">Track document</label>
        
        <!-- Glowing ring effect behind search bar -->
        <div class="absolute -inset-1 bg-gradient-to-r from-candy-orange to-amber-500 rounded-full blur-md opacity-30 group-hover:opacity-60 transition duration-1000 group-hover:duration-200"></div>
        
        <div class="relative flex items-center gap-4 rounded-full border border-white/20 bg-black/40 p-2 shadow-2xl backdrop-blur-2xl transition-all duration-300 focus-within:ring-2 focus-within:ring-candy-orange/50">
          <Icon name="ph:magnifying-glass-bold" class="ml-6 h-6 w-6 text-gray-300" />
          <input
            id="document-search"
            v-model="trackingQuery"
            type="search"
            placeholder="Packet ID, QR binding, or courier ref..."
            class="min-w-0 flex-1 bg-transparent px-2 py-4 font-dashboard text-lg outline-none placeholder:text-gray-400 text-white"
          >
          <button
            type="submit"
            class="flex items-center gap-2 rounded-full bg-candy-orange px-8 py-4 font-dashboard text-sm font-bold text-white shadow-lg shadow-candy-orange/40 transition-all hover:bg-[#e95a0b] active:scale-[0.98]"
          >
            Track <Icon name="ph:arrow-right-bold" class="h-4 w-4" />
          </button>
        </div>
      </form>
    </section>

    <!-- Telemetry Dashboard (Hidden until searched, but forced open here for demo if simulated) -->
    <main v-show="hasSearched" class="dashboard-wrapper relative z-10 mx-auto grid max-w-[1200px] grid-cols-1 gap-8 px-6 pb-32 lg:grid-cols-12">
      
      <!-- Left Column: Live Node Map -->
      <section class="telemetry-panel opacity-0 rounded-3xl border border-white/10 bg-white/5 dark:bg-black/40 p-8 backdrop-blur-xl lg:col-span-7 shadow-2xl relative overflow-hidden">
        
        <!-- Subtle internal glow -->
        <div class="absolute top-0 right-0 w-64 h-64 bg-candy-orange/10 blur-[80px] rounded-full pointer-events-none"></div>

        <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-12 relative z-10">
          <div>
            <p class="font-dashboard text-xs font-bold uppercase tracking-[0.24em] text-candy-orange">
              Live Routing Map
            </p>
            <h2 class="mt-3 font-primary text-3xl font-bold tracking-tight text-white">
              Office A <span class="text-candy-orange px-2">→</span> HUB <span class="text-candy-orange px-2">→</span> Office B
            </h2>
          </div>
          <div class="flex flex-wrap gap-4">
            <div
              v-for="metric in telemetryMetrics"
              :key="metric.label"
              class="telemetry-metric-card opacity-0 rounded-xl border border-white/10 bg-black/40 px-4 py-2 backdrop-blur-md shadow-sm"
            >
              <p class="font-dashboard text-[9px] font-bold uppercase tracking-widest text-gray-500">
                {{ metric.label }}
              </p>
              <p class="mt-1 font-dashboard text-lg font-bold text-candy-orange leading-none">
                {{ metric.value }}
              </p>
            </div>
          </div>
        </div>

        <!-- Beautiful Image Layout for Node Map -->
        <div class="relative mt-8 mb-4 rounded-3xl overflow-hidden group border border-white/10 shadow-2xl">
          <img src="https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=2074" alt="Live Routing Map" class="absolute inset-0 w-full h-full object-cover mix-blend-luminosity opacity-40 group-hover:opacity-60 group-hover:scale-105 transition-all duration-1000">
          <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20 pointer-events-none"></div>
          
          <!-- Explanation Overlay -->
          <div class="relative z-10 p-8 pb-4">
            <div class="bg-black/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 max-w-lg shadow-xl">
              <div class="flex items-center gap-3 mb-3">
                <div class="w-2 h-2 rounded-full bg-candy-orange animate-pulse"></div>
                <p class="font-dashboard text-xs font-bold uppercase tracking-[0.24em] text-candy-orange">Live Transit Status</p>
              </div>
              <p class="font-dashboard text-sm leading-relaxed text-gray-300">
                Packet is currently actively transiting the mesh network. Last known secure uplink established at the HUB checkpoint. Real-time trajectory predicts arrival at Office B in approximately 14 minutes.
              </p>
            </div>
          </div>

          <!-- Animated Minimalist Timeline Node Map -->
          <div class="relative p-8 pt-12 overflow-hidden">
            <!-- Connecting Line Background -->
            <div class="absolute top-[4.2rem] left-[15%] right-[15%] h-[2px] bg-white/10 rounded-full z-0"></div>
            <!-- Animated Connecting Line Progress -->
            <div class="timeline-progress absolute top-[4.2rem] left-[15%] w-[50%] h-[2px] bg-gradient-to-r from-amber-500 to-candy-orange rounded-full z-0 shadow-[0_0_15px_rgba(244,125,47,0.8)]"></div>

            <div class="grid grid-cols-3 relative z-10">
              <div v-for="(node, index) in nodeMap" :key="node.label" class="node-item flex flex-col items-center text-center opacity-0 translate-y-4">
                <!-- Node Point -->
                <div class="relative flex items-center justify-center w-12 h-12 mb-8">
                  <!-- Ping effect for active node (e.g. HUB) -->
                  <div v-if="index === 1" class="absolute inset-0 rounded-full bg-candy-orange animate-ping opacity-40"></div>
                  
                  <div class="relative h-4 w-4 rounded-full shadow-[0_0_10px_rgba(244,125,47,0.5)] transition-all duration-300"
                       :class="index <= 1 ? 'bg-candy-orange ring-4 ring-candy-orange/20' : 'bg-gray-700'">
                  </div>
                </div>
                
                <h3 class="font-primary text-lg font-bold text-white mb-2 shadow-black drop-shadow-md">
                  {{ node.label }}
                </h3>
                <p class="inline-flex items-center font-mono text-[10px] font-bold text-candy-orange mb-3 shadow-black drop-shadow-md">
                  <Icon name="ph:hash-bold" class="mr-1" />{{ node.code }}
                </p>
                <p class="max-w-[180px] font-dashboard text-xs leading-relaxed text-gray-300 font-medium shadow-black drop-shadow-md">
                  {{ node.detail }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Right Column: Audit Log -->
      <aside class="audit-panel opacity-0 translate-x-8 rounded-3xl border border-white/10 bg-white/5 dark:bg-black/40 p-8 backdrop-blur-xl lg:col-span-5 shadow-2xl flex flex-col relative overflow-hidden">
        
        <!-- Beautiful Image Header -->
        <div class="absolute top-0 left-0 right-0 h-[220px] overflow-hidden z-0 border-b border-white/10 pointer-events-none">
          <img src="https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=2034" alt="Cryptographic Ledger" class="w-full h-full object-cover mix-blend-luminosity opacity-40 scale-105">
          <div class="absolute inset-0 bg-gradient-to-b from-transparent via-black/80 to-black"></div>
        </div>

        <div class="relative z-10 mb-8 pt-4">
          <p class="font-dashboard text-xs font-bold uppercase tracking-[0.24em] text-candy-orange">
            Zero-Ambiguity Log
          </p>
          <h2 class="mt-3 font-primary text-3xl font-bold tracking-tight text-white mb-4">
            Cryptographic Checkpoints
          </h2>
          <p class="font-dashboard text-sm leading-relaxed text-gray-300 max-w-md bg-black/40 p-4 rounded-xl border border-white/10 backdrop-blur-md">
            The following ledger is cryptographically signed and perfectly immutable. GPS coordinates and temporal identities are permanently locked. There is zero ambiguity in this chain of custody.
          </p>
        </div>

        <ol class="flex-1 relative border-l border-white/10 ml-2 space-y-6 pb-4">
          <li
            v-for="event in auditLog"
            :key="event.title"
            class="audit-item opacity-0 translate-x-4 relative pl-6 group cursor-default"
          >
            <!-- Timeline Marker -->
            <span
              class="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full transition-colors duration-300"
              :class="event.status === 'ACTIVE' ? 'bg-candy-orange shadow-[0_0_8px_#f47d2f]' : event.status === 'SECURED' ? 'bg-gray-500' : 'bg-gray-700'"
            >
              <span v-if="event.status === 'ACTIVE'" class="absolute -inset-2 rounded-full border border-candy-orange animate-ping opacity-60"></span>
            </span>
            
            <article class="flex flex-col gap-2 rounded-xl bg-transparent p-4 border border-transparent hover:border-white/10 hover:bg-white/5 transition-all duration-300">
              <div class="flex items-center justify-between gap-4">
                <h3 class="font-primary text-sm font-bold text-white group-hover:text-candy-orange transition-colors">
                  {{ event.title }}
                </h3>
                <span class="font-mono text-[9px] font-bold uppercase tracking-widest" :class="event.status === 'ACTIVE' ? 'text-candy-orange' : event.status === 'SECURED' ? 'text-gray-400' : 'text-gray-600'">
                  [{{ event.status }}]
                </span>
              </div>
              
              <div class="font-mono text-[10px] text-gray-500 flex flex-col gap-1 mt-1">
                <div class="flex justify-between items-center">
                  <span>HASH:</span>
                  <span class="text-gray-300">{{ event.binding }}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span>LOC:</span>
                  <span class="text-candy-orange/80">{{ event.gps }}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span>TIME:</span>
                  <span class="text-white">{{ event.time }}</span>
                </div>
              </div>
            </article>
          </li>
        </ol>
      </aside>
    </main>

    <!-- Detailed Tracking Mechanics Section -->
    <section v-show="hasSearched" class="relative z-10 mx-auto max-w-[1200px] px-6 pb-32 flex flex-col gap-32">
      
      <!-- Block 1: Physical-to-Digital Binding -->
      <div class="mechanics-block grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div class="mechanic-img-wrapper relative h-[450px] rounded-3xl overflow-hidden border border-white/10 group opacity-0 translate-x-[-2rem]">
          <img src="https://images.unsplash.com/photo-1586281380349-632531db7ed4?q=80&w=2070" alt="Document Scanning" class="mechanic-img absolute inset-0 w-full h-[120%] object-cover mix-blend-luminosity opacity-70 group-hover:opacity-90 transition-opacity duration-700">
          <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none"></div>
          <div class="absolute bottom-6 left-6 right-6 p-4 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 flex items-center gap-4">
            <Icon name="ph:qr-code-bold" class="w-8 h-8 text-candy-orange" />
            <div>
              <p class="text-sm font-bold text-white">QR Trailer Generation</p>
              <p class="text-xs text-gray-400">Appending unique cryptographic signatures.</p>
            </div>
          </div>
        </div>
        <div class="mechanic-content px-4">
          <p class="mechanic-text opacity-0 translate-y-4 font-dashboard text-xs font-bold uppercase tracking-[0.24em] text-candy-orange mb-4">Phase 01</p>
          <h3 class="mechanic-text opacity-0 translate-y-4 font-primary text-4xl font-extrabold text-white mb-6">Physical-to-Digital Binding.</h3>
          <p class="mechanic-text opacity-0 translate-y-4 font-dashboard text-base leading-relaxed text-gray-400 mb-6">
            FlowVision bridges the gap between physical paperwork and digital telemetry. Upon document intake, the system generates a unique cryptographic QR code that is either printed directly onto the payload or appended as a standalone tracking trailer page.
          </p>
          <p class="mechanic-text opacity-0 translate-y-4 font-dashboard text-base leading-relaxed text-gray-400">
            This QR binding acts as the document's immutable digital twin, guaranteeing that the physical item moving through the world is perfectly synced with the digital dashboard you see above.
          </p>
        </div>
      </div>

      <!-- Block 2: Mesh-Node Transit (Flipped) -->
      <div class="mechanics-block grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div class="mechanic-content px-4 order-2 lg:order-1">
          <p class="mechanic-text opacity-0 translate-y-4 font-dashboard text-xs font-bold uppercase tracking-[0.24em] text-candy-orange mb-4">Phase 02</p>
          <h3 class="mechanic-text opacity-0 translate-y-4 font-primary text-4xl font-extrabold text-white mb-6">Mesh-Node Telemetry.</h3>
          <p class="mechanic-text opacity-0 translate-y-4 font-dashboard text-base leading-relaxed text-gray-400 mb-6">
            As documents move between offices and transit hubs, they are scanned by authorized personnel using the FlowVision Employee Portal.
          </p>
          <p class="mechanic-text opacity-0 translate-y-4 font-dashboard text-base leading-relaxed text-gray-400">
            Each scan acts as a "ping" across the logistics mesh network. Our sub-100ms backend immediately updates the Live Routing Map, calculates current latency, and estimates remaining transit time based on historical SLA metrics.
          </p>
        </div>
        <div class="mechanic-img-wrapper relative h-[450px] rounded-3xl overflow-hidden border border-white/10 group order-1 lg:order-2 opacity-0 translate-x-[2rem]">
          <img src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=2070" alt="Logistics Scanning" class="mechanic-img absolute inset-0 w-full h-[120%] object-cover mix-blend-luminosity opacity-70 group-hover:opacity-90 transition-opacity duration-700">
          <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none"></div>
          <div class="absolute bottom-6 left-6 right-6 p-4 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 flex items-center gap-4">
            <Icon name="ph:broadcast-bold" class="w-8 h-8 text-candy-orange" />
            <div>
              <p class="text-sm font-bold text-white">Live Uplink</p>
              <p class="text-xs text-gray-400">Sub-100ms global node synchronization.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Block 3: Zero-Ambiguity Auditing -->
      <div class="mechanics-block grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div class="mechanic-img-wrapper relative h-[450px] rounded-3xl overflow-hidden border border-white/10 group opacity-0 translate-x-[-2rem]">
          <img src="https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=2034" alt="Cryptographic Security" class="mechanic-img absolute inset-0 w-full h-[120%] object-cover mix-blend-luminosity opacity-70 group-hover:opacity-90 transition-opacity duration-700">
          <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none"></div>
          <div class="absolute bottom-6 left-6 right-6 p-4 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 flex items-center gap-4">
            <Icon name="ph:fingerprint-simple-bold" class="w-8 h-8 text-candy-orange" />
            <div>
              <p class="text-sm font-bold text-white">Immutable Ledger</p>
              <p class="text-xs text-gray-400">Zero-ambiguity chain of custody verified.</p>
            </div>
          </div>
        </div>
        <div class="mechanic-content px-4">
          <p class="mechanic-text opacity-0 translate-y-4 font-dashboard text-xs font-bold uppercase tracking-[0.24em] text-candy-orange mb-4">Phase 03</p>
          <h3 class="mechanic-text opacity-0 translate-y-4 font-primary text-4xl font-extrabold text-white mb-6">Zero-Ambiguity Auditing.</h3>
          <p class="mechanic-text opacity-0 translate-y-4 font-dashboard text-base leading-relaxed text-gray-400 mb-6">
            Trust is not assumed; it is cryptographically verified. Every physical scan captures the exact GPS coordinates, a precise timestamp, and the authenticated identity of the employee handling the packet.
          </p>
          <p class="mechanic-text opacity-0 translate-y-4 font-dashboard text-base leading-relaxed text-gray-400">
            This data is written to an immutable ledger, generating the Zero-Ambiguity Audit Log. Once a checkpoint is cleared, the record is permanently locked, ensuring absolute accountability until the document reaches its final destination.
          </p>
        </div>
      </div>

    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { gsap } from 'gsap'

type AuditStatus = 'CLEARED' | 'ACTIVE' | 'PENDING'

definePageMeta({ layout: 'default' })

useHead({
  title: 'Document Tracking & Telemetry - FlowVision',
  meta: [{ name: 'description', content: 'Track documents through live FlowVision node telemetry and cryptographic audit checkpoints.' }],
})

let ctx: gsap.Context

const trackingQuery = ref('')
// For the demo, we'll auto-search after a short delay
const hasSearched = ref(false)

const nodeMap = [
  { label: 'Office A', code: 'INTAKE NODE', detail: 'Packet registered and identity-bound at origin.' },
  { label: 'HUB', code: 'MESH CORE', detail: 'Route verified with active SLA telemetry.' },
  { label: 'Office B', code: 'DESTINATION', detail: 'Awaiting final receiving checkpoint.' },
] as const

const telemetryMetrics = [
  { label: 'Latency', value: '82ms' },
  { label: 'Transit', value: '14m' },
  { label: 'Route Health', value: 'Optimal' },
  { label: 'SLA Risk', value: 'Low' },
] as const

const auditLog = [
  { title: 'Intake Registry', status: 'CLEARED' as AuditStatus, binding: 'Binding 0x8F2A-441C-90E1', gps: '10.5333 N, 122.8333 E', time: '09:12 SGT' },
  { title: 'Courier Handoff', status: 'ACTIVE' as AuditStatus, binding: 'Binding 0x2C90-7A0F-1D77', gps: '10.5379 N, 122.8381 E', time: '10:38 SGT' },
  { title: 'Final Drop-off', status: 'PENDING' as AuditStatus, binding: 'Awaiting cryptographic seal', gps: '10.5415 N, 122.8420 E', time: 'Pending' },
] as const

const statusRingClass = (status: AuditStatus) => ({
  CLEARED: 'bg-emerald-500',
  ACTIVE: 'bg-candy-orange shadow-[0_0_15px_rgba(244,125,47,0.7)]',
  PENDING: 'bg-white/20',
}[status])

const statusBadgeClass = (status: AuditStatus) => ({
  CLEARED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  ACTIVE: 'bg-candy-orange text-white border-candy-orange shadow-[0_0_10px_rgba(244,125,47,0.3)]',
  PENDING: 'bg-transparent text-gray-400 border-white/10',
}[status])

const simulateTracking = async () => {
  if (hasSearched.value) return 
  
  if (!trackingQuery.value) trackingQuery.value = 'PKG-0x8F2A'
  
  hasSearched.value = true
  
  await nextTick()
  
  ctx.add(() => {
    const dashTl = gsap.timeline({ defaults: { ease: 'power3.out' } })
    
    gsap.to('.search-form', { y: 0, duration: 0.8, ease: 'power3.out' })
    
    dashTl
      .to('.telemetry-panel', { opacity: 1, duration: 0.8 }, 0)
      .to('.audit-panel', { opacity: 1, x: 0, duration: 0.8 }, 0.2)
      .fromTo('.timeline-progress', 
        { scaleX: 0, transformOrigin: 'left center' }, 
        { scaleX: 1, duration: 1.5, ease: 'power2.inOut' }, 
        0.4
      )
      .to('.node-item', { opacity: 1, y: 0, stagger: 0.3, duration: 0.6 }, 0.5)
      .to('.telemetry-metric-card', { opacity: 1, stagger: 0.1, duration: 0.5 }, 1)
      .to('.audit-item', { opacity: 1, x: 0, stagger: 0.2, duration: 0.6 }, 0.8)
      
    // Set up ScrollTrigger for the advanced mechanics blocks
    gsap.utils.toArray('.mechanics-block').forEach((block: any) => {
      // 1. Reveal Animation for the image wrapper
      gsap.to(block.querySelector('.mechanic-img-wrapper'), {
        scrollTrigger: {
          trigger: block,
          start: 'top 85%',
        },
        opacity: 1,
        x: 0,
        duration: 1,
        ease: 'power3.out'
      })

      // 2. Parallax effect for the image itself inside the wrapper
      gsap.to(block.querySelector('.mechanic-img'), {
        scrollTrigger: {
          trigger: block,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true
        },
        yPercent: -20, // Moves up slightly as you scroll down
        ease: 'none'
      })

      // 3. Staggered reveal for the text content
      gsap.to(block.querySelectorAll('.mechanic-text'), {
        scrollTrigger: {
          trigger: block,
          start: 'top 80%',
        },
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: 'power3.out'
      })
    })
  })
}

onMounted(() => {
  
  ctx = gsap.context(() => {
    const heroTl = gsap.timeline({ defaults: { ease: 'power4.out', duration: 1.2 } })
    heroTl
      .to('.search-hero-eyebrow', { opacity: 1, y: 0 }, 0.1)
      .to('.search-hero-title', { opacity: 1, y: 0 }, 0.3)
      .to('.search-form', { opacity: 1, y: 0 }, 0.5)
  })
  
  setTimeout(() => {
    simulateTracking()
  }, 1200)
})

onUnmounted(() => {
  if (ctx) ctx.revert()
})
</script>

<style scoped>
.animate-spin-slow {
  animation: spin 4s linear infinite;
}
</style>
