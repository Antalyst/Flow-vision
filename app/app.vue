<template>
  <div
    class="w-full transition-colors duration-300"
    :class="{ 'overflow-x-hidden': !isHomePage }"
  >
    <GlobalLoading />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup>
const { initTheme } = useTheme()
const route = useRoute()
const isHomePage = computed(() => route.path === '/')

onMounted(() => {
  initTheme()
})
</script>
