<template>
  <div class="min-h-screen w-full font-primary sticky top-0 relative">
    <nav class="flex justify-between items-center p-4 px-28">
      <div class="flex items-center">
        <img class="w-[50px] h-auto" src="/logo/Logos.png" alt="FlowVision Logo">
        <h1 class="text-heading text-heading-dark font-bold">FlowVision</h1>
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
        <div class="relative hidden sm:flex items-center">
          <input 
            type="text" 
            placeholder="Search documents..."
            class="pl-10 pr-4 py-1.5 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
          <Icon name="material-symbols-light:search" class="absolute left-3 text-xl text-gray-400"/>
        </div>

        <div class="flex gap-2">
      
    
            <button @click="loginModal = true" class="px-4 py-2 text-sm font-medium hover:text-blue-600 transition">Sign in</button>
            <button @click="registerModal = true" class="px-5 py-2 text-sm font-medium bg-primary-btn text-white rounded-md transition shadow-sm">
              Get started
            </button>
     
        </div>
      </div>
    </nav>
  
    <div v-if="registerModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div class="relative bg-white w-full max-w-5xl min-h-[600px] rounded-md shadow-2xl overflow-hidden flex">
          <div class="hidden lg:flex flex-1 relative bg-[url('/bg/bg.png')] bg-cover bg-center items-center justify-center p-12">
              <div class="absolute inset-0 bg-black/20"></div>
              <div class="relative z-10 text-center">
                  <img src="/logo/Logos.png" class="w-20 mx-auto mb-4 brightness-0 invert" alt="FlowVision">
                  <h1 class="text-4xl font-bold text-white tracking-tight">Join FlowVision</h1>
                  <p class="text-white/80 mt-2">Start managing your workflow today.</p>
              </div>
          </div>

          <div class="flex-1 bg-white p-8 md:p-10 flex flex-col justify-center relative overflow-y-auto max-h-[90vh]">
              <button @click="registerModal = false" class="absolute top-6 right-8 text-3xl text-gray-400 hover:text-gray-800 transition">
                  &times;
              </button>

              <div class="w-full max-w-md mx-auto">
                  <div class="mb-6 text-center lg:text-left">
                      <h1 class="text-3xl font-bold text-gray-900 mb-1">Create Account</h1>
                      <p class="text-gray-500 text-sm">Select your account type to get started.</p>
                  </div>

                  <div class="flex bg-gray-100 p-1 rounded-md w-full mb-6">
                      <button 
                          v-for="accType in accTypeData" 
                          :key="accType.accType_id"
                          @click="selectType(accType.accType_id)" 
                          type="button"
                          :class="[
                              'flex-1 py-2 rounded-md text-sm font-bold transition-all capitalize',
                              selectedType === accType.accType_id 
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

                      <div v-if="selectedType == 2" class="flex flex-col gap-1 md:col-span-2">
                          <label class="text-xs font-bold text-[#F77934] uppercase">Organization Code</label>
                          <input v-model="form.org_code" class="w-full px-4 py-2 rounded-md border border-[#F77934] outline-none bg-orange-50/30" type="text" required placeholder="Enter provided code">
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

                  <form @submit.prevent="handlelogin" class="flex flex-col gap-4">
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
        </div>
    </div>
    <main class="p-2 mx-auto">
      <slot />
    </main>
  </div>
</template>

<script setup>
import { useAuthStore } from '~/stores/auth'
const {startLoading, stopLoading} = useLoading();
const showPassword = ref(false);
const auth = useAuthStore() 
const accTypeData = ref([])
const selectedType = ref(null)
const registerModal = ref(false)
const userRole = ref("")
const loginModal = ref(false)


const selectType = (id) => {
  selectedType.value = id
}

const login = ref({
  email: '',
  password: '',
  rememberMe:false
})

const form = ref({
  full_name: '',
  email: '',
  accType_id: selectType.value,
  role:userRole.value,
  birth_date: '',
  password: '',
  confirm_password: ''
})

const callAccType = async () => {
  try {
  
    const data = await $fetch("/api/account_type")
    accTypeData.value = data
    if (data.length > 0) {
      selectedType.value = data[0].accType_id 
    }
  } catch (e) {
    console.error("Fetch error:", e)
  }
}



const handleRegister = async () => {
  if (form.value.password !== form.value.confirm_password) {
    alert("Passwords do not match!")
    return
  }

  try {
  
    const result = await auth.register({
      ...form.value,
      accType_id: selectedType.value,
      role: userRole.value
    })

    if (result.autoLogin) {
      registerModal.value = false
      navigateTo('/client') 
    } else {
      alert('Registration successful! Please sign in.')
      registerModal.value = false
    }
  } catch (e) {
    alert(e.data?.statusMessage || 'Registration failed')
  }
}

const handlelogin = async () => {
  console.log("Attempting login with:", login.value);

  if (!login.value.email || !login.value.password) {
      alert("Please fill in all fields");
      return;
  }

  try {
    startLoading();
    const result = await auth.login(login.value); 
    if (result.success) {
      loginModal.value = false;
      navigateTo("/client");
    }
  } catch (e) {
    alert(e.data?.statusMessage || 'Login failed');
  }finally{
    stopLoading();
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