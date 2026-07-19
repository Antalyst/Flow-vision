<template>
  <OfficeView />
</template>

<script setup lang="ts">
useSeoMeta({
  title: 'FlowVision | Branch Offices',
  description: 'Map out your organizational sub-offices, manage branch locations, and oversee physical routing nodes.'
})
import OfficeView from '~/components/client/offices/officeComp.vue'

definePageMeta({ layout: 'client' })
</script>
