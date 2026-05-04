<template>
  <div class="flex flex-col h-screen w-full font-primary overflow-hidden">
    <nav class="flex justify-between items-center p-4 px-28 sticky top-0 bg-white z-50 border-b flex-none"> 
      <div class="flex items-center">
        <img class="w-[50px] h-auto" src="/logo/Logos.png" alt="FlowVision Logo">
        <h1 class="text-heading text-heading-dark font-bold">FlowVision</h1>
      </div>
      <h1 class="text-center text-2xl pl-40" v-if="auth.currentOrg">
        {{ auth.currentOrg.name }}-{{ auth.currentOrg.code }}
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

    <div class="flex flex-1 overflow-hidden">
      <aside class="w-[240px] border-r overflow-y-auto bg-white flex-none">
        <ul class="p-4 flex flex-col gap-2">
          <div class="flex flex-col gap-2"> 
            <h1 class="font-bold text-gray-400 text-sm uppercase">Navigation</h1>
            <div class="flex flex-col gap-2 pl-4 side-div">
                <li><Icon name="ic:round-dashboard" width="24" height="24" /> Dashboard</li>
                <li><nuxt-link to="/client/office" class="flex items-center gap-2"><Icon name="ic:round-business" width="24" height="24" /> Office</nuxt-link></li>
                <li><Icon name="ic:round-directions" width="24" height="24" /> Routes</li>
                <li><Icon name="ic:round-person" width="24" height="24" /> User</li>
                <li><Icon name="ic:round-dashboard" width="24" height="24" /> Dashboard</li>
                <li><Icon name="ic:round-dashboard" width="24" height="24" /> Dashboard</li>
                <li><Icon name="ic:round-dashboard" width="24" height="24" /> Dashboard</li>
                <li><Icon name="ic:round-dashboard" width="24" height="24" /> Dashboard</li>
            </div>
          </div>
        </ul>
      </aside>

      <main class="flex-1 overflow-y-auto p-2 bg-gray-50">
          <slot />
      </main>
    </div>
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

<style scoped>
.side-div > li {
  display: flex;
  align-items: center; 
  gap: 5px;
  cursor: pointer;
}
.side-div > li:hover {
  color: #3b82f6; 
}
</style>