<template>
  <div class="relative flex h-screen max-h-screen w-full overflow-hidden bg-[#F9F9FB] text-slate-800 dark:bg-[#0E0E10] dark:text-slate-100">
    <!-- ── Ambient background orbs for glassmorphism ─────────────────── -->
    <div 
      class="pointer-events-none absolute left-1/4 top-1/4 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px] transition-all duration-1000"
      :class="isLoading ? 'bg-blue-500/40 dark:bg-blue-500/20 scale-125' : 'bg-blue-400/20 dark:bg-blue-600/10 scale-100'"
    ></div>
    <div 
      class="pointer-events-none absolute bottom-1/4 right-1/4 h-[400px] w-[400px] translate-x-1/3 translate-y-1/3 rounded-full blur-[120px] transition-all duration-1000"
      :class="isLoading ? 'bg-red-500/40 dark:bg-red-500/20 scale-125' : 'bg-red-400/20 dark:bg-red-600/10 scale-100'"
    ></div>
    <div 
      class="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[150px] transition-all duration-1000"
      :class="isLoading ? 'bg-yellow-500/30 dark:bg-yellow-500/15 scale-125' : 'bg-yellow-400/10 dark:bg-yellow-600/5 scale-100'"
    ></div>

    <!-- ── Mobile backdrop ───────────────────────────────────────────── -->
    <Transition name="fade">
      <div
        v-if="isSidebarOpen && isMobile"
        class="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
        @click="isSidebarOpen = false"
      ></div>
    </Transition>

    <!-- ── Collapsible sidebar (chat history) ────────────────────────── -->
    <aside
      class="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gray-200 bg-white transition-all duration-300 ease-in-out dark:border-white/5 dark:bg-[#161616] md:static md:z-auto"
      :class="isSidebarOpen ? 'translate-x-0 md:w-64' : '-translate-x-full md:translate-x-0 md:w-0 md:overflow-hidden md:border-r-0'"
    >
      <div class="fv-ai-enter-sidebar flex h-full w-64 flex-col" :class="enterClass">
        <!-- Brand + close (mobile) -->
        <div class="fv-ai-enter-brand flex items-center justify-between px-4 py-4" :class="enterClass">
          <div class="flex items-center gap-2">
            <img :src="brandLogo" alt="FlowVision" class="h-7 w-7" />
            <span class="text-sm font-bold tracking-tight text-neutral-900 dark:text-white">FlowVision</span>
          </div>
          <button
            type="button"
            class="rounded-lg p-1.5 text-neutral-500 transition hover:bg-black/5 md:hidden dark:text-neutral-400 dark:hover:bg-white/5"
            @click="isSidebarOpen = false"
          >
            <Icon name="ph:x" class="h-4 w-4" />
          </button>
        </div>

        <div class="px-3">
          <button
            type="button"
            class="fv-ai-enter-stagger fv-ai-interactive flex w-full items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-neutral-700 transition-all duration-300 hover:scale-[1.02] hover:border-neutral-300 hover:bg-neutral-100 hover:shadow-sm active:scale-[0.98] dark:border-white/10 dark:bg-white/[0.03] dark:text-neutral-300 dark:hover:border-white/20 dark:hover:bg-white/5 dark:hover:text-white"
            :class="enterClass"
            :style="staggerDelay(0, 320)"
            @click="newChat"
          >
            <Icon name="ph:plus" class="h-4 w-4" />
            New chat
          </button>
        </div>

        <!-- Recents -->
        <p
          class="fv-ai-enter-stagger px-5 pb-2 pt-5 text-[13px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500"
          :class="enterClass"
          :style="staggerDelay(1, 320)"
        >
          Recents
        </p>
        <div class="custom-scrollbar flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
          <button
            v-for="(session, index) in sessions"
            :key="session.id"
            type="button"
            class="fv-ai-enter-stagger fv-ai-interactive flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition-all duration-300 hover:translate-x-0.5 hover:shadow-sm active:scale-[0.99]"
            :class="[
              enterClass,
              session.id === activeSessionId
                ? 'bg-blue-50/50 text-blue-700 dark:bg-white/10 dark:text-white font-medium'
                : 'text-neutral-600 hover:bg-neutral-100/70 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-white/5 dark:hover:text-neutral-200',
            ]"
            :style="staggerDelay(index, 390, 55)"
            @click="selectSession(session.id)"
          >
            <Icon name="ph:chat-circle-dots" class="h-4 w-4 flex-shrink-0 opacity-70" />
            <span class="truncate">{{ session.title }}</span>
          </button>

          <p
            v-if="sessions.length === 0"
            class="px-3 py-6 text-center text-xs text-neutral-400 dark:text-neutral-600"
          >
            No conversations yet.
          </p>
        </div>
      </div>
    </aside>

    <!-- ── Main column ───────────────────────────────────────────────── -->
    <div class="fv-ai-enter-workspace flex min-w-0 flex-1 flex-col" :class="enterClass">
      <!-- Top control strip -->
      <header class="flex flex-shrink-0 items-center justify-between gap-2 px-3 py-3 lg:px-5">
        <div class="flex items-center gap-1.5">
          <!-- Gemini-style toggle -->
          <button
            type="button"
            class="fv-ai-enter-stagger fv-ai-interactive rounded-lg p-2 text-neutral-500 transition-all duration-300 hover:scale-105 hover:bg-black/5 active:scale-95 dark:text-neutral-400 dark:hover:bg-white/5"
            :class="enterClass"
            :style="staggerDelay(0, 280)"
            aria-label="Toggle sidebar"
            @click="toggleSidebar"
          >
            <Icon name="ph:list" class="h-5 w-5" />
          </button>

          <button
            type="button"
            class="fv-ai-enter-stagger fv-ai-interactive group inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium text-neutral-500 transition-all duration-300 hover:scale-[1.02] hover:bg-black/5 hover:text-neutral-900 active:scale-[0.98] dark:text-neutral-400 dark:hover:bg-white/5 dark:hover:text-white"
            :class="enterClass"
            :style="staggerDelay(1, 280)"
            @click="backToDashboard"
          >
            <Icon name="ph:arrow-left" class="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            Back to Dashboard
          </button>
        </div>

        <div class="flex items-center gap-2">
          <!-- Scope context badge -->
          <span
            class="fv-ai-enter-brand inline-flex cursor-default items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-300"
            :class="[
              enterClass,
              props.scope === 'LOCAL'
                ? 'border-candy-orange/30 bg-candy-orange/10 text-candy-orange dark:text-candy-orange dark:border-candy-orange/25 dark:bg-candy-orange/[0.08]'
                : 'border-gray-200 bg-white text-neutral-500 dark:border-white/10 dark:bg-white/5 dark:text-neutral-400',
            ]"
          >
            <Icon :name="scopeIcon" class="h-3.5 w-3.5 flex-none" />
            {{ scopeLabel }}
          </span>

          <!-- Live indicator -->
          <span
            class="fv-ai-enter-brand fv-ai-interactive inline-flex cursor-default items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-neutral-500 transition-colors duration-300 hover:border-candy-orange/40 active:scale-95 dark:border-white/10 dark:bg-white/5 dark:text-neutral-300 dark:hover:border-candy-orange/30"
            :class="enterClass"
          >
            <span class="relative flex h-1.5 w-1.5">
              <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-candy-orange opacity-75"></span>
              <span class="relative inline-flex h-1.5 w-1.5 rounded-full bg-candy-orange"></span>
            </span>
            FlowVision AI
          </span>
        </div>
      </header>

      <!-- Split workspace: chat timeline (left 40%) + sliding document canvas (right 60%) -->
      <div class="relative flex min-h-0 flex-1 overflow-hidden">
        <!-- Chat timeline column -->
        <div
          class="flex min-h-0 min-w-0 flex-1 flex-col transition-[padding] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
          :class="isCanvasOpen ? 'lg:pr-[60%]' : ''"
        >
        <!-- Empty welcome hero -->
        <div
          v-if="showSplash && chatHistory.length === 0 && !isLoading && !isHydrating"
          class="flex flex-1 flex-col items-center justify-center px-4 text-center"
        >
          <div
            class="fv-ai-enter-hero mb-6 flex h-16 w-16 items-center justify-center"
            :class="enterClass"
            :style="staggerDelay(0, 420)"
          >
            <svg viewBox="0 0 24 24" fill="none" class="h-10 w-10">
              <path d="M12 0C12 6.62742 17.3726 12 24 12C17.3726 12 12 17.3726 12 24C12 17.3726 6.62742 12 0 12C6.62742 12 12 6.62742 12 0Z" fill="#EE4D2D" />
            </svg>
          </div>
          <h1
            class="fv-ai-enter-hero text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl dark:text-white"
            :class="enterClass"
            :style="staggerDelay(1, 420)"
          >
            Ask about your documents
          </h1>
          <p
            class="fv-ai-enter-hero mt-3 max-w-md text-sm leading-relaxed text-neutral-500 dark:text-neutral-400"
            :class="enterClass"
            :style="staggerDelay(2, 420)"
          >
            <template v-if="props.scope === 'LOCAL'">
              Ask in plain language. FlowVision AI only looks at your own office's records.
            </template>
            <template v-else>
              Ask in plain language. FlowVision AI only looks at your organization's own records.
            </template>
          </p>

          <div
            class="fv-ai-enter-hero mt-6 flex flex-wrap items-center justify-center gap-2"
            :class="enterClass"
            :style="staggerDelay(3, 420)"
          >
            <button
              v-for="example in examplePrompts"
              :key="example"
              type="button"
              class="rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-sm text-neutral-600 transition-colors hover:border-candy-orange/50 hover:text-candy-orange dark:border-white/10 dark:bg-white/5 dark:text-neutral-300"
              @click="inputPrompt = example"
            >
              {{ example }}
            </button>
          </div>
        </div>

        <!-- Fluid chat stream -->
        <div v-else ref="scrollContainer" class="custom-scrollbar flex-1 overflow-y-auto px-4">
          <div class="mx-auto w-full max-w-3xl space-y-6 py-6">
            <div
              v-for="(msg, idx) in chatHistory"
              :key="idx"
              class="flex animate-fadeIn gap-3"
              :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
            >
              <!-- Assistant / error avatar -->
              <div
                v-if="msg.role !== 'user'"
                class="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center"
              >
                <svg viewBox="0 0 24 24" fill="none" class="h-5 w-5">
                  <path d="M12 0C12 6.62742 17.3726 12 24 12C17.3726 12 12 17.3726 12 24C12 17.3726 6.62742 12 0 12C6.62742 12 12 6.62742 12 0Z" fill="url(#avatar-gemini-gradient)" />
                  <defs>
                    <linearGradient id="avatar-gemini-gradient" x1="0" y1="0" x2="24" y2="24">
                      <stop stop-color="#4285F4" />
                      <stop offset="0.5" stop-color="#EA4335" />
                      <stop offset="1" stop-color="#FBBC05" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              <!-- User bubble -->
              <div
                v-if="msg.role === 'user'"
                class="max-w-[80%] rounded-3xl bg-neutral-100 px-5 py-3 text-[17px] text-neutral-800 dark:bg-white/10 dark:text-neutral-200"
              >
                <p class="whitespace-pre-line">{{ msg.content }}</p>
              </div>

              <!-- Error bubble -->
              <div
                v-else-if="msg.role === 'error'"
                class="flex max-w-[85%] items-start gap-2.5 rounded-2xl rounded-tl-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-950/20 dark:text-red-300"
              >
                <Icon name="ph:warning-circle" class="mt-0.5 h-4 w-4 flex-shrink-0" />
                <p>{{ msg.content }}</p>
              </div>

              <!-- Assistant bubble -->
              <div v-else class="min-w-0 max-w-[85%] space-y-3">
                <div class="px-1 py-2 text-[17px] leading-relaxed text-neutral-800 dark:text-neutral-200">
                  <p class="whitespace-pre-line">
                    <AiTypewriter
                      :text="msg.content"
                      :animate="msg.isNew"
                      @done="msg.isNew = false"
                    />
                  </p>
                </div>

                <!-- Document canvas call-to-action (Professional & Minimalist) -->
                <button
                  v-if="msg.documentPayload"
                  type="button"
                  class="fv-ai-interactive group flex w-full items-center gap-3.5 rounded-xl border p-3 text-left transition-all duration-300 active:scale-[0.99]"
                  :class="activeDoc === msg.documentPayload && isCanvasOpen
                    ? 'border-neutral-400 bg-neutral-50 shadow-sm dark:border-neutral-600 dark:bg-white/5'
                    : 'border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50 dark:border-white/10 dark:bg-black/20 dark:hover:border-white/20 dark:hover:bg-white/5'"
                  @click="openCanvas(msg.documentPayload)"
                >
                  <span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-100/50 text-neutral-600 dark:border-white/10 dark:bg-white/5 dark:text-neutral-300">
                    <Icon :name="msg.documentPayload.type === 'spreadsheet' ? 'ph:grid-nine' : 'ph:file-text'" class="h-5 w-5" />
                  </span>
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-[15px] font-semibold text-neutral-900 dark:text-neutral-100">
                      {{ msg.documentPayload.title }}
                    </span>
                    <span class="block text-[14px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                      View document
                    </span>
                  </span>
                  <div class="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 transition-colors group-hover:bg-neutral-200 group-hover:text-neutral-700 dark:bg-white/10 dark:text-neutral-500 dark:group-hover:bg-white/20 dark:group-hover:text-white">
                    <Icon
                      name="ph:arrow-right"
                      class="h-3 w-3 transition-transform group-hover:translate-x-0.5"
                    />
                  </div>
                </button>

                <!-- Semantic Search Inline Document Cards -->
                <div v-if="msg.inlineDocuments && msg.inlineDocuments.length > 0" class="mt-4 space-y-2">
                  <button
                    v-for="doc in msg.inlineDocuments"
                    :key="doc.id"
                    type="button"
                    class="fv-ai-interactive group flex w-full flex-col gap-1 rounded-xl border border-neutral-200 bg-white p-3 text-left transition-all duration-300 active:scale-[0.99] cursor-pointer hover:bg-opacity-80 transition dark:border-white/10 dark:bg-black/20 hover:border-candy-orange/40 hover:shadow-sm"
                    @click="navigateTo(`/client/documents?id=${doc.id}`)"
                  >
                    <div class="flex items-center gap-3">
                      <span class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-candy-orange/20 bg-candy-orange/10 text-candy-orange dark:border-candy-orange/30 dark:bg-candy-orange/20 dark:text-candy-orange">
                        <Icon name="ph:file-text" class="h-4 w-4" />
                      </span>
                      <span class="min-w-0 flex-1">
                        <span class="block truncate text-[15px] font-semibold text-neutral-900 dark:text-neutral-100">
                          {{ doc.title || 'Untitled Document' }}
                        </span>
                        <span class="block text-[14px] text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">
                          {{ doc.description || 'No description provided.' }}
                        </span>
                      </span>
                      <div class="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 transition-colors group-hover:bg-candy-orange/10 group-hover:text-candy-orange dark:bg-white/10 dark:text-neutral-500 dark:group-hover:bg-candy-orange/20 dark:group-hover:text-candy-orange">
                        <Icon name="ph:arrow-right" class="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  </button>
                </div>

                <span class="block px-1 font-mono text-[14px] text-neutral-400 dark:text-neutral-600">{{ msg.timestamp }}</span>
              </div>
            </div>

            <!-- Typing / hydration loader -->
            <div v-if="isLoading || isHydrating" class="flex animate-fadeIn gap-3">
              <AiGeminiLoader class="mt-1 flex-shrink-0" />
              <div class="flex items-center px-1 py-1">
                <Transition name="think" mode="out-in">
                  <span :key="thinkingStageText" class="text-[16px] text-candy-orange italic">{{ thinkingStageText }}</span>
                </Transition>
              </div>
            </div>
          </div>
        </div>

        <!-- Input console -->
        <div
          class="fv-ai-enter-input flex-shrink-0 px-4 pb-5 pt-2 relative z-10"
          :class="enterClass"
        >
          <div class="mx-auto w-full max-w-3xl relative">
            <form
              class="relative fv-ai-interactive flex items-end gap-2 rounded-[32px] border border-white/40 bg-white/40 p-2 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-3xl transition-all duration-300 focus-within:bg-white/60 focus-within:shadow-[0_8px_40px_rgb(0,0,0,0.08)] dark:border-white/10 dark:bg-neutral-900/50 dark:focus-within:bg-neutral-900/80"
              @submit.prevent="submitQuery"
            >
              <textarea
                v-model="inputPrompt"
                :disabled="isLoading"
                rows="1"
                placeholder="Ask a question about your documents…"
                class="max-h-40 flex-1 resize-none bg-transparent px-4 py-3 text-[17px] text-slate-800 placeholder-neutral-500 focus:outline-none disabled:opacity-50 dark:text-slate-200 dark:placeholder-neutral-400"
                @keydown.enter.exact.prevent="submitQuery"
              ></textarea>
              <button
                type="submit"
                :disabled="isLoading || !inputPrompt.trim()"
                class="fv-ai-interactive flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-candy-orange text-white transition-colors duration-300 hover:bg-candy-hover active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Icon v-if="isLoading" name="ph:spinner-gap" class="h-5 w-5 animate-spin" />
                <Icon v-else name="ph:arrow-up" class="h-5 w-5" />
              </button>
            </form>
            <p class="mt-2 text-center text-[14px] text-neutral-500 dark:text-neutral-500">
              FlowVision AI can make mistakes. Double-check anything important.
            </p>
          </div>
        </div>
        </div>
        <!-- ── End chat timeline column ─────────────────────────────────── -->

        <!-- ── Sliding document canvas (right 60%) ──────────────────────── -->
        <section
          class="absolute right-0 top-0 z-20 h-full w-full transform-gpu transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] lg:w-[60%]"
          :class="isCanvasOpen ? 'translate-x-0' : 'pointer-events-none translate-x-full'"
          aria-label="Document canvas"
        >
          <div class="fv-canvas-glass-panel flex h-full w-full flex-col border-l border-neutral-200/50 bg-white/70 shadow-2xl backdrop-blur-3xl dark:border-white/10 dark:bg-[#0a0a0c]/70">
            
            <!-- Minimalist Canvas Header -->
            <div class="flex flex-shrink-0 items-center justify-between px-6 py-4">
              <!-- Left: Document Context -->
              <div class="flex items-center gap-3 min-w-0">
                <Icon
                  :name="isSpreadsheetCanvas ? 'ph:grid-nine' : 'ph:file-text'"
                  class="h-5 w-5 flex-shrink-0 text-neutral-500 dark:text-neutral-400"
                />
                <div class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-semibold tracking-tight text-neutral-900 dark:text-white">
                    {{ documentPayload?.title || 'No Document' }}
                  </span>
                </div>
                <!-- Scope Badge -->
                <span
                  class="hidden sm:inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[13px] font-bold uppercase tracking-wider"
                  :class="props.scope === 'LOCAL'
                    ? 'bg-candy-orange text-candy-hover dark:bg-candy-orange/10 dark:text-candy-orange'
                    : 'bg-neutral-100 text-neutral-600 dark:bg-white/10 dark:text-neutral-400'"
                >
                  {{ scopeLabel }}
                </span>
              </div>

              <!-- Right: Actions -->
              <div class="flex items-center gap-3 flex-shrink-0 ml-4">
                <div v-if="documentPayload" class="flex items-center">
                  <button
                    v-if="isSpreadsheetCanvas"
                    type="button"
                    :disabled="isExporting"
                    class="group inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 active:scale-95 disabled:opacity-50 dark:text-neutral-300 dark:hover:bg-white/10 dark:hover:text-white"
                    @click="downloadAsExcel"
                  >
                    <Icon v-if="isExporting" name="ph:spinner-gap" class="h-4 w-4 animate-spin" />
                    <Icon v-else name="ph:download-simple" class="h-4 w-4" />
                    <span class="hidden sm:inline">Export</span>
                  </button>

                  <button
                    v-else
                    type="button"
                    :disabled="isExporting"
                    class="group inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 active:scale-95 disabled:opacity-50 dark:text-neutral-300 dark:hover:bg-white/10 dark:hover:text-white"
                    @click="downloadAsDocx"
                  >
                    <Icon v-if="isExporting" name="ph:spinner-gap" class="h-4 w-4 animate-spin" />
                    <Icon v-else name="ph:download-simple" class="h-4 w-4" />
                    <span class="hidden sm:inline">Download</span>
                  </button>
                </div>

                <div class="h-4 w-px bg-neutral-300 dark:bg-neutral-700"></div>

                <button
                  type="button"
                  class="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-white/10 dark:hover:text-white"
                  aria-label="Close canvas"
                  @click="closeCanvas"
                >
                  <Icon name="ph:x" class="h-5 w-5" />
                </button>
              </div>
            </div>

            <!-- Paper scroll surface -->
            <div class="fv-canvas-scroll custom-scrollbar relative min-h-0 flex-1 overflow-y-auto px-4 py-8 sm:px-10 lg:px-12 bg-neutral-100/50 dark:bg-black/20">
              
              <!-- High-Contrast Pristine White Document -->
              <article
                v-if="documentPayload"
                class="fv-canvas-paper fv-canvas-article mx-auto w-full min-w-0 bg-white text-neutral-900 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] ring-1 ring-neutral-200 transition-all duration-500"
                :class="isSpreadsheetCanvas
                  ? 'max-w-none rounded-xl px-4 py-5 sm:px-6 sm:py-6'
                  : 'max-w-[850px] rounded-sm px-8 py-12 sm:px-16 sm:py-16'"
              >
                <!-- Document Header -->
                <header
                  class="border-b border-neutral-200 pb-6"
                  :class="isSpreadsheetCanvas ? 'mb-4' : 'mb-8'"
                >
                  <p class="text-[13px] font-bold uppercase tracking-[0.2em] text-neutral-400 mb-2">
                    {{ isSpreadsheetCanvas ? 'FlowVision Data Matrix' : 'FlowVision Document' }}
                  </p>
                  <h1
                    class="font-bold leading-tight tracking-tight text-neutral-900"
                    :class="isSpreadsheetCanvas ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'"
                  >
                    {{ documentPayload.title }}
                  </h1>
                </header>

                <!-- Document Body -->
                <!-- By keeping this entirely out of dark mode, injected inline styles (like dark text) remain perfectly readable -->
                <div
                  class="fv-doc-viewport min-w-0"
                  :class="needsHorizontalScroll ? 'custom-scrollbar overflow-x-auto' : ''"
                >
                  <!-- eslint-disable-next-line vue/no-v-html -->
                  <div
                    ref="canvasBodyRef"
                    class="fv-doc-body leading-relaxed text-neutral-800"
                    :class="[
                      isSpreadsheetCanvas ? 'fv-doc-body--matrix text-sm' : 'text-[17px]',
                    ]"
                    v-html="documentPayload.content"
                  ></div>
                </div>
              </article>

              <!-- Empty State -->
              <div
                v-else
                class="flex h-full min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white/50 px-6 text-center dark:border-neutral-800 dark:bg-[#111113]/50"
              >
                <Icon name="ph:file-dashed" class="h-8 w-8 text-neutral-300 dark:text-neutral-600 mb-3" />
                <p class="text-sm font-medium text-neutral-900 dark:text-neutral-300">No document is open</p>
                <p class="mt-1 text-xs text-neutral-500">Ask FlowVision to generate a report or matrix.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, computed } from 'vue'
import AiGeminiLoader from './AiGeminiLoader.vue'
import AiTypewriter from './AiTypewriter.vue'
import { Document as DocxDocument, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, WidthType, BorderStyle } from 'docx'

// ── Scope props ────────────────────────────────────────────────────────
// AiCanvasWorkspace is role-agnostic; the caller (client/ai.vue or
// employee/ai.vue) stamps the perspective context through these props.
const props = withDefaults(
  defineProps<{
    /** Big Picture (entire org) or Small Picture (employee's offices) */
    scope?: 'GLOBAL' | 'LOCAL'
    /** UUIDs of assigned offices — required when scope === 'LOCAL' */
    officeIds?: string[]
    /** Route to navigate to when the back button is pressed */
    backRoute?: string
    /** Caller role — drives labelling and suggestion chip copy */
    roleContext?: 'client' | 'employee'
  }>(),
  {
    scope:       'GLOBAL',
    officeIds:   () => [],
    backRoute:   '/client/dashboard',
    roleContext: 'client',
  },
)

interface DatasetColumn {
  key: string
  label: string
  type: 'text' | 'longtext' | 'date' | 'number' | 'status'
}
interface SynthesizedDataset {
  format: 'EXCEL' | 'WORD'
  structureType: 'TABULAR_GRID' | 'NARRATIVE_REPORT'
  metadata: { title: string; brandingContext: string; generationDate: string; theme: string; recordCount: number }
  columns: DatasetColumn[]
  canvas: { table: { columns: DatasetColumn[]; rows: Array<Record<string, unknown>> } }
  warnings: string[]
}
interface ChatMessage {
  role: 'user' | 'assistant' | 'error'
  content: string
  timestamp: string
  documentPayload?: DocumentPayload | null
  inlineDocuments?: Record<string, any>[] | null
  isNew?: boolean
}
interface ChatSession {
  id: string
  title: string
  created_at?: string
}

interface StoredMessage {
  role: 'user' | 'assistant'
  content: string
  metadata?: Record<string, any> | null
  created_at?: string
}

const { isDark } = useTheme()
const route = useRoute()
const { enterClass, staggerDelay } = useAiWorkspaceEntrance()
const brandLogo = computed(() => (isDark.value ? '/logo/new-logo.png' : '/logo/new-logo-dark.png'))

// ── Scope-derived helpers ──────────────────────────────────────────────
const scopeLabel = computed(() =>
  props.scope === 'LOCAL' ? 'My Office' : 'All Offices',
)
const scopeIcon = computed(() =>
  props.scope === 'LOCAL' ? 'ph:buildings-fill' : 'ph:globe-hemisphere-west-fill',
)
const examplePrompts = computed(() =>
  props.scope === 'LOCAL'
    ? [
        'Which documents are overdue?',
        'What came in this week?',
        'Anything waiting on me?',
      ]
    : [
        'Which offices are behind schedule?',
        'Summarize this week\'s activity',
        'Which documents are overdue?',
      ],
)

const inputPrompt = ref('')
const isLoading = ref(false)
const isHydrating = ref(false)
const showSplash = ref(true)
const chatHistory = ref<ChatMessage[]>([])
const sessions = ref<ChatSession[]>([])
const activeSessionId = ref<string | null>(null)
const thinkingStageText = ref('Reading secure organization token…')
const scrollContainer = ref<HTMLElement | null>(null)

// ── Document canvas state ──────────────────────────────────────────────
interface DocumentPayload {
  title: string
  content: string
  /** Pre-built row matrix from legacy dataset metadata (header row + data rows). */
  matrix?: string[][]
}
const isCanvasOpen = ref(false)
const documentPayload = ref<DocumentPayload | null>(null)
const activeDoc = ref<DocumentPayload | null>(null)
const canvasBodyRef = ref<HTMLElement | null>(null)
const isExporting = ref(false)

const SPREADSHEET_MARKER = 'fv-spreadsheet-matrix'
const isSpreadsheetCanvas = computed(
  () => Boolean(documentPayload.value?.content?.includes(SPREADSHEET_MARKER))
)
const needsHorizontalScroll = computed(() => {
  const content = documentPayload.value?.content ?? ''
  return isSpreadsheetCanvas.value || /<table[\s>]/i.test(content)
})

// ── Sidebar state ──────────────────────────────────────────────────────
const isSidebarOpen = ref(true)
const isMobile = ref(false)

const updateIsMobile = () => {
  isMobile.value = window.innerWidth < 768
}
const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value
}

// ── Scope-aware suggestion chips ──────────────────────────────────────
const suggestionChips = computed(() =>
  props.scope === 'LOCAL'
    ? [
        { label: 'Summarize documents in my office branches', icon: 'ph:buildings' },
        { label: 'List all pending documents in my offices', icon: 'ph:clock-countdown' },
        { label: 'Generate an office branch transaction audit', icon: 'ph:table' },
      ]
    : [
        { label: 'Summarize all approved documents this quarter', icon: 'ph:check-circle' },
        { label: 'Find records missing verification stages', icon: 'ph:magnifying-glass' },
        { label: 'Generate an organisation-wide ledger review', icon: 'ph:table' },
      ],
)

const thinkingStages = computed(() =>
  props.scope === 'LOCAL'
    ? [
        'Reading secure organisation token…',
        'Isolating branch-level step sequence data bounds...',
        'Mapping routing pipeline topology structures...',
        'Executing semantic query over internal tracking ledger histories...',
        'Hydrating document content from storage…',
        'Assembling office-scoped report structure…',
      ]
    : [
        'Reading secure organisation token…',
        'Applying global routing topology map analysis...',
        'Mapping routing pipeline topology structures...',
        'Executing semantic query over internal tracking ledger histories...',
        'Hydrating distributed document blocks…',
        'Assembling organisation-wide data template…',
      ],
)

let thinkingTimer: ReturnType<typeof setInterval> | null = null

const startThinking = () => {
  let idx = 0
  const stages = thinkingStages.value
  thinkingStageText.value = stages[0]
  thinkingTimer = setInterval(() => {
    idx = (idx + 1) % stages.length
    thinkingStageText.value = stages[idx]
  }, 1400)
}
const stopThinking = () => {
  if (thinkingTimer) {
    clearInterval(thinkingTimer)
    thinkingTimer = null
  }
}

const nowLabel = () =>
  new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
const formatTime = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : nowLabel()

const cellText = (value: unknown): string =>
  value === null || value === undefined || value === '' ? '—' : String(value)

const backToDashboard = () => {
  navigateTo(props.backRoute)
}

// ── Document canvas synthesis & control ────────────────────────────────
const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

// Synthesize a clean, formal HTML report body from a dataset (inline-styled so
// it renders identically inside the v-html paper frame, independent of theme).
const buildDocumentHtml = (dataset: SynthesizedDataset): string => {
  const columns = dataset.canvas?.table?.columns?.length
    ? dataset.canvas.table.columns
    : dataset.columns
  const rows = dataset.canvas?.table?.rows ?? []

  const meta = dataset.metadata
  const intro = `${escapeHtml(meta?.brandingContext || 'FlowVision')}${
    meta?.generationDate ? ` · ${escapeHtml(meta.generationDate)}` : ''
  }`

  if (!rows.length || !columns.length) {
    return `
      <p style="color:#6b7280;font-style:italic;margin:0;">${intro}</p>
      <p style="margin-top:16px;">No structured records were assembled for this request.</p>
    `
  }

  const headCells = columns
    .map(
      (c) =>
        `<th style="text-align:left;padding:10px 12px;border-bottom:2px solid #e5e7eb;font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:#9ca3af;">${escapeHtml(
          c.label
        )}</th>`
    )
    .join('')

  const bodyRows = rows
    .map((row, ri) => {
      const cells = columns
        .map(
          (c) =>
            `<td style="padding:10px 12px;border-bottom:1px solid #f0f1f3;vertical-align:top;color:#374151;">${escapeHtml(
              cellText(row[c.key])
            )}</td>`
        )
        .join('')
      const zebra = ri % 2 ? 'background:#fafafa;' : ''
      return `<tr style="${zebra}">${cells}</tr>`
    })
    .join('')

  return `
    <p style="color:#9ca3af;font-size:12px;margin:0 0 20px;">${intro}</p>
    <h2 style="font-size:15px;font-weight:700;color:#111827;margin:0 0 6px;">Records Overview</h2>
    <p style="margin:0 0 20px;color:#4b5563;">
      This report compiles <strong>${rows.length}</strong> record(s) assembled from your
      organization's documents.
    </p>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead><tr>${headCells}</tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>
  `
}

const openCanvas = (payload: DocumentPayload | null | undefined) => {
  if (!payload) return
  activeDoc.value = payload
  documentPayload.value = payload
  isCanvasOpen.value = true
}

const closeCanvas = () => {
  isCanvasOpen.value = false
}

// ── Native file export (client-side blob compilation) ───────────────────
const escapeXml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const buildExportFilename = (title: string, extension: 'docx' | 'xlsx'): string => {
  const base =
    title
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 80) || 'FlowVision_Export'
  // Stamp the active scope so saved files are self-describing
  const scopeSuffix = props.scope === 'LOCAL' ? '_Office_View' : '_Org_View'
  return `${base}${scopeSuffix}.${extension}`
}

const triggerNativeDownload = (blob: Blob, filename: string) => {
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(objectUrl)
}

const parseCanvasHtml = (htmlContent: string): globalThis.Document => {
  const parser = new DOMParser()
  return parser.parseFromString(htmlContent, 'text/html')
}

const htmlTableToMatrix = (table: HTMLTableElement): string[][] => {
  const matrix: string[][] = []

  if (table.tHead) {
    for (const row of Array.from(table.tHead.rows)) {
      matrix.push(Array.from(row.cells).map((cell) => cell.textContent?.trim() ?? ''))
    }
  }

  const bodyRows = table.tBodies.length
    ? Array.from(table.tBodies).flatMap((body) => Array.from(body.rows))
    : Array.from(table.rows).filter((row) => !row.closest('thead'))

  for (const row of bodyRows) {
    if (table.tHead && row.closest('thead')) continue
    matrix.push(Array.from(row.cells).map((cell) => cell.textContent?.trim() ?? ''))
  }

  return matrix.filter((row) => row.some((cell) => cell.length > 0))
}

const resolveTableMatrix = (payload: DocumentPayload): string[][] => {
  if (payload.matrix?.length) return payload.matrix

  const liveRoot = canvasBodyRef.value
  if (liveRoot) {
    const liveTable =
      liveRoot.querySelector<HTMLTableElement>('.fv-spreadsheet-matrix table') ??
      liveRoot.querySelector<HTMLTableElement>('table')
    if (liveTable) return htmlTableToMatrix(liveTable)
  }

  const parsed = parseCanvasHtml(payload.content)
  const parsedTable =
    parsed.querySelector<HTMLTableElement>('.fv-spreadsheet-matrix table') ??
    parsed.querySelector<HTMLTableElement>('table')
  return parsedTable ? htmlTableToMatrix(parsedTable) : []
}

const processHtmlNode = (node: globalThis.Node): any => {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent?.replace(/\s+/g, ' ') || ''
    if (!text.trim()) return null
    return new TextRun({ text })
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return null
  const el = node as globalThis.Element
  const tagName = el.tagName.toLowerCase()

  // Inline formatting
  if (tagName === 'b' || tagName === 'strong') {
    return Array.from(el.childNodes).map((child) => {
      const parsed = processHtmlNode(child)
      if (parsed instanceof TextRun) return new TextRun({ text: parsed.text, bold: true })
      return parsed
    }).flat().filter(Boolean)
  }
  if (tagName === 'i' || tagName === 'em') {
    return Array.from(el.childNodes).map((child) => {
      const parsed = processHtmlNode(child)
      if (parsed instanceof TextRun) return new TextRun({ text: parsed.text, italics: true })
      return parsed
    }).flat().filter(Boolean)
  }
  if (tagName === 'span' || tagName === 'a') {
    return Array.from(el.childNodes).map(processHtmlNode).flat().filter(Boolean)
  }

  // Block formatting
  if (tagName.match(/^h[1-6]$/)) {
    const level = parseInt(tagName.substring(1), 10)
    const headingTypes = [
      HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3,
      HeadingLevel.HEADING_4, HeadingLevel.HEADING_5, HeadingLevel.HEADING_6
    ]
    const runs = Array.from(el.childNodes).map(processHtmlNode).flat().filter(Boolean) as TextRun[]
    return new Paragraph({
      children: runs.length ? runs : [new TextRun({ text: el.textContent || '' })],
      heading: headingTypes[level - 1],
    })
  }

  if (tagName === 'p' || tagName === 'div') {
    const runs = Array.from(el.childNodes).map(processHtmlNode).flat().filter(Boolean) as TextRun[]
    if (runs.length === 0) return null
    return new Paragraph({ children: runs })
  }

  if (tagName === 'ul' || tagName === 'ol') {
    const listItems: Paragraph[] = []
    Array.from(el.children).forEach((li) => {
      if (li.tagName.toLowerCase() === 'li') {
        const runs = Array.from(li.childNodes).map(processHtmlNode).flat().filter(Boolean) as TextRun[]
        listItems.push(new Paragraph({
          children: runs,
          bullet: { level: 0 }
        }))
      }
    })
    return listItems
  }

  if (tagName === 'table') {
    const rows: TableRow[] = []
    Array.from(el.querySelectorAll('tr')).forEach((tr) => {
      const cells: TableCell[] = []
      Array.from(tr.querySelectorAll('th, td')).forEach((td) => {
        const paragraphs = Array.from(td.childNodes)
          .map(processHtmlNode)
          .flat()
          .filter((n) => n instanceof Paragraph) as Paragraph[]
        
        if (paragraphs.length === 0) {
          paragraphs.push(new Paragraph({ text: td.textContent?.trim() || '' }))
        }
        
        cells.push(new TableCell({
          children: paragraphs,
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" },
            left: { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" },
            right: { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" },
          }
        }))
      })
      if (cells.length > 0) {
        rows.push(new TableRow({ children: cells }))
      }
    })
    
    if (rows.length > 0) {
      return new Table({
        rows,
        width: { size: 100, type: WidthType.PERCENTAGE }
      })
    }
    return null
  }

  // Fallback for unknown elements
  const children = Array.from(el.childNodes).map(processHtmlNode).flat().filter(Boolean)
  return children.length > 0 ? children : null
}

const buildNativeWordDocument = async (title: string, htmlContent: string): Promise<Blob> => {
  const parsed = parseCanvasHtml(htmlContent)
  const sectionsContent: any[] = [
    new Paragraph({
      text: title,
      heading: HeadingLevel.TITLE,
    }),
  ]

  Array.from(parsed.body.childNodes).forEach((node) => {
    const parsedComponent = processHtmlNode(node)
    if (parsedComponent) {
      if (Array.isArray(parsedComponent)) {
        sectionsContent.push(...parsedComponent.filter(c => c instanceof Paragraph || c instanceof Table))
      } else if (parsedComponent instanceof Paragraph || parsedComponent instanceof Table) {
        sectionsContent.push(parsedComponent)
      } else {
        // If it's TextRun, wrap in a Paragraph
        sectionsContent.push(new Paragraph({ children: [parsedComponent].flat() }))
      }
    }
  })

  const doc = new DocxDocument({
    sections: [{
      properties: {},
      children: sectionsContent,
    }]
  })

  return await Packer.toBlob(doc)
}

const buildSpreadsheetXml = (rows: string[][], sheetName: string): string => {
  const safeSheet = escapeXml(sheetName.slice(0, 31) || 'Data')
  const rowXml = rows
    .map((row) => {
      const cells = row
        .map(
          (cell) =>
            `<Cell><Data ss:Type="String">${escapeXml(cell)}</Data></Cell>`
        )
        .join('')
      return `<Row>${cells}</Row>`
    })
    .join('')

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Header">
   <Font ss:Bold="1"/>
   <Interior ss:Color="#F3F4F6" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="${safeSheet}">
  <Table>${rowXml}</Table>
 </Worksheet>
</Workbook>`
}

const downloadAsDocx = async () => {
  const payload = documentPayload.value
  if (!payload?.content || isExporting.value) return

  isExporting.value = true
  try {
    const htmlContent = payload.content
    const blob = await buildNativeWordDocument(payload.title, htmlContent)
    triggerNativeDownload(blob, buildExportFilename(payload.title, 'docx'))
  } catch (error) {
    console.error('Failed to generate native .docx file:', error)
  } finally {
    isExporting.value = false
  }
}

const downloadAsExcel = () => {
  const payload = documentPayload.value
  if (!payload?.content || isExporting.value) return

  isExporting.value = true
  try {
    const matrix = resolveTableMatrix(payload)
    if (!matrix.length) return

    const spreadsheetXml = buildSpreadsheetXml(matrix, payload.title)
    const blob = new Blob(['\ufeff', spreadsheetXml], {
      type: 'application/vnd.ms-excel',
    })
    triggerNativeDownload(blob, buildExportFilename(payload.title, 'xlsx'))
  } finally {
    isExporting.value = false
  }
}

// Resolve a DocumentPayload from a persisted metadata object. Supports the
// unified { documentPayload: { title, htmlContent } } contract, and falls back
// to synthesizing HTML from any legacy dataset-grid metadata.
const extractDocumentPayload = (metadata: unknown): DocumentPayload | null => {
  if (!metadata || typeof metadata !== 'object') return null
  const meta = metadata as Record<string, any>

  if (meta.documentPayload?.htmlContent) {
    return {
      title: String(meta.documentPayload.title || 'Document'),
      content: String(meta.documentPayload.htmlContent),
    }
  }

  const legacyDataset = meta.canvas ? meta : meta.dataBuilderOutput ?? null
  if (legacyDataset?.canvas?.table?.rows) {
    const columns = legacyDataset.canvas?.table?.columns?.length
      ? legacyDataset.canvas.table.columns
      : legacyDataset.columns ?? []
    const rows = legacyDataset.canvas.table.rows as Array<Record<string, unknown>>
    const matrix =
      columns.length && rows.length
        ? [
            columns.map((c: DatasetColumn) => c.label),
            ...rows.map((row) => columns.map((c: DatasetColumn) => cellText(row[c.key]))),
          ]
        : undefined

    return {
      title: legacyDataset.metadata?.title || 'Document',
      content: buildDocumentHtml(legacyDataset as SynthesizedDataset),
      matrix,
    }
  }

  return null
}

// ── Multi-turn session control (DB-backed) ─────────────────────────────
const loadSessions = async () => {
  try {
    const res = await $fetch<{ sessions: ChatSession[] }>('/api/ai/sessions')
    sessions.value = res?.sessions ?? []
  } catch {
    sessions.value = []
  }
}

const newChat = () => {
  chatHistory.value = []
  activeSessionId.value = null
  inputPrompt.value = ''
  stopThinking()
  isLoading.value = false
  isHydrating.value = false
  showSplash.value = true
  isCanvasOpen.value = false
  documentPayload.value = null
  activeDoc.value = null
  if (isMobile.value) isSidebarOpen.value = false
}

const selectSession = async (id: string) => {
  console.log('🚀 selectSession triggered for ID:', id)
  if (isHydrating.value) return

  // Bind the active thread + force out of the splash view immediately.
  activeSessionId.value = id
  chatHistory.value = []
  isHydrating.value = true
  showSplash.value = false
  stopThinking()
  isLoading.value = false
  // Reset the canvas when switching threads.
  isCanvasOpen.value = false
  documentPayload.value = null
  activeDoc.value = null
  if (isMobile.value) isSidebarOpen.value = false

  try {
    const response = await $fetch<any>('/api/ai/messages', {
      query: { session_id: id },
    })
    console.log('📥 Raw DB Response received:', response)

    // Safely unwrap whether the array arrives raw or nested under a data/body key.
    const rawArray = Array.isArray(response)
      ? response
      : response?.messages ??
        response?.body?.messages ??
        response?.data?.messages ??
        response?.data ??
        response?.body ??
        []
    const rows = (Array.isArray(rawArray) ? rawArray : []) as StoredMessage[]

    chatHistory.value = rows.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
      timestamp: formatTime(m.created_at),
      documentPayload: m.role === 'assistant' ? extractDocumentPayload(m.metadata) : null,
      inlineDocuments: m.role === 'assistant' ? (m.metadata as any)?.inlineDocuments || null : null,
    }))

    // If the database returns 0 messages for this session, revert to the splash screen
    // so the user doesn't see a completely blank void. They can still send a message
    // which will be routed to the bound activeSessionId.
    if (chatHistory.value.length === 0) {
      showSplash.value = true
    } else {
      showSplash.value = false
      await scrollToBottom()
    }
  } catch (err) {
    console.error('❌ selectSession failed to hydrate thread:', err)
    chatHistory.value = [
      { role: 'error', content: 'Failed to load this conversation.', timestamp: nowLabel() },
    ]
  } finally {
    isHydrating.value = false
  }
}

const useSuggestion = (query: string) => {
  inputPrompt.value = query
  submitQuery()
}

const scrollToBottom = async () => {
  await nextTick()
  if (scrollContainer.value) {
    scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight
  }
}

const submitQuery = async () => {
  const prompt = inputPrompt.value.trim()
  if (!prompt || isLoading.value) return

  const wasNewSession = !activeSessionId.value

  chatHistory.value.push({ role: 'user', content: prompt, timestamp: nowLabel() })
  inputPrompt.value = ''
  showSplash.value = false
  isLoading.value = true
  await scrollToBottom()
  startThinking()

  try {
    const data = await $fetch<any>('/api/rag/query', {
      method: 'POST',
      body: {
        prompt,
        session_id: activeSessionId.value,
        scope:     props.scope,
        officeIds: props.officeIds,
        current_page_context: route.path,
      },
    })

    // The server owns the session id (create-on-first-message) and the reply text.
    if (data?.session_id) {
      activeSessionId.value = data.session_id
    }

    // Prefer the unified documentPayload; fall back to legacy dataset metadata.
    const doc = extractDocumentPayload(data) ?? extractDocumentPayload({ dataBuilderOutput: data?.dataBuilderOutput })
    const inlineDocs = data?.inlineDocuments || null
    const reply =
      data?.reply || (doc ? `Prepared “${doc.title}”.` : 'Done.')

    chatHistory.value.push({
      role: 'assistant',
      content: reply,
      timestamp: nowLabel(),
      documentPayload: doc,
      inlineDocuments: inlineDocs,
      isNew: true,
    })

    // Intercept SYSTEM_ASSISTANT_HELP responses to explicitly protect viewport state
    if (data?.mode === 'assistant_chat') {
      // Do nothing to the canvas. It will stay open/closed as it was, retaining any active matrix.
    } else if (doc) {
      // A document payload was received — slide the canvas open automatically.
      openCanvas(doc)
    }

    // Refresh the Recents rail so a freshly-created session appears immediately.
    if (wasNewSession) {
      await loadSessions()
    }
  } catch (err: any) {
    chatHistory.value.push({
      role: 'error',
      content:
        err?.data?.statusMessage ||
        err?.statusMessage ||
        err?.message ||
        'An infrastructure compilation error occurred.',
      timestamp: nowLabel(),
    })
  } finally {
    stopThinking()
    isLoading.value = false
    await scrollToBottom()
  }
}

onMounted(() => {
  updateIsMobile()
  isSidebarOpen.value = !isMobile.value
  window.addEventListener('resize', updateIsMobile)
  loadSessions()
})

onBeforeUnmount(() => {
  stopThinking()
  window.removeEventListener('resize', updateIsMobile)
})
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(120, 120, 120, 0.25);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(249, 115, 22, 0.4);
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fadeIn {
  animation: fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.think-enter-active,
.think-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.think-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.think-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* ── AI workspace mount entrance (/client/ai) ─────────────────────────── */
.fv-ai-enter-sidebar,
.fv-ai-enter-workspace,
.fv-ai-enter-brand {
  transform: translateZ(0);
  will-change: transform, opacity;
  transition-property: transform, opacity;
  backface-visibility: hidden;
}

/* Step 1 — Left chat panel: slide from left + fade */
.fv-ai-enter-sidebar {
  opacity: 0;
  transform: translate3d(-1rem, 0, 0);
  transition-duration: 500ms;
  transition-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}

.fv-ai-enter-sidebar.fv-ai-enter-visible {
  opacity: 1;
  transform: translate3d(0, 0, 0);
  pointer-events: auto;
}

.fv-ai-enter-sidebar:not(.fv-ai-enter-visible) {
  pointer-events: none;
}

/* Step 2 — Main workspace canvas: float up + fade */
.fv-ai-enter-workspace {
  opacity: 0;
  transform: translate3d(0, 1rem, 0);
  transition-duration: 500ms;
  transition-delay: 150ms;
  transition-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}

.fv-ai-enter-workspace.fv-ai-enter-visible {
  opacity: 1;
  transform: translate3d(0, 0, 0);
  pointer-events: auto;
}

.fv-ai-enter-workspace:not(.fv-ai-enter-visible) {
  pointer-events: none;
}

/* Step 3 — Branding & status badges: micro-scale pop */
.fv-ai-enter-brand {
  opacity: 0;
  transform: scale(0.95);
  transition-duration: 300ms;
  transition-delay: 300ms;
  transition-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}

.fv-ai-enter-brand.fv-ai-enter-visible {
  opacity: 1;
  transform: scale(1);
  pointer-events: auto;
}

.fv-ai-enter-brand:not(.fv-ai-enter-visible) {
  pointer-events: none;
}

/* Staggered child items — slide + fade with inline delay */
.fv-ai-enter-stagger {
  opacity: 0;
  transform: translate3d(-0.625rem, 0, 0);
  transition-property: transform, opacity, box-shadow, border-color, background-color;
  transition-duration: 450ms;
  transition-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}

.fv-ai-enter-stagger.fv-ai-enter-visible {
  opacity: 1;
  transform: translate3d(0, 0, 0);
}

/* Splash hero beats — float up + subtle scale */
.fv-ai-enter-hero {
  opacity: 0;
  transform: translate3d(0, 0.875rem, 0) scale(0.97);
  transition-property: transform, opacity, box-shadow;
  transition-duration: 550ms;
  transition-timing-function: cubic-bezier(0.34, 1.45, 0.64, 1);
}

.fv-ai-enter-hero.fv-ai-enter-visible {
  opacity: 1;
  transform: translate3d(0, 0, 0) scale(1);
}

/* Step 4 — Chat input dock: rises last */
.fv-ai-enter-input {
  opacity: 0;
  transform: translate3d(0, 1.25rem, 0);
  transition-duration: 550ms;
  transition-delay: 450ms;
  transition-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}

.fv-ai-enter-input.fv-ai-enter-visible {
  opacity: 1;
  transform: translate3d(0, 0, 0);
  pointer-events: auto;
}

.fv-ai-enter-input:not(.fv-ai-enter-visible) {
  pointer-events: none;
}

/* Ambient logo pulse on splash */
.fv-ai-logo-glow.fv-ai-enter-visible {
  animation: fvAiLogoPulse 3s ease-in-out 0.8s infinite;
}

@keyframes fvAiLogoPulse {
  0%, 100% {
    box-shadow: 0 0 32px rgba(249, 115, 22, 0.12);
  }
  50% {
    box-shadow: 0 0 44px rgba(249, 115, 22, 0.22);
  }
}

@media (prefers-reduced-motion: reduce) {
  .fv-ai-enter-sidebar,
  .fv-ai-enter-workspace,
  .fv-ai-enter-brand,
  .fv-ai-enter-stagger,
  .fv-ai-enter-hero,
  .fv-ai-enter-input {
    opacity: 1 !important;
    transform: none !important;
    transition: none !important;
    pointer-events: auto !important;
    animation: none !important;
  }
}

/* ── Glassmorphic canvas panel system ─────────────────────────────────── */
.fv-canvas-glass-panel {
  position: relative;
  isolation: isolate;
}

.fv-canvas-glass-panel::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse 80% 50% at 50% -10%, rgba(249, 115, 22, 0.08), transparent 55%),
    radial-gradient(ellipse 60% 40% at 100% 100%, rgba(249, 115, 22, 0.05), transparent 50%);
  z-index: 0;
}

:global(html.dark) .fv-canvas-glass-panel::before {
  background:
    radial-gradient(ellipse 80% 50% at 50% -10%, rgba(249, 115, 22, 0.12), transparent 55%),
    radial-gradient(ellipse 60% 40% at 100% 100%, rgba(249, 115, 22, 0.06), transparent 50%);
}

.fv-canvas-header {
  position: relative;
  z-index: 2;
  background: rgba(255, 255, 255, 0.55);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.6) inset;
}

:global(html.dark) .fv-canvas-header {
  background: rgba(15, 23, 42, 0.45);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.04) inset;
}

.fv-canvas-scroll {
  position: relative;
  z-index: 1;
}

.fv-canvas-paper {
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.06),
    0 20px 40px -12px rgba(0, 0, 0, 0.12),
    0 0 0 1px rgba(255, 255, 255, 0.8) inset;
}

:global(html.dark) .fv-canvas-paper {
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.35),
    0 24px 48px -12px rgba(0, 0, 0, 0.55),
    0 0 0 1px rgba(255, 255, 255, 0.06) inset,
    0 0 40px rgba(249, 115, 22, 0.04);
}

/* Formal document typography for synthesized HTML (rendered via v-html → :deep). */
.fv-doc-viewport {
  -webkit-overflow-scrolling: touch;
}

/* Wide matrix / table lanes: let columns breathe; parent handles horizontal scroll. */
.fv-doc-viewport.overflow-x-auto .fv-doc-body :deep(table),
.fv-doc-body--matrix :deep(table) {
  min-width: max-content;
  width: max-content;
  max-width: none;
}

.fv-doc-body :deep(h2) {
  font-size: 1rem;
  font-weight: 700;
  color: #111827;
  margin: 1.5rem 0 0.5rem;
}
:global(html.dark) .fv-canvas-article .fv-doc-body :deep(h2) {
  color: #f3f4f6;
}
.fv-doc-body :deep(h3) {
  font-size: 0.875rem;
  font-weight: 700;
  color: #1f2937;
  margin: 1.25rem 0 0.5rem;
}
:global(html.dark) .fv-canvas-article .fv-doc-body :deep(h3) {
  color: #e5e7eb;
}
.fv-doc-body :deep(p) {
  margin: 0 0 0.85rem;
  color: #374151;
}
:global(html.dark) .fv-canvas-article .fv-doc-body :deep(p) {
  color: #d1d5db;
}
.fv-doc-body :deep(ul) {
  margin: 0 0 0.85rem 1.1rem;
  list-style: disc;
}
.fv-doc-body :deep(li) {
  margin: 0.2rem 0;
}
.fv-doc-body :deep(strong) {
  color: #111827;
  font-weight: 700;
}
:global(html.dark) .fv-canvas-article .fv-doc-body :deep(strong) {
  color: #f9fafb;
}

/* Tables — shared light sheet styling + sticky distinct headers. */
.fv-doc-body :deep(table) {
  border-collapse: collapse;
  margin: 0.5rem 0 1.25rem;
  font-size: 0.8125rem;
}
.fv-doc-body :deep(thead th) {
  position: sticky;
  top: 0;
  z-index: 2;
  text-align: left;
  padding: 0.6rem 0.75rem;
  border-bottom: 2px solid #e5e7eb;
  background: #f9fafb;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.6875rem;
  font-weight: 600;
  color: #6b7280;
  white-space: nowrap;
}
.fv-doc-body :deep(td) {
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid #f0f1f3;
  color: #374151;
  vertical-align: top;
  white-space: nowrap;
}
.fv-doc-body :deep(tr:nth-child(even) td) {
  background: #fafafa;
}
:global(html.dark) .fv-canvas-article .fv-doc-body :deep(thead th) {
  background: #1e293b;
  border-bottom-color: #334155;
  color: #94a3b8;
}
:global(html.dark) .fv-canvas-article .fv-doc-body :deep(td) {
  border-bottom-color: #2a2a2a;
  color: #d1d5db;
}
:global(html.dark) .fv-canvas-article .fv-doc-body :deep(tr:nth-child(even) td) {
  background: rgba(255, 255, 255, 0.03);
}
:global(html.dark) .fv-canvas-article .fv-doc-body :deep(tr:hover td) {
  background: rgba(249, 115, 22, 0.1);
}

/* Full-bleed spreadsheet matrix reinforcement. */
.fv-doc-body :deep(.fv-spreadsheet-matrix) {
  margin: 0;
  padding-bottom: 0.25rem;
}
.fv-doc-body :deep(.fv-spreadsheet-matrix table) {
  border-collapse: collapse;
}
.fv-doc-body :deep(.fv-spreadsheet-matrix thead th) {
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  padding: 0.75rem 1rem;
}
.fv-doc-body :deep(.fv-spreadsheet-matrix td) {
  border: 1px solid #e2e8f0;
  padding: 0.625rem 1rem;
  color: #334155;
}
.fv-doc-body :deep(.fv-spreadsheet-matrix tbody tr:nth-child(even) td) {
  background: #f8fafc;
}
.fv-doc-body :deep(.fv-spreadsheet-matrix tbody tr:hover td) {
  background: rgba(249, 115, 22, 0.08);
}
:global(html.dark) .fv-canvas-article .fv-doc-body :deep(.fv-spreadsheet-matrix thead th) {
  background: #1e293b;
  border-color: #334155;
  color: #94a3b8;
}
:global(html.dark) .fv-canvas-article .fv-doc-body :deep(.fv-spreadsheet-matrix td) {
  border-color: #334155;
  color: #d1d5db;
}
:global(html.dark) .fv-canvas-article .fv-doc-body :deep(.fv-spreadsheet-matrix tbody tr:nth-child(even) td) {
  background: rgba(255, 255, 255, 0.04);
}
:global(html.dark) .fv-canvas-article .fv-doc-body :deep(.fv-spreadsheet-matrix tbody tr:hover td) {
  background: rgba(249, 115, 22, 0.12);
}
</style>
