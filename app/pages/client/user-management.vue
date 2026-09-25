<template>
  <UserManagementComp />
</template>

<script setup lang="ts">
useSeoMeta({
  title: 'FlowVision | Team Members',
  description: 'Add employees with their office assignment, provision messengers, and manage access across your organization.'
})
import UserManagementComp from '~/components/client/users/UserManagementComp.vue'

definePageMeta({ layout: 'client' })
</script>
