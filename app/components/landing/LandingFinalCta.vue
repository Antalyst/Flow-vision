<template>
  <section class="relative w-full bg-flow-void px-6 py-28 sm:py-36 md:py-44">
    <div class="mx-auto flex max-w-2xl flex-col items-center text-center">
      <h2 class="font-primary text-3xl font-semibold text-flow-ink sm:text-4xl md:text-5xl">
        Move information forward.
      </h2>
      <p class="mt-5 max-w-xl text-base text-flow-muted sm:text-lg">
        FlowVision gives your documents a clear path from capture to decision.
      </p>
      <button
        type="button"
        class="mt-9 rounded-full bg-flow-signal px-8 py-3 text-sm font-semibold text-flow-void transition-colors hover:bg-flow-signal/85"
        @click="openRegister"
      >
        Get started
      </button>
      <img src="/logo/new-logo.png" alt="FlowVision" class="mt-16 h-10 w-auto opacity-80">
    </div>
  </section>
</template>

<script setup lang="ts">
const { openRegister } = useAuthModals()
</script>
