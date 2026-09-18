<template>
  <UserManagementComp />
</template>

<script setup lang="ts">
useSeoMeta({
  title: 'FlowVision | Team Members',
  description: 'Manage who has access, assign roles, and control permissions across your organization.'
})
import UserManagementComp from '~/components/client/users/UserManagementComp.vue'

definePageMeta({ layout: 'client' })
</script>
