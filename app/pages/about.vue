<template>
  <div class="min-h-screen bg-transparent text-onyx-black dark:text-white-pure">
    <section class="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-6 pb-16 pt-24 lg:grid-cols-12 lg:items-center">
      <div class="lg:col-span-6">
        <p class="font-dashboard text-xs font-bold uppercase tracking-[0.24em] text-candy-orange">
          ARCHITECTURE & PHILOSOPHY
        </p>
        <h1 class="mt-4 font-primary text-4xl font-extrabold tracking-tight md:text-6xl">
          The operating model behind FlowVision.
        </h1>

        <div class="mt-12 space-y-8">
          <article
            v-for="section in philosophySections"
            :key="section.title"
            class="rounded-card border bg-white/60 p-6 backdrop-blur-md transition-all duration-300 hover:shadow-card-hover dark:border-onyx-border dark:bg-onyx-card/40"
          >
            <h2 class="font-primary text-2xl font-bold tracking-tight dark:text-white-pure">
              {{ section.title }}
            </h2>
            <p class="mt-4 font-dashboard text-sm leading-7 text-white-muted">
              {{ section.copy }}
            </p>
          </article>
        </div>
      </div>

      <div class="lg:col-span-6">
        <div class="relative min-h-[440px] overflow-hidden rounded-card border bg-white/60 p-8 backdrop-blur-md transition-all duration-300 hover:shadow-card-hover dark:border-onyx-border dark:bg-onyx-card/40">
          <div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(244,125,47,0.16),transparent_45%)]" aria-hidden="true" />
          <div class="absolute inset-8 rounded-card border border-dashed border-neutral-200/80 dark:border-onyx-border" aria-hidden="true" />
          <img
            src="/bg/network-topology-transparent.svg"
            alt="FlowVision network schema"
            class="relative z-10 mx-auto mt-10 h-[300px] w-full max-w-[460px] object-contain opacity-90"
          >
          <div class="absolute bottom-8 left-8 right-8 rounded-card border border-neutral-200/80 bg-white/60 p-5 backdrop-blur-md dark:border-onyx-border dark:bg-onyx-black/30">
            <p class="font-dashboard text-[10px] font-bold uppercase tracking-[0.22em] text-candy-orange">
              Route Integrity
            </p>
            <div class="mt-3 flex items-end gap-2">
              <span class="font-primary text-4xl font-extrabold dark:text-white-pure">99.9</span>
              <span class="pb-1 font-dashboard text-sm font-bold text-candy-orange">%</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-7xl px-6 pb-24">
      <div class="grid grid-cols-1 gap-6 md:grid-cols-3">
        <article
          v-for="metric in performanceMetrics"
          :key="metric.title"
          class="rounded-card border bg-white/60 p-6 backdrop-blur-md transition-all duration-300 hover:shadow-card-hover dark:border-onyx-border dark:bg-onyx-card/40 md:p-8"
        >
          <p class="font-dashboard text-xs font-bold uppercase tracking-[0.24em] text-candy-orange">
            {{ metric.value }}
          </p>
          <h3 class="mt-4 font-primary text-2xl font-bold tracking-tight dark:text-white-pure">
            {{ metric.title }}
          </h3>
          <p class="mt-3 font-dashboard text-sm leading-7 text-white-muted">
            {{ metric.description }}
          </p>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

useHead({
  title: 'Architecture & Philosophy - FlowVision',
  meta: [{ name: 'description', content: 'Learn the FlowVision philosophy behind deterministic mesh routing, cryptographic accountability, and physical document telemetry.' }],
})

const philosophySections = [
  {
    title: 'The Vision',
    copy: 'FlowVision treats every physical document as an operational signal. Intake, transfer, queue movement, and completion become visible telemetry that institutions can trust and act on.',
  },
  {
    title: 'Deterministic Mesh Routing',
    copy: 'Documents move through a controlled graph of offices, checkpoints, and actors. Routes are predictable, failovers are explicit, and each node understands its responsibility in the larger network.',
  },
  {
    title: 'Cryptographic Accountability',
    copy: 'Every custody transition is anchored to identity, timestamp, route state, and verification context, producing a secure audit spine with no ambiguous gaps.',
  },
] as const

const performanceMetrics = [
  { value: '99.9%', title: 'SLA Resilience', description: 'Node-aware routing and escalation signals keep handoffs accountable across regional workloads.' },
  { value: '<45s', title: 'Transit Speeds', description: 'Fast checkpoint registration helps teams detect drag before delays become operational failures.' },
  { value: '0.3%', title: 'Error Rates', description: 'Structured verification reduces lost context, incorrect handoffs, and unresolved custody events.' },
] as const
</script>
