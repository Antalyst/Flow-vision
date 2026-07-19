<template>
  <UserManagementComp />
</template>

<script setup lang="ts">
useSeoMeta({
  title: 'FlowVision | Team Directory',
  description: 'Manage employee access, assign courier roles, and control permissions across your entire organizational structure.'
})
import UserManagementComp from '~/components/client/users/UserManagementComp.vue'

definePageMeta({ layout: 'client' })
</script>
