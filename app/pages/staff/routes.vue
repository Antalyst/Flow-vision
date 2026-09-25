<template>
  <EmployeeStagesView />
</template>

<script setup lang="ts">
import EmployeeStagesView from '~/components/employee/EmployeeStagesView.vue'

useSeoMeta({
  title: 'FlowVision | Document Routes',
  description: 'Configure and order document routing steps across your organization.'
})

definePageMeta({ layout: 'staff' })
</script>
