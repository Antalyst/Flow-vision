<template>
  <div class="min-h-screen bg-transparent text-onyx-black dark:text-white-pure">
    <section class="mx-auto max-w-7xl px-6 pb-12 pt-24">
      <div class="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-end">
        <div class="lg:col-span-7">
          <p class="font-dashboard text-xs font-bold uppercase tracking-[0.24em] text-candy-orange">
            FLOWVISION PLATFORM
          </p>
          <h1 class="mt-4 max-w-3xl font-primary text-4xl font-extrabold tracking-tight md:text-6xl">
            Platform Features
          </h1>
          <p class="mt-3 font-dashboard text-sm font-semibold tracking-wide text-white-muted">
            Decentralized Intelligence. Unified Control.
          </p>
        </div>

        <div class="lg:col-span-5 lg:flex lg:justify-end">
          <p class="max-w-md font-dashboard text-sm leading-7 text-white-muted">
            A modular node architecture where routing, AI inference, and custody verification operate as aligned, observable systems across your network.
          </p>
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-7xl px-6 pb-10">
      <div class="grid grid-cols-1 gap-6 md:grid-cols-3">
        <article
          v-for="feature in aiFeatures"
          :key="feature.title"
          class="group rounded-card border bg-white/60 p-5 backdrop-blur-md transition-all duration-300 hover:shadow-card-hover dark:border-onyx-border dark:bg-onyx-card/40 md:p-6"
        >
          <div class="overflow-hidden rounded-card border border-neutral-200/80 bg-transparent dark:border-onyx-border">
            <img
              :src="feature.image"
              :alt="feature.title"
              class="h-56 w-full object-cover opacity-90 transition duration-500 group-hover:scale-105 group-hover:opacity-100"
            >
          </div>
          <h2 class="mt-7 font-primary text-2xl font-bold tracking-tight dark:text-white-pure">
            {{ feature.title }}
          </h2>
          <p class="mt-4 font-dashboard text-sm leading-7 text-white-muted">
            {{ feature.description }}
          </p>
          <div class="mt-6 flex flex-wrap gap-2">
            <span
              v-for="tag in feature.tags"
              :key="tag"
              class="rounded-full bg-candy-orange/10 px-3 py-1 font-dashboard text-[11px] font-bold uppercase tracking-wide text-candy-orange"
            >
              {{ tag }}
            </span>
          </div>
        </article>
      </div>
    </section>

    <section class="mx-auto max-w-7xl px-6 py-8">
      <article class="grid grid-cols-1 gap-8 rounded-card border bg-white/60 p-6 backdrop-blur-md transition-all duration-300 hover:shadow-card-hover dark:border-onyx-border dark:bg-onyx-card/40 lg:grid-cols-12 lg:p-8">
        <div class="lg:col-span-7">
          <p class="font-dashboard text-xs font-bold uppercase tracking-[0.24em] text-candy-orange">
            Query Intelligence
          </p>
          <h2 class="mt-4 font-primary text-3xl font-extrabold tracking-tight md:text-4xl dark:text-white-pure">
            Natural Language Query (NLQ)
          </h2>
          <p class="mt-5 max-w-2xl font-dashboard text-sm leading-7 text-white-muted">
            Convert plain-language operational questions into structured reports, analytics summaries, and printable intelligence without exposing staff to SQL or configuration friction.
          </p>

          <div class="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div
              v-for="item in nlqFeatures"
              :key="item.title"
              class="border-l border-candy-orange pl-4"
            >
              <h3 class="font-primary text-base font-bold dark:text-white-pure">
                {{ item.title }}
              </h3>
              <p class="mt-2 font-dashboard text-xs leading-6 text-white-muted">
                {{ item.description }}
              </p>
            </div>
          </div>
        </div>

        <div class="lg:col-span-5">
          <div class="h-full overflow-hidden rounded-card border border-neutral-200/80 bg-transparent dark:border-onyx-border">
            <img
              src="/bg/Hero/section-two/Natural Language Query.png"
              alt="Natural Language Query interface"
              class="h-full min-h-[300px] w-full object-cover"
            >
          </div>
        </div>
      </article>
    </section>

    <section class="mx-auto max-w-7xl px-6 py-16">
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <article
          v-for="group in infrastructureGroups"
          :key="group.title"
          class="rounded-card border bg-white/60 p-6 backdrop-blur-md transition-all duration-300 hover:shadow-card-hover dark:border-onyx-border dark:bg-onyx-card/40 md:p-8"
        >
          <p class="font-dashboard text-xs font-bold uppercase tracking-[0.24em] text-candy-orange">
            {{ group.eyebrow }}
          </p>
          <h2 class="mt-3 font-primary text-2xl font-extrabold tracking-tight dark:text-white-pure">
            {{ group.title }}
          </h2>
          <div class="mt-8 divide-y divide-neutral-200/80 dark:divide-onyx-border">
            <div
              v-for="item in group.items"
              :key="item.title"
              class="py-5 first:pt-0 last:pb-0"
            >
              <h3 class="font-primary text-lg font-bold dark:text-white-pure">
                {{ item.title }}
              </h3>
              <p class="mt-2 font-dashboard text-sm leading-7 text-white-muted">
                {{ item.description }}
              </p>
            </div>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

useHead({
  title: 'Platform Features - FlowVision',
  meta: [
    {
      name: 'description',
      content: 'Explore FlowVision platform features for smart summarization, predictive bottleneck analysis, contextual discovery, and deterministic routing infrastructure.',
    },
  ],
})

const aiFeatures = [
  {
    title: 'Smart Summarization',
    description: 'Generate non-sensitive overviews of lengthy document packets so operators can understand context without parsing every page.',
    tags: ['AI Review', 'Privacy-First'],
    image: '/bg/Hero/section-two/smart  sumarization.png',
  },
  {
    title: 'Predictive Bottleneck Analysis',
    description: 'Forecast approval durations, identify likely delays, and rebalance office workloads before service-level risk escalates.',
    tags: ['Forecasting', 'SLA Signals'],
    image: '/bg/Hero/section-two/predective.png',
  },
  {
    title: 'Contextual Document Discovery',
    description: 'Retrieve the right record by describing intent in natural language, using semantic understanding instead of brittle keyword searches.',
    tags: ['Semantic Search', 'Discovery'],
    image: '/bg/Hero/section-two/Contextual Document DiscoveryDescription.png',
  },
] as const

const nlqFeatures = [
  { title: 'Conversational Reporting', description: 'Ask for operational datasets in plain English.' },
  { title: 'Visual Synthesis', description: 'Transform results into readable summaries and reports.' },
  { title: 'Zero-Technical Barrier', description: 'Give non-technical teams advanced query access.' },
] as const

const infrastructureGroups = [
  {
    eyebrow: 'Core Layer',
    title: 'Core Layer & Infrastructure',
    items: [
      { title: 'Unified Routing Mesh', description: 'Move documents through a deterministic graph of local offices with live telemetry at every handoff.' },
      { title: 'Real-Time Network Topology', description: 'View the office network framework, current node load, and systemic bottlenecks from a single operational surface.' },
    ],
  },
  {
    eyebrow: 'Custody Layer',
    title: 'Verification & Chain of Custody',
    items: [
      { title: 'Smart QR Checkpoints', description: 'Bind physical scans to intake, transit, official handoff, and final drop-off events.' },
      { title: 'Zero-Ambiguity Auditing', description: 'Connect courier identity, office coordinates, timestamps, and active record state into one trusted custody timeline.' },
    ],
  },
] as const
</script>
