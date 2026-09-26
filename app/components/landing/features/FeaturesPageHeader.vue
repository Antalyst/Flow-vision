<template>
  <section
    ref="sectionRef"
    class="features-page-header relative w-full overflow-hidden bg-flow-void"
    aria-labelledby="features-page-title"
  >
    <!-- Subtle vertical grid overlay -->
    <div class="features-header-grid pointer-events-none absolute inset-0" aria-hidden="true" />

    <div class="relative mx-auto max-w-7xl px-6 py-20">
      <div class="grid grid-cols-1 items-end gap-8 md:grid-cols-2">
        <!-- Left: typography hierarchy -->
        <div>
          <span class="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-flow-muted">
            FlowVision Platform
          </span>
          <h1
            id="features-page-title"
            class="mb-3 text-4xl font-bold tracking-tight text-flow-ink md:text-5xl"
          >
            Platform Features
          </h1>
          <p class="text-sm font-semibold tracking-wide text-flow-signal">
            Intelligence for the movement of your documents.
          </p>
        </div>

        <!-- Right: muted description -->
        <p class="max-w-md text-sm leading-relaxed text-flow-muted md:text-right lg:text-left">
          One connected system for routing, understanding, and tracking every document your
          organization handles.
        </p>
      </div>

      <!-- Bottom divider -->
      <div class="mt-16 border-b border-flow-muted/15" />
    </div>
  </section>
</template>

<script setup lang="ts">
const sectionRef = ref<HTMLElement | null>(null)

defineExpose({ sectionRef })
</script>

<style scoped>
.features-header-grid {
  background-image: linear-gradient(
    to right,
    rgb(255 255 255 / 0.035) 1px,
    transparent 1px
  );
  background-size: 72px 100%;
}
</style>
