<template>
  <div class="min-h-screen bg-transparent text-onyx-black dark:text-white-pure">
    <section class="mx-auto max-w-4xl px-6 pb-12 pt-24 text-center">
      <p class="font-dashboard text-xs font-bold uppercase tracking-[0.24em] text-candy-orange">
        PRICING & NODE LICENSES
      </p>
      <h1 class="mt-4 font-primary text-4xl font-extrabold tracking-tight md:text-6xl">
        Scalable tiers for every routing topology.
      </h1>
      <p class="mx-auto mt-5 max-w-2xl font-dashboard text-sm leading-7 text-white-muted md:text-base">
        Start with a single office deployment, expand into a regional routing mesh, or coordinate enterprise-scale document movement with dedicated edge support.
      </p>
    </section>

    <section class="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-6 pb-24 md:grid-cols-3">
      <article
        v-for="tier in pricingTiers"
        :key="tier.name"
        class="relative flex min-h-full flex-col rounded-card border bg-white/60 p-6 backdrop-blur-md transition-all duration-300 dark:border-onyx-border dark:bg-onyx-card/40 md:p-8"
        :class="tier.featured ? 'border-candy-orange/50 shadow-card-hover hover:shadow-card-hover' : 'border-neutral-200/80 hover:shadow-card-hover'"
      >
        <span
          v-if="tier.featured"
          class="mb-6 w-fit rounded-full bg-candy-orange px-4 py-1.5 font-dashboard text-[13px] font-bold uppercase tracking-[0.18em] text-white-pure"
        >
          Featured Mesh
        </span>

        <p class="font-dashboard text-xs font-bold uppercase tracking-[0.2em] text-white-muted">
          {{ tier.audience }}
        </p>
        <h2 class="mt-3 font-primary text-2xl font-extrabold tracking-tight dark:text-white-pure">
          {{ tier.name }}
        </h2>
        <p class="mt-4 flex-1 font-dashboard text-sm leading-7 text-white-muted">
          {{ tier.description }}
        </p>

        <div class="my-8 border-y border-neutral-200/80 py-7 dark:border-onyx-border">
          <div class="flex items-end gap-2">
            <span class="font-primary text-5xl font-extrabold tracking-tight dark:text-white-pure">
              {{ tier.price }}
            </span>
            <span class="pb-2 font-dashboard text-sm font-semibold text-white-muted">
              {{ tier.unit }}
            </span>
          </div>
        </div>

        <ul class="space-y-4">
          <li
            v-for="feature in tier.features"
            :key="feature"
            class="flex gap-3 font-dashboard text-sm leading-6 text-white-muted"
          >
            <svg class="mt-1 h-4 w-4 shrink-0 text-candy-orange" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3.5 8.2 6.6 11.3 12.8 4.7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <span>{{ feature }}</span>
          </li>
        </ul>

        <button
          type="button"
          class="mt-10 rounded-full px-6 py-3 font-dashboard text-sm font-bold transition active:scale-[0.98]"
          :class="tier.featured
            ? 'bg-candy-orange text-white-pure hover:bg-candy-hover'
            : 'border border-neutral-200/80 bg-transparent text-onyx-black hover:border-candy-orange hover:text-candy-orange dark:border-onyx-border dark:text-white-pure'"
        >
          {{ tier.cta }}
        </button>
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

useHead({
  title: 'Pricing & Node Licenses - FlowVision',
  meta: [{ name: 'description', content: 'Compare FlowVision node licensing tiers for pilot offices, regional meshes, and enterprise routing topologies.' }],
})

const pricingTiers = [
  {
    name: 'Pilot Node',
    audience: 'Independent local offices',
    description: 'Base deployment for teams validating secure document routing in a controlled office environment.',
    price: '$89',
    unit: '/ node',
    cta: 'Start Pilot',
    featured: false,
    features: ['Single node deployment', 'Document intake queue', 'QR checkpoint verification', 'Basic custody timeline', 'Guided onboarding'],
  },
  {
    name: 'Regional Mesh',
    audience: 'Full LGU networks',
    description: 'Multi-node architecture for departments that need live telemetry, resilient routing, and regional visibility.',
    price: '$249',
    unit: '/ node',
    cta: 'Deploy Mesh',
    featured: true,
    features: ['Multi-office routing mesh', 'Live topology dashboard', 'Predictive bottleneck analysis', 'Cryptographic audit ledger', 'Priority support channel'],
  },
  {
    name: 'Enterprise Topology',
    audience: 'Dedicated edge scaling',
    description: 'Infinite routing networks with custom policy controls, data retention, and decentralized infrastructure planning.',
    price: 'Custom',
    unit: '/ annual',
    cta: 'Contact Sales',
    featured: false,
    features: ['Unlimited topology planning', 'Advanced policy verification', 'Dedicated SLA reporting', 'Custom integrations', 'Executive deployment program'],
  },
] as const
</script>
