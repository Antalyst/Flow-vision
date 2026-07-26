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
          <li class="cursor-pointer transition"><nuxt-link to="/documents">Tracking</nuxt-link></li>
          <li class="cursor-pointer transition"><nuxt-link to="/about">About</nuxt-link></li>
          <li class="cursor-pointer transition"><button @click="openDocForm">Contact</button></li>
        </ul>
      </div>

      <div class="hidden items-center justify-center gap-4 md:flex">
       

        <div class="flex gap-2">
            <NuxtLink to="/login" class="px-4 py-2 text-md font-medium hover:text-candy-orange transition">Sign in</NuxtLink>
            <NuxtLink to="/register" class="px-5 py-2 text-md font-medium bg-white text-onyx-black rounded-full hover:bg-candy-orange hover:text-white transition shadow-sm">
              Get started
<<<<<<< HEAD
            </button>

=======
            </NuxtLink>
     
>>>>>>> 8573f678e67d6a3347dba549b6b3e298ed81c1d3
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

<<<<<<< HEAD
              <div class="w-full max-w-md mx-auto">
                  <div class="mb-6 text-center lg:text-left">
                      <h1 class="text-3xl font-bold text-gray-900 mb-1">Create Account</h1>
                      <p class="text-gray-500 text-sm">Select your account type to get started.</p>
                  </div>

                  <div class="flex bg-gray-100 p-1 rounded-md w-full mb-6">
                      <button 
                        v-for="accType in accTypeData" 
                        :key="accType.accType_id" 
                        @click="selectType(accType)"
                        type="button"
                        :class="[
                          'flex-1 py-2 rounded-md text-sm font-bold transition-all capitalize',
                        
                          selectedType === accType.acctype_id
                          ? 'bg-white text-[#F77934] shadow-sm' 
                          : 'text-gray-500 hover:text-gray-700'
                        ]"
                      >
                        {{ accType.name }}
                      </button>
                  </div>

                  <form @submit.prevent="handleRegister" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div class="flex flex-col gap-1 md:col-span-2">
                          <label class="text-xs font-bold text-gray-700 uppercase">Full name</label>
                          <input v-model="form.full_name" class="w-full px-4 py-2 rounded-md border border-gray-300 outline-none focus:border-[#F77934] transition-colors" type="text" required placeholder="Juan D. Dela Cruz">
                      </div>

                      <div class="flex flex-col gap-1 md:col-span-2">
                          <label class="text-xs font-bold text-gray-700 uppercase">Email</label>
                          <input v-model="form.email" class="w-full px-4 py-2 rounded-md border border-gray-300 outline-none focus:border-[#F77934] transition-colors" type="email" required placeholder="example@gmail.com">
                      </div>

                      <div v-if="selectedTypeName === 'employee'" class="flex flex-col gap-1 md:col-span-2">
                        <label class="text-xs font-bold text-[#F77934] uppercase">Organization Code</label>
                        <input 
                          v-model="form.org_code" 
                          class="w-full px-4 py-2 rounded-md border border-[#F77934] outline-none bg-orange-50/30" 
                          type="text" 
                          required 
                          placeholder="Enter provided code"
                        >
                      </div>

                      <div class="flex flex-col gap-1 md:col-span-2">
                          <label class="text-xs font-bold text-gray-700 uppercase">Birth Date</label>
                          <input v-model="form.birth_date" type="date" class="w-full px-4 py-2 rounded-md border border-gray-300 outline-none focus:border-[#F77934] transition-colors text-gray-700">
                      </div>

                      <div class="flex flex-col gap-1">
                          <label class="text-xs font-bold text-gray-700 uppercase">Password</label>
                          <input v-model="form.password" class="w-full px-4 py-2 rounded-md border border-gray-300 outline-none focus:border-[#F77934] transition-colors" type="password" required>
                      </div>

                      <div class="flex flex-col gap-1">
                          <label class="text-xs font-bold text-gray-700 uppercase">Confirm</label>
                          <input v-model="form.confirm_password" class="w-full px-4 py-2 rounded-md border border-gray-300 outline-none focus:border-[#F77934] transition-colors" type="password" required>
                      </div>

                      <button type="submit" class="md:col-span-2 w-full bg-[#F77934] hover:bg-[#e06b2a] text-white py-3 rounded-md font-bold mt-2 transition-colors">
                          Create Account
                      </button>
                  </form>

                  <p class="mt-6 text-center text-sm text-gray-500">
                      Already have an account? 
                      <button @click="registerModal = false; loginModal = true" class="font-bold text-[#F77934] hover:underline ml-1">Sign in</button>
                  </p>
              </div>
          </div>
      </div>
    </div>

    <div v-if="loginModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div class="relative bg-white w-full max-w-5xl min-h-[600px] rounded-md shadow-2xl overflow-hidden flex">
            
            <div class="hidden lg:flex flex-1 relative bg-[url('/bg/bg.png')] bg-cover bg-center items-center justify-center p-12">
                <div class="absolute inset-0 bg-black/20"></div>
                <div class="relative z-10 text-center">
                    <img src="/logo/Logos.png" class="w-20 mx-auto mb-4 brightness-0 invert" alt="FlowVision">
                    <h1 class="text-4xl font-bold text-white tracking-tight">FlowVision</h1>
                </div>
            </div>

            <div class="flex-1 bg-white p-8 md:p-16 flex flex-col justify-center relative">
              <button @click="loginModal = false" class="absolute top-6 right-8 text-3xl text-gray-400 hover:text-gray-800 transition">
                  &times;
              </button>

              <div class="w-full max-w-sm mx-auto">
                  <div class="mb-8">
                      <h1 class="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
                      <p class="text-gray-500 text-sm">Please enter your details to sign in.</p>
                  </div>

                  <form @submit.prevent="handleLogin" class="flex flex-col gap-4">
                      <div class="flex flex-col gap-1.5">
                          <label class="text-sm font-semibold text-gray-700">Email Address</label>
                          <input 
                              v-model="login.email" 
                              type="email" 
                              required 
                              placeholder="name@company.com"
                              class="w-full px-4 py-2.5 rounded-md border border-gray-300 outline-none focus:border-[#F77934] transition-colors"
                          >
                      </div>

                      <div class="flex flex-col gap-1.5">
                          <label class="text-sm font-semibold text-gray-700">Password</label>
                          <div class="relative w-full">
                              <input 
                                  v-model="login.password" 
                                  :type="showPassword ? 'text' : 'password'" 
                                  required 
                                  placeholder="••••••••"
                                  class="w-full px-4 py-2.5 rounded-md border border-gray-300 outline-none focus:border-[#F77934] transition-colors pr-12"
                              >
                              <button 
                                  type="button"
                                  @click="showPassword = !showPassword"
                                  class="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-[#F77934]"
                              >
                                  <span class="text-xs font-bold uppercase">{{ showPassword ? 'Hide' : 'Show' }}</span>
                              </button>
                          </div>
                      </div>

                      <div class="flex items-center justify-between mt-1">
                          <label class="flex items-center gap-2 cursor-pointer">
                              <input 
                                  v-model="login.rememberMe"
                                  type="checkbox" 
                                  class="w-4 h-4 rounded-md accent-[#F77934]"
                              >
                              <span class="text-sm text-gray-600">Remember me</span>
                          </label>
                          <button type="button" class="text-sm font-medium text-[#F77934] hover:underline">
                              Forgot password?
                          </button>
                      </div>

                      <button 
                          type="submit" 
                          class="w-full bg-[#F77934] hover:bg-[#e06b2a] text-white py-2.5 rounded-md font-bold mt-4 transition-colors"
                      >
                          Sign in
                      </button>
                  </form>

                  <p class="mt-8 text-center text-sm text-gray-500">
                      Don't have an account? 
                      <button @click="loginModal = false; registerModal = true" class="font-bold text-[#F77934] hover:underline ml-1">Create account</button>
                  </p>
              </div>
            </div>
=======
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
>>>>>>> 8573f678e67d6a3347dba549b6b3e298ed81c1d3
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
