<template>
  <div class="features-tracking-diagram w-full">
    <div class="relative overflow-hidden rounded-2xl border border-flow-muted/15 bg-flow-void p-4 sm:p-6">
      <svg
        viewBox="0 0 720 280"
        class="h-auto w-full"
        role="img"
        aria-label="Decentralized document tracking flow diagram"
      >
        <defs>
          <linearGradient id="flow-line" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#FF6A2A" stop-opacity="0.2" />
            <stop offset="50%" stop-color="#FF6A2A" stop-opacity="0.9" />
            <stop offset="100%" stop-color="#FF6A2A" stop-opacity="0.2" />
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
          fill="#FF6A2A"
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
            class="fill-flow-muted text-[12px]"
            style="font-family: Inter, system-ui, sans-serif"
          >
            {{ node.sublabel }}
          </text>
        </g>
      </svg>

      <div class="mt-6 rounded-2xl border border-flow-muted/15 bg-flow-void p-5 sm:p-6">
        <p class="text-xs text-flow-muted">
          {{ activeNodeData?.label ?? 'Overview' }}
        </p>
        <p class="mt-2 text-sm leading-relaxed text-flow-muted">
          {{ activeNodeData?.description ?? 'Every step is scanned, timestamped, and logged, so the current status is always accurate.' }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
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
    description: 'Clients submit documents online and follow their status the moment they arrive.',
    x: 80,
    y: 140,
  },
  {
    id: 'office-a',
    label: 'Office A',
    sublabel: 'Intake & classify',
    description: 'FlowVision reads each document as it comes in and sorts it automatically.',
    x: 220,
    y: 80,
  },
  {
    id: 'transit',
    label: 'In Transit',
    sublabel: 'Courier relay',
    description: 'A QR scan at every handoff confirms who has the document, and when.',
    x: 360,
    y: 140,
  },
  {
    id: 'office-b',
    label: 'Office B',
    sublabel: 'Review & approve',
    description: 'Receiving offices see documents arrive with their SLA countdown already running.',
    x: 500,
    y: 80,
  },
  {
    id: 'messenger',
    label: 'Messenger',
    sublabel: 'Last-mile scan',
    description: 'A final scan closes the loop with clear proof of pickup and delivery.',
    x: 580,
    y: 200,
  },
  {
    id: 'archive',
    label: 'Archive',
    sublabel: 'Permanent record',
    description: 'Completed documents are stored securely with a full history of every step.',
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

const edgeStroke = 'rgba(139,139,135,0.5)'

function nodeFill(id: NodeId) {
  return activeNode.value === id ? 'rgba(255,106,42,0.15)' : 'rgba(5,5,5,0.95)'
}

function nodeStroke(id: NodeId) {
  return activeNode.value === id ? '#FF6A2A' : 'rgba(139,139,135,0.35)'
}

function isEdgeActive(edge: { from: string, to: string }) {
  if (!activeNode.value) return false
  return edge.from === activeNode.value || edge.to === activeNode.value
}

function selectNode(id: NodeId) {
  activeNode.value = activeNode.value === id ? null : id
}
</script>
