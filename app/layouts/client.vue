<template>
  <div class="min-h-screen w-full font-primary sticky top-0 relative">
    <nav class="flex justify-between items-center p-4 px-28">
      <div class="flex items-center">
        <img class="w-[50px] h-auto" src="/logo/Logos.png" alt="FlowVision Logo">
        <h1 class="text-heading text-heading-dark font-bold">FlowVision</h1>
      </div>
      <h1 class="text-center text-2xl pl-40" v-if="auth.currentOrg">
        {{ auth.currentOrg.name }}
      </h1>
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
          <template v-if="auth.isLoggedIn">
             <span class="text-sm font-medium self-center">Hi, {{ auth.user?.full_name }}</span>
             <button @click="auth.logout()" class="px-4 py-2 text-sm text-red-500 font-medium transition">Logout</button>
          </template>
        </div>
      </div>
    </nav>
    <main class="p-2 mx-auto">
      <slot />
    </main>
  </div>
</template>

<script setup>
import { useAuthStore } from '~/stores/auth'

const auth = useAuthStore() 
onMounted(() => {
    if (auth.isLoggedIn && !auth.currentOrg) {
        auth.fetchMyOrg();
    }
});
</script>