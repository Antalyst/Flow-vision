<template>
  <div
    class="w-full transition-colors duration-300"
    :class="{ 'overflow-x-hidden': !isMarketingPage }"
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
const { isMarketingPage } = useMarketingPage()

onMounted(() => {
  initTheme()
})
</script>
