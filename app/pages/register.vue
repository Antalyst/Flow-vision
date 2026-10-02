<template>
  <main class="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-transparent font-primary">
    <section class="hidden md:flex flex-col justify-between p-12 bg-onyx-black relative overflow-hidden">
      <div class="absolute inset-0 bg-gradient-to-br from-onyx-black via-[#171717] to-black" aria-hidden="true" />
      <img
        src="/bg/register/register.png"
        alt=""
        class="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[52%] w-full object-cover object-bottom opacity-95"
      >
      <div class="pointer-events-none absolute inset-0 z-20 bg-[radial-gradient(circle_at_50%_70%,rgba(244,125,47,0.24),transparent_35%)]" aria-hidden="true" />

      <NuxtLink
        to="/"
        class="relative z-50 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white-pure transition hover:border-candy-orange hover:text-candy-orange"
        aria-label="Back to home"
      >
        <Icon name="ph:arrow-left-bold" class="h-4 w-4" />
      </NuxtLink>

      <div class="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center px-10 text-center">
        <img src="/logo/new-logo.png" alt="FlowVision" class="mb-5 h-20 w-auto pointer-events-auto">
        <h1 class="font-primary font-extrabold text-white text-3xl tracking-wide">FLOW VISION</h1>
        <p class="mt-2 font-dashboard text-[14px] font-semibold text-white-pure">
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

      <div class="w-full max-w-[410px]">
        <div class="mb-8 text-center">
          <h2 class="font-primary font-bold dark:text-white-pure text-neutral-900 text-3xl tracking-tight mb-1">
            WELCOME
          </h2>
          <span class="font-dashboard text-xs text-white-muted uppercase tracking-wider mb-8 block">
            Secure Gateway Register
          </span>
        </div>

        <div class="mb-6 flex w-full rounded-lg border border-zinc-200 bg-white p-1 dark:border-onyx-border dark:bg-onyx-card">
          <button
            v-for="accType in accTypeData"
            :key="accType.accType_id"
            type="button"
            class="flex-1 rounded-md py-2 text-sm font-semibold capitalize transition-all"
            :class="selectedType === accType.acctype_id
              ? 'bg-candy-orange text-white-pure shadow-md shadow-candy-orange/25'
              : 'text-white-muted hover:text-onyx-black dark:hover:text-white-pure'"
            @click="selectType(accType)"
          >
            {{ accType.name }}
          </button>
        </div>

        <form @submit.prevent="handleRegister" class="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div class="flex flex-col gap-1.5 md:col-span-2">
            <label class="font-dashboard text-[14px] font-medium text-neutral-700 dark:text-white-muted">Full name</label>
            <input v-model="form.full_name" :class="inputClass" type="text" required placeholder="Juan D. Dela Cruz">
          </div>

          <div class="flex flex-col gap-1.5 md:col-span-2">
            <label class="font-dashboard text-[14px] font-medium text-neutral-700 dark:text-white-muted">Email Address</label>
            <input v-model="form.email" :class="inputClass" type="email" required placeholder="Example@gmail.com">
          </div>

          <div v-if="selectedTypeName === 'employee'" class="flex flex-col gap-1.5 md:col-span-2">
            <label class="font-dashboard text-[14px] font-medium text-candy-orange">Organization code</label>
            <input
              v-model="form.org_code"
              :class="[inputClass, 'border-candy-orange/50 dark:border-candy-orange/60']"
              type="text"
              required
              placeholder="Enter provided code"
            >
          </div>

          <div v-if="selectedTypeName === 'employee'" class="flex items-center gap-2 md:col-span-2">
            <input type="checkbox" id="prevalidationToggle" v-model="requiresEmployeeId" class="h-4 w-4 rounded border-gray-300 text-candy-orange focus:ring-candy-orange dark:border-onyx-border dark:bg-onyx-black dark:ring-offset-onyx-card">
            <label for="prevalidationToggle" class="font-dashboard text-[14px] font-medium text-neutral-700 dark:text-white-muted cursor-pointer">
              My organization requires Employee Pre-Validation
            </label>
          </div>

          <div v-if="selectedTypeName === 'employee' && requiresEmployeeId" class="flex flex-col gap-1.5 md:col-span-2">
            <label class="font-dashboard text-[14px] font-medium text-candy-orange">Employee ID Number</label>
            <input
              v-model="form.employee_id_number"
              :class="[inputClass, 'border-candy-orange/50 dark:border-candy-orange/60']"
              type="text"
              required
              placeholder="Enter your Employee ID"
            >
          </div>


          <div class="flex flex-col gap-1.5 md:col-span-2">
            <label class="font-dashboard text-[14px] font-medium text-neutral-700 dark:text-white-muted">Birth date</label>
            <input v-model="form.birth_date" type="date" :class="inputClass">
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="font-dashboard text-[14px] font-medium text-neutral-700 dark:text-white-muted">Password</label>
            <input v-model="form.password" :class="inputClass" type="password" required placeholder="Password">
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="font-dashboard text-[14px] font-medium text-neutral-700 dark:text-white-muted">Confirm</label>
            <input v-model="form.confirm_password" :class="inputClass" type="password" required placeholder="Password">
          </div>

          <button type="submit" :class="primaryBtnClass" class="md:col-span-2">
            Register
          </button>
        </form>

        <p class="mt-5 font-dashboard text-[14px] text-neutral-700 dark:text-white-muted">
          Already Have Account?
          <NuxtLink to="/login" class="font-semibold text-candy-orange transition hover:text-candy-hover">
            Login
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
const employeeAuth = useEmployeeAuthStore()

const inputClass = computed(() =>
  'dark:bg-transparent dark:border-b dark:border-onyx-border rounded-none focus:border-candy-orange outline-none text-sm w-full py-2.5 border-b border-neutral-400 bg-transparent text-neutral-900 dark:text-white-pure placeholder:text-white-muted transition-colors'
)

const primaryBtnClass =
  'bg-candy-orange text-white hover:bg-candy-hover font-bold text-sm tracking-wide rounded-lg py-3.5 w-full uppercase transition-all duration-300 shadow-md shadow-candy-orange/10'

const auth = useAuthStore()
const registerModal = ref(false)
const loginModal = ref(false)
const accTypeData = ref([])
const selectedType = ref(null)
const userRole = ref("")
const verifyCode = ref(false)
const selectedTypeObj = ref(null)
const selectedTypeName = ref('')
const requiresEmployeeId = ref(false)

const selectType = (accType) => {
  selectedType.value = accType.acctype_id
  selectedTypeName.value = accType.name.toLowerCase()
}

const form = ref({
  full_name: '',
  email: '',
  acctype_id: selectedType.value,
  role:userRole.value,
  birth_date: '',
  password: '',
  confirm_password: '',
  org_code: '',
  employee_id_number: ''
})

// dynamic checking logic removed per request

const getPostLoginRoute = (role = '') => {
  const map = {
    client: '/client/dashboard',
    employee: '/employee/dashboard',
    employee_sub_user: '/employee/dashboard',
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
        accType_id: selectedType.value,
        role: userRole.value
      })
      processResult(result);

    } else {
      await fetchOrgCode();

      if (verifyCode.value) {
        const result = await auth.register({
          ...form.value,
          accType_id: selectedType.value,
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

const processResult = async (result) => {
  if (result && (result.autoLogin || result.success)) {
    registerModal.value = false;

    // The server already started the session (HttpOnly cookie).
    const currentUser = result.user || auth.user;
    await navigateTo(getPostLoginRoute(currentUser?.role || ''));
  } else {
    alert('Registration successful! Please sign in.');
    registerModal.value = false;
    loginModal.value = true;
    await navigateTo('/login');
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
