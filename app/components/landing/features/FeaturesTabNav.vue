<template>
  <nav
    ref="navRef"
    class="features-tab-nav sticky top-[4.25rem] z-40 sm:top-[4.75rem]"
    aria-label="Feature categories"
  >
    <div class="inline-flex max-w-full rounded-full border border-flow-muted/15 bg-flow-void p-1" role="tablist">
      <div class="relative flex gap-0.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <span
          v-if="indicatorStyle"
          class="pointer-events-none absolute inset-y-0.5 rounded-full bg-flow-signal transition-all duration-300 ease-out"
          :style="indicatorStyle"
          aria-hidden="true"
        />

        <button
          v-for="(node, index) in nodes"
          :key="node.id"
          :ref="(el) => setTabRef(el as HTMLElement | null, index)"
          type="button"
          role="tab"
          :aria-selected="modelValue === node.id"
          class="relative z-10 shrink-0 rounded-full px-4 py-2 text-xs font-medium tracking-tight transition-colors duration-300 ease-out sm:px-5 sm:py-2.5"
          :class="modelValue === node.id ? 'text-flow-void' : 'text-flow-muted hover:text-flow-ink'"
          @click="emit('update:modelValue', node.id)"
        >
          <span class="flex items-center gap-1.5 whitespace-nowrap">
            <Icon v-if="node.icon" :name="node.icon" class="hidden h-3.5 w-3.5 sm:block" />
            {{ node.label }}
          </span>
        </button>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import type { FeatureFilterId, FeatureFilterNode } from '~/composables/useFeaturesPage'

const props = defineProps<{
  nodes: FeatureFilterNode[]
  modelValue: FeatureFilterId
}>()

const emit = defineEmits<{
  'update:modelValue': [value: FeatureFilterId]
}>()

const navRef = ref<HTMLElement | null>(null)
const tabRefs = ref<(HTMLElement | null)[]>([])
const indicatorStyle = ref<{ left: string, width: string } | null>(null)

function setTabRef(el: HTMLElement | null, index: number) {
  tabRefs.value[index] = el
}

function updateIndicator(activeIndex: number) {
  const tab = tabRefs.value[activeIndex]
  if (!tab) return

  indicatorStyle.value = {
    left: `${tab.offsetLeft}px`,
    width: `${tab.offsetWidth}px`,
  }
}

watch(
  () => props.modelValue,
  (id) => {
    const index = props.nodes.findIndex((n) => n.id === id)
    nextTick(() => updateIndicator(index >= 0 ? index : 0))
  },
  { immediate: true },
)

onMounted(() => {
  const index = props.nodes.findIndex((n) => n.id === props.modelValue)
  nextTick(() => updateIndicator(index >= 0 ? index : 0))

  if (!import.meta.client) return
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  if (!import.meta.client) return
  window.removeEventListener('resize', onResize)
})

function onResize() {
  const index = props.nodes.findIndex((n) => n.id === props.modelValue)
  updateIndicator(index >= 0 ? index : 0)
}
</script>
