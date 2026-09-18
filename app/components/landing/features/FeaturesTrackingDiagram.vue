<template>
  <div class="features-tracking-diagram w-full">
    <div
      class="relative overflow-hidden rounded-2xl p-4 sm:p-6"
      :class="wellClass"
    >
      <svg
        viewBox="0 0 720 280"
        class="h-auto w-full"
        role="img"
        aria-label="Decentralized document tracking flow diagram"
      >
        <defs>
          <linearGradient id="flow-line" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#F47D2F" stop-opacity="0.2" />
            <stop offset="50%" stop-color="#F47D2F" stop-opacity="0.9" />
            <stop offset="100%" stop-color="#F47D2F" stop-opacity="0.2" />
          </linearGradient>
          <filter id="node-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g fill="none" stroke-width="2">
          <path
            v-for="edge in edges"
            :key="edge.id"
            :d="edge.d"
            :stroke="isEdgeActive(edge) ? 'url(#flow-line)' : edgeStroke"
            :stroke-opacity="isEdgeActive(edge) ? 1 : 0.35"
            class="transition-all duration-300 ease-out"
          />
        </g>

        <circle
          v-if="activeNode"
          r="4"
          fill="#F47D2F"
          filter="url(#node-glow)"
        >
          <animateMotion
            dur="3s"
            repeatCount="indefinite"
            :path="pulsePath"
          />
        </circle>

        <g
          v-for="node in nodes"
          :key="node.id"
          class="cursor-pointer transition-all duration-300 ease-out"
          :filter="activeNode === node.id ? 'url(#node-glow)' : undefined"
          @click="selectNode(node.id)"
          @keydown.enter="selectNode(node.id)"
        >
          <rect
            :x="node.x - 52"
            :y="node.y - 28"
            width="104"
            height="56"
            rx="10"
            :fill="nodeFill(node.id)"
            :stroke="nodeStroke(node.id)"
            stroke-width="1.5"
            class="transition-all duration-300 ease-out"
          />
          <text
            :x="node.x"
            :y="node.y - 4"
            text-anchor="middle"
            class="fill-white text-[14px] font-semibold"
            style="font-family: Inter, system-ui, sans-serif"
          >
            {{ node.label }}
          </text>
          <text
            :x="node.x"
            :y="node.y + 12"
            text-anchor="middle"
            class="text-[12px]"
            :class="isLandingDark ? 'fill-neutral-500' : 'fill-zinc-500'"
            style="font-family: Inter, system-ui, sans-serif"
          >
            {{ node.sublabel }}
          </text>
        </g>
      </svg>

      <div
        class="mt-6 rounded-2xl p-5 sm:p-6"
        :class="detailClass"
      >
        <p class="text-xs text-neutral-500">
          {{ activeNodeData?.label ?? 'Overview' }}
        </p>
        <p class="mt-2 text-sm leading-relaxed" :class="descClass">
          {{ activeNodeData?.description ?? 'Every packet traverses authenticated hops with immutable audit lineage and sub-second SLA telemetry.' }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { isLandingDark } = useLandingTheme()

type NodeId = 'client' | 'office-a' | 'transit' | 'office-b' | 'messenger' | 'archive'

const nodes: Array<{
  id: NodeId
  label: string
  sublabel: string
  description: string
  x: number
  y: number
}> = [
  {
    id: 'client',
    label: 'Client Portal',
    sublabel: 'Submit & track',
    description: 'Clients initiate custody with encrypted upload, policy checks, and live status subscriptions.',
    x: 80,
    y: 140,
  },
  {
    id: 'office-a',
    label: 'Office Node A',
    sublabel: 'Intake & classify',
    description: 'Edge AI classifies documents locally, assigns routing priority, and seals checksum metadata.',
    x: 220,
    y: 80,
  },
  {
    id: 'transit',
    label: 'Transit Mesh',
    sublabel: 'Courier relay',
    description: 'QR-authenticated handoffs bind courier identity, GPS, and timestamp at every physical touchpoint.',
    x: 360,
    y: 140,
  },
  {
    id: 'office-b',
    label: 'Office Node B',
    sublabel: 'Review & approve',
    description: 'Downstream offices receive pre-scored packets with SLA countdowns and bottleneck forecasts.',
    x: 500,
    y: 80,
  },
  {
    id: 'messenger',
    label: 'Messenger',
    sublabel: 'Last-mile scan',
    description: 'Field couriers close the loop with zero-ambiguity pickup and delivery proof.',
    x: 580,
    y: 200,
  },
  {
    id: 'archive',
    label: 'Archive Vault',
    sublabel: 'Immutable store',
    description: 'Completed records enter checksum-sealed long-term retention with full lineage export.',
    x: 660,
    y: 140,
  },
]

const edges = [
  { id: 'c-a', from: 'client', to: 'office-a', d: 'M 132 140 Q 170 110 168 80' },
  { id: 'a-t', from: 'office-a', to: 'transit', d: 'M 272 80 Q 310 100 308 140' },
  { id: 't-b', from: 'transit', to: 'office-b', d: 'M 412 140 Q 450 100 448 80' },
  { id: 'b-m', from: 'office-b', to: 'messenger', d: 'M 552 108 Q 570 160 528 200' },
  { id: 'm-a', from: 'messenger', to: 'archive', d: 'M 632 200 Q 660 180 608 140' },
  { id: 'c-t', from: 'client', to: 'transit', d: 'M 132 148 Q 240 200 308 148' },
]

const activeNode = ref<NodeId | null>('transit')

const activeNodeData = computed(() =>
  nodes.find((node) => node.id === activeNode.value) ?? null,
)

const pulsePath = computed(() => {
  const edge = edges.find((e) => e.from === activeNode.value || e.to === activeNode.value)
  return edge?.d ?? edges[2].d
})

const edgeStroke = computed(() =>
  isLandingDark.value ? 'rgba(115,115,115,0.5)' : 'rgba(0,0,0,0.2)',
)

const wellClass = computed(() =>
  isLandingDark.value ? 'bg-neutral-950' : 'bg-zinc-50 border border-zinc-200',
)

const detailClass = computed(() =>
  isLandingDark.value ? 'bg-neutral-900' : 'bg-white border border-zinc-200',
)

const descClass = computed(() =>
  isLandingDark.value ? 'text-neutral-400' : 'text-zinc-600',
)

function nodeFill(id: NodeId) {
  const active = activeNode.value === id
  if (isLandingDark.value) {
    return active ? 'rgba(244,125,47,0.15)' : 'rgba(23,23,23,0.95)'
  }
  return active ? 'rgba(244,125,47,0.12)' : 'rgba(255,255,255,0.95)'
}

function nodeStroke(id: NodeId) {
  return activeNode.value === id ? '#F47D2F' : (isLandingDark.value ? 'rgba(64,64,64,1)' : 'rgba(0,0,0,0.1)')
}

function isEdgeActive(edge: { from: string, to: string }) {
  if (!activeNode.value) return false
  return edge.from === activeNode.value || edge.to === activeNode.value
}

function selectNode(id: NodeId) {
  activeNode.value = activeNode.value === id ? null : id
}
</script>
