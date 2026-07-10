<template>
  <div
    class="w-full min-h-screen transition-colors duration-300"
    :class="isMarketingPage
      ? [
        isLandingDark ? 'dark bg-onyx-black text-white-pure font-dashboard' : 'bg-white-surface text-zinc-900 font-dashboard',
        'relative',
      ]
      : 'overflow-x-hidden font-primary bg-white-pure dark:bg-onyx-black'"
  >
    <!-- Landing atmosphere vignette -->
    <div
      v-if="isMarketingPage && isLandingDark"
      class="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-zinc-800/20 via-transparent to-[#09090b]"
      aria-hidden="true"
    />

    <!-- Ghost grid texture (landing) -->
    <div
      v-if="isMarketingPage"
      class="pointer-events-none absolute inset-0 z-0"
      :class="isLandingDark ? 'grid-bg-lines-dark opacity-[0.03]' : 'grid-bg-lines opacity-[0.35]'"
      aria-hidden="true"
    />

    <!-- Sticky navigation (landing) — top-locked, solid capsule -->
    <div
      v-if="isMarketingPage"
      class="sticky top-0 left-0 right-0 z-50 w-full px-3 pt-3 sm:px-4 sm:pt-4 md:px-8"
    >
      <div class="container relative mx-auto flex max-w-[1800px] items-center justify-between pr-10 sm:pr-11 md:pr-0">
        <nav
          class="pointer-events-auto flex h-12 w-full max-w-[960px] items-center justify-between gap-2 rounded-full px-3 transition-colors duration-300 sm:mx-auto sm:h-14 sm:gap-4 sm:px-5 md:gap-6 md:px-8"
          :class="navCapsuleClass"
        >
          <NuxtLink to="/" class="flex shrink-0 items-center">
            <img
              src="/logo/new-logo-dark.png"
              alt="FlowVision"
              class="h-7 w-auto sm:h-8"
              :class="isLandingDark ? 'hidden' : 'block'"
            >
            <img
              src="/logo/new-logo.png"
              alt="FlowVision"
              class="h-7 w-auto sm:h-8"
              :class="isLandingDark ? 'block' : 'hidden'"
            >
          </NuxtLink>

          <div class="hidden items-center gap-6 md:flex">
            <NuxtLink
              v-for="link in landingNavLinks"
              :key="link.label"
              :to="link.to"
              class="font-dashboard text-[11px] font-semibold uppercase tracking-wider transition-colors hover:text-candy-orange"
              :class="route.path === link.to ? 'text-candy-orange' : 'text-white-muted'"
            >{{ link.label }}</NuxtLink>
          </div>

          <div class="ml-auto hidden shrink-0 items-center gap-2 sm:gap-3 md:ml-0 md:flex md:gap-4">
            <NuxtLink
              to="/login"
              class="font-dashboard text-[10px] font-semibold uppercase tracking-wider text-white-muted transition-colors hover:text-candy-orange sm:text-[11px]"
            >
              Sign in
            </NuxtLink>
            <NuxtLink
              to="/register"
              class="rounded-full bg-candy-orange px-3 py-1 font-dashboard text-[10px] font-bold uppercase tracking-wider text-white-pure shadow-md shadow-candy-orange/10 transition-transform hover:scale-105 active:scale-95 hover:bg-candy-hover sm:px-4 sm:py-1.5 sm:text-[11px]"
            >
              Get started!
            </NuxtLink>
          </div>

          <button
            type="button"
            class="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-full text-white-muted transition-colors hover:text-candy-orange md:hidden"
            :aria-expanded="mobileMenuOpen"
            aria-controls="mobile-navigation"
            aria-label="Open navigation menu"
            @click="mobileMenuOpen = true"
          >
            <Icon name="ph:list-bold" class="h-5 w-5" />
          </button>
        </nav>


      </div>
    </div>

    <nav v-else class="mx-4 my-5 flex items-center justify-between rounded-full bg-onyx-black p-4 text-white shadow-md md:mx-60">
      <div class="flex items-center">
        <img class="w-[40px] h-auto pl-4" src="/logo/new-logo.png" alt="FlowVision Logo">
      </div>
      <div class="hidden md:block">
        <ul class="flex md:pl-52 gap-8 justify-center">
          <li class="cursor-pointer transition"><nuxt-link to="/">Home</nuxt-link></li>
          <li class="cursor-pointer transition"><nuxt-link to="/tracking">Tracking</nuxt-link></li>
          <li class="cursor-pointer transition"><nuxt-link to="/about">About</nuxt-link></li>
          <li class="cursor-pointer transition"><button @click="openDocForm">Contact</button></li>
        </ul>
      </div>

      <div class="hidden items-center justify-center gap-4 md:flex">
       

        <div class="flex gap-2">
            <NuxtLink to="/login" class="px-4 py-2 text-md font-medium hover:text-candy-orange transition">Sign in</NuxtLink>
            <NuxtLink to="/register" class="px-5 py-2 text-md font-medium bg-white text-onyx-black rounded-full hover:bg-candy-orange hover:text-white transition shadow-sm">
              Get started
            </NuxtLink>
     
        </div>
      </div>

      <button
        type="button"
        class="inline-flex h-10 w-10 items-center justify-center rounded-full text-white-muted transition-colors hover:text-candy-orange md:hidden"
        :aria-expanded="mobileMenuOpen"
        aria-controls="mobile-navigation"
        aria-label="Open navigation menu"
        @click="mobileMenuOpen = true"
      >
        <Icon name="ph:list-bold" class="h-5 w-5" />
      </button>
    </nav>

    <Transition name="mobile-menu">
      <div
        v-if="mobileMenuOpen"
        id="mobile-navigation"
        class="fixed inset-0 z-[60] bg-white-surface/95 backdrop-blur-lg dark:bg-onyx-black/95 md:hidden"
      >
        <div class="flex min-h-screen flex-col px-6 py-6">
          <div class="flex items-center justify-between">
            <NuxtLink to="/" class="inline-flex items-center" @click="mobileMenuOpen = false">
              <img src="/logo/new-logo-dark.png" alt="FlowVision" class="h-8 w-auto dark:hidden">
              <img src="/logo/new-logo.png" alt="FlowVision" class="hidden h-8 w-auto dark:block">
            </NuxtLink>
            <button
              type="button"
              class="inline-flex h-11 w-11 items-center justify-center rounded-full text-neutral-500 transition-colors duration-200 hover:text-neutral-900 dark:text-white-muted dark:hover:text-white-pure"
              aria-label="Close navigation menu"
              @click="mobileMenuOpen = false"
            >
              <Icon name="ph:x-bold" class="h-5 w-5" />
            </button>
          </div>

          <nav class="mt-10 flex flex-1 flex-col" aria-label="Mobile navigation">
            <NuxtLink
              v-for="link in mobileNavLinks"
              :key="link.label"
              :to="link.to"
              class="border-b border-neutral-200/70 py-4 font-primary text-lg font-medium tracking-wide transition-colors dark:border-onyx-border"
              :class="route.path === link.to ? 'text-candy-orange' : 'text-neutral-900 hover:text-candy-orange dark:text-white-pure dark:hover:text-candy-orange'"
              @click="mobileMenuOpen = false"
            >
              {{ link.label }}
            </NuxtLink>
          </nav>

          <div class="grid gap-3 pb-3">
            <NuxtLink
              to="/login"
              class="py-4 text-center font-primary text-lg font-medium tracking-wide transition-colors"
              :class="route.path === '/login' ? 'text-candy-orange' : 'text-neutral-900 hover:text-candy-orange dark:text-white-pure dark:hover:text-candy-orange'"
              @click="mobileMenuOpen = false"
            >
              Sign in
            </NuxtLink>
            <NuxtLink
              to="/register"
              class="rounded-lg bg-candy-orange py-4 text-center font-primary text-lg font-bold tracking-wide text-white-pure shadow-md shadow-candy-orange/10 transition-colors hover:bg-candy-hover"
              @click="mobileMenuOpen = false"
            >
              Get started
            </NuxtLink>
          </div>
        </div>
      </div>
    </Transition>
  
    <main
      :class="isMarketingPage
        ? 'container relative z-10 mx-auto max-w-[1800px] px-8 pt-6 2xl:px-0'
        : 'w-full p-2'"
    >
      <slot />
    </main>
  </div>
</template>

<script setup>
const route = useRoute()
const { isMarketingPage } = useMarketingPage()
const { isLandingDark, toggleLandingTheme, navCapsuleClass } = useLandingTheme()
const mobileMenuOpen = ref(false)

const landingNavLinks = [
  { label: 'Home', to: '/' },
  { label: 'Features', to: '/features' },
  { label: 'Tracking', to: '/tracking' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
]

const mobileNavLinks = landingNavLinks

watch(() => route.fullPath, () => {
  mobileMenuOpen.value = false
})

</script>

<style scoped>
.mobile-menu-enter-active,
.mobile-menu-leave-active {
  transition: opacity 0.22s ease;
}
.mobile-menu-enter-from,
.mobile-menu-leave-to {
  opacity: 0;
}
.grid-bg-lines {
  background-image:
    linear-gradient(to right, rgb(228 228 231 / 0.55) 1px, transparent 1px),
    linear-gradient(to bottom, rgb(228 228 231 / 0.55) 1px, transparent 1px);
  background-size: 100px 100px;
}

.grid-bg-lines-dark {
  background-image:
    linear-gradient(to right, rgb(255 255 255 / 0.35) 1px, transparent 1px),
    linear-gradient(to bottom, rgb(255 255 255 / 0.35) 1px, transparent 1px);
  background-size: 100px 100px;
}
</style>
