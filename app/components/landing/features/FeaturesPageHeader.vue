<template>
  <section
    ref="sectionRef"
    class="features-page-header relative w-full overflow-hidden bg-[#050505]"
    :class="!isLandingDark && 'bg-white-surface'"
    aria-labelledby="features-page-title"
  >
    <!-- Subtle vertical grid overlay -->
    <div
      class="pointer-events-none absolute inset-0"
      :class="isLandingDark ? 'features-header-grid-dark' : 'features-header-grid-light'"
      aria-hidden="true"
    />

    <div class="relative mx-auto max-w-7xl px-6 py-20">
      <div class="grid grid-cols-1 items-end gap-8 md:grid-cols-2">
        <!-- Left: typography hierarchy -->
        <div>
          <span class="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
            FlowVision Platform
          </span>
          <h1
            id="features-page-title"
            class="mb-3 text-4xl font-bold tracking-tight text-white md:text-5xl"
            :class="!isLandingDark && '!text-zinc-900'"
          >
            Platform Features
          </h1>
          <p class="text-sm font-semibold tracking-wide text-[#FF6B00]">
            Decentralized Intelligence. Unified Control.
          </p>
        </div>

        <!-- Right: muted description -->
        <p
          class="max-w-md text-sm leading-relaxed text-neutral-400 md:text-right lg:text-left"
          :class="!isLandingDark && '!text-zinc-600'"
        >
          A modular node architecture where routing, AI inference, and custody verification
          operate as interconnected panels across your network.
        </p>
      </div>

      <!-- Bottom divider -->
      <div
        class="mt-16 border-b"
        :class="isLandingDark ? 'border-neutral-900' : 'border-zinc-200'"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
const { isLandingDark } = useLandingTheme()

const sectionRef = ref<HTMLElement | null>(null)

defineExpose({ sectionRef })
</script>

<style scoped>
.features-header-grid-dark {
  background-image: linear-gradient(
    to right,
    rgb(255 255 255 / 0.035) 1px,
    transparent 1px
  );
  background-size: 72px 100%;
}

.features-header-grid-light {
  background-image: linear-gradient(
    to right,
    rgb(0 0 0 / 0.06) 1px,
    transparent 1px
  );
  background-size: 72px 100%;
}
</style>
