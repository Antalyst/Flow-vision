<template>
  <div class="min-h-screen overflow-hidden bg-flow-void text-flow-ink selection:bg-flow-signal/30">

    <!-- Hero -->
    <section class="hero-section relative flex min-h-[90vh] items-center overflow-hidden px-6 pt-24">
      <div class="absolute inset-0 -z-10">
        <div class="hero-bg-img absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,106,42,0.12),transparent_60%)]" />
      </div>

      <div class="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center text-center">
        <div class="hero-eyebrow inline-flex translate-y-4 items-center gap-2 rounded-full border border-flow-signal/30 bg-flow-signal/5 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-flow-signal opacity-0 backdrop-blur-md">
          <span class="h-1.5 w-1.5 rounded-full bg-flow-signal animate-pulse" />
          Everything in one platform
        </div>

        <h1 class="hero-title mt-8 max-w-5xl translate-y-8 font-primary text-5xl font-extrabold leading-[1.05] tracking-tight opacity-0 md:text-7xl lg:text-[6rem]">
          One system for every
          <br class="hidden md:block">
          document, <span class="text-flow-signal">everywhere it goes.</span>
        </h1>

        <p class="hero-desc mt-8 max-w-2xl translate-y-4 text-base leading-relaxed text-flow-muted opacity-0 md:text-lg">
          Workflows, tracking, and AI — all in one place, so you always know where things stand.
        </p>
      </div>
    </section>

    <!-- 1. Workflow -->
    <section class="workflow-section relative mx-auto max-w-7xl border-t border-flow-muted/10 px-6 py-32">
      <div class="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
        <div class="workflow-text translate-x-[-2rem] opacity-0">
          <p class="mb-4 text-xs font-bold uppercase tracking-widest text-flow-signal">
            01 — Workflow
          </p>
          <h2 class="mb-6 font-primary text-4xl font-extrabold tracking-tight md:text-5xl">
            Automatic Workflows
          </h2>
          <p class="mb-8 text-lg leading-relaxed text-flow-muted">
            Move documents through custom stages automatically, matched to how your organization
            actually works.
          </p>

          <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div class="rounded-2xl border border-flow-muted/15 bg-flow-void p-5">
              <Icon name="ph:steps-fill" class="mb-4 h-8 w-8 text-flow-signal" />
              <h3 class="mb-2 font-primary text-lg font-bold">Custom Stages</h3>
              <p class="text-sm text-flow-muted">Set up stages that match your real process.</p>
            </div>
            <div class="rounded-2xl border border-flow-muted/15 bg-flow-void p-5">
              <Icon name="ph:kanban-fill" class="mb-4 h-8 w-8 text-flow-signal" />
              <h3 class="mb-2 font-primary text-lg font-bold">Live Board</h3>
              <p class="text-sm text-flow-muted">See every document's stage at a glance.</p>
            </div>
          </div>
        </div>

        <div class="workflow-img-wrapper relative flex h-[500px] translate-x-[2rem] items-center justify-center rounded-3xl border border-flow-muted/15 bg-flow-void opacity-0">
          <Icon name="ph:kanban-fill" class="workflow-parallax-img h-28 w-28 text-flow-signal/70" />
        </div>
      </div>
    </section>

    <!-- 2. Chain of custody -->
    <section class="custody-section relative overflow-hidden border-t border-flow-muted/10 bg-flow-void py-32">
      <div class="mx-auto mb-16 max-w-7xl px-6 text-center">
        <p class="mb-4 text-xs font-bold uppercase tracking-widest text-flow-signal">
          02 — Chain of Custody
        </p>
        <h2 class="font-primary text-4xl font-extrabold tracking-tight md:text-5xl">
          Know who has what, always.
        </h2>
      </div>

      <div class="mx-auto max-w-7xl px-6">
        <div class="grid grid-cols-1 gap-8 md:grid-cols-3">
          <article class="custody-card group flex translate-y-12 flex-col overflow-hidden rounded-3xl border border-flow-muted/15 bg-flow-void opacity-0">
            <div class="flex h-40 items-center justify-center border-b border-flow-muted/10">
              <Icon name="ph:upload-simple-fill" class="h-14 w-14 text-flow-signal/70" />
            </div>
            <div class="relative flex flex-1 flex-col p-8">
              <div class="absolute -top-6 right-8 flex h-12 w-12 items-center justify-center rounded-full border-4 border-flow-void bg-flow-signal text-xl font-bold text-flow-void shadow-lg">
                1
              </div>
              <h3 class="mb-4 pr-12 font-primary text-2xl font-bold">Client Drop-off</h3>
              <p class="leading-relaxed text-flow-muted">
                Clients submit documents online and can track them from the very first step.
              </p>
            </div>
          </article>

          <article class="custody-card group flex translate-y-12 flex-col overflow-hidden rounded-3xl border border-flow-muted/15 bg-flow-void opacity-0 md:translate-y-8">
            <div class="flex h-40 items-center justify-center border-b border-flow-muted/10">
              <Icon name="ph:scan-fill" class="h-14 w-14 text-flow-signal/70" />
            </div>
            <div class="relative flex flex-1 flex-col p-8">
              <div class="absolute -top-6 right-8 flex h-12 w-12 items-center justify-center rounded-full border-4 border-flow-void bg-flow-signal text-xl font-bold text-flow-void shadow-lg">
                2
              </div>
              <h3 class="mb-4 pr-12 font-primary text-2xl font-bold">Messenger Pickup</h3>
              <p class="leading-relaxed text-flow-muted">
                A quick QR scan confirms who picked it up, and when.
              </p>
            </div>
          </article>

          <article class="custody-card group flex translate-y-12 flex-col overflow-hidden rounded-3xl border border-flow-muted/15 bg-flow-void opacity-0 md:translate-y-16">
            <div class="flex h-40 items-center justify-center border-b border-flow-muted/10">
              <Icon name="ph:qr-code-bold" class="h-14 w-14 text-flow-signal/70" />
            </div>
            <div class="relative flex flex-1 flex-col p-8">
              <div class="absolute -top-6 right-8 flex h-12 w-12 items-center justify-center rounded-full border-4 border-flow-void bg-flow-signal text-xl font-bold text-flow-void shadow-lg">
                3
              </div>
              <h3 class="mb-4 pr-12 font-primary text-2xl font-bold">Office Checkpoints</h3>
              <p class="leading-relaxed text-flow-muted">
                Staff only see and scan documents meant for their own office.
              </p>
            </div>
          </article>
        </div>
      </div>
    </section>

    <!-- 3. AI -->
    <section class="ai-section relative mx-auto max-w-7xl border-t border-flow-muted/10 px-6 py-32">
      <div class="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
        <div class="ai-img-wrapper relative order-last h-[500px] translate-x-[-2rem] overflow-hidden rounded-3xl border border-flow-muted/15 opacity-0 lg:order-first">
          <img
            src="/images/flowvision-ai-core.png"
            alt="FlowVision AI"
            class="absolute inset-0 h-full w-full object-cover"
          >
        </div>

        <div class="ai-text order-first translate-x-[2rem] opacity-0 lg:order-last">
          <p class="mb-4 text-xs font-bold uppercase tracking-widest text-flow-signal">
            03 — Artificial Intelligence
          </p>
          <h2 class="mb-6 font-primary text-4xl font-extrabold tracking-tight md:text-5xl">
            FlowVision Intelligence
          </h2>
          <p class="mb-8 text-lg leading-relaxed text-flow-muted">
            No more digging through long documents. FlowVision reads and understands them for you.
          </p>

          <ul class="space-y-4">
            <li class="flex items-start gap-4">
              <div class="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-flow-signal/10 text-flow-signal">
                <Icon name="ph:sparkle-fill" class="h-3 w-3" />
              </div>
              <div>
                <strong class="block text-sm font-bold text-flow-ink">Smart Summarization</strong>
                <span class="text-sm text-flow-muted">Get a clear overview of any document instantly, without exposing sensitive details.</span>
              </div>
            </li>
            <li class="flex items-start gap-4">
              <div class="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-flow-signal/10 text-flow-signal">
                <Icon name="ph:chat-centered-text-fill" class="h-3 w-3" />
              </div>
              <div>
                <strong class="block text-sm font-bold text-flow-ink">Natural Language Query (NLQ)</strong>
                <span class="text-sm text-flow-muted">Ask a plain-English question and get a real answer from your live data.</span>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- 4. Analytics -->
    <section class="analytics-section relative mx-auto max-w-7xl border-t border-flow-muted/10 px-6 py-32">
      <div class="analytics-header mx-auto mb-16 max-w-3xl translate-y-8 text-center opacity-0">
        <p class="mb-4 text-xs font-bold uppercase tracking-widest text-flow-signal">
          04 — Analytics
        </p>
        <h2 class="mb-6 font-primary text-4xl font-extrabold tracking-tight md:text-5xl">
          See problems before they happen.
        </h2>
        <p class="text-lg leading-relaxed text-flow-muted">
          Spot slow spots before they turn into missed deadlines.
        </p>
      </div>

      <div class="grid grid-cols-1 gap-8 md:grid-cols-2">
        <article class="analytics-card translate-y-12 rounded-3xl border border-flow-muted/15 bg-flow-void p-8 opacity-0">
          <Icon name="ph:shield-warning-fill" class="mb-6 h-10 w-10 text-flow-signal" />
          <h3 class="mb-3 font-primary text-2xl font-bold">On-Time Alerts</h3>
          <p class="leading-relaxed text-flow-muted">
            Get notified automatically if a document is at risk of missing its deadline.
          </p>
        </article>

        <article class="analytics-card translate-y-12 rounded-3xl border border-flow-muted/15 bg-flow-void p-8 opacity-0">
          <Icon name="ph:chart-line-up-fill" class="mb-6 h-10 w-10 text-flow-signal" />
          <h3 class="mb-3 font-primary text-2xl font-bold">Office Busyness</h3>
          <p class="leading-relaxed text-flow-muted">
            See which offices are busiest right now, and route new work accordingly.
          </p>
        </article>
      </div>
    </section>

  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

definePageMeta({ layout: 'default' })

useHead({
  title: 'Platform Features - FlowVision',
  meta: [
    { name: 'description', content: 'Explore FlowVision: document workflows, chain of custody tracking, AI, and analytics in one platform.' }
  ]
})

let ctx: gsap.Context

onMounted(() => {
  gsap.registerPlugin(ScrollTrigger)

  ctx = gsap.context(() => {
    // 1. Hero Entrance Animation
    const heroTl = gsap.timeline({ defaults: { ease: 'power4.out', duration: 1.2 } })
    heroTl
      .to('.hero-eyebrow', { opacity: 1, y: 0 }, 0.2)
      .to('.hero-title', { opacity: 1, y: 0 }, 0.4)
      .to('.hero-desc', { opacity: 1, y: 0 }, 0.6)

    // Hero Background Parallax
    gsap.to('.hero-bg-img', {
      scrollTrigger: {
        trigger: '.hero-section',
        start: 'top top',
        end: 'bottom top',
        scrub: true,
      },
      yPercent: 20,
      ease: 'none'
    })

    // 2. Intelligent Workflows Reveal
    gsap.to('.workflow-text', {
      scrollTrigger: { trigger: '.workflow-section', start: 'top 75%' },
      opacity: 1, x: 0, duration: 1, ease: 'power3.out'
    })
    gsap.to('.workflow-img-wrapper', {
      scrollTrigger: { trigger: '.workflow-section', start: 'top 75%' },
      opacity: 1, x: 0, duration: 1, delay: 0.2, ease: 'power3.out'
    })


    // 3. Chain of Custody vertical cards animation
    gsap.to('.custody-card', {
      scrollTrigger: {
        trigger: '.custody-section',
        start: 'top 75%',
      },
      opacity: 1,
      y: (index, target) => {
        // preserve the md:translate-y stagger we set via Tailwind classes by clearing GSAP y
        // but wait, GSAP y: 0 will override it. Let's just animate opacity and y conditionally
        return 0;
      },
      duration: 1,
      stagger: 0.2,
      ease: 'power3.out',
      clearProps: 'transform' // Let the css classes handle the final staggered resting position
    })

    // 4. AI Section
    gsap.to('.ai-img-wrapper', {
      scrollTrigger: { trigger: '.ai-section', start: 'top 75%' },
      opacity: 1, x: 0, duration: 1, ease: 'power3.out'
    })
    gsap.to('.ai-text', {
      scrollTrigger: { trigger: '.ai-section', start: 'top 75%' },
      opacity: 1, x: 0, duration: 1, delay: 0.2, ease: 'power3.out'
    })

    // 5. Analytics Section
    gsap.to('.analytics-header', {
      scrollTrigger: { trigger: '.analytics-section', start: 'top 85%' },
      opacity: 1, y: 0, duration: 1, ease: 'power3.out'
    })
    gsap.to('.analytics-card', {
      scrollTrigger: { trigger: '.analytics-section', start: 'top 80%' },
      opacity: 1, y: 0, duration: 1, stagger: 0.2, ease: 'power3.out'
    })
  })
})

onUnmounted(() => {
  if (ctx) ctx.revert()
})
</script>
