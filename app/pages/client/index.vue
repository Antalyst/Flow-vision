<template>
<<<<<<< HEAD
  <div>
      <user-side-client-side-org v-if="auth.needsOrgSetup" />
      <div v-else>
        <h1 class="text-2xl font-bold">Client Dashboard</h1>
        <p>Welcome back, {{ auth.user?.full_name }}!</p>
      </div>
    </div>
=======
  <div />
>>>>>>> 8573f678e67d6a3347dba549b6b3e298ed81c1d3
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'client',
  middleware: () => navigateTo('/client/dashboard'),
})
</script>
