<template>
  <div class="space-y-6 pb-24 lg:pb-8">
    <header>
      <div class="mb-2 flex items-center gap-2 text-sm" :class="mutedClass">
        <Icon name="ph:question-fill" class="h-4 w-4 text-candy-orange" />
        <span>Support</span>
        <Icon name="ph:caret-right" class="h-3 w-3" />
        <span class="font-medium" :class="headingClass">Help Center</span>
      </div>
      <h1 class="text-2xl font-bold tracking-tight sm:text-3xl" :class="headingClass">Help &amp; Documentation</h1>
      <p class="mt-1 text-sm" :class="mutedClass">Ask a question about tracking, compliance, or platform operations.</p>
    </header>

    <div class="relative">
      <Icon name="ph:magnifying-glass" class="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2" :class="mutedClass" />
      <input
        v-model="query"
        type="search"
        placeholder="How do I track my missing document?"
        class="w-full rounded-none border py-4 pl-12 pr-4 text-sm outline-none transition-all duration-200 focus:border-candy-orange focus:ring-1 focus:ring-candy-orange shadow-sm"
        :class="inputClass"
        @keydown.enter.prevent="runSearch"
      />
    </div>

    <div v-if="!query.trim()" class="grid gap-3 sm:grid-cols-2">
      <button
        v-for="article in defaults"
        :key="article.id"
        type="button"
        class="rounded-none border px-5 py-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-candy-orange/50"
        :class="panelClass"
        @click="selectArticle(article)"
      >
        <p class="text-sm font-semibold" :class="headingClass">{{ article.title }}</p>
        <p class="mt-1 text-xs" :class="mutedClass">{{ article.summary }}</p>
      </button>
    </div>

    <TransitionGroup name="help-card" tag="div" class="space-y-3">
      <article
        v-for="match in results"
        :key="match.article.id"
        class="rounded-none border px-6 py-6 shadow-sm transition-all duration-300"
        :class="panelClass"
      >
        <h2 class="text-sm font-bold" :class="headingClass">{{ match.article.title }}</h2>
        <p class="mt-1 text-xs" :class="mutedClass">{{ match.article.summary }}</p>
        <ol class="mt-4 list-decimal space-y-2 pl-5 text-sm" :class="mutedClass">
          <li v-for="(step, idx) in match.article.steps" :key="idx">{{ step }}</li>
        </ol>
      </article>
    </TransitionGroup>

    <div
      v-if="query.trim() && !results.length"
      class="rounded-none border px-4 py-8 text-center text-sm shadow-sm"
      :class="panelClass"
    >
      <p :class="mutedClass">No direct match found. Try keywords like <span class="text-candy-orange font-semibold">flagged</span>, <span class="text-candy-orange font-semibold">track</span>, or <span class="text-candy-orange font-semibold">SLA</span>.</p>
    </div>

    <!-- Contact Support Callout -->
    <div class="mt-8 rounded-none border p-6 sm:flex sm:items-center sm:justify-between shadow-sm transition-all duration-300" :class="panelClass">
      <div class="sm:pr-8">
        <h3 class="text-sm font-bold" :class="headingClass">Still need help?</h3>
        <p class="mt-1 text-xs" :class="mutedClass">If you cannot find the answer to your question in our documentation, you can submit a direct feedback ticket to our operations team.</p>
      </div>
      <div class="mt-4 sm:mt-0 sm:flex-shrink-0">
        <NuxtLink
          to="/client/feedback"
          class="inline-flex items-center justify-center gap-2 rounded-none bg-candy-orange px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#e95a0b] active:scale-[0.98]"
        >
          <Icon name="ph:paper-plane-tilt-fill" class="h-4 w-4" />
          Contact Support
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getDefaultHelpArticles, matchHelpQuery, type HelpArticle } from '~/utils/helpNlp'

definePageMeta({ layout: 'client' })

const { isDark } = useTheme()
const query = ref('')
const results = ref<Array<{ article: HelpArticle; score: number }>>([])
const defaults = getDefaultHelpArticles()

const headingClass = computed(() => (isDark.value ? 'text-white-pure' : 'text-onyx-black'))
const mutedClass = computed(() => (isDark.value ? 'text-gray-400' : 'text-gray-500'))
const panelClass = computed(() => (isDark.value ? 'border-onyx-border bg-onyx-black' : 'border-zinc-200 bg-white'))
const inputClass = computed(() => (isDark.value ? 'border-onyx-border bg-onyx-card text-white-pure placeholder:text-gray-500' : 'border-zinc-200 bg-white text-onyx-black placeholder:text-gray-400'))

function runSearch() {
  results.value = matchHelpQuery(query.value)
}

function selectArticle(article: HelpArticle) {
  query.value = article.keywords[0] ?? article.title
  results.value = [{ article, score: 10 }]
}

watch(query, (val) => {
  if (!val.trim()) {
    results.value = []
    return
  }
  results.value = matchHelpQuery(val)
})
</script>

<style scoped>
.help-card-enter-active,
.help-card-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.help-card-enter-from,
.help-card-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
.help-card-move {
  transition: transform 0.2s ease;
}
</style>
