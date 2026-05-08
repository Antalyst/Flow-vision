

<template>
  <div class="min-h-dvh bg-gray-50/50 font-primary">
    <div v-if="auth.needsOrgSetup" class="fixed inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-md p-4">
      <div class="w-full max-w-lg bg-white p-10 rounded-md shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100 transition-all">
        
        <div class="flex flex-col items-center text-center mb-8">
          <div class=" p-4 rounded-2xl mb-4">
            <img src="/logo/Logos.png" class="w-16 h-auto" alt="FlowVision">
          </div>
          <h2 class="text-3xl font-bold text-gray-900">Welcome to FlowVision</h2>
          <p class="text-gray-500 mt-2 text-md leading-relaxed">
            Every great workflow starts with an organization. <br /> Let's create yours to get started.
          </p>
        </div>

        <form @submit.prevent="handleCreateOrg" class="space-y-6">
          <div class="flex flex-col gap-2">
            <label class="text-xs font-semibold uppercase tracking-wider text-gray-400 ml-1">
              Organization Name
            </label>
            <input 
              v-model="orgData.name"
              type="text" 
              placeholder="e.g. Acme Corporation"
              required
              class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-md outline-none focus:ring-2 focus:ring-[#F77934]/20 focus:border-[#F77934] transition-all text-gray-700 placeholder:text-gray-300"
            >
          </div>

         <button 
            type="submit"
            class="w-full py-4 bg-[#F77934] hover:bg-[#e06b2a] text-white rounded-md font-bold transition-all transform active:scale-[0.98]"
            >
            Setup Organization
            </button>
        </form>
      </div>
    </div>

    <div v-else>
      <slot />
    </div>
  </div>
</template>

<script setup>
    import { ref, onMounted } from 'vue';
    const auth = useAuthStore();
    
    const orgData = ref({
        name: '',
        user_id: auth.user?.user_id 
    });

    onMounted(() => {
        console.log("Org Setup Component Loaded");
        console.log("User Data:", auth.user);
        console.log("Needs Org Setup:", auth.needsOrgSetup);
    });

    const handleCreateOrg = async () => {
        orgData.value.user_id = auth.user?.user_id;
        
        try {
            await auth.createOrg(orgData.value);
        } catch (error) {
            console.error("Setup failed:", error);
        }
    }
</script>