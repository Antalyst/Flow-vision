<template>
  <div class="min-h-screen w-full font-primary sticky top-0 relative">
    <nav class="flex justify-between items-center p-4 bg-onyx-black text-white m-5 mx-60 rounded-full shadow-md">
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

      <div class="flex items-center justify-center gap-4">
       

        <div class="flex gap-2">
            <button @click="loginModal = true" class="px-4 py-2 text-md font-medium hover:text-candy-orange transition">Sign in</button>
            <button @click="registerModal = true" class="px-5 py-2 text-md font-medium bg-white text-onyx-black rounded-full hover:bg-candy-orange hover:text-white transition shadow-sm">
              Get started
            </button>
     
        </div>
      </div>
    </nav>
  
    <Transition name="modal-fade">
      <div
        v-if="registerModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        @click.self="registerModal = false"
      >
        <div
          class="relative flex w-full max-w-4xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-onyx-border dark:bg-onyx-black"
          role="dialog"
          aria-modal="true"
          aria-labelledby="register-modal-title"
        >
          <div class="hidden flex-1 flex-col justify-between bg-onyx-black p-10 lg:flex">
            <div>
              <img src="/logo/Logos.png" class="mb-6 h-10 w-auto brightness-0 invert" alt="FlowVision">
              <h2 class="text-3xl font-bold tracking-tight text-white-pure">Join FlowVision</h2>
              <p class="mt-2 max-w-xs text-sm leading-relaxed text-white-muted">
                Start managing your workflow with a unified document routing platform.
              </p>
            </div>
            <div class="h-1 w-16 rounded-full bg-candy-orange" />
          </div>

          <div class="relative flex max-h-[90vh] flex-1 flex-col overflow-y-auto p-8 md:p-10">
            <button
              type="button"
              class="absolute right-5 top-5 inline-flex h-9 w-9 items-center justify-center rounded-lg text-white-muted transition hover:bg-zinc-100 hover:text-onyx-black dark:hover:bg-onyx-card dark:hover:text-white-pure"
              aria-label="Close registration"
              @click="registerModal = false"
            >
              <Icon name="ph:x-bold" class="h-4 w-4" />
            </button>

            <div class="mx-auto w-full max-w-md">
              <div class="mb-6 text-center lg:text-left">
                <p class="text-[10px] font-bold uppercase tracking-widest text-candy-orange">Get started</p>
                <h1 id="register-modal-title" class="mt-1 text-2xl font-bold text-onyx-black dark:text-white-pure">
                  Create Account
                </h1>
                <p class="mt-1 text-sm text-white-muted">Select your account type to continue.</p>
              </div>

              <div class="mb-6 flex w-full rounded-xl border border-zinc-200 bg-white-surface p-1 dark:border-onyx-border dark:bg-onyx-card">
                <button
                  v-for="accType in accTypeData"
                  :key="accType.accType_id"
                  type="button"
                  class="flex-1 rounded-lg py-2.5 text-sm font-semibold capitalize transition-all"
                  :class="selectedType === accType.acctype_id
                    ? 'bg-candy-orange text-white-pure shadow-md shadow-candy-orange/25'
                    : 'text-white-muted hover:text-onyx-black dark:hover:text-white-pure'"
                  @click="selectType(accType)"
                >
                  {{ accType.name }}
                </button>
              </div>

              <form @submit.prevent="handleRegister" class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div class="flex flex-col gap-1.5 md:col-span-2">
                  <label class="text-xs font-semibold uppercase tracking-wide text-onyx-black dark:text-white-muted">Full name</label>
                  <input v-model="form.full_name" :class="inputClass" type="text" required placeholder="Juan D. Dela Cruz">
                </div>

                <div class="flex flex-col gap-1.5 md:col-span-2">
                  <label class="text-xs font-semibold uppercase tracking-wide text-onyx-black dark:text-white-muted">Email</label>
                  <input v-model="form.email" :class="inputClass" type="email" required placeholder="name@company.com">
                </div>

                <div v-if="selectedTypeName === 'employee'" class="flex flex-col gap-1.5 md:col-span-2">
                  <label class="text-xs font-semibold uppercase tracking-wide text-candy-orange">Organization code</label>
                  <input
                    v-model="form.org_code"
                    :class="[inputClass, 'border-candy-orange/40 bg-candy-orange/5 dark:bg-candy-orange/10']"
                    type="text"
                    required
                    placeholder="Enter provided code"
                  >
                </div>

                <div class="flex flex-col gap-1.5 md:col-span-2">
                  <label class="text-xs font-semibold uppercase tracking-wide text-onyx-black dark:text-white-muted">Birth date</label>
                  <input v-model="form.birth_date" type="date" :class="inputClass">
                </div>

                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-semibold uppercase tracking-wide text-onyx-black dark:text-white-muted">Password</label>
                  <input v-model="form.password" :class="inputClass" type="password" required placeholder="••••••••">
                </div>

                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-semibold uppercase tracking-wide text-onyx-black dark:text-white-muted">Confirm</label>
                  <input v-model="form.confirm_password" :class="inputClass" type="password" required placeholder="••••••••">
                </div>

                <button type="submit" :class="primaryBtnClass" class="md:col-span-2">
                  Create Account
                </button>
              </form>

              <p class="mt-6 text-center text-sm text-white-muted">
                Already have an account?
                <button
                  type="button"
                  class="ml-1 font-semibold text-candy-orange transition hover:text-candy-hover"
                  @click="registerModal = false; loginModal = true"
                >
                  Sign in
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <Transition name="modal-fade">
      <div
        v-if="loginModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        @click.self="loginModal = false"
      >
        <div
          class="relative flex w-full max-w-4xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-onyx-border dark:bg-onyx-black"
          role="dialog"
          aria-modal="true"
          aria-labelledby="login-modal-title"
        >
          <div class="hidden flex-1 flex-col justify-between bg-onyx-black p-10 lg:flex">
            <div>
              <img src="/logo/Logos.png" class="mb-6 h-10 w-auto brightness-0 invert" alt="FlowVision">
              <h2 class="text-3xl font-bold tracking-tight text-white-pure">FlowVision</h2>
              <p class="mt-2 max-w-xs text-sm leading-relaxed text-white-muted">
                Sign in to manage documents, routes, and real-time fulfillment.
              </p>
            </div>
            <div class="h-1 w-16 rounded-full bg-candy-orange" />
          </div>

          <div class="relative flex flex-1 flex-col justify-center p-8 md:p-12">
            <button
              type="button"
              class="absolute right-5 top-5 inline-flex h-9 w-9 items-center justify-center rounded-lg text-white-muted transition hover:bg-zinc-100 hover:text-onyx-black dark:hover:bg-onyx-card dark:hover:text-white-pure"
              aria-label="Close sign in"
              @click="loginModal = false"
            >
              <Icon name="ph:x-bold" class="h-4 w-4" />
            </button>

            <div class="mx-auto w-full max-w-sm">
              <div class="mb-8">
                <p class="text-[10px] font-bold uppercase tracking-widest text-candy-orange">Welcome back</p>
                <h1 id="login-modal-title" class="mt-1 text-2xl font-bold text-onyx-black dark:text-white-pure">
                  Sign In
                </h1>
                <p class="mt-1 text-sm text-white-muted">Enter your credentials to access your workspace.</p>
              </div>

              <form @submit.prevent="handleLogin" class="flex flex-col gap-4">
                <div class="flex flex-col gap-1.5">
                  <label class="text-sm font-semibold text-onyx-black dark:text-white-pure">Email address</label>
                  <input
                    v-model="login.email"
                    type="email"
                    required
                    placeholder="name@company.com"
                    :class="inputClass"
                  >
                </div>

                <div class="flex flex-col gap-1.5">
                  <label class="text-sm font-semibold text-onyx-black dark:text-white-pure">Password</label>
                  <div class="relative w-full">
                    <input
                      v-model="login.password"
                      :type="showPassword ? 'text' : 'password'"
                      required
                      placeholder="••••••••"
                      :class="[inputClass, 'pr-16']"
                    >
                    <button
                      type="button"
                      class="absolute inset-y-0 right-0 flex items-center px-4 text-xs font-semibold uppercase tracking-wide text-white-muted transition hover:text-candy-orange"
                      @click="showPassword = !showPassword"
                    >
                      {{ showPassword ? 'Hide' : 'Show' }}
                    </button>
                  </div>
                </div>

                <div class="mt-1 flex items-center justify-between">
                  <label class="flex cursor-pointer items-center gap-2">
                    <input
                      v-model="login.rememberMe"
                      type="checkbox"
                      class="h-4 w-4 rounded border-zinc-300 accent-candy-orange dark:border-onyx-border"
                    >
                    <span class="text-sm text-white-muted">Remember me</span>
                  </label>
                  <button type="button" class="text-sm font-medium text-candy-orange transition hover:text-candy-hover">
                    Forgot password?
                  </button>
                </div>

                <button type="submit" :class="primaryBtnClass">
                  Log In
                </button>
              </form>

              <p class="mt-8 text-center text-sm text-white-muted">
                Don't have an account?
                <button
                  type="button"
                  class="ml-1 font-semibold text-candy-orange transition hover:text-candy-hover"
                  @click="loginModal = false; registerModal = true"
                >
                  Create account
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </Transition>
    <main class="w-full p-2">
      <slot />
    </main>
  </div>
</template>

<script setup>

import { useAuthStore } from '~/stores/auth'
const { startLoading, stopLoading } = useLoading()
const employeeAuth = useEmployeeAuthStore()

const inputClass = computed(() =>
  'w-full rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-onyx-black outline-none transition placeholder:text-white-muted focus:border-candy-orange focus:ring-2 focus:ring-candy-orange/25 dark:border-onyx-border dark:bg-onyx-card dark:text-white-pure'
)

const primaryBtnClass =
  'mt-2 w-full rounded-lg bg-candy-orange py-3 font-bold text-white-pure shadow-lg shadow-candy-orange/25 transition-all hover:bg-opacity-90 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-candy-orange/40'

const showPassword = ref(false)
const auth = useAuthStore() 
const accTypeData = ref([])
const selectedType = ref(null)
const registerModal = ref(false)
const userRole = ref("")
const loginModal = ref(false)
const verifyCode = ref(false)
const selectedTypeObj = ref(null)
const selectedTypeName = ref('')

const selectType = (accType) => {
  selectedType.value = accType.acctype_id
  selectedTypeName.value = accType.name.toLowerCase()
}
const login = ref({
  email: '',
  password: '',
  rememberMe:false
})

const form = ref({
  full_name: '',
  email: '',
  acctype_id: selectedType.value,
  role:userRole.value,
  birth_date: '',
  password: '',
  confirm_password: '',
  org_code:''
})

const getPostLoginRoute = (role = '') => {
  const map = {
    client: '/client/dashboard',
    employee: '/employee/dashboard',
    messenger: '/messenger/dashboard',
  }
  return map[role.toLowerCase().trim()] ?? '/'
}

const callAccType = async () => {
  try {
    const data = await $fetch("/api/account_type")
    accTypeData.value = data
    if (data.length > 0) {
      selectedType.value = data[0].acctype_id
      selectedTypeName.value = data[0].name.toLowerCase()
    }
  } catch (e) {
    console.error("Fetch error:", e)
  }
}

const fetchOrgCode = async () => {
  try {
    const res = await employeeAuth.fetchOrgCode({
      code: form.value.org_code
    })
    
    if (res && res.org_id) {
      verifyCode.value = true;
      return true;
    } else {
      verifyCode.value = false;
      return false;
    }
  } catch (e) {
    console.error("Verification Error:", e);
    verifyCode.value = false;
    return false;
  }
}

const handleRegister = async () => {

  if (form.value.password !== form.value.confirm_password) {
    alert("Passwords do not match!")
    return
  }

  try {
    startLoading(); 

    if (selectedTypeName.value === 'organization') {
      const result = await auth.register({
        ...form.value,
        acctype_id: selectedType.value,
        role: userRole.value
      })
      processResult(result);

    } else {
      await fetchOrgCode();

      if (verifyCode.value) {
        const result = await auth.register({
          ...form.value,
          acctype_id: selectedType.value,
          role: userRole.value
        })
        processResult(result);
      } else {

        form.value.password = '';
        form.value.confirm_password = '';
        form.value.org_code = '';
        alert('Invalid registration Code');
      }
    }
  } catch (e) {
    alert(e.data?.statusMessage || 'Registration failed');
  } finally {
    stopLoading();
  }
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
const processResult = async (result) => {
  if (result && (result.autoLogin || result.success)) {
    registerModal.value = false;

    const currentUser = result.user || auth.user;
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

    const sessionUserId = currentUser?.user_id || currentUser?.id || '';
    userSession.value = sessionUserId;
    userRole.value = currentUser?.role || '';

    await navigateTo(getPostLoginRoute(currentUser?.role || ''));
  } else {
    alert('Registration successful! Please sign in.');
    registerModal.value = false;
    loginModal.value = true;
  }
}


onMounted(async() => {
  await callAccType()
})
watch(selectedType, (newVal)=>{
  if(newVal === 1 ){
    userRole.value = "client";
  }else{
    userRole.value = "employee"
  }
  
})
</script>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.22s ease;
}
.modal-fade-enter-active > div,
.modal-fade-leave-active > div {
  transition: transform 0.22s ease, opacity 0.22s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
.modal-fade-enter-from > div,
.modal-fade-leave-to > div {
  opacity: 0;
  transform: translateY(10px) scale(0.98);
}
</style>
