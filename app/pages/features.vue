<template>
  <div class="min-h-screen bg-transparent text-onyx-black dark:text-white-pure selection:bg-candy-orange/30 overflow-hidden">
    
    <!-- Hero Section with Parallax Image -->
    <section class="hero-section relative min-h-[90vh] flex items-center pt-24 px-6 overflow-hidden">
      <!-- Background Parallax Image -->
      <div class="absolute inset-0 -z-10">
        <img 
          src="https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2069" 
          alt="Modern Architecture" 
          class="hero-bg-img w-full h-[120%] object-cover opacity-20 dark:opacity-30 mix-blend-luminosity"
        >
        <div class="absolute inset-0 bg-gradient-to-b from-transparent via-white/80 to-white dark:from-transparent dark:via-onyx-black/90 dark:to-onyx-black"></div>
      </div>

      <div class="mx-auto w-full max-w-7xl flex flex-col items-center text-center relative z-10">
        <div class="hero-eyebrow opacity-0 translate-y-4 inline-flex items-center gap-2 rounded-full border border-candy-orange/30 bg-candy-orange/5 px-4 py-1.5 font-dashboard text-xs font-bold uppercase tracking-widest text-candy-orange backdrop-blur-md">
          <span class="h-1.5 w-1.5 rounded-full bg-candy-orange animate-pulse"></span>
          The Complete Architecture
        </div>
        
        <h1 class="hero-title mt-8 max-w-5xl font-primary text-5xl font-extrabold tracking-tight md:text-7xl lg:text-[6rem] leading-[1.05] opacity-0 translate-y-8">
          The Nervous System <br class="hidden md:block"/>
          For Your <span class="text-transparent bg-clip-text bg-gradient-to-r from-candy-orange to-amber-500">Logistics.</span>
        </h1>
        
        <p class="hero-desc mt-8 max-w-2xl font-dashboard text-base md:text-lg leading-relaxed text-gray-700 dark:text-gray-300 opacity-0 translate-y-4">
          Unifying Document Workflows, Chain of Custody Telemetry, and Generative AI into a single, observable pane of glass.
        </p>
      </div>
    </section>

    <!-- 1. Intelligent Workflows (Parallax Split Pane) -->
    <section class="workflow-section relative mx-auto max-w-7xl px-6 py-32 border-t border-neutral-200/50 dark:border-white/5">
      <div class="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
        <div class="workflow-text opacity-0 translate-x-[-2rem]">
          <p class="font-dashboard text-xs font-bold uppercase tracking-widest text-candy-orange mb-4">
            01 — Workflow Engine
          </p>
          <h2 class="font-primary text-4xl font-extrabold tracking-tight md:text-5xl mb-6">
            Intelligent Pipeline Automation
          </h2>
          <p class="font-dashboard text-lg leading-relaxed text-gray-600 dark:text-gray-300 mb-8">
            Replace static lists with dynamic organizational stages. Route documents smoothly across your enterprise network.
          </p>
          
          <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div class="p-5 rounded-2xl bg-white/50 dark:bg-white/5 border border-neutral-200/50 dark:border-white/5 backdrop-blur-sm">
              <Icon name="ph:steps-fill" class="h-8 w-8 text-candy-orange mb-4" />
              <h3 class="font-primary font-bold text-lg mb-2">Custom Stages</h3>
              <p class="text-sm text-gray-600 dark:text-gray-400">Map documents to real-world operational phases instantly.</p>
            </div>
            <div class="p-5 rounded-2xl bg-white/50 dark:bg-white/5 border border-neutral-200/50 dark:border-white/5 backdrop-blur-sm">
              <Icon name="ph:kanban-fill" class="h-8 w-8 text-candy-orange mb-4" />
              <h3 class="font-primary font-bold text-lg mb-2">Current Working</h3>
              <p class="text-sm text-gray-600 dark:text-gray-400">Real-time Kanban-style tracking for active document loads.</p>
            </div>
          </div>
        </div>

        <div class="workflow-img-wrapper relative h-[500px] rounded-3xl overflow-hidden border border-neutral-200/50 dark:border-white/10 group opacity-0 translate-x-[2rem]">
          <img 
            src="https://images.unsplash.com/photo-1551434678-e076c223a692?q=80&w=2070" 
            alt="Team Working" 
            class="workflow-parallax-img absolute inset-0 w-full h-[120%] object-cover mix-blend-luminosity transition-all duration-700 group-hover:mix-blend-normal group-hover:scale-105"
          >
          <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none"></div>
        </div>
      </div>
    </section>

    <!-- 2. Chain of Custody (Vertical Staggered Layout) -->
    <section class="custody-section relative py-32 overflow-hidden bg-neutral-100 dark:bg-onyx-card">
      <div class="px-6 mb-16 mx-auto max-w-7xl text-center">
        <p class="font-dashboard text-xs font-bold uppercase tracking-widest text-candy-orange mb-4">
          02 — The Logistics Engine
        </p>
        <h2 class="font-primary text-4xl font-extrabold tracking-tight md:text-5xl">
          Chain of Custody Telemetry
        </h2>
      </div>

      <div class="mx-auto max-w-7xl px-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <!-- Step 1 -->
          <article class="custody-card opacity-0 translate-y-12 flex flex-col rounded-3xl overflow-hidden border border-neutral-200/50 dark:border-white/5 bg-white dark:bg-onyx-black shadow-xl group">
            <div class="h-56 relative overflow-hidden bg-neutral-200 dark:bg-black">
              <img src="https://images.unsplash.com/photo-1580674285054-bed31e145f59?q=80&w=2070" class="w-full h-full object-cover opacity-80 mix-blend-luminosity transition-all duration-700 group-hover:mix-blend-normal group-hover:scale-105">
            </div>
            <div class="p-8 flex-1 flex flex-col relative">
              <div class="absolute -top-6 right-8 flex h-12 w-12 items-center justify-center rounded-full bg-candy-orange text-white font-bold text-xl shadow-lg border-4 border-white dark:border-onyx-black">1</div>
              <h3 class="font-primary text-2xl font-bold mb-4 pr-12">Client Drop-off</h3>
              <p class="font-dashboard text-gray-600 dark:text-gray-400 leading-relaxed">
                Clients securely upload and track the initial dispatch of sensitive documents, linking digital profiles to physical parcels.
              </p>
            </div>
          </article>

          <!-- Step 2 -->
          <article class="custody-card opacity-0 translate-y-12 flex flex-col rounded-3xl overflow-hidden border border-neutral-200/50 dark:border-white/5 bg-white dark:bg-onyx-black shadow-xl group md:translate-y-8">
            <div class="h-56 relative overflow-hidden bg-neutral-200 dark:bg-black">
              <img src="https://images.unsplash.com/photo-1512314889357-e157c22f938d?q=80&w=2071" class="w-full h-full object-cover opacity-80 mix-blend-luminosity transition-all duration-700 group-hover:mix-blend-normal group-hover:scale-105">
            </div>
            <div class="p-8 flex-1 flex flex-col relative">
              <div class="absolute -top-6 right-8 flex h-12 w-12 items-center justify-center rounded-full bg-candy-orange text-white font-bold text-xl shadow-lg border-4 border-white dark:border-onyx-black">2</div>
              <h3 class="font-primary text-2xl font-bold mb-4 pr-12">Messenger Pickup</h3>
              <p class="font-dashboard text-gray-600 dark:text-gray-400 leading-relaxed">
                Messengers use native capacitor-driven QR scanners to take physical custody. Telemetry instantly records GPS, timestamp, and identity.
              </p>
            </div>
          </article>

          <!-- Step 3 -->
          <article class="custody-card opacity-0 translate-y-12 flex flex-col rounded-3xl overflow-hidden border border-neutral-200/50 dark:border-white/5 bg-white dark:bg-onyx-black shadow-xl group md:translate-y-16">
            <div class="h-56 relative overflow-hidden bg-neutral-200 dark:bg-black">
              <div class="absolute inset-0 bg-candy-orange/10 blur-xl z-0 transition-opacity duration-700 group-hover:opacity-100 opacity-50"></div>
              <div class="relative z-10 w-full h-full flex items-center justify-center">
                <Icon name="ph:qr-code-bold" class="w-20 h-20 text-candy-orange/70 transition-transform duration-700 group-hover:scale-110" />
              </div>
            </div>
            <div class="p-8 flex-1 flex flex-col relative">
              <div class="absolute -top-6 right-8 flex h-12 w-12 items-center justify-center rounded-full bg-candy-orange text-white font-bold text-xl shadow-lg border-4 border-white dark:border-onyx-black">3</div>
              <h3 class="font-primary text-2xl font-bold mb-4 pr-12">Office Checkpoints</h3>
              <p class="font-dashboard text-gray-600 dark:text-gray-400 leading-relaxed">
                Role-based boundaries guarantee that Office Employees can only scan and process documents designated for their specific network branches.
              </p>
            </div>
          </article>

        </div>
      </div>
    </section>

    <!-- 3. AI Integration (Custom Asset) -->
    <section class="ai-section relative mx-auto max-w-7xl px-6 py-32 border-b border-neutral-200/50 dark:border-white/5">
      <div class="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
        <!-- Generative AI Image Side -->
        <div class="ai-img-wrapper order-last lg:order-first relative h-[500px] rounded-3xl overflow-hidden group opacity-0 translate-x-[-2rem]">
          <div class="absolute inset-0 bg-candy-orange/10 blur-3xl scale-150"></div>
          <img 
            src="/features/flowvision_ai_core.png" 
            alt="AI Core" 
            class="absolute inset-0 w-full h-full object-cover mix-blend-lighten transition-transform duration-1000 group-hover:scale-110"
          >
          <div class="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-3xl pointer-events-none"></div>
        </div>

        <!-- Text Side -->
        <div class="ai-text order-first lg:order-last opacity-0 translate-x-[2rem]">
          <p class="font-dashboard text-xs font-bold uppercase tracking-widest text-candy-orange mb-4">
            03 — Artificial Intelligence
          </p>
          <h2 class="font-primary text-4xl font-extrabold tracking-tight md:text-5xl mb-6">
            FlowVision Intelligence
          </h2>
          <p class="font-dashboard text-lg leading-relaxed text-gray-600 dark:text-gray-300 mb-8">
            Stop digging through dense document packets. Our embedded AI reads, comprehends, and visualizes complex data using secure RAG retrieval.
          </p>
          
          <ul class="space-y-4">
            <li class="flex items-start gap-4">
              <div class="mt-1 h-6 w-6 flex items-center justify-center rounded-full bg-candy-orange/10 text-candy-orange flex-shrink-0">
                <Icon name="ph:sparkle-fill" class="w-3 h-3" />
              </div>
              <div>
                <strong class="block text-sm font-bold dark:text-white-pure">Smart Summarization</strong>
                <span class="text-sm text-gray-500 dark:text-gray-400">Generate non-sensitive overviews of lengthy packets instantly.</span>
              </div>
            </li>
            <li class="flex items-start gap-4">
              <div class="mt-1 h-6 w-6 flex items-center justify-center rounded-full bg-candy-orange/10 text-candy-orange flex-shrink-0">
                <Icon name="ph:chat-centered-text-fill" class="w-3 h-3" />
              </div>
              <div>
                <strong class="block text-sm font-bold dark:text-white-pure">Natural Language Query (NLQ)</strong>
                <span class="text-sm text-gray-500 dark:text-gray-400">Ask plain-English questions to query your live operational database.</span>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- 4. Analytics & Compliance -->
    <section class="analytics-section relative mx-auto max-w-7xl px-6 py-32">
      <div class="text-center max-w-3xl mx-auto mb-16 analytics-header opacity-0 translate-y-8">
        <p class="font-dashboard text-xs font-bold uppercase tracking-widest text-candy-orange mb-4">
          04 — Observability
        </p>
        <h2 class="font-primary text-4xl font-extrabold tracking-tight md:text-5xl mb-6">
          Analytics & SLA Compliance
        </h2>
        <p class="font-dashboard text-lg leading-relaxed text-gray-600 dark:text-gray-300">
          Identify bottlenecks before they break service-level agreements.
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <article class="analytics-card opacity-0 translate-y-12 p-8 rounded-3xl border bg-white/40 dark:bg-[#0c0c0e]/60 dark:border-white/10 backdrop-blur-md">
          <Icon name="ph:shield-warning-fill" class="w-10 h-10 text-candy-orange mb-6" />
          <h3 class="font-primary text-2xl font-bold mb-3">Live SLA Monitoring</h3>
          <p class="text-gray-600 dark:text-gray-400 leading-relaxed">
            Automatic tracking of time-in-stage ensures documents don't stagnate. Dispatch alerts directly to assigned branches if limits are breached.
          </p>
        </article>
        
        <article class="analytics-card opacity-0 translate-y-12 p-8 rounded-3xl border bg-white/40 dark:bg-[#0c0c0e]/60 dark:border-white/10 backdrop-blur-md">
          <Icon name="ph:chart-line-up-fill" class="w-10 h-10 text-candy-orange mb-6" />
          <h3 class="font-primary text-2xl font-bold mb-3">Workload Heatmaps</h3>
          <p class="text-gray-600 dark:text-gray-400 leading-relaxed">
            Visualize heavy loads across your office network. Rebalance routing intelligently by observing which stations are nearing capacity.
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
  title: 'Comprehensive Platform Features - FlowVision',
  meta: [
    { name: 'description', content: 'Explore the full capabilities of FlowVision: Document Workflows, Chain of Custody, AI, and Analytics.' }
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
    
    // Workflow Parallax
    gsap.to('.workflow-parallax-img', {
      scrollTrigger: { trigger: '.workflow-section', start: 'top bottom', end: 'bottom top', scrub: true },
      yPercent: -15, ease: 'none'
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

<style scoped>
/* Ensure smooth transitions */
.mix-blend-luminosity {
  transition: all 0.7s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
