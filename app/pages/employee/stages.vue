<template>
  <EmployeeStagesView />
</template>

<script setup lang="ts">
import EmployeeStagesView from '~/components/employee/EmployeeStagesView.vue'

useSeoMeta({
  title: 'Workflow Steps - FlowVision',
  description: 'Configure and order document routing steps across your organisation and local offices.'
})

definePageMeta({ layout: 'employee' })
</script>

