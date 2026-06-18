<template>
  <div class="h-screen max-h-screen w-full max-w-[1800px] mx-auto overflow-hidden bg-white-pure transition-colors duration-300 dark:bg-onyx-black">
    <GlobalLoading />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup>
const { initTheme } = useTheme()

onMounted(() => {
  initTheme()
})
</script>
