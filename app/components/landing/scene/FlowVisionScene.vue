<template>
  <div
    ref="rootRef"
    class="relative h-full w-full overflow-hidden"
    @pointermove="handlePointerMove"
  >
    <canvas ref="canvasRef" class="block h-full w-full" aria-hidden="true" />

    <div
      v-if="showFallback"
      class="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,106,42,0.14),transparent_60%)]"
      aria-hidden="true"
    />

    <div
      v-for="label in labels"
      :key="label.id"
      class="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-flow-muted/30 bg-flow-void/70 px-3 py-1 font-dashboard text-xs uppercase tracking-wider text-flow-ink transition-opacity duration-500"
      :style="{ left: `${label.x}px`, top: `${label.y}px`, opacity: label.visible ? 1 : 0 }"
    >
      {{ label.label }}
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FlowVisionSceneHandle, FlowVisionSceneState, LabelPosition } from './useFlowVisionScene'

const props = withDefaults(defineProps<{
  initialState?: FlowVisionSceneState
  eager?: boolean
}>(), {
  initialState: 'idle',
  eager: false,
})

const emit = defineEmits<{ ready: [] }>()

const { prefersReducedMotion, isLowPower } = useScenePreferences()

const rootRef = ref<HTMLElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const labels = ref<LabelPosition[]>([])
const showFallback = ref(false)

let handle: FlowVisionSceneHandle | null = null
let creating = false
let resizeObserver: ResizeObserver | null = null
let intersectionObserver: IntersectionObserver | null = null

async function ensureScene() {
  if (handle || creating || !canvasRef.value || !rootRef.value) return

  if (prefersReducedMotion.value) {
    showFallback.value = true
    return
  }

  creating = true
  const rect = rootRef.value.getBoundingClientRect()

  try {
    const { createFlowVisionScene } = await import('./useFlowVisionScene')
    handle = await createFlowVisionScene(canvasRef.value, {
      lowPower: isLowPower.value,
      width: rect.width || 1,
      height: rect.height || 1,
      onReset: () => {
        handle = null
      },
      onLabelsUpdate: (next) => {
        labels.value = next
      },
    })
    handle.setState(props.initialState)
    showFallback.value = false
    emit('ready')
  }
  catch {
    showFallback.value = true
  }
  finally {
    creating = false
  }
}

function handlePointerMove(event: PointerEvent) {
  if (!rootRef.value) return
  const rect = rootRef.value.getBoundingClientRect()
  if (!rect.width || !rect.height) return
  const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  const y = ((event.clientY - rect.top) / rect.height) * 2 - 1
  handle?.setPointer(x, y)
}

defineExpose({
  setState: (state: FlowVisionSceneState) => handle?.setState(state),
  setProgress: (progress: number) => handle?.setProgress(progress),
})

onMounted(() => {
  if (!rootRef.value) return

  intersectionObserver = new IntersectionObserver((entries) => {
    const entry = entries[0]
    if (!entry) return

    if (entry.isIntersecting) {
      if (handle) handle.resume()
      else ensureScene()
    }
    else {
      handle?.pause()
    }
  }, { rootMargin: '200px' })
  intersectionObserver.observe(rootRef.value)

  resizeObserver = new ResizeObserver((entries) => {
    const entry = entries[0]
    if (!entry) return
    handle?.onResize(entry.contentRect.width, entry.contentRect.height)
  })
  resizeObserver.observe(rootRef.value)

  if (props.eager) ensureScene()
})

onUnmounted(() => {
  intersectionObserver?.disconnect()
  resizeObserver?.disconnect()
  intersectionObserver = null
  resizeObserver = null
  handle?.dispose()
  handle = null
})
</script>
