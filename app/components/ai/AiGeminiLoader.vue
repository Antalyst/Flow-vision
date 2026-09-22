<template>
  <div class="flex h-7 w-7 items-center justify-center">
    <svg
      ref="sparkle"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      class="h-full w-full"
    >
      <path
        d="M12 0C12 6.62742 17.3726 12 24 12C17.3726 12 12 17.3726 12 24C12 17.3726 6.62742 12 0 12C6.62742 12 12 6.62742 12 0Z"
        fill="#EE4D2D"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import gsap from 'gsap'

const sparkle = ref<SVGElement | null>(null)
let ctx: gsap.Context | null = null

onMounted(() => {
  ctx = gsap.context(() => {
    if (sparkle.value) {
      // Smooth continuous rotation
      gsap.to(sparkle.value, {
        rotation: 360,
        duration: 2.5,
        repeat: -1,
        ease: 'linear'
      })
      // Subtle pulse
      gsap.to(sparkle.value, {
        scale: 1.15,
        duration: 1,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      })
    }
  })
})

onUnmounted(() => {
  ctx?.revert()
})
</script>
