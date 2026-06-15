<template>
  <div class="w-full max-w-[1800px] mx-auto h-screen max-h-screen overflow-hidden bg-[#121212] dark:bg-[#121212] light:bg-[#F9F9F9]">
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
