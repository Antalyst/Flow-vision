<template>
  <AppSidebarProfile
    :user="user"
    accent="amber"
    fallback-name="Messenger"
    @logout="emit('logout')"
  />
</template>

<script setup>
import AppSidebarProfile from '~/components/shared/AppSidebarProfile.vue'

defineProps({ user: { type: Object, default: null } })
const emit = defineEmits(['logout'])
</script>
