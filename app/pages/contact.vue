<template>
  <div class="min-h-screen bg-transparent text-onyx-black dark:text-white-pure">
    <section class="mx-auto max-w-7xl px-6 pb-10 pt-24">
      <div class="max-w-3xl">
        <p class="font-dashboard text-xs font-bold uppercase tracking-[0.24em] text-candy-orange">
          NODE TERMINAL SUPPORT
        </p>
        <h1 class="mt-4 font-primary text-4xl font-extrabold tracking-tight md:text-6xl">
          Establish Node Connection
        </h1>
        <p class="mt-5 font-dashboard text-sm leading-7 text-white-muted md:text-base">
          Reach systems deployment and support engineers through a secure intake panel built for live operational response.
        </p>
      </div>
    </section>

    <section class="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-6 pb-24 lg:grid-cols-12">
      <section class="rounded-card border bg-white/60 p-6 backdrop-blur-md transition-all duration-300 hover:shadow-card-hover dark:border-onyx-border dark:bg-onyx-card/40 lg:col-span-7 md:p-8">
        <div class="mb-8 flex items-start justify-between gap-4">
          <div>
            <p class="font-dashboard text-xs font-bold uppercase tracking-[0.24em] text-candy-orange">
              Secure Intake Terminal
            </p>
            <h2 class="mt-2 font-primary text-2xl font-bold tracking-tight dark:text-white-pure">
              Message Protocol
            </h2>
          </div>
          <span class="rounded-full bg-candy-orange/10 px-4 py-2 font-dashboard text-[10px] font-bold uppercase tracking-[0.18em] text-candy-orange">
            Online
          </span>
        </div>

        <form class="grid grid-cols-1 gap-5 md:grid-cols-2" @submit.prevent>
          <label class="flex flex-col gap-2">
            <span class="font-dashboard text-xs font-bold uppercase tracking-widest text-white-muted">Name</span>
            <input
              type="text"
              name="name"
              autocomplete="name"
              placeholder="Operator name"
              class="bg-neutral-950/20 dark:bg-onyx-black/30 border border-neutral-200/80 dark:border-onyx-border rounded-card p-4 font-dashboard text-sm outline-none transition placeholder:text-white-muted focus:border-candy-orange"
            >
          </label>

          <label class="flex flex-col gap-2">
            <span class="font-dashboard text-xs font-bold uppercase tracking-widest text-white-muted">Agency Email</span>
            <input
              type="email"
              name="email"
              autocomplete="email"
              placeholder="unit@agency.gov"
              class="bg-neutral-950/20 dark:bg-onyx-black/30 border border-neutral-200/80 dark:border-onyx-border rounded-card p-4 font-dashboard text-sm outline-none transition placeholder:text-white-muted focus:border-candy-orange"
            >
          </label>

          <label class="flex flex-col gap-2 md:col-span-2">
            <span class="font-dashboard text-xs font-bold uppercase tracking-widest text-white-muted">Node ID</span>
            <input
              type="text"
              name="nodeId"
              placeholder="FV-NODE-0000"
              class="bg-neutral-950/20 dark:bg-onyx-black/30 border border-neutral-200/80 dark:border-onyx-border rounded-card p-4 font-dashboard text-sm outline-none transition placeholder:text-white-muted focus:border-candy-orange"
            >
          </label>

          <label class="flex flex-col gap-2 md:col-span-2">
            <span class="font-dashboard text-xs font-bold uppercase tracking-widest text-white-muted">Message</span>
            <textarea
              name="message"
              rows="7"
              placeholder="Describe the deployment request, incident signal, or support requirement."
              class="bg-neutral-950/20 dark:bg-onyx-black/30 border border-neutral-200/80 dark:border-onyx-border rounded-card p-4 font-dashboard text-sm outline-none transition placeholder:text-white-muted focus:border-candy-orange resize-none"
            />
          </label>

          <button
            type="submit"
            class="ml-auto rounded-full bg-candy-orange px-8 py-3.5 font-dashboard text-sm font-bold text-white-pure transition hover:bg-candy-hover md:col-span-2"
          >
            Submit Switch
          </button>
        </form>
      </section>

      <aside class="rounded-card border bg-white/60 p-6 backdrop-blur-md transition-all duration-300 hover:shadow-card-hover dark:border-onyx-border dark:bg-onyx-card/40 lg:col-span-5 md:p-8">
        <p class="font-dashboard text-xs font-bold uppercase tracking-[0.24em] text-candy-orange">
          Support Coordinates
        </p>
        <h2 class="mt-2 font-primary text-2xl font-bold tracking-tight dark:text-white-pure">
          Active Terminal Gateway
        </h2>

        <div class="mt-8 space-y-4">
          <a
            v-for="channel in supportChannels"
            :key="channel.label"
            :href="channel.href"
            class="block rounded-card border border-neutral-200/80 bg-transparent p-5 backdrop-blur-md transition-all duration-300 hover:border-candy-orange hover:shadow-card-hover dark:border-onyx-border"
          >
            <div class="flex items-center gap-3">
              <span class="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_18px_rgba(16,185,129,0.85)] animate-pulse" aria-hidden="true" />
              <p class="font-dashboard text-xs font-bold uppercase tracking-[0.2em] text-white-muted">
                {{ channel.label }}
              </p>
            </div>
            <p class="mt-3 font-primary text-xl font-bold dark:text-white-pure">
              {{ channel.value }}
            </p>
            <p class="mt-2 font-dashboard text-sm leading-6 text-white-muted">
              {{ channel.description }}
            </p>
          </a>
        </div>

        <div class="mt-8 rounded-card border border-candy-orange/30 bg-candy-orange/10 p-5">
          <p class="font-dashboard text-[10px] font-bold uppercase tracking-[0.2em] text-candy-orange">
            Regional Offices
          </p>
          <p class="mt-3 font-dashboard text-sm leading-7 text-white-muted">
            Primary gateway coordination is routed through Bago City, Western Visayas with support coverage for regional office deployment.
          </p>
        </div>
      </aside>
    </section>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

useHead({
  title: 'Node Terminal Support - FlowVision',
  meta: [{ name: 'description', content: 'Contact FlowVision systems deployment and support engineers through the Node Terminal Support intake panel.' }],
})

const supportChannels = [
  {
    label: 'Direct Terminal Call',
    value: '+63 900 000 0000',
    description: 'Immediate support line for live deployment or routing escalation.',
    href: 'tel:+639000000000',
  },
  {
    label: 'Secure Email Gateway',
    value: 'support@flowvision.systems',
    description: 'Structured intake for technical reports, node requests, and incident packets.',
    href: 'mailto:support@flowvision.systems',
  },
  {
    label: 'HQ Coordinates',
    value: 'Bago City, Western Visayas',
    description: 'Regional coordination point for operations, deployment, and terminal support.',
    href: 'https://maps.google.com/?q=Bago%20City%2C%20Western%20Visayas',
  },
] as const
</script>
