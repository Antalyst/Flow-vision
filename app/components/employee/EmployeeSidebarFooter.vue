<template>
  <AppSidebarProfile
    :user="user"
    :minimized="minimized"
    accent="orange"
    fallback-name="Employee"
    @logout="emit('logout')"
  />
</template>

<script setup>
import AppSidebarProfile from '~/components/shared/AppSidebarProfile.vue'

defineProps({
  user: { type: Object, default: null },
  minimized: { type: Boolean, default: false }
})
const emit = defineEmits(['logout'])
</script>
