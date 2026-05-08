<template>
  <div>
     <user-side-client-side-org v-if="auth.needsOrgSetup" />
     <div v-else>
       <h1 class="text-2xl font-bold">Client Dashboard</h1>
       <p>Welcome back, {{ auth.user?.full_name }}!</p>
     </div>
  </div>
</template>
<script setup>
definePageMeta({
    layout:"client"
})

const auth = useAuthStore();

</script>