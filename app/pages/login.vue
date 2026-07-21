<template>
  <main class="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-transparent font-primary">
    <section class="hidden md:flex flex-col justify-between p-12 bg-onyx-black relative overflow-hidden">
      <div class="absolute inset-0 bg-gradient-to-br from-onyx-black via-[#171717] to-black" aria-hidden="true" />
      <img
        src="/bg/login/login.png"
        alt=""
        class="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[52%] w-full object-cover object-bottom opacity-90"
      >
      <div class="pointer-events-none absolute inset-0 z-20 bg-[radial-gradient(circle_at_50%_62%,rgba(244,125,47,0.22),transparent_34%)]" aria-hidden="true" />

      <NuxtLink
        to="/"
        class="relative z-30 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white-pure transition hover:border-candy-orange hover:text-candy-orange"
        aria-label="Back to home"
      >
        <Icon name="ph:arrow-left-bold" class="h-4 w-4" />
      </NuxtLink>

      <div class="absolute inset-0 z-30 flex flex-col items-center justify-center px-10 text-center">
        <img src="/logo/new-logo.png" alt="FlowVision" class="mb-5 h-20 w-auto">
        <h1 class="font-primary font-extrabold text-white text-3xl tracking-wide">FLOW VISION</h1>
        <p class="mt-2 font-dashboard text-[11px] font-semibold text-candy-orange">
          AI-Powered Document Monitoring Framework
        </p>
      </div>

      <div class="relative z-30 h-9" aria-hidden="true" />
    </section>

    <section class="relative flex items-center justify-center p-8 pt-20 md:pt-8 lg:p-16 dark:bg-onyx-black bg-white-surface transition-colors duration-300">
      <NuxtLink
        to="/"
        class="absolute top-6 left-6 z-50 inline-flex h-11 w-11 items-center justify-center text-neutral-500 transition-colors duration-200 hover:text-neutral-900 dark:text-white-muted dark:hover:text-white-pure md:hidden"
        aria-label="Back to home"
      >
        <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </NuxtLink>

      <div class="w-full max-w-[370px]">
        <div class="mb-8 text-center">
          <h2 class="font-primary font-bold dark:text-white-pure text-neutral-900 text-3xl tracking-tight mb-1">
            WELCOME BACK
          </h2>
          <span class="font-dashboard text-xs text-white-muted uppercase tracking-wider mb-8 block">
            Secure Gateway Login
          </span>
        </div>

        <form @submit.prevent="handleLogin" class="flex flex-col gap-5">
          <div class="flex flex-col gap-1.5">
            <label class="font-dashboard text-[11px] font-medium text-neutral-700 dark:text-white-muted">Email Address</label>
            <input
              v-model="login.email"
              type="email"
              required
              placeholder="Example@gmail.com"
              :class="inputClass"
            >
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="font-dashboard text-[11px] font-medium text-neutral-700 dark:text-white-muted">Password</label>
            <div class="relative w-full">
              <input
                v-model="login.password"
                :type="showPassword ? 'text' : 'password'"
                required
                placeholder="Password"
                :class="[inputClass, 'pr-16']"
              >
              <button
                type="button"
                class="absolute inset-y-0 right-0 flex items-center px-1 font-dashboard text-[10px] font-semibold uppercase tracking-wide text-white-muted transition hover:text-candy-orange"
                @click="showPassword = !showPassword"
              >
                {{ showPassword ? 'Hide' : 'Show' }}
              </button>
            </div>
          </div>

          <div class="flex items-center justify-between">
            <label class="flex cursor-pointer items-center gap-2">
              <input
                v-model="login.rememberMe"
                type="checkbox"
                class="h-3.5 w-3.5 rounded border-zinc-300 accent-candy-orange dark:border-onyx-border"
              >
              <span class="font-dashboard text-[11px] text-neutral-700 dark:text-white-muted">Remember me</span>
            </label>
            <button type="button" class="font-dashboard text-[11px] font-medium text-neutral-700 transition hover:text-candy-orange dark:text-white-muted">
              Forgot Password
            </button>
          </div>

          <button type="submit" :class="primaryBtnClass">
            Log In
          </button>
        </form>

        <p class="mt-5 font-dashboard text-[11px] text-neutral-700 dark:text-white-muted">
          Don't Have Account?
          <NuxtLink to="/register" class="font-semibold text-candy-orange transition hover:text-candy-hover">
            Register
          </NuxtLink>
        </p>
      </div>
    </section>
  </main>
</template>

<script setup>
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  layout: false
})

const { startLoading, stopLoading } = useLoading()

const inputClass = computed(() =>
  'dark:bg-transparent dark:border-b dark:border-onyx-border rounded-none focus:border-candy-orange outline-none text-sm w-full py-2.5 border-b border-neutral-400 bg-transparent text-neutral-900 dark:text-white-pure placeholder:text-white-muted transition-colors'
)

const primaryBtnClass =
  'bg-candy-orange text-white hover:bg-candy-hover font-bold text-sm tracking-wide rounded-lg py-3.5 w-full uppercase transition-all duration-300 shadow-md shadow-candy-orange/10'

const showPassword = ref(false)
const auth = useAuthStore()
const loginModal = ref(false)

const login = ref({
  email: '',
  password: '',
  rememberMe:false
})

const getPostLoginRoute = (role = '') => {
  const map = {
    client: '/client/dashboard',
    employee: '/employee/dashboard',
    employee_sub_user: '/employee/dashboard',
    messenger: '/messenger/dashboard',
  }
  return map[role.toLowerCase().trim()] ?? '/'
}

const handleLogin = async () => {
  console.log("Attempting login with:", login.value);

  if (!login.value.email || !login.value.password) {
      alert("Please fill in all fields");
      return;
  }

  try {
    startLoading();
    const result = await auth.login(login.value);
    console.log("Login result:", result);

    if (result.success) {
      console.log("Login successful, navigating to /client...");
      loginModal.value = false;

      const userSession = useCookie('user_session', {
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
        sameSite: 'lax'
      });
      const userRole = useCookie('user_role', {
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
        sameSite: 'lax'
      });
      const sessionUserId = result.user?.user_id || result.user?.id || '';
      userSession.value = sessionUserId;
      userRole.value = result.user.role || '';

      await navigateTo(getPostLoginRoute(result.user.role || ''));
    } else {
      console.warn("Login failed: result.success is false");
    }
  } catch (e) {
    console.error("Login catch error:", e);
    alert(e.data?.statusMessage || 'Login failed');
  } finally {
    stopLoading();
  }
}
</script>
