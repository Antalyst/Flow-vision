<template>
  <div class="min-h-screen bg-onyx-black text-onyx-black dark:text-white-pure selection:bg-candy-orange/30 overflow-x-hidden relative">
    
    <!-- Abstract Ambient Glow -->
    <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] h-[50vh] bg-candy-orange/5 blur-[120px] pointer-events-none z-0"></div>

    <!-- 1. Hero Section -->
    <section class="relative z-10 mx-auto max-w-[1200px] px-6 pt-40 pb-32 flex flex-col items-center text-center">
      <p class="hero-text opacity-0 translate-y-4 font-dashboard text-sm font-bold uppercase tracking-[0.3em] text-candy-orange mb-8">
        Architecture & Philosophy
      </p>
      <h1 class="hero-text opacity-0 translate-y-8 font-primary text-5xl font-extrabold tracking-tight md:text-7xl lg:text-8xl text-white max-w-4xl leading-[1.1]">
        The operating model behind <span class="text-transparent bg-clip-text bg-gradient-to-r from-candy-orange to-amber-500">FlowVision.</span>
      </h1>
      <p class="hero-text opacity-0 translate-y-8 mt-8 font-dashboard text-lg md:text-xl leading-relaxed text-gray-400 max-w-2xl">
        We built FlowVision on a simple premise: physical documents are operational signals. It's time to route them with the same deterministic precision as digital packets.
      </p>
    </section>

    <!-- 2. The Philosophy Pillars (3 Alternating Blocks) -->
    <section class="relative z-10 mx-auto max-w-[1200px] px-6 pb-40 flex flex-col gap-32">
      
      <!-- Pillar 1: The Vision -->
      <div class="pillar-block grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div class="pillar-img-wrapper relative h-[500px] rounded-[2.5rem] overflow-hidden border border-white/10 group opacity-0 translate-x-[-2rem]">
          <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070" alt="Data Analytics" class="pillar-img absolute inset-0 w-full h-[120%] object-cover mix-blend-luminosity opacity-50 group-hover:opacity-80 transition-opacity duration-1000">
          <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
        </div>
        <div class="pillar-content px-4">
          <p class="pillar-text opacity-0 translate-y-4 font-dashboard text-xs font-bold uppercase tracking-[0.24em] text-candy-orange mb-4">Core Philosophy 01</p>
          <h2 class="pillar-text opacity-0 translate-y-4 font-primary text-5xl font-extrabold text-white mb-6">The Vision.</h2>
          <p class="pillar-text opacity-0 translate-y-4 font-dashboard text-lg leading-relaxed text-gray-400 mb-6">
            FlowVision treats every physical document as an operational signal. Intake, transfer, queue movement, and completion become visible telemetry that institutions can trust and act on.
          </p>
          <p class="pillar-text opacity-0 translate-y-4 font-dashboard text-lg leading-relaxed text-gray-400">
            We don't just track paper; we digitize the physical transit space, turning chaotic logistics into a highly structured, queryable data graph.
          </p>
        </div>
      </div>

      <!-- Pillar 2: Mesh Routing (Flipped) -->
      <div class="pillar-block grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div class="pillar-content px-4 order-2 lg:order-1">
          <p class="pillar-text opacity-0 translate-y-4 font-dashboard text-xs font-bold uppercase tracking-[0.24em] text-candy-orange mb-4">Core Philosophy 02</p>
          <h2 class="pillar-text opacity-0 translate-y-4 font-primary text-5xl font-extrabold text-white mb-6">Deterministic Mesh Routing.</h2>
          <p class="pillar-text opacity-0 translate-y-4 font-dashboard text-lg leading-relaxed text-gray-400 mb-6">
            Documents move through a tightly controlled graph of offices, checkpoints, and actors. Routes are perfectly predictable, failovers are explicitly mapped, and each node understands its responsibility in the larger network.
          </p>
          <p class="pillar-text opacity-0 translate-y-4 font-dashboard text-lg leading-relaxed text-gray-400">
            By enforcing rigid routing topologies, we eliminate the black holes where documents traditionally vanish.
          </p>
        </div>
        <div class="pillar-img-wrapper relative h-[500px] rounded-[2.5rem] overflow-hidden border border-white/10 group order-1 lg:order-2 opacity-0 translate-x-[2rem]">
          <img src="https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=2034" alt="Server Mesh" class="pillar-img absolute inset-0 w-full h-[120%] object-cover mix-blend-luminosity opacity-50 group-hover:opacity-80 transition-opacity duration-1000">
          <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
        </div>
      </div>

      <!-- Pillar 3: Cryptographic Accountability -->
      <div class="pillar-block grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div class="pillar-img-wrapper relative h-[500px] rounded-[2.5rem] overflow-hidden border border-white/10 group opacity-0 translate-x-[-2rem]">
          <img src="https://images.unsplash.com/photo-1614064641913-a53b92949432?q=80&w=2070" alt="Cryptographic Security" class="pillar-img absolute inset-0 w-full h-[120%] object-cover mix-blend-luminosity opacity-50 group-hover:opacity-80 transition-opacity duration-1000">
          <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
        </div>
        <div class="pillar-content px-4">
          <p class="pillar-text opacity-0 translate-y-4 font-dashboard text-xs font-bold uppercase tracking-[0.24em] text-candy-orange mb-4">Core Philosophy 03</p>
          <h2 class="pillar-text opacity-0 translate-y-4 font-primary text-5xl font-extrabold text-white mb-6">Cryptographic Accountability.</h2>
          <p class="pillar-text opacity-0 translate-y-4 font-dashboard text-lg leading-relaxed text-gray-400 mb-6">
            Every custody transition is anchored to identity, timestamp, route state, and verification context. This produces a highly secure audit spine with absolutely zero ambiguous gaps.
          </p>
          <p class="pillar-text opacity-0 translate-y-4 font-dashboard text-lg leading-relaxed text-gray-400">
            Trust is never assumed. It is verified, logged, and permanently locked into the tracking ledger.
          </p>
        </div>
      </div>
    </section>

    <!-- 3. Performance Matrix (Image 4 as Background) -->
    <section class="performance-section relative z-10 py-32 border-y border-white/10 overflow-hidden">
      <!-- Background Image -->
      <img src="https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=2074" alt="Global Data Map" class="absolute inset-0 w-full h-full object-cover mix-blend-luminosity opacity-10">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-none"></div>

      <div class="relative z-10 mx-auto max-w-[1200px] px-6">
        <div class="text-center mb-16">
          <h2 class="font-primary text-4xl font-extrabold text-white">The Output Matrix</h2>
          <p class="font-dashboard text-gray-400 mt-4 max-w-xl mx-auto">When the operating model is executed perfectly, the metrics speak for themselves.</p>
        </div>

        <div class="grid grid-cols-1 gap-8 md:grid-cols-3">
          <article
            v-for="(metric, index) in performanceMetrics"
            :key="metric.title"
            class="metric-card opacity-0 translate-y-8 rounded-[2rem] border border-white/10 bg-black/40 p-8 backdrop-blur-xl hover:bg-black/60 transition-colors duration-500 shadow-2xl relative overflow-hidden group"
          >
            <div class="absolute top-0 right-0 w-32 h-32 bg-candy-orange/10 blur-[50px] group-hover:bg-candy-orange/20 transition-colors"></div>
            <p class="font-primary text-5xl font-extrabold text-candy-orange mb-6">
              {{ metric.value }}
            </p>
            <h3 class="font-primary text-2xl font-bold tracking-tight text-white mb-4">
              {{ metric.title }}
            </h3>
            <p class="font-dashboard text-sm leading-relaxed text-gray-400">
              {{ metric.description }}
            </p>
          </article>
        </div>
      </div>
    </section>

    <!-- 4. Final Mission Banner (Image 5 as Background) -->
    <section class="mission-section relative z-10 py-40 overflow-hidden">
      <!-- Background Image -->
      <img src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072" alt="Global Network" class="mission-img absolute inset-0 w-full h-[130%] object-cover mix-blend-luminosity opacity-30">
      <div class="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black pointer-events-none"></div>

      <div class="relative z-10 mx-auto max-w-4xl px-6 text-center">
        <Icon name="ph:fingerprint-simple-bold" class="w-16 h-16 text-candy-orange mb-8 mx-auto opacity-80" />
        <h2 class="mission-text opacity-0 translate-y-4 font-primary text-4xl md:text-6xl font-extrabold text-white leading-tight">
          Total accountability.<br>
          <span class="text-gray-500">Zero ambiguity.</span>
        </h2>
      </div>
    </section>

  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { gsap } from 'gsap'

definePageMeta({ layout: 'default' })

useHead({
  title: 'Architecture & Philosophy - FlowVision',
  meta: [{ name: 'description', content: 'Learn the FlowVision philosophy behind deterministic mesh routing, cryptographic accountability, and physical document telemetry.' }],
})

const performanceMetrics = [
  { value: '99.9%', title: 'SLA Resilience', description: 'Node-aware routing and escalation signals keep handoffs accountable across regional workloads.' },
  { value: '<45s', title: 'Transit Speeds', description: 'Fast checkpoint registration helps teams detect drag before delays become operational failures.' },
  { value: '0.3%', title: 'Error Rates', description: 'Structured verification reduces lost context, incorrect handoffs, and unresolved custody events.' },
] as const

let ctx: gsap.Context

onMounted(() => {
  ctx = gsap.context(() => {
    
    // 1. Hero Animation
    gsap.to('.hero-text', {
      opacity: 1,
      y: 0,
      duration: 1.2,
      stagger: 0.2,
      ease: 'power4.out',
      delay: 0.2
    })

    // 2. Pillar Blocks (Alternating Layouts)
    gsap.utils.toArray('.pillar-block').forEach((block: any) => {
      // Reveal Image Wrapper
      gsap.to(block.querySelector('.pillar-img-wrapper'), {
        scrollTrigger: {
          trigger: block,
          start: 'top 85%',
        },
        opacity: 1,
        x: 0,
        duration: 1.2,
        ease: 'power3.out'
      })

      // Image Parallax
      gsap.to(block.querySelector('.pillar-img'), {
        scrollTrigger: {
          trigger: block,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true
        },
        yPercent: -15,
        ease: 'none'
      })

      // Text Stagger Reveal
      gsap.to(block.querySelectorAll('.pillar-text'), {
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

    // 3. Performance Metrics
    gsap.to('.metric-card', {
      scrollTrigger: {
        trigger: '.performance-section',
        start: 'top 75%'
      },
      opacity: 1,
      y: 0,
      duration: 0.8,
      stagger: 0.2,
      ease: 'power3.out'
    })

    // 4. Mission Banner
    gsap.to('.mission-img', {
      scrollTrigger: {
        trigger: '.mission-section',
        start: 'top bottom',
        end: 'bottom top',
        scrub: true
      },
      yPercent: -20,
      ease: 'none'
    })

    gsap.to('.mission-text', {
      scrollTrigger: {
        trigger: '.mission-section',
        start: 'top 80%'
      },
      opacity: 1,
      y: 0,
      duration: 1.5,
      ease: 'power4.out'
    })

  })
})

onUnmounted(() => {
  if (ctx) ctx.revert()
})
</script>
