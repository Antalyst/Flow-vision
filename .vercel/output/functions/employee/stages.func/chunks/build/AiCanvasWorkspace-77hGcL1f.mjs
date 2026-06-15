import __nuxt_component_0 from './index-BRIQYxw1.mjs';
import { defineComponent, computed, ref, mergeProps, unref, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderClass, ssrRenderAttr, ssrRenderComponent, ssrRenderStyle, ssrRenderList, ssrInterpolate, ssrIncludeBooleanAttr } from 'vue/server-renderer';
import { _ as _export_sfc, b as useTheme } from './server.mjs';

function useAiWorkspaceEntrance() {
  const isEntranceVisible = ref(false);
  const enterClass = computed(() => isEntranceVisible.value ? "fv-ai-enter-visible" : "");
  const staggerDelay = (index = 0, baseMs = 350, stepMs = 65) => ({
    transitionDelay: `${baseMs + index * stepMs}ms`
  });
  return { isEntranceVisible, enterClass, staggerDelay };
}
const SPREADSHEET_MARKER = "fv-spreadsheet-matrix";
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "AiCanvasWorkspace",
  __ssrInlineRender: true,
  props: {
    scope: { default: "GLOBAL" },
    officeIds: { default: () => [] },
    backRoute: { default: "/client/dashboard" },
    roleContext: { default: "client" }
  },
  setup(__props) {
    const props = __props;
    const { isDark } = useTheme();
    const { enterClass, staggerDelay } = useAiWorkspaceEntrance();
    const brandLogo = computed(() => isDark.value ? "/logo/new-logo.png" : "/logo/new-logo-dark.png");
    const scopeLabel = computed(
      () => props.scope === "LOCAL" ? "Office View" : "Org View"
    );
    const scopeIcon = computed(
      () => props.scope === "LOCAL" ? "ph:buildings-fill" : "ph:globe-hemisphere-west-fill"
    );
    const inputPrompt = ref("");
    const isLoading = ref(false);
    const isHydrating = ref(false);
    const showSplash = ref(true);
    const chatHistory = ref([]);
    const sessions = ref([]);
    const activeSessionId = ref(null);
    const thinkingStageText = ref("Reading secure organization token…");
    ref(null);
    const isCanvasOpen = ref(false);
    const documentPayload = ref(null);
    const activeDoc = ref(null);
    ref(null);
    const isExporting = ref(false);
    const isSpreadsheetCanvas = computed(
      () => Boolean(documentPayload.value?.content?.includes(SPREADSHEET_MARKER))
    );
    const needsHorizontalScroll = computed(() => {
      const content = documentPayload.value?.content ?? "";
      return isSpreadsheetCanvas.value || /<table[\s>]/i.test(content);
    });
    const isSidebarOpen = ref(true);
    const isMobile = ref(false);
    const suggestionChips = computed(
      () => props.scope === "LOCAL" ? [
        { label: "Summarize documents in my office branches", icon: "ph:buildings" },
        { label: "List all pending documents in my offices", icon: "ph:clock-countdown" },
        { label: "Generate an office branch transaction audit", icon: "ph:table" }
      ] : [
        { label: "Summarize all approved documents this quarter", icon: "ph:check-circle" },
        { label: "Find records missing verification stages", icon: "ph:magnifying-glass" },
        { label: "Generate an organisation-wide ledger review", icon: "ph:table" }
      ]
    );
    computed(
      () => props.scope === "LOCAL" ? [
        "Reading secure organisation token…",
        "Applying office-scope isolation filter…",
        "Extracting records from your branch(es)…",
        "Hydrating document content from storage…",
        "Assembling office-scoped report structure…"
      ] : [
        "Reading secure organisation token…",
        "Parsing document schema matchers…",
        "Executing tenant-isolated extraction logic…",
        "Hydrating distributed document blocks…",
        "Assembling organisation-wide data template…"
      ]
    );
    return (_ctx, _push, _parent, _attrs) => {
      const _component_Icon = __nuxt_component_0;
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "relative flex h-screen max-h-screen w-full overflow-hidden bg-[#F9F9FB] text-slate-800 dark:bg-[#0E0E10] dark:text-slate-100" }, _attrs))} data-v-92cfc71a>`);
      if (isSidebarOpen.value && isMobile.value) {
        _push(`<div class="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden" data-v-92cfc71a></div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`<aside class="${ssrRenderClass([isSidebarOpen.value ? "translate-x-0 md:w-64" : "-translate-x-full md:translate-x-0 md:w-0 md:overflow-hidden md:border-r-0", "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gray-200 bg-white transition-all duration-300 ease-in-out dark:border-white/5 dark:bg-[#161616] md:static md:z-auto"])}" data-v-92cfc71a><div class="${ssrRenderClass([unref(enterClass), "fv-ai-enter-sidebar flex h-full w-64 flex-col"])}" data-v-92cfc71a><div class="${ssrRenderClass([unref(enterClass), "fv-ai-enter-brand flex items-center justify-between px-4 py-4"])}" data-v-92cfc71a><div class="flex items-center gap-2" data-v-92cfc71a><img${ssrRenderAttr("src", brandLogo.value)} alt="FlowVision" class="h-7 w-7" data-v-92cfc71a><span class="text-sm font-bold tracking-tight text-neutral-900 dark:text-white" data-v-92cfc71a>FlowVision</span></div><button type="button" class="rounded-lg p-1.5 text-neutral-500 transition hover:bg-black/5 md:hidden dark:text-neutral-400 dark:hover:bg-white/5" data-v-92cfc71a>`);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:x",
        class: "h-4 w-4"
      }, null, _parent));
      _push(`</button></div><div class="px-3" data-v-92cfc71a><button type="button" class="${ssrRenderClass([unref(enterClass), "fv-ai-enter-stagger fv-ai-interactive flex w-full items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-semibold text-neutral-700 transition-all duration-300 hover:scale-[1.02] hover:border-orange-500/40 hover:bg-orange-500/10 hover:text-orange-600 hover:shadow-[0_8px_24px_rgba(249,115,22,0.12)] active:scale-[0.98] dark:border-white/10 dark:bg-white/[0.03] dark:text-neutral-200 dark:hover:text-orange-400"])}" style="${ssrRenderStyle(unref(staggerDelay)(0, 320))}" data-v-92cfc71a>`);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:plus",
        class: "h-4 w-4"
      }, null, _parent));
      _push(` New chat </button></div><p class="${ssrRenderClass([unref(enterClass), "fv-ai-enter-stagger px-5 pb-2 pt-5 text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500"])}" style="${ssrRenderStyle(unref(staggerDelay)(1, 320))}" data-v-92cfc71a> Recents </p><div class="custom-scrollbar flex-1 space-y-0.5 overflow-y-auto px-3 pb-4" data-v-92cfc71a><!--[-->`);
      ssrRenderList(sessions.value, (session, index) => {
        _push(`<button type="button" class="${ssrRenderClass([[
          unref(enterClass),
          session.id === activeSessionId.value ? "bg-orange-500/10 text-orange-600 dark:text-orange-400" : "text-neutral-600 hover:bg-orange-500/10 hover:text-orange-600 dark:text-neutral-300 dark:hover:text-orange-400"
        ], "fv-ai-enter-stagger fv-ai-interactive flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition-all duration-300 hover:translate-x-0.5 hover:shadow-sm active:scale-[0.99]"])}" style="${ssrRenderStyle(unref(staggerDelay)(index, 390, 55))}" data-v-92cfc71a>`);
        _push(ssrRenderComponent(_component_Icon, {
          name: "ph:chat-circle-dots",
          class: "h-4 w-4 flex-shrink-0 opacity-70"
        }, null, _parent));
        _push(`<span class="truncate" data-v-92cfc71a>${ssrInterpolate(session.title)}</span></button>`);
      });
      _push(`<!--]-->`);
      if (sessions.value.length === 0) {
        _push(`<p class="px-3 py-6 text-center text-xs text-neutral-400 dark:text-neutral-600" data-v-92cfc71a> No conversations yet. </p>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div></div></aside><div class="${ssrRenderClass([unref(enterClass), "fv-ai-enter-workspace flex min-w-0 flex-1 flex-col"])}" data-v-92cfc71a><header class="flex flex-shrink-0 items-center justify-between gap-2 px-3 py-3 lg:px-5" data-v-92cfc71a><div class="flex items-center gap-1.5" data-v-92cfc71a><button type="button" class="${ssrRenderClass([unref(enterClass), "fv-ai-enter-stagger fv-ai-interactive rounded-lg p-2 text-neutral-500 transition-all duration-300 hover:scale-105 hover:bg-black/5 active:scale-95 dark:text-neutral-400 dark:hover:bg-white/5"])}" style="${ssrRenderStyle(unref(staggerDelay)(0, 280))}" aria-label="Toggle sidebar" data-v-92cfc71a>`);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:list",
        class: "h-5 w-5"
      }, null, _parent));
      _push(`</button><button type="button" class="${ssrRenderClass([unref(enterClass), "fv-ai-enter-stagger fv-ai-interactive group inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium text-neutral-500 transition-all duration-300 hover:scale-[1.02] hover:bg-black/5 hover:text-neutral-900 active:scale-[0.98] dark:text-neutral-400 dark:hover:bg-white/5 dark:hover:text-white"])}" style="${ssrRenderStyle(unref(staggerDelay)(1, 280))}" data-v-92cfc71a>`);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:arrow-left",
        class: "h-4 w-4 transition-transform group-hover:-translate-x-0.5"
      }, null, _parent));
      _push(` Back to Dashboard </button></div><div class="flex items-center gap-2" data-v-92cfc71a><span class="${ssrRenderClass([[
        unref(enterClass),
        props.scope === "LOCAL" ? "border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400 dark:border-orange-500/25 dark:bg-orange-500/[0.08]" : "border-gray-200 bg-white text-neutral-500 dark:border-white/10 dark:bg-white/5 dark:text-neutral-400"
      ], "fv-ai-enter-brand inline-flex cursor-default items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-300"])}" data-v-92cfc71a>`);
      _push(ssrRenderComponent(_component_Icon, {
        name: scopeIcon.value,
        class: "h-3.5 w-3.5 flex-none"
      }, null, _parent));
      _push(` ${ssrInterpolate(scopeLabel.value)}</span><span class="${ssrRenderClass([unref(enterClass), "fv-ai-enter-brand fv-ai-interactive inline-flex cursor-default items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-neutral-500 transition-all duration-300 hover:scale-105 hover:border-orange-500/40 hover:shadow-[0_0_22px_rgba(249,115,22,0.18)] active:scale-95 dark:border-white/10 dark:bg-white/5 dark:text-neutral-300 dark:hover:border-orange-500/30"])}" data-v-92cfc71a><span class="relative flex h-1.5 w-1.5" data-v-92cfc71a><span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" data-v-92cfc71a></span><span class="relative inline-flex h-1.5 w-1.5 rounded-full bg-orange-500" data-v-92cfc71a></span></span> FlowVision Intelligence </span></div></header><div class="relative flex min-h-0 flex-1 overflow-hidden" data-v-92cfc71a><div class="${ssrRenderClass([isCanvasOpen.value ? "lg:pr-[60%]" : "", "flex min-h-0 min-w-0 flex-1 flex-col transition-[padding] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"])}" data-v-92cfc71a>`);
      if (showSplash.value && chatHistory.value.length === 0 && !isLoading.value && !isHydrating.value) {
        _push(`<div class="flex flex-1 flex-col items-center justify-center px-4 text-center" data-v-92cfc71a><div class="${ssrRenderClass([unref(enterClass), "fv-ai-enter-hero fv-ai-logo-glow mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-orange-500/20 bg-orange-500/5 shadow-[0_0_32px_rgba(249,115,22,0.12)]"])}" style="${ssrRenderStyle(unref(staggerDelay)(0, 420))}" data-v-92cfc71a><img${ssrRenderAttr("src", brandLogo.value)} alt="FlowVision" class="h-9 w-9" data-v-92cfc71a></div><h1 class="${ssrRenderClass([unref(enterClass), "fv-ai-enter-hero text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl dark:text-white"])}" style="${ssrRenderStyle(unref(staggerDelay)(1, 420))}" data-v-92cfc71a> Where should we start? </h1><p class="${ssrRenderClass([unref(enterClass), "fv-ai-enter-hero mt-3 max-w-md text-sm leading-relaxed text-neutral-500 dark:text-neutral-400"])}" style="${ssrRenderStyle(unref(staggerDelay)(2, 420))}" data-v-92cfc71a>`);
        if (props.scope === "LOCAL") {
          _push(`<!--[--> Ask anything about your office branches. FlowVision Intelligence will analyze only the records scoped to your assigned sub-offices — nothing else. <!--]-->`);
        } else {
          _push(`<!--[--> Ask in plain language and FlowVision will assemble it from your entire organization&#39;s records — securely scoped to your tenant. <!--]-->`);
        }
        _push(`</p><div class="mt-8 flex w-full max-w-md flex-col gap-2.5" data-v-92cfc71a><!--[-->`);
        ssrRenderList(suggestionChips.value, (chip, index) => {
          _push(`<button type="button" class="${ssrRenderClass([unref(enterClass), "fv-ai-enter-hero fv-ai-interactive group flex items-center gap-3 rounded-xl border border-gray-200 bg-black/[0.02] px-4 py-3 text-left text-sm text-neutral-600 transition-all duration-300 hover:scale-[1.02] hover:border-orange-500/35 hover:bg-orange-500/10 hover:text-orange-600 hover:shadow-[0_10px_28px_rgba(249,115,22,0.1)] active:scale-[0.98] dark:border-white/5 dark:bg-white/[0.02] dark:text-neutral-300 dark:hover:text-white"])}" style="${ssrRenderStyle(unref(staggerDelay)(index, 520, 80))}" data-v-92cfc71a>`);
          _push(ssrRenderComponent(_component_Icon, {
            name: chip.icon,
            class: "h-4 w-4 flex-shrink-0 text-orange-400/80 transition-transform duration-300 group-hover:scale-110"
          }, null, _parent));
          _push(`<span class="flex-1 truncate" data-v-92cfc71a>${ssrInterpolate(chip.label)}</span>`);
          _push(ssrRenderComponent(_component_Icon, {
            name: "ph:arrow-up-right",
            class: "h-3.5 w-3.5 text-neutral-400 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-orange-500 dark:text-neutral-600"
          }, null, _parent));
          _push(`</button>`);
        });
        _push(`<!--]--></div></div>`);
      } else {
        _push(`<div class="custom-scrollbar flex-1 overflow-y-auto px-4" data-v-92cfc71a><div class="mx-auto w-full max-w-3xl space-y-6 py-6" data-v-92cfc71a><!--[-->`);
        ssrRenderList(chatHistory.value, (msg, idx) => {
          _push(`<div class="${ssrRenderClass([msg.role === "user" ? "justify-end" : "justify-start", "flex animate-fadeIn gap-3"])}" data-v-92cfc71a>`);
          if (msg.role !== "user") {
            _push(`<div class="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 text-xs font-bold text-white shadow-md" data-v-92cfc71a> FV </div>`);
          } else {
            _push(`<!---->`);
          }
          if (msg.role === "user") {
            _push(`<div class="max-w-[80%] rounded-2xl rounded-br-md bg-orange-600 px-4 py-2.5 text-sm text-white shadow-md" data-v-92cfc71a><p class="whitespace-pre-line" data-v-92cfc71a>${ssrInterpolate(msg.content)}</p></div>`);
          } else if (msg.role === "error") {
            _push(`<div class="flex max-w-[85%] items-start gap-2.5 rounded-2xl rounded-tl-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-950/20 dark:text-red-300" data-v-92cfc71a>`);
            _push(ssrRenderComponent(_component_Icon, {
              name: "ph:warning-circle",
              class: "mt-0.5 h-4 w-4 flex-shrink-0"
            }, null, _parent));
            _push(`<p data-v-92cfc71a>${ssrInterpolate(msg.content)}</p></div>`);
          } else {
            _push(`<div class="min-w-0 max-w-[85%] space-y-3" data-v-92cfc71a><div class="rounded-2xl rounded-tl-md border border-gray-200 bg-white px-4 py-3 text-sm leading-relaxed text-neutral-700 shadow-sm dark:border-white/5 dark:bg-neutral-900/60 dark:text-neutral-200 dark:shadow-none" data-v-92cfc71a><p class="whitespace-pre-line" data-v-92cfc71a>${ssrInterpolate(msg.content)}</p></div>`);
            if (msg.documentPayload) {
              _push(`<button type="button" class="${ssrRenderClass([activeDoc.value === msg.documentPayload && isCanvasOpen.value ? "border-orange-500/60 bg-orange-500/10 shadow-[0_8px_24px_rgba(249,115,22,0.12)]" : "border-orange-500/30 bg-orange-500/[0.06] hover:border-orange-500/60 hover:bg-orange-500/10 hover:shadow-[0_8px_24px_rgba(249,115,22,0.1)]", "fv-ai-interactive group flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"])}" data-v-92cfc71a><span class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow" data-v-92cfc71a>`);
              _push(ssrRenderComponent(_component_Icon, {
                name: "ph:file-text",
                class: "h-4 w-4"
              }, null, _parent));
              _push(`</span><span class="min-w-0 flex-1" data-v-92cfc71a><span class="block truncate text-sm font-semibold text-neutral-800 dark:text-neutral-100" data-v-92cfc71a>${ssrInterpolate(msg.documentPayload.title)}</span><span class="block text-[11px] text-neutral-500 dark:text-neutral-400" data-v-92cfc71a> Open document canvas </span></span>`);
              _push(ssrRenderComponent(_component_Icon, {
                name: "ph:arrow-right",
                class: "h-4 w-4 flex-shrink-0 text-orange-500 transition-transform group-hover:translate-x-0.5"
              }, null, _parent));
              _push(`</button>`);
            } else {
              _push(`<!---->`);
            }
            _push(`<span class="block px-1 font-mono text-[11px] text-neutral-400 dark:text-neutral-600" data-v-92cfc71a>${ssrInterpolate(msg.timestamp)}</span></div>`);
          }
          _push(`</div>`);
        });
        _push(`<!--]-->`);
        if (isLoading.value || isHydrating.value) {
          _push(`<div class="flex animate-fadeIn gap-3" data-v-92cfc71a><div class="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 text-xs font-bold text-white shadow-md" data-v-92cfc71a> FV </div><div class="flex items-center gap-3 rounded-2xl rounded-tl-md border border-gray-200 bg-white px-4 py-3 dark:border-white/5 dark:bg-neutral-900/60" data-v-92cfc71a><div class="flex items-center gap-1" data-v-92cfc71a><span class="h-1.5 w-1.5 animate-bounce rounded-full bg-orange-400 [animation-delay:-0.3s]" data-v-92cfc71a></span><span class="h-1.5 w-1.5 animate-bounce rounded-full bg-orange-400 [animation-delay:-0.15s]" data-v-92cfc71a></span><span class="h-1.5 w-1.5 animate-bounce rounded-full bg-orange-400" data-v-92cfc71a></span></div><span class="text-xs italic text-neutral-500 dark:text-neutral-400" data-v-92cfc71a>${ssrInterpolate(thinkingStageText.value)}</span></div></div>`);
        } else {
          _push(`<!---->`);
        }
        _push(`</div></div>`);
      }
      _push(`<div class="${ssrRenderClass([unref(enterClass), "fv-ai-enter-input flex-shrink-0 px-4 pb-5 pt-2"])}" data-v-92cfc71a><div class="mx-auto w-full max-w-3xl" data-v-92cfc71a><form class="fv-ai-interactive flex items-end gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-lg transition-all duration-300 focus-within:scale-[1.01] focus-within:border-orange-500/50 focus-within:ring-1 focus-within:ring-orange-500/20 focus-within:shadow-[0_12px_40px_rgba(249,115,22,0.12)] dark:border-white/10 dark:bg-neutral-900/60 dark:shadow-2xl dark:backdrop-blur-xl" data-v-92cfc71a><textarea${ssrIncludeBooleanAttr(isLoading.value) ? " disabled" : ""} rows="1" placeholder="Ask FlowVision anything about your documents…" class="max-h-40 flex-1 resize-none bg-transparent px-3 py-2.5 text-sm text-slate-800 placeholder-neutral-400 focus:outline-none disabled:opacity-50 dark:text-slate-200 dark:placeholder-neutral-600" data-v-92cfc71a>${ssrInterpolate(inputPrompt.value)}</textarea><button type="submit"${ssrIncludeBooleanAttr(isLoading.value || !inputPrompt.value.trim()) ? " disabled" : ""} class="fv-ai-interactive flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-orange-600 text-white shadow transition-all duration-300 hover:scale-105 hover:bg-orange-500 hover:shadow-[0_8px_20px_rgba(249,115,22,0.35)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:scale-100" data-v-92cfc71a>`);
      if (isLoading.value) {
        _push(ssrRenderComponent(_component_Icon, {
          name: "ph:spinner-gap",
          class: "h-4 w-4 animate-spin"
        }, null, _parent));
      } else {
        _push(ssrRenderComponent(_component_Icon, {
          name: "ph:arrow-up",
          class: "h-4 w-4"
        }, null, _parent));
      }
      _push(`</button></form><p class="mt-2 text-center text-[11px] text-neutral-400 dark:text-neutral-600" data-v-92cfc71a> FlowVision Intelligence can make mistakes. Verify important records. </p></div></div></div><section class="${ssrRenderClass([isCanvasOpen.value ? "translate-x-0" : "pointer-events-none translate-x-full", "absolute right-0 top-0 z-20 h-full w-full transform-gpu transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] lg:w-[60%]"])}" aria-label="Document canvas" data-v-92cfc71a><div class="fv-canvas-glass-panel flex h-full w-full flex-col border-l border-white/20 bg-white/70 shadow-2xl backdrop-blur-lg dark:border-slate-800/40 dark:bg-slate-900/60" data-v-92cfc71a><div class="fv-canvas-header flex flex-shrink-0 items-center gap-3 border-b border-white/30 px-4 py-3 backdrop-blur-md sm:px-5 dark:border-white/[0.06]" data-v-92cfc71a><span class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-orange-500/20 bg-orange-500/10 shadow-[0_0_12px_rgba(249,115,22,0.15)]" data-v-92cfc71a>`);
      _push(ssrRenderComponent(_component_Icon, {
        name: isSpreadsheetCanvas.value ? "ph:grid-nine" : "ph:file-text",
        class: "h-4 w-4 text-orange-500 dark:text-orange-400"
      }, null, _parent));
      _push(`</span><div class="min-w-0 flex-1" data-v-92cfc71a><p class="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-600/80 dark:text-orange-400/80" data-v-92cfc71a>${ssrInterpolate(isSpreadsheetCanvas.value ? "Data Matrix" : "Document Canvas")}</p><span class="block truncate text-sm font-semibold text-neutral-900 dark:text-neutral-50" data-v-92cfc71a>${ssrInterpolate(documentPayload.value?.title || "Awaiting document")}</span></div><span class="${ssrRenderClass([props.scope === "LOCAL" ? "border-orange-500/20 bg-orange-500/10 text-orange-600 dark:text-orange-400" : "border-white/20 bg-white/10 text-neutral-500 dark:border-white/10 dark:text-neutral-500", "hidden items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider sm:inline-flex"])}" data-v-92cfc71a>`);
      _push(ssrRenderComponent(_component_Icon, {
        name: scopeIcon.value,
        class: "h-2.5 w-2.5"
      }, null, _parent));
      _push(` ${ssrInterpolate(scopeLabel.value)}</span>`);
      if (documentPayload.value) {
        _push(`<div class="fv-canvas-actions flex flex-shrink-0 items-center gap-2 rounded-xl border border-orange-500/20 bg-white/40 p-1 backdrop-blur-sm dark:border-orange-500/25 dark:bg-white/[0.04]" data-v-92cfc71a>`);
        if (isSpreadsheetCanvas.value) {
          _push(`<button type="button"${ssrIncludeBooleanAttr(isExporting.value) ? " disabled" : ""} class="fv-canvas-export-btn group inline-flex items-center gap-2 rounded-lg border border-orange-500/30 bg-white/60 px-3 py-2 text-xs font-semibold text-neutral-800 shadow-[0_0_20px_rgba(249,115,22,0.12)] transition-all duration-300 hover:scale-105 hover:border-orange-500/50 hover:bg-orange-500/10 hover:shadow-[0_0_24px_rgba(249,115,22,0.22)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/[0.06] dark:text-neutral-100 dark:hover:bg-orange-500/15" data-v-92cfc71a><span class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-emerald-500/15 ring-1 ring-emerald-500/25" data-v-92cfc71a>`);
          if (!isExporting.value) {
            _push(`<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden="true" data-v-92cfc71a><rect x="3" y="3" width="18" height="18" rx="2" class="stroke-emerald-600 dark:stroke-emerald-400" stroke-width="1.5" data-v-92cfc71a></rect><path d="M3 9h18M3 15h18M9 3v18M15 3v18" class="stroke-emerald-600/70 dark:stroke-emerald-400/70" stroke-width="1.25" data-v-92cfc71a></path></svg>`);
          } else {
            _push(ssrRenderComponent(_component_Icon, {
              name: "ph:spinner-gap",
              class: "h-3.5 w-3.5 animate-spin text-orange-500"
            }, null, _parent));
          }
          _push(`</span><span class="hidden sm:inline" data-v-92cfc71a>Export Spreadsheet</span><span class="sm:hidden" data-v-92cfc71a>Export</span></button>`);
        } else {
          _push(`<button type="button"${ssrIncludeBooleanAttr(isExporting.value) ? " disabled" : ""} class="fv-canvas-export-btn group inline-flex items-center gap-2 rounded-lg border border-orange-500/30 bg-white/60 px-3 py-2 text-xs font-semibold text-neutral-800 shadow-[0_0_20px_rgba(249,115,22,0.12)] transition-all duration-300 hover:scale-105 hover:border-orange-500/50 hover:bg-orange-500/10 hover:shadow-[0_0_24px_rgba(249,115,22,0.22)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/[0.06] dark:text-neutral-100 dark:hover:bg-orange-500/15" data-v-92cfc71a><span class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-blue-500/15 ring-1 ring-blue-500/25" data-v-92cfc71a>`);
          if (!isExporting.value) {
            _push(`<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden="true" data-v-92cfc71a><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" class="stroke-blue-600 dark:stroke-blue-400" stroke-width="1.5" stroke-linejoin="round" data-v-92cfc71a></path><path d="M14 3v5h5M8 13h8M8 17h5" class="stroke-blue-600/80 dark:stroke-blue-400/80" stroke-width="1.5" stroke-linecap="round" data-v-92cfc71a></path></svg>`);
          } else {
            _push(ssrRenderComponent(_component_Icon, {
              name: "ph:spinner-gap",
              class: "h-3.5 w-3.5 animate-spin text-orange-500"
            }, null, _parent));
          }
          _push(`</span><span class="hidden sm:inline" data-v-92cfc71a>Download Document</span><span class="sm:hidden" data-v-92cfc71a>Download</span></button>`);
        }
        _push(`</div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`<button type="button" class="rounded-xl border border-white/40 bg-white/50 p-2 text-neutral-600 shadow-sm transition-all duration-300 hover:scale-105 hover:border-orange-500/30 hover:bg-orange-500/10 hover:text-orange-600 active:scale-95 dark:border-white/10 dark:bg-white/[0.05] dark:text-neutral-300 dark:hover:text-orange-400" aria-label="Close canvas" data-v-92cfc71a>`);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:x",
        class: "h-4 w-4"
      }, null, _parent));
      _push(`</button></div><div class="fv-canvas-scroll custom-scrollbar relative min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10" data-v-92cfc71a>`);
      if (documentPayload.value) {
        _push(`<article class="${ssrRenderClass([isSpreadsheetCanvas.value ? "max-w-none px-4 py-5 sm:px-6 sm:py-6" : "max-w-3xl px-7 py-9 sm:px-12 sm:py-14", "fv-canvas-paper fv-canvas-article mx-auto w-full min-w-0 rounded-2xl bg-white text-neutral-800 shadow-2xl ring-1 ring-black/[0.04] transition-all duration-500 dark:bg-[#141416] dark:text-neutral-200 dark:ring-white/10"])}" data-v-92cfc71a><header class="${ssrRenderClass([isSpreadsheetCanvas.value ? "mb-4" : "mb-8", "border-b border-neutral-200/80 pb-6 dark:border-neutral-700/80"])}" data-v-92cfc71a><p class="text-[11px] font-bold uppercase tracking-[0.25em] text-orange-600 dark:text-orange-400" data-v-92cfc71a>${ssrInterpolate(isSpreadsheetCanvas.value ? "FlowVision Data Matrix" : "FlowVision Report")}</p><h1 class="${ssrRenderClass([isSpreadsheetCanvas.value ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl", "mt-2 font-bold leading-tight tracking-tight text-neutral-900 dark:text-neutral-50"])}" data-v-92cfc71a>${ssrInterpolate(documentPayload.value.title)}</h1></header><div class="${ssrRenderClass([needsHorizontalScroll.value ? "custom-scrollbar overflow-x-auto" : "", "fv-doc-viewport min-w-0"])}" data-v-92cfc71a><div class="${ssrRenderClass([[
          isSpreadsheetCanvas.value ? "fv-doc-body--matrix text-sm" : "text-sm"
        ], "fv-doc-body leading-relaxed text-neutral-700 dark:text-neutral-300"])}" data-v-92cfc71a>${documentPayload.value.content ?? ""}</div></div></article>`);
      } else {
        _push(`<div class="flex h-full min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/40 bg-white/30 px-6 text-center backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.03]" data-v-92cfc71a><span class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-orange-500/20 bg-orange-500/10 shadow-[0_0_20px_rgba(249,115,22,0.12)]" data-v-92cfc71a>`);
        _push(ssrRenderComponent(_component_Icon, {
          name: "ph:file-dashed",
          class: "h-7 w-7 text-orange-500/70 dark:text-orange-400/70"
        }, null, _parent));
        _push(`</span><p class="text-sm font-medium text-neutral-700 dark:text-neutral-300" data-v-92cfc71a>No document is open yet.</p><p class="mt-1 text-xs text-neutral-500 dark:text-neutral-500" data-v-92cfc71a>Ask FlowVision to generate a report or matrix.</p></div>`);
      }
      _push(`</div></div></section></div></div></div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/ai/AiCanvasWorkspace.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const AiCanvasWorkspace = /* @__PURE__ */ Object.assign(_export_sfc(_sfc_main, [["__scopeId", "data-v-92cfc71a"]]), { __name: "AiCanvasWorkspace" });

export { AiCanvasWorkspace as A };
//# sourceMappingURL=AiCanvasWorkspace-77hGcL1f.mjs.map
