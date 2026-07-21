<template>
  <div class="min-h-screen bg-transparent text-onyx-black dark:text-white-pure">
    <section class="mx-auto max-w-7xl px-6 pb-10 pt-24">
      <div class="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-end">
        <div class="lg:col-span-7">
          <p class="font-dashboard text-xs font-bold uppercase tracking-[0.24em] text-candy-orange">
            DOCUMENT TELEMETRY
          </p>
          <h1 class="mt-4 font-primary text-4xl font-extrabold tracking-tight md:text-6xl">
            Document Tracking & Telemetry
          </h1>
        </div>
        <form class="lg:col-span-5" @submit.prevent>
          <label for="document-search" class="sr-only">Track document</label>
          <div class="flex items-center gap-2 rounded-full border border-neutral-200/80 bg-transparent p-2 backdrop-blur-md dark:border-onyx-border">
            <input
              id="document-search"
              v-model="trackingQuery"
              type="search"
              placeholder="Packet ID, QR binding, courier ref"
              class="min-w-0 flex-1 bg-transparent px-4 py-3 font-dashboard text-sm outline-none placeholder:text-white-muted"
            >
            <button
              type="submit"
              class="rounded-full bg-candy-orange px-6 py-3 font-dashboard text-sm font-bold text-white-pure transition hover:bg-candy-hover"
            >
              Track
            </button>
          </div>
        </form>
      </div>
    </section>

    <main class="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-6 pb-24 lg:grid-cols-12">
      <section class="rounded-card border bg-white/60 p-6 backdrop-blur-md transition-all duration-300 hover:shadow-card-hover dark:border-onyx-border dark:bg-onyx-card/40 lg:col-span-7 md:p-8">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p class="font-dashboard text-xs font-bold uppercase tracking-[0.24em] text-candy-orange">
              Live Node Map
            </p>
            <h2 class="mt-2 font-primary text-2xl font-bold tracking-tight dark:text-white-pure">
              Office A -> HUB -> Office B
            </h2>
          </div>
          <div class="flex gap-3 font-dashboard text-xs font-bold text-white-muted">
            <span>Latency: <strong class="text-candy-orange">82ms</strong></span>
            <span>Transit: <strong class="text-candy-orange">14m</strong></span>
          </div>
        </div>

        <div class="mt-10 grid grid-cols-1 items-center gap-6 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
          <template v-for="(node, index) in nodeMap" :key="node.label">
            <div class="rounded-card border border-neutral-200/80 bg-transparent p-6 text-center backdrop-blur-md dark:border-onyx-border">
              <span class="mx-auto block h-3 w-3 rounded-full bg-candy-orange shadow-[0_0_24px_rgba(244,125,47,0.75)]" />
              <h3 class="mt-5 font-primary text-xl font-bold dark:text-white-pure">
                {{ node.label }}
              </h3>
              <p class="mt-2 font-dashboard text-xs uppercase tracking-[0.18em] text-white-muted">
                {{ node.code }}
              </p>
              <p class="mt-5 font-dashboard text-sm leading-6 text-white-muted">
                {{ node.detail }}
              </p>
            </div>
            <div
              v-if="index < nodeMap.length - 1"
              class="hidden h-px w-20 bg-candy-orange/70 shadow-[0_0_24px_rgba(244,125,47,0.7)] md:block"
            />
          </template>
        </div>

        <div class="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div
            v-for="metric in telemetryMetrics"
            :key="metric.label"
            class="rounded-card border border-neutral-200/80 bg-transparent p-4 backdrop-blur-md dark:border-onyx-border"
          >
            <p class="font-dashboard text-[10px] font-bold uppercase tracking-widest text-white-muted">
              {{ metric.label }}
            </p>
            <p class="mt-2 font-dashboard text-lg font-bold text-candy-orange">
              {{ metric.value }}
            </p>
          </div>
        </div>
      </section>

      <aside class="rounded-card border bg-white/60 p-6 backdrop-blur-md transition-all duration-300 hover:shadow-card-hover dark:border-onyx-border dark:bg-onyx-card/40 lg:col-span-5 md:p-8">
        <p class="font-dashboard text-xs font-bold uppercase tracking-[0.24em] text-candy-orange">
          Zero-Ambiguity Audit Log
        </p>
        <h2 class="mt-2 font-primary text-2xl font-bold tracking-tight dark:text-white-pure">
          Cryptographic Checkpoints
        </h2>

        <ol class="mt-8 border-l border-neutral-200/80 dark:border-onyx-border">
          <li
            v-for="event in auditLog"
            :key="event.title"
            class="relative pb-8 pl-8 last:pb-0"
          >
            <span
              class="absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2"
              :class="statusRingClass(event.status)"
            />
            <article class="rounded-card border border-neutral-200/80 bg-transparent p-5 backdrop-blur-md dark:border-onyx-border">
              <div class="flex items-start justify-between gap-4">
                <h3 class="font-primary text-lg font-bold dark:text-white-pure">
                  {{ event.title }}
                </h3>
                <span class="rounded-full px-3 py-1 font-dashboard text-[10px] font-bold uppercase tracking-widest" :class="statusBadgeClass(event.status)">
                  {{ event.status }}
                </span>
              </div>
              <p class="mt-2 font-dashboard text-sm text-white-muted">
                {{ event.binding }}
              </p>
              <dl class="mt-4 space-y-2 font-dashboard text-xs text-white-muted">
                <div class="flex justify-between gap-4">
                  <dt>GPS</dt>
                  <dd class="text-right text-candy-orange">{{ event.gps }}</dd>
                </div>
                <div class="flex justify-between gap-4">
                  <dt>Time</dt>
                  <dd class="text-right">{{ event.time }}</dd>
                </div>
              </dl>
            </article>
          </li>
        </ol>
      </aside>
    </main>
  </div>
</template>

<script setup lang="ts">
type AuditStatus = 'CLEARED' | 'ACTIVE' | 'PENDING'

definePageMeta({ layout: 'default' })

useHead({
  title: 'Document Tracking & Telemetry - FlowVision',
  meta: [{ name: 'description', content: 'Track documents through live FlowVision node telemetry and cryptographic audit checkpoints.' }],
})

const trackingQuery = ref('')

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
  CLEARED: 'border-emerald-500 bg-emerald-500/20',
  ACTIVE: 'border-candy-orange bg-candy-orange/20 shadow-[0_0_22px_rgba(244,125,47,0.7)] animate-pulse',
  PENDING: 'border-neutral-400 bg-transparent',
}[status])

const statusBadgeClass = (status: AuditStatus) => ({
  CLEARED: 'bg-emerald-500/10 text-emerald-500',
  ACTIVE: 'bg-candy-orange text-white-pure',
  PENDING: 'border border-neutral-300 text-white-muted dark:border-onyx-border',
}[status])
</script>
