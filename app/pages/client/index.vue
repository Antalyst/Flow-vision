<template>
  <div>
     <user-side-client-side-org v-if="auth.needsOrgSetup" />
     <div v-else>
       <slot />
    </div>
    
  </div>
</template>
<script setup>
definePageMeta({
    layout:"client"
})

const auth = useAuthStore();

</script>