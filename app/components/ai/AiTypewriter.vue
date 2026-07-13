<template>
  <span>{{ displayedText }}</span>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  text: string
  animate?: boolean
}>()

const emit = defineEmits<{
  (e: 'done'): void
}>()

const displayedText = ref(props.animate ? '' : props.text)
let timer: ReturnType<typeof setInterval> | null = null

const startTyping = () => {
  if (!props.animate) {
    displayedText.value = props.text
    return
  }
  
  let i = 0
  displayedText.value = ''
  timer = setInterval(() => {
    displayedText.value += props.text.charAt(i)
    i++
    // Auto scroll down while typing
    const scrollContainer = document.querySelector('.custom-scrollbar')
    if (scrollContainer) {
      scrollContainer.scrollTop = scrollContainer.scrollHeight
    }
    
    if (i >= props.text.length) {
      if (timer) clearInterval(timer)
      emit('done')
    }
  }, 12) // 12ms per character for a smooth natural typing feel
}

onMounted(() => {
  startTyping()
})

watch(() => props.text, (newVal, oldVal) => {
  if (props.animate && newVal !== oldVal) {
    if (timer) clearInterval(timer)
    startTyping()
  } else {
    displayedText.value = newVal
  }
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>
