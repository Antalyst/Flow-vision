<template>
  <div class="relative min-h-screen overflow-x-hidden text-flow-ink selection:bg-flow-signal/30">

    <!-- Abstract Background Element -->
    <div class="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,106,42,0.1),transparent_60%)]" />

    <!-- Hero Search Section -->
    <section class="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-6 pb-16 pt-32 text-center">
      <div class="search-hero-eyebrow mb-6 inline-flex translate-y-4 items-center gap-2 rounded-full border border-flow-signal/40 bg-flow-signal/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-flow-signal opacity-0 backdrop-blur-md">
        <Icon name="ph:radar-fill" class="animate-spin-slow h-4 w-4" />
        Live Tracking
      </div>

      <h1 class="search-hero-title mb-12 translate-y-8 font-primary text-5xl font-extrabold tracking-tight text-flow-ink opacity-0 md:text-7xl">
        Track Any <span class="text-flow-signal">Document.</span>
      </h1>

      <form class="search-form group relative w-full max-w-3xl translate-y-8 opacity-0" @submit.prevent="simulateTracking">
        <label for="document-search" class="sr-only">Track document</label>

        <div class="relative flex items-center gap-4 rounded-full border border-flow-muted/20 bg-flow-void p-2 shadow-xl transition-all duration-300 focus-within:border-flow-signal/50">
          <Icon name="ph:magnifying-glass-bold" class="ml-6 h-6 w-6 text-flow-muted" />
          <input
            id="document-search"
            v-model="trackingQuery"
            type="search"
            placeholder="Document ID, QR code, or reference number..."
            class="min-w-0 flex-1 bg-transparent px-2 py-4 text-lg text-flow-ink outline-none placeholder:text-flow-muted"
          >
          <button
            type="submit"
            class="flex items-center gap-2 rounded-full bg-flow-signal px-8 py-4 text-sm font-bold text-flow-void transition-all hover:bg-flow-signal/85 active:scale-[0.98]"
          >
            Track <Icon name="ph:arrow-right-bold" class="h-4 w-4" />
          </button>
        </div>
      </form>
    </section>

    <!-- Telemetry Dashboard -->
    <main v-show="hasSearched" class="dashboard-wrapper relative z-10 mx-auto grid max-w-[1200px] grid-cols-1 gap-8 px-6 pb-32 lg:grid-cols-12">

      <!-- Left Column: Live Node Map -->
      <section class="telemetry-panel relative overflow-hidden rounded-3xl border border-flow-muted/15 bg-flow-void p-8 opacity-0 lg:col-span-7">
        <div class="relative z-10 mb-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.24em] text-flow-signal">
              Live Routing Map
            </p>
            <h2 class="mt-3 font-primary text-3xl font-bold tracking-tight text-flow-ink">
              Office A <span class="px-2 text-flow-signal">→</span> HUB <span class="px-2 text-flow-signal">→</span> Office B
            </h2>
          </div>
          <div class="flex flex-wrap gap-4">
            <div
              v-for="metric in telemetryMetrics"
              :key="metric.label"
              class="telemetry-metric-card rounded-xl border border-flow-muted/15 bg-flow-void px-4 py-2 opacity-0"
            >
              <p class="text-[12px] font-bold uppercase tracking-widest text-flow-muted">
                {{ metric.label }}
              </p>
              <p class="mt-1 text-lg font-bold leading-none text-flow-signal">
                {{ metric.value }}
              </p>
            </div>
          </div>
        </div>

        <!-- Node Map visual -->
        <div class="group relative mb-4 mt-8 overflow-hidden rounded-3xl border border-flow-muted/15">
          <div class="relative h-[280px] w-full">
            <FlowVisionScene initial-state="monitor" />
          </div>
          <div class="pointer-events-none absolute inset-0 bg-gradient-to-t from-flow-void via-flow-void/40 to-transparent" />

          <!-- Explanation Overlay -->
          <div class="relative z-10 p-8 pb-4">
            <div class="max-w-lg rounded-2xl border border-flow-muted/15 bg-flow-void/80 p-6 backdrop-blur-md">
              <div class="mb-3 flex items-center justify-between gap-3">
                <div class="flex items-center gap-3">
                  <div class="h-2 w-2 rounded-full bg-flow-signal animate-pulse" />
                  <p class="text-xs font-bold uppercase tracking-[0.24em] text-flow-signal">Live Status</p>
                </div>
                <span class="rounded-full border border-flow-muted/20 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-flow-muted">Example data</span>
              </div>
              <p class="text-sm leading-relaxed text-flow-muted">
                This document is on its way. It was last confirmed at the HUB checkpoint, with an
                estimated arrival at Office B in about 14 minutes.
              </p>
            </div>
          </div>

          <!-- Timeline Node Map -->
          <div class="relative overflow-hidden p-8 pt-12">
            <div class="absolute left-[15%] right-[15%] top-[4.2rem] z-0 h-[2px] rounded-full bg-flow-muted/15" />
            <div class="timeline-progress absolute left-[15%] top-[4.2rem] z-0 h-[2px] w-[50%] rounded-full bg-flow-signal" />

            <div class="relative z-10 grid grid-cols-3">
              <div v-for="(node, index) in nodeMap" :key="node.label" class="node-item flex translate-y-4 flex-col items-center text-center opacity-0">
                <div class="relative mb-8 flex h-12 w-12 items-center justify-center">
                  <div v-if="index === 1" class="absolute inset-0 rounded-full bg-flow-signal animate-ping opacity-40" />
                  <div
                    class="relative h-4 w-4 rounded-full transition-all duration-300"
                    :class="index <= 1 ? 'bg-flow-signal ring-4 ring-flow-signal/20' : 'bg-flow-muted/30'"
                  />
                </div>

                <h3 class="mb-2 font-primary text-lg font-bold text-flow-ink">
                  {{ node.label }}
                </h3>
                <p class="mb-3 inline-flex items-center font-mono text-[13px] font-bold text-flow-signal">
                  <Icon name="ph:hash-bold" class="mr-1" />{{ node.code }}
                </p>
                <p class="max-w-[180px] text-xs font-medium leading-relaxed text-flow-muted">
                  {{ node.detail }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Right Column: Activity Log -->
      <aside class="audit-panel relative flex translate-x-8 flex-col overflow-hidden rounded-3xl border border-flow-muted/15 bg-flow-void p-8 opacity-0 lg:col-span-5">
        <div class="relative z-10 mb-8 flex items-center gap-4">
          <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-flow-muted/15">
            <Icon name="ph:list-checks-fill" class="h-7 w-7 text-flow-signal" />
          </div>
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.24em] text-flow-signal">
              Activity Log
            </p>
            <h2 class="mt-1 font-primary text-2xl font-bold tracking-tight text-flow-ink">
              Checkpoint History
            </h2>
          </div>
        </div>
        <p class="relative z-10 mb-8 max-w-md text-sm leading-relaxed text-flow-muted">
          Every scan is timestamped and locked in permanently, so there's a complete, trustworthy
          record of where this document has been.
        </p>

        <ol class="relative ml-2 flex-1 space-y-6 border-l border-flow-muted/15 pb-4">
          <li
            v-for="event in auditLog"
            :key="event.title"
            class="audit-item group relative translate-x-4 cursor-default pl-6 opacity-0"
          >
            <span
              class="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full transition-colors duration-300"
              :class="event.status === 'ACTIVE' ? 'bg-flow-signal' : event.status === 'SECURED' ? 'bg-flow-muted/60' : 'bg-flow-muted/30'"
            >
              <span v-if="event.status === 'ACTIVE'" class="absolute -inset-2 rounded-full border border-flow-signal animate-ping opacity-60" />
            </span>

            <article class="flex flex-col gap-2 rounded-xl border border-transparent p-4 transition-all duration-300 hover:border-flow-muted/15 hover:bg-flow-void">
              <div class="flex items-center justify-between gap-4">
                <h3 class="font-primary text-sm font-bold text-flow-ink transition-colors group-hover:text-flow-signal">
                  {{ event.title }}
                </h3>
                <span class="font-mono text-[12px] font-bold uppercase tracking-widest" :class="event.status === 'ACTIVE' ? 'text-flow-signal' : 'text-flow-muted'">
                  [{{ event.status }}]
                </span>
              </div>

              <div class="mt-1 flex flex-col gap-1 font-mono text-[13px] text-flow-muted">
                <div class="flex items-center justify-between">
                  <span>Reference:</span>
                  <span class="text-flow-ink/70">{{ event.binding }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span>Location:</span>
                  <span class="text-flow-signal/80">{{ event.gps }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span>Time:</span>
                  <span class="text-flow-ink">{{ event.time }}</span>
                </div>
              </div>
            </article>
          </li>
        </ol>
      </aside>
    </main>

    <!-- Detailed Tracking Mechanics Section -->
    <section v-show="hasSearched" class="relative z-10 mx-auto flex max-w-[1200px] flex-col gap-32 px-6 pb-32">

      <!-- Block 1: From paper to digital -->
      <div class="mechanics-block grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
        <div class="mechanic-img-wrapper relative flex h-[360px] translate-x-[-2rem] items-center justify-center overflow-hidden rounded-3xl border border-flow-muted/15 opacity-0">
          <Icon name="ph:qr-code-bold" class="mechanic-img h-24 w-24 text-flow-signal/70" />
        </div>
        <div class="mechanic-content px-4">
          <p class="mechanic-text mb-4 translate-y-4 text-xs font-bold uppercase tracking-[0.24em] text-flow-signal opacity-0">Phase 01</p>
          <h3 class="mechanic-text mb-6 translate-y-4 font-primary text-4xl font-extrabold text-flow-ink opacity-0">From Paper to Digital</h3>
          <p class="mechanic-text mb-6 translate-y-4 text-base leading-relaxed text-flow-muted opacity-0">
            The moment a document arrives, FlowVision prints or attaches a QR code that links it
            to its digital record.
          </p>
          <p class="mechanic-text translate-y-4 text-base leading-relaxed text-flow-muted opacity-0">
            That code keeps the physical document and its digital status perfectly in sync,
            wherever it goes.
          </p>
        </div>
      </div>

      <!-- Block 2: Scanned at every step -->
      <div class="mechanics-block grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
        <div class="mechanic-content order-2 px-4 lg:order-1">
          <p class="mechanic-text mb-4 translate-y-4 text-xs font-bold uppercase tracking-[0.24em] text-flow-signal opacity-0">Phase 02</p>
          <h3 class="mechanic-text mb-6 translate-y-4 font-primary text-4xl font-extrabold text-flow-ink opacity-0">Scanned at Every Step</h3>
          <p class="mechanic-text mb-6 translate-y-4 text-base leading-relaxed text-flow-muted opacity-0">
            As a document moves between offices, staff scan it at every handoff.
          </p>
          <p class="mechanic-text translate-y-4 text-base leading-relaxed text-flow-muted opacity-0">
            Each scan updates its status instantly, so the map above always reflects where it
            really is.
          </p>
        </div>
        <div class="mechanic-img-wrapper relative order-1 flex h-[360px] translate-x-[2rem] items-center justify-center overflow-hidden rounded-3xl border border-flow-muted/15 opacity-0 lg:order-2">
          <Icon name="ph:broadcast-bold" class="mechanic-img h-24 w-24 text-flow-signal/70" />
        </div>
      </div>

      <!-- Block 3: A clear audit trail -->
      <div class="mechanics-block grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
        <div class="mechanic-img-wrapper relative flex h-[360px] translate-x-[-2rem] items-center justify-center overflow-hidden rounded-3xl border border-flow-muted/15 opacity-0">
          <Icon name="ph:fingerprint-simple-bold" class="mechanic-img h-24 w-24 text-flow-signal/70" />
        </div>
        <div class="mechanic-content px-4">
          <p class="mechanic-text mb-4 translate-y-4 text-xs font-bold uppercase tracking-[0.24em] text-flow-signal opacity-0">Phase 03</p>
          <h3 class="mechanic-text mb-6 translate-y-4 font-primary text-4xl font-extrabold text-flow-ink opacity-0">A Clear Audit Trail</h3>
          <p class="mechanic-text mb-6 translate-y-4 text-base leading-relaxed text-flow-muted opacity-0">
            Every scan records the location, time, and staff member responsible.
          </p>
          <p class="mechanic-text translate-y-4 text-base leading-relaxed text-flow-muted opacity-0">
            That record is locked in permanently, giving you a complete, trustworthy history from
            start to finish.
          </p>
        </div>
      </div>

    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { gsap } from 'gsap'
import FlowVisionScene from '~/components/landing/scene/FlowVisionScene.vue'

type AuditStatus = 'CLEARED' | 'ACTIVE' | 'PENDING'

definePageMeta({ layout: 'default' })

useHead({
  title: 'Document Tracking - FlowVision',
  meta: [{ name: 'description', content: 'Track any document through FlowVision\'s live routing map and checkpoint history.' }],
})

let ctx: gsap.Context

const trackingQuery = ref('')
// For the demo, we'll auto-search after a short delay
const hasSearched = ref(false)

const nodeMap = [
  { label: 'Office A', code: 'INTAKE', detail: 'Document registered at origin.' },
  { label: 'HUB', code: 'IN TRANSIT', detail: 'Confirmed on route, on schedule.' },
  { label: 'Office B', code: 'DESTINATION', detail: 'Awaiting final checkpoint.' },
] as const

const telemetryMetrics = [
  { label: 'Latency', value: '82ms' },
  { label: 'Transit', value: '14m' },
  { label: 'Route Health', value: 'Optimal' },
  { label: 'SLA Risk', value: 'Low' },
] as const

const auditLog = [
  { title: 'Intake Registered', status: 'CLEARED' as AuditStatus, binding: 'REF-8F2A-441C', gps: '10.5333 N, 122.8333 E', time: '09:12 SGT' },
  { title: 'Courier Handoff', status: 'ACTIVE' as AuditStatus, binding: 'REF-2C90-7A0F', gps: '10.5379 N, 122.8381 E', time: '10:38 SGT' },
  { title: 'Final Drop-off', status: 'PENDING' as AuditStatus, binding: 'Awaiting confirmation', gps: '10.5415 N, 122.8420 E', time: 'Pending' },
] as const

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

      // 2. Staggered reveal for the text content
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
