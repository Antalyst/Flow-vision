import __nuxt_component_0 from './index-BRIQYxw1.mjs';
import { defineComponent, ref, computed, mergeProps, unref, inject, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderClass, ssrInterpolate, ssrRenderList, ssrRenderComponent, ssrRenderStyle, ssrIncludeBooleanAttr } from 'vue/server-renderer';
import { a as useAuthStore, b as useTheme } from './server.mjs';
import '@iconify/vue';
import '@iconify/utils/lib/css/icon';
import '../routes/renderer.mjs';
import 'vue-bundle-renderer/runtime';
import '../_/nitro.mjs';
import 'node:crypto';
import '@supabase/supabase-js';
import 'groq-sdk';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'mysql2/promise';
import '@iconify/utils';
import 'consola';
import 'node:fs';
import 'node:path';
import 'unhead/server';
import 'devalue';
import 'unhead/utils';
import 'pinia';
import 'vue-router';
import '@supabase/ssr';

const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "DocumentTimeline",
  __ssrInlineRender: true,
  props: {
    events: {},
    routeSteps: {},
    summary: {}
  },
  setup(__props) {
    const { isDark } = useTheme();
    const STATUS_LABELS = {
      CREATED: "Registered",
      PICKED_UP: "Picked Up",
      IN_TRANSIT: "In Transit",
      ARRIVED_AT_OFFICE: "Arrived at Office",
      COMPLETED: "Completed"
    };
    const STATUS_ICONS = {
      CREATED: "ph:file-plus-fill",
      PICKED_UP: "ph:hand-fill",
      IN_TRANSIT: "ph:motorcycle-fill",
      ARRIVED_AT_OFFICE: "ph:buildings-fill",
      COMPLETED: "ph:check-circle-fill"
    };
    const statusStyle = (status) => {
      switch (status) {
        case "CREATED":
          return {
            badge: "bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400",
            dot: "bg-gray-400",
            iconBorder: "border-gray-300 dark:border-gray-600",
            iconColor: "text-gray-400",
            textAccent: "text-gray-500"
          };
        case "PICKED_UP":
          return {
            badge: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
            dot: "bg-sky-500",
            iconBorder: "border-sky-400",
            iconColor: "text-sky-500",
            textAccent: "text-sky-500"
          };
        case "IN_TRANSIT":
          return {
            badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
            dot: "bg-amber-500 animate-pulse",
            iconBorder: "border-amber-400",
            iconColor: "text-amber-500",
            textAccent: "text-amber-500"
          };
        case "ARRIVED_AT_OFFICE":
          return {
            badge: "bg-rich-orange/10 text-rich-orange",
            dot: "bg-rich-orange",
            iconBorder: "border-rich-orange",
            iconColor: "text-rich-orange",
            textAccent: "text-rich-orange"
          };
        case "COMPLETED":
          return {
            badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
            dot: "bg-emerald-500",
            iconBorder: "border-emerald-400",
            iconColor: "text-emerald-500",
            textAccent: "text-emerald-500"
          };
        default:
          return {
            badge: "bg-gray-100 text-gray-500",
            dot: "bg-gray-400",
            iconBorder: "border-gray-300",
            iconColor: "text-gray-400",
            textAccent: "text-gray-400"
          };
      }
    };
    const routeStepClass = (stepNumber) => {
      const { current_step, tracking_status } = inject("summary") ?? {};
      return isDark.value ? "border-white/10 text-gray-400" : "border-gray-200 text-gray-500";
    };
    const formatRelative = (dateStr) => {
      if (!dateStr) return "";
      const d = new Date(dateStr);
      const now = /* @__PURE__ */ new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMin = Math.floor(diffMs / 6e4);
      if (diffMin < 1) return "just now";
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `${diffHr}h ago`;
      const diffDay = Math.floor(diffHr / 24);
      if (diffDay < 7) return `${diffDay}d ago`;
      return new Intl.DateTimeFormat("en", { month: "short", day: "2-digit" }).format(d);
    };
    return (_ctx, _push, _parent, _attrs) => {
      const _component_Icon = __nuxt_component_0;
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "space-y-4" }, _attrs))}><div><div class="flex items-center justify-between mb-1.5"><span class="${ssrRenderClass([unref(isDark) ? "text-gray-300" : "text-gray-700", "text-xs font-semibold"])}"> Route Progress </span><span class="text-xs font-mono font-bold text-rich-orange">${ssrInterpolate(__props.summary.current_step)} / ${ssrInterpolate(__props.summary.total_steps)} offices </span></div><div class="${ssrRenderClass([unref(isDark) ? "bg-white/10" : "bg-gray-200", "h-2 w-full overflow-hidden rounded-full"])}"><div class="h-full rounded-full bg-gradient-to-r from-rich-orange to-amber-400 transition-all duration-700" style="${ssrRenderStyle({ width: `${__props.summary.progress_pct}%` })}"></div></div></div><div class="flex items-center gap-2"><span class="${ssrRenderClass([statusStyle(__props.summary.tracking_status).badge, "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest"])}"><span class="${ssrRenderClass([statusStyle(__props.summary.tracking_status).dot, "h-1.5 w-1.5 rounded-full"])}"></span> ${ssrInterpolate(STATUS_LABELS[__props.summary.tracking_status] ?? __props.summary.tracking_status)}</span>`);
      if (__props.summary.is_complete) {
        _push(`<span class="text-xs font-semibold text-emerald-500"> All checkpoints cleared ✓ </span>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div>`);
      if (__props.routeSteps.length) {
        _push(`<div class="space-y-1"><p class="${ssrRenderClass([unref(isDark) ? "text-gray-500" : "text-gray-400", "text-[10px] font-bold uppercase tracking-widest mb-2"])}"> Planned Route </p><div class="flex flex-wrap items-center gap-1.5"><span class="${ssrRenderClass([unref(isDark) ? "text-gray-400" : "text-gray-500", "text-xs font-semibold"])}">Origin</span>`);
        _push(ssrRenderComponent(_component_Icon, {
          name: "ph:arrow-right-bold",
          class: "h-3 w-3 text-gray-300"
        }, null, _parent));
        _push(`<!--[-->`);
        ssrRenderList(__props.routeSteps, (step, idx) => {
          _push(`<!--[--><span class="${ssrRenderClass([routeStepClass(), "inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-xs font-semibold transition"])}">`);
          _push(ssrRenderComponent(_component_Icon, {
            name: idx + 1 < __props.summary.current_step ? "ph:check-circle-fill" : idx + 1 === __props.summary.current_step ? "ph:map-pin-fill" : "ph:circle",
            class: "h-3 w-3"
          }, null, _parent));
          _push(` ${ssrInterpolate(step.office_name)}</span>`);
          if (idx < __props.routeSteps.length - 1) {
            _push(ssrRenderComponent(_component_Icon, {
              name: "ph:arrow-right-bold",
              class: "h-3 w-3 text-gray-300"
            }, null, _parent));
          } else {
            _push(`<!---->`);
          }
          _push(`<!--]-->`);
        });
        _push(`<!--]--></div></div>`);
      } else {
        _push(`<!---->`);
      }
      if (__props.events.length) {
        _push(`<div class="relative space-y-0 pt-2"><p class="${ssrRenderClass([unref(isDark) ? "text-gray-500" : "text-gray-400", "text-[10px] font-bold uppercase tracking-widest mb-3"])}"> Activity Log </p><div class="${ssrRenderClass([unref(isDark) ? "bg-white/10" : "bg-gray-200", "absolute left-[15px] top-10 bottom-2 w-px"])}"></div><!--[-->`);
        ssrRenderList(__props.events, (ev, idx) => {
          _push(`<div class="relative flex gap-3 pb-4"><div class="${ssrRenderClass([statusStyle(ev.status).iconBorder, "relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 bg-white dark:bg-[#1A1A1A]"])}">`);
          _push(ssrRenderComponent(_component_Icon, {
            name: STATUS_ICONS[ev.status] ?? "ph:circle",
            class: ["h-3.5 w-3.5", statusStyle(ev.status).iconColor]
          }, null, _parent));
          _push(`</div><div class="flex-1 min-w-0 pt-0.5"><div class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5"><span class="${ssrRenderClass([unref(isDark) ? "text-gray-100" : "text-gray-800", "text-xs font-bold"])}">${ssrInterpolate(STATUS_LABELS[ev.status] ?? ev.status)}</span>`);
          if (ev.office_name) {
            _push(`<span class="${ssrRenderClass([statusStyle(ev.status).textAccent, "text-[11px] font-semibold"])}"> @ ${ssrInterpolate(ev.office_name)}</span>`);
          } else {
            _push(`<!---->`);
          }
          _push(`</div><p class="${ssrRenderClass([unref(isDark) ? "text-gray-500" : "text-gray-400", "mt-0.5 text-[11px]"])}">`);
          if (ev.actor_name) {
            _push(`<span>by ${ssrInterpolate(ev.actor_name)}</span>`);
          } else {
            _push(`<!---->`);
          }
          if (ev.actor_role) {
            _push(`<span class="${ssrRenderClass([unref(isDark) ? "bg-white/5 text-gray-400" : "bg-gray-100 text-gray-500", "ml-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase"])}">${ssrInterpolate(ev.actor_role)}</span>`);
          } else {
            _push(`<!---->`);
          }
          _push(`<span class="ml-2">${ssrInterpolate(formatRelative(ev.created_at))}</span></p>`);
          if (ev.notes) {
            _push(`<p class="${ssrRenderClass([unref(isDark) ? "text-gray-500" : "text-gray-400", "mt-1 text-[11px] italic"])}"> &quot;${ssrInterpolate(ev.notes)}&quot; </p>`);
          } else {
            _push(`<!---->`);
          }
          _push(`</div></div>`);
        });
        _push(`<!--]--></div>`);
      } else {
        _push(`<div class="${ssrRenderClass([unref(isDark) ? "text-gray-500" : "text-gray-400", "py-6 text-center text-sm"])}"> No tracking events recorded yet. </div>`);
      }
      _push(`</div>`);
    };
  }
});
const _sfc_setup$1 = _sfc_main$1.setup;
_sfc_main$1.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/client/tracking/DocumentTimeline.vue");
  return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
const DocumentTimeline = Object.assign(_sfc_main$1, { __name: "ClientTrackingDocumentTimeline" });
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "current-working",
  __ssrInlineRender: true,
  setup(__props) {
    const auth = useAuthStore();
    const { isDark } = useTheme();
    const STATUS_LABELS = {
      CREATED: "Registered",
      PICKED_UP: "Picked Up",
      IN_TRANSIT: "In Transit",
      ARRIVED_AT_OFFICE: "Arrived",
      COMPLETED: "Completed"
    };
    const STATUS_ICONS = {
      CREATED: "ph:file-plus-fill",
      PICKED_UP: "ph:hand-fill",
      IN_TRANSIT: "ph:motorcycle-fill",
      ARRIVED_AT_OFFICE: "ph:buildings-fill",
      COMPLETED: "ph:check-circle-fill"
    };
    const TRANSITIONS = {
      CREATED: ["PICKED_UP"],
      PICKED_UP: ["IN_TRANSIT"],
      IN_TRANSIT: ["ARRIVED_AT_OFFICE"],
      ARRIVED_AT_OFFICE: ["PICKED_UP", "COMPLETED"],
      COMPLETED: []
    };
    const statusChips = [
      { status: "CREATED", label: "Registered", icon: "ph:file-plus-fill", countKey: "created", activeClass: "border-gray-400 bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-200 dark:border-gray-500" },
      { status: "PICKED_UP", label: "Picked Up", icon: "ph:hand-fill", countKey: "picked_up", activeClass: "border-sky-400 bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400" },
      { status: "IN_TRANSIT", label: "In Transit", icon: "ph:motorcycle-fill", countKey: "in_transit", activeClass: "border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400" },
      { status: "ARRIVED_AT_OFFICE", label: "Arrived", icon: "ph:buildings-fill", countKey: "arrived_at_office", activeClass: "border-orange-400 bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400" },
      { status: "COMPLETED", label: "Completed", icon: "ph:check-circle-fill", countKey: "completed", activeClass: "border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" }
    ];
    const queue = ref([]);
    const queueLoading = ref(false);
    const queueSummary = ref({});
    const statusFilter = ref("");
    const selectedDocId = ref(null);
    const selectedDoc = ref(null);
    const timelineData = ref(null);
    const timelineLoading = ref(false);
    const advancing = ref(false);
    const filteredQueue = computed(() => {
      if (!statusFilter.value) return queue.value;
      return queue.value.filter((d) => d.tracking_status === statusFilter.value);
    });
    const kpiCards = computed(() => [
      { label: "Total", value: queueSummary.value.total ?? 0, icon: "ph:files-fill", iconBg: "bg-rich-orange/10", iconColor: "text-rich-orange" },
      { label: "Registered", value: queueSummary.value.created ?? 0, icon: "ph:file-plus-fill", iconBg: "bg-gray-500/10", iconColor: "text-gray-500" },
      { label: "In Transit", value: queueSummary.value.in_transit ?? 0, icon: "ph:motorcycle-fill", iconBg: "bg-amber-500/10", iconColor: "text-amber-500" },
      { label: "Arrived", value: queueSummary.value.arrived_at_office ?? 0, icon: "ph:buildings-fill", iconBg: "bg-orange-500/10", iconColor: "text-orange-500" },
      { label: "Completed", value: queueSummary.value.completed ?? 0, icon: "ph:check-circle-fill", iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" }
    ]);
    const allowedTransitions = computed(() => {
      if (!timelineData.value) return [];
      const current = timelineData.value.summary.tracking_status;
      return TRANSITIONS[current] ?? [];
    });
    const statusIconBg = (status) => {
      const map = {
        CREATED: isDark.value ? "bg-white/5" : "bg-gray-100",
        PICKED_UP: isDark.value ? "bg-sky-500/10" : "bg-sky-50",
        IN_TRANSIT: isDark.value ? "bg-amber-500/10" : "bg-amber-50",
        ARRIVED_AT_OFFICE: isDark.value ? "bg-rich-orange/10" : "bg-orange-50",
        COMPLETED: isDark.value ? "bg-emerald-500/10" : "bg-emerald-50"
      };
      return map[status] ?? (isDark.value ? "bg-white/5" : "bg-gray-100");
    };
    const statusIconColor = (status) => ({
      CREATED: "text-gray-400",
      PICKED_UP: "text-sky-500",
      IN_TRANSIT: "text-amber-500",
      ARRIVED_AT_OFFICE: "text-rich-orange",
      COMPLETED: "text-emerald-500"
    })[status] ?? "text-gray-400";
    const statusBadgeClass = (status) => ({
      CREATED: isDark.value ? "bg-white/5 text-gray-400" : "bg-gray-100 text-gray-500",
      PICKED_UP: isDark.value ? "bg-sky-500/10 text-sky-400" : "bg-sky-50 text-sky-700",
      IN_TRANSIT: isDark.value ? "bg-amber-500/10 text-amber-400" : "bg-amber-50 text-amber-700",
      ARRIVED_AT_OFFICE: isDark.value ? "bg-orange-500/10 text-orange-400" : "bg-orange-50 text-orange-700",
      COMPLETED: isDark.value ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-700"
    })[status] ?? "";
    const advanceButtonClass = (status) => ({
      PICKED_UP: "bg-sky-500 text-white hover:bg-sky-600",
      IN_TRANSIT: "bg-amber-500 text-white hover:bg-amber-600",
      ARRIVED_AT_OFFICE: "bg-rich-orange text-white hover:bg-orange-600",
      COMPLETED: "bg-emerald-500 text-white hover:bg-emerald-600"
    })[status] ?? "bg-gray-500 text-white";
    return (_ctx, _push, _parent, _attrs) => {
      const _component_Icon = __nuxt_component_0;
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "space-y-6 pb-24 lg:pb-8" }, _attrs))}><div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div class="mb-3 h-1 w-14 rounded-full bg-rich-orange"></div><h1 class="${ssrRenderClass([unref(isDark) ? "text-white" : "text-gray-900", "text-2xl font-bold tracking-tight sm:text-3xl"])}"> Tracking Operations </h1><p class="${ssrRenderClass([unref(isDark) ? "text-gray-400" : "text-gray-500", "mt-1 text-sm"])}"> Live fulfillment pipeline · ${ssrInterpolate(unref(auth).currentOrg?.name)}</p></div><div class="flex flex-wrap gap-2"><!--[-->`);
      ssrRenderList(statusChips, (chip) => {
        _push(`<button type="button" class="${ssrRenderClass([statusFilter.value === chip.status ? chip.activeClass : unref(isDark) ? "border-card-border bg-white/5 text-gray-400" : "border-gray-200 bg-white text-gray-500", "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all duration-200 hover:scale-[1.02]"])}">`);
        _push(ssrRenderComponent(_component_Icon, {
          name: chip.icon,
          class: "h-3.5 w-3.5"
        }, null, _parent));
        _push(`<span>${ssrInterpolate(chip.label)}</span><span class="${ssrRenderClass([unref(isDark) ? "bg-white/10" : "bg-black/5", "rounded-full px-1.5 py-0.5 text-[10px]"])}">${ssrInterpolate(queueSummary.value[chip.countKey] ?? 0)}</span></button>`);
      });
      _push(`<!--]--></div></div><div class="grid grid-cols-2 gap-3 sm:grid-cols-5"><!--[-->`);
      ssrRenderList(kpiCards.value, (kpi) => {
        _push(`<div class="${ssrRenderClass([unref(isDark) ? "border-card-border bg-[#1A1A1A]" : "border-gray-200 bg-white", "flex flex-col gap-1 rounded-xl border p-4 transition-all duration-300"])}"><div class="flex items-center gap-2 mb-1"><span class="${ssrRenderClass([kpi.iconBg, "flex h-7 w-7 items-center justify-center rounded-lg"])}">`);
        _push(ssrRenderComponent(_component_Icon, {
          name: kpi.icon,
          class: ["h-3.5 w-3.5", kpi.iconColor]
        }, null, _parent));
        _push(`</span><span class="${ssrRenderClass([unref(isDark) ? "text-gray-500" : "text-gray-400", "text-[10px] font-bold uppercase tracking-wider"])}">${ssrInterpolate(kpi.label)}</span></div><p class="${ssrRenderClass([unref(isDark) ? "text-white" : "text-gray-900", "text-2xl font-bold"])}">${ssrInterpolate(kpi.value)}</p></div>`);
      });
      _push(`<!--]--></div><div class="grid grid-cols-1 gap-5 lg:grid-cols-3"><section class="${ssrRenderClass([unref(isDark) ? "border-card-border bg-[#1A1A1A]" : "border-gray-200 bg-white", "overflow-hidden rounded-xl border transition-all duration-300 lg:col-span-2"])}"><div class="${ssrRenderClass([unref(isDark) ? "border-card-border" : "border-gray-100", "flex items-center justify-between border-b px-6 py-4"])}"><div><h2 class="${ssrRenderClass([unref(isDark) ? "text-white" : "text-gray-900", "text-sm font-bold"])}"> In-Flight Documents </h2><p class="${ssrRenderClass([unref(isDark) ? "text-gray-500" : "text-gray-400", "text-xs mt-0.5"])}">${ssrInterpolate(filteredQueue.value.length)} documents${ssrInterpolate(statusFilter.value ? ` · ${STATUS_LABELS[statusFilter.value]}` : "")}</p></div><button type="button" class="${ssrRenderClass([unref(isDark) ? "border-card-border text-gray-400" : "border-gray-200 text-gray-500", "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition hover:border-rich-orange hover:text-rich-orange"])}">`);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:arrows-clockwise",
        class: ["h-3.5 w-3.5", queueLoading.value ? "animate-spin" : ""]
      }, null, _parent));
      _push(` Refresh </button></div>`);
      if (queueLoading.value) {
        _push(`<div class="${ssrRenderClass([unref(isDark) ? "divide-card-border" : "divide-gray-100", "divide-y"])}"><!--[-->`);
        ssrRenderList(5, (n) => {
          _push(`<div class="flex items-center gap-4 px-6 py-4"><div class="${ssrRenderClass([unref(isDark) ? "bg-white/5" : "bg-gray-200", "h-9 w-9 animate-pulse rounded-xl"])}"></div><div class="flex-1 space-y-2"><div class="${ssrRenderClass([unref(isDark) ? "bg-white/5" : "bg-gray-200", "h-3 w-48 animate-pulse rounded"])}"></div><div class="${ssrRenderClass([unref(isDark) ? "bg-white/5" : "bg-gray-100", "h-2.5 w-32 animate-pulse rounded"])}"></div></div></div>`);
        });
        _push(`<!--]--></div>`);
      } else {
        _push(`<div class="${ssrRenderClass([unref(isDark) ? "divide-card-border" : "divide-gray-100", "divide-y"])}"><!--[-->`);
        ssrRenderList(filteredQueue.value, (doc) => {
          _push(`<button type="button" class="${ssrRenderClass([[
            unref(isDark) ? "hover:bg-white/[0.025]" : "hover:bg-gray-50",
            selectedDocId.value === doc.id ? unref(isDark) ? "bg-rich-orange/5 border-l-2 border-l-rich-orange" : "bg-rich-orange/[0.03] border-l-2 border-l-rich-orange" : "border-l-2 border-l-transparent"
          ], "w-full flex items-start gap-4 px-6 py-4 text-left transition-all duration-150"])}"><span class="${ssrRenderClass([statusIconBg(doc.tracking_status), "mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"])}">`);
          _push(ssrRenderComponent(_component_Icon, {
            name: STATUS_ICONS[doc.tracking_status] ?? "ph:file",
            class: ["h-4 w-4", statusIconColor(doc.tracking_status)]
          }, null, _parent));
          _push(`</span><div class="min-w-0 flex-1"><div class="flex items-start justify-between gap-2"><p class="${ssrRenderClass([unref(isDark) ? "text-gray-100" : "text-gray-900", "truncate text-sm font-semibold"])}">${ssrInterpolate(doc.title || "Untitled Document")}</p><span class="${ssrRenderClass([statusBadgeClass(doc.tracking_status), "flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"])}">${ssrInterpolate(STATUS_LABELS[doc.tracking_status] ?? doc.tracking_status)}</span></div><div class="${ssrRenderClass([unref(isDark) ? "text-gray-500" : "text-gray-400", "mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px]"])}">`);
          if (doc.stage_name) {
            _push(`<span class="flex items-center gap-1">`);
            _push(ssrRenderComponent(_component_Icon, {
              name: "ph:steps-fill",
              class: "h-3 w-3"
            }, null, _parent));
            _push(` ${ssrInterpolate(doc.stage_name)}</span>`);
          } else {
            _push(`<!---->`);
          }
          if (doc.total_steps) {
            _push(`<span class="flex items-center gap-1">`);
            _push(ssrRenderComponent(_component_Icon, {
              name: "ph:map-pin",
              class: "h-3 w-3"
            }, null, _parent));
            _push(` Step ${ssrInterpolate(doc.current_step)} / ${ssrInterpolate(doc.total_steps)}</span>`);
          } else {
            _push(`<!---->`);
          }
          if (doc.messenger_name) {
            _push(`<span class="flex items-center gap-1 text-amber-500 dark:text-amber-400">`);
            _push(ssrRenderComponent(_component_Icon, {
              name: "ph:motorcycle-fill",
              class: "h-3 w-3"
            }, null, _parent));
            _push(` ${ssrInterpolate(doc.messenger_name)}</span>`);
          } else {
            _push(`<!---->`);
          }
          _push(`</div>`);
          if (doc.total_steps) {
            _push(`<div class="${ssrRenderClass([unref(isDark) ? "bg-white/10" : "bg-gray-200", "mt-2 h-1 w-full overflow-hidden rounded-full"])}"><div class="${ssrRenderClass([doc.tracking_status === "COMPLETED" ? "bg-emerald-500" : "bg-rich-orange", "h-full rounded-full transition-all duration-500"])}" style="${ssrRenderStyle({ width: `${doc.progress_pct}%` })}"></div></div>`);
          } else {
            _push(`<!---->`);
          }
          _push(`</div></button>`);
        });
        _push(`<!--]-->`);
        if (!filteredQueue.value.length) {
          _push(`<div class="flex flex-col items-center gap-3 px-6 py-16 text-center">`);
          _push(ssrRenderComponent(_component_Icon, {
            name: "ph:package-fill",
            class: "h-10 w-10 text-gray-300"
          }, null, _parent));
          _push(`<p class="${ssrRenderClass([unref(isDark) ? "text-gray-300" : "text-gray-600", "font-semibold"])}">No documents in this status</p><p class="${ssrRenderClass([unref(isDark) ? "text-gray-500" : "text-gray-400", "text-sm"])}">${ssrInterpolate(statusFilter.value ? "Try a different filter or refresh." : "All documents are completed or none have been uploaded yet.")}</p></div>`);
        } else {
          _push(`<!---->`);
        }
        _push(`</div>`);
      }
      _push(`</section><aside class="${ssrRenderClass([unref(isDark) ? "border-card-border bg-[#1A1A1A]" : "border-gray-200 bg-white", "rounded-xl border transition-all duration-300"])}"><div class="${ssrRenderClass([unref(isDark) ? "border-card-border" : "border-gray-100", "border-b px-5 py-4"])}"><h2 class="${ssrRenderClass([unref(isDark) ? "text-white" : "text-gray-900", "text-sm font-bold"])}">${ssrInterpolate(selectedDoc.value ? "Tracking Timeline" : "Select a Document")}</h2>`);
      if (selectedDoc.value) {
        _push(`<p class="${ssrRenderClass([unref(isDark) ? "text-gray-500" : "text-gray-400", "mt-0.5 truncate text-xs"])}">${ssrInterpolate(selectedDoc.value.title)}</p>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div>`);
      if (!selectedDoc.value) {
        _push(`<div class="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">`);
        _push(ssrRenderComponent(_component_Icon, {
          name: "ph:cursor-click",
          class: "h-10 w-10 text-gray-300"
        }, null, _parent));
        _push(`<p class="${ssrRenderClass([unref(isDark) ? "text-gray-500" : "text-gray-400", "text-sm"])}"> Click a document row to view its full tracking timeline. </p></div>`);
      } else if (timelineLoading.value) {
        _push(`<div class="p-5 space-y-3"><!--[-->`);
        ssrRenderList(4, (n) => {
          _push(`<div class="flex items-center gap-3"><div class="${ssrRenderClass([unref(isDark) ? "bg-white/5" : "bg-gray-200", "h-8 w-8 animate-pulse rounded-full"])}"></div><div class="flex-1 space-y-1.5"><div class="${ssrRenderClass([unref(isDark) ? "bg-white/5" : "bg-gray-200", "h-3 w-28 animate-pulse rounded"])}"></div><div class="${ssrRenderClass([unref(isDark) ? "bg-white/5" : "bg-gray-100", "h-2.5 w-20 animate-pulse rounded"])}"></div></div></div>`);
        });
        _push(`<!--]--></div>`);
      } else if (timelineData.value) {
        _push(`<div class="p-5 space-y-5">`);
        _push(ssrRenderComponent(DocumentTimeline, {
          events: timelineData.value.events,
          "route-steps": timelineData.value.routeSteps,
          summary: timelineData.value.summary
        }, null, _parent));
        if (allowedTransitions.value.length) {
          _push(`<div class="${ssrRenderClass([unref(isDark) ? "border-card-border" : "border-gray-100", "space-y-2 border-t pt-4"])}"><p class="${ssrRenderClass([unref(isDark) ? "text-gray-500" : "text-gray-400", "text-[10px] font-bold uppercase tracking-widest"])}"> Advance Status </p><!--[-->`);
          ssrRenderList(allowedTransitions.value, (nextStatus) => {
            _push(`<button type="button"${ssrIncludeBooleanAttr(advancing.value) ? " disabled" : ""} class="${ssrRenderClass([advanceButtonClass(nextStatus), "w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wide transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"])}">`);
            if (advancing.value) {
              _push(ssrRenderComponent(_component_Icon, {
                name: "ph:spinner-gap",
                class: "h-4 w-4 animate-spin"
              }, null, _parent));
            } else {
              _push(ssrRenderComponent(_component_Icon, {
                name: STATUS_ICONS[nextStatus] ?? "ph:arrow-right",
                class: "h-4 w-4"
              }, null, _parent));
            }
            _push(` Mark as ${ssrInterpolate(STATUS_LABELS[nextStatus])}</button>`);
          });
          _push(`<!--]--></div>`);
        } else if (timelineData.value.summary.is_complete) {
          _push(`<p class="text-center text-xs font-semibold text-emerald-500"> ✓ Document delivery completed. </p>`);
        } else {
          _push(`<!---->`);
        }
        _push(`</div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</aside></div></div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/client/current-working.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=current-working-uvE3EJBn.mjs.map
