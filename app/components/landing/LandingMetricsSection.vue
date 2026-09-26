<template>
  <section class="relative w-full bg-flow-void px-4 py-16 sm:px-6 lg:px-8">
    <div class="mx-auto max-w-4xl">
      <div class="grid grid-cols-1 gap-8 border-y border-flow-muted/15 py-10 sm:grid-cols-3 sm:gap-4">
        <div v-for="metric in METRICS" :key="metric.label" class="text-center">
          <p class="font-primary text-4xl font-semibold text-flow-ink sm:text-5xl">
            {{ metric.value }}
          </p>
          <p class="mt-2 text-sm text-flow-muted">
            {{ metric.label }}
          </p>
        </div>
      </div>
      <p class="mt-4 text-center text-xs uppercase tracking-widest text-flow-muted/70">
        Example data
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
const METRICS = [
  { value: '99.4%', label: 'SLA compliance' },
  { value: '15K+', label: 'Documents processed' },
  { value: '<45s', label: 'Average transit time' },
]
</script>
