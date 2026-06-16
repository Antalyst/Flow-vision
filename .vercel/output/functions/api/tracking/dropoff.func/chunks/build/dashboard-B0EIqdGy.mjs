import __nuxt_component_0 from './index-CSZJBLRw.mjs';
import { _ as __nuxt_component_3 } from './nuxt-link-BkIUUJ0e.mjs';
import { defineComponent, ref, computed, watch, mergeProps, unref, withCtx, createVNode, createTextVNode, nextTick, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderClass, ssrRenderComponent, ssrInterpolate, ssrRenderStyle, ssrRenderList } from 'vue/server-renderer';
import { _ as _export_sfc, a as useAuthStore, u as useTheme } from './server.mjs';
import '@iconify/vue';
import '@iconify/utils/lib/css/icon';
import '../_/nitro.mjs';
import 'node:crypto';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'sql-escaper';
import 'events';
import 'lru.min';
import 'process';
import 'net';
import 'tls';
import 'timers';
import 'stream';
import 'denque';
import 'buffer';
import 'long';
import 'iconv-lite';
import 'crypto';
import 'zlib';
import 'generate-function';
import 'url';
import 'aws-ssl-profiles';
import 'named-placeholders';
import '@iconify/utils';
import 'consola';
import 'node:fs';
import 'node:path';
import '../routes/renderer.mjs';
import 'vue-bundle-renderer/runtime';
import 'unhead/server';
import 'devalue';
import 'unhead/utils';
import 'pinia';
import 'vue-router';
import '@vue/shared';

const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "dashboard",
  __ssrInlineRender: true,
  setup(__props) {
    const auth = useAuthStore();
    const { isDark } = useTheme();
    const currentScope = ref("LOCAL");
    const scopeOptions = [
      { value: "LOCAL", label: "Office View", icon: "ph:buildings-fill" },
      { value: "GLOBAL", label: "Org View", icon: "ph:globe-hemisphere-west-fill" }
    ];
    const tabRefs = ref({});
    const indicatorStyle = ref({ left: "6px", width: "120px" });
    const updateIndicator = () => {
      nextTick(() => {
        const btn = tabRefs.value[currentScope.value];
        if (!btn) return;
        indicatorStyle.value = {
          left: `${btn.offsetLeft}px`,
          width: `${btn.offsetWidth}px`
        };
      });
    };
    const ledger = ref([]);
    const ledgerLoading = ref(false);
    const myOffices = ref([]);
    const officesLoading = ref(false);
    const queueSummary = ref({ total: 0, created: 0, picked_up: 0, in_transit: 0, arrived_at_office: 0, completed: 0 });
    const queueLoading = ref(false);
    const mutedText = computed(() => isDark.value ? "text-gray-400" : "text-gray-500");
    const kpiCards = computed(() => {
      if (currentScope.value === "LOCAL") {
        const own = ledger.value.filter((d) => d.is_own_upload).length;
        const pending = ledger.value.filter((d) => (d.status ?? "").toLowerCase() === "pending").length;
        const transit = ledger.value.filter((d) => d.tracking_status === "IN_TRANSIT").length;
        return [
          {
            label: "Office Docs",
            value: String(ledger.value.length),
            trend: "in your offices",
            trendColor: "text-rich-orange",
            icon: "ph:files-fill",
            iconBg: "bg-rich-orange/10",
            iconColor: "text-rich-orange"
          },
          {
            label: "My Uploads",
            value: String(own),
            trend: "uploaded by you",
            trendColor: mutedText.value,
            icon: "ph:upload-simple-fill",
            iconBg: "bg-emerald-500/10",
            iconColor: "text-emerald-500"
          },
          {
            label: "Pending",
            value: String(pending),
            trend: "awaiting action",
            trendColor: pending > 0 ? "text-amber-500" : mutedText.value,
            icon: "ph:clock-countdown-fill",
            iconBg: "bg-amber-500/10",
            iconColor: "text-amber-500"
          },
          {
            label: "In Transit",
            value: String(transit),
            trend: "currently moving",
            trendColor: transit > 0 ? "text-blue-400" : mutedText.value,
            icon: "ph:package-fill",
            iconBg: "bg-blue-500/10",
            iconColor: "text-blue-400"
          }
        ];
      }
      const { total, in_transit, arrived_at_office, completed } = queueSummary.value;
      return [
        {
          label: "Total Org Docs",
          value: String(total),
          trend: "across organisation",
          trendColor: "text-rich-orange",
          icon: "ph:files-fill",
          iconBg: "bg-rich-orange/10",
          iconColor: "text-rich-orange"
        },
        {
          label: "In Transit",
          value: String(in_transit),
          trend: "with messengers",
          trendColor: in_transit > 0 ? "text-blue-400" : mutedText.value,
          icon: "ph:truck-fill",
          iconBg: "bg-blue-500/10",
          iconColor: "text-blue-400"
        },
        {
          label: "At Office",
          value: String(arrived_at_office),
          trend: "awaiting next step",
          trendColor: arrived_at_office > 0 ? "text-teal-500" : mutedText.value,
          icon: "ph:buildings-fill",
          iconBg: "bg-teal-500/10",
          iconColor: "text-teal-500"
        },
        {
          label: "Completed",
          value: String(completed),
          trend: "fully delivered",
          trendColor: completed > 0 ? "text-emerald-500" : mutedText.value,
          icon: "ph:check-circle-fill",
          iconBg: "bg-emerald-500/10",
          iconColor: "text-emerald-500"
        }
      ];
    });
    const pipelineChips = computed(() => [
      { label: "Created", count: queueSummary.value.created, dot: "bg-rich-orange" },
      { label: "Picked Up", count: queueSummary.value.picked_up, dot: "bg-purple-400" },
      { label: "In Transit", count: queueSummary.value.in_transit, dot: "bg-blue-400" },
      { label: "At Office", count: queueSummary.value.arrived_at_office, dot: "bg-teal-400" },
      { label: "Completed", count: queueSummary.value.completed, dot: "bg-emerald-400" }
    ]);
    const queueStats = computed(() => [
      { label: "Created — awaiting pickup", count: queueSummary.value.created, dot: "bg-rich-orange" },
      { label: "Picked Up", count: queueSummary.value.picked_up, dot: "bg-purple-400" },
      { label: "In Transit", count: queueSummary.value.in_transit, dot: "bg-blue-400" },
      { label: "Arrived at Office", count: queueSummary.value.arrived_at_office, dot: "bg-teal-400" },
      { label: "Completed", count: queueSummary.value.completed, dot: "bg-emerald-400" }
    ]);
    const tasks = [
      { id: 1, title: "Review subsidy application batch #221", priority: "High", due: "Today", status: "In Progress" },
      { id: 2, title: "Verify identification docs — Q3", priority: "Medium", due: "Tomorrow", status: "Pending" },
      { id: 3, title: "Update SLA tracking records", priority: "Low", due: "Jun 18", status: "Pending" }
    ];
    const formatDate = (value) => value ? new Intl.DateTimeFormat("en", { month: "short", day: "2-digit", year: "numeric" }).format(new Date(value)) : "—";
    const statusClass = (s) => {
      switch ((s ?? "").toLowerCase()) {
        case "approved":
          return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
        case "pending":
          return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
        case "rejected":
          return "bg-red-500/10 text-red-600 dark:text-red-400";
        case "processing":
          return "bg-blue-500/10 text-blue-500";
        default:
          return isDark.value ? "bg-white/5 text-gray-400" : "bg-gray-100 text-gray-500";
      }
    };
    const trackingBadge = (s) => {
      switch (s) {
        case "COMPLETED":
          return "bg-emerald-500/10 text-emerald-500";
        case "IN_TRANSIT":
          return "bg-blue-500/10 text-blue-400";
        case "ARRIVED_AT_OFFICE":
          return "bg-teal-500/10 text-teal-400";
        case "PICKED_UP":
          return "bg-purple-500/10 text-purple-400";
        default:
          return "bg-rich-orange/10 text-rich-orange";
      }
    };
    const fetchLedger = async () => {
      ledgerLoading.value = true;
      try {
        const res = await $fetch("/api/employee/ledger", {
          params: { scope: currentScope.value, limit: 30 }
        });
        ledger.value = res.data ?? [];
      } catch (err) {
        console.error("[EmployeeDashboard] ledger fetch error:", err);
      } finally {
        ledgerLoading.value = false;
      }
    };
    const fetchQueue = async () => {
      if (currentScope.value !== "GLOBAL") return;
      queueLoading.value = true;
      try {
        const res = await $fetch("/api/tracking/queue", {
          params: { scope: "GLOBAL", limit: 1 }
        });
        if (res.summary) queueSummary.value = res.summary;
      } catch (err) {
        console.error("[EmployeeDashboard] queue fetch error:", err);
      } finally {
        queueLoading.value = false;
      }
    };
    const reloadScopedData = async () => {
      await Promise.all([
        fetchLedger(),
        fetchQueue()
      ]);
      updateIndicator();
    };
    watch(currentScope, () => reloadScopedData());
    return (_ctx, _push, _parent, _attrs) => {
      const _component_Icon = __nuxt_component_0;
      const _component_NuxtLink = __nuxt_component_3;
      _push(`<div${ssrRenderAttrs(mergeProps({
        class: ["space-y-6 pb-24 lg:pb-8", unref(isDark) ? "text-white" : "text-gray-900"]
      }, _attrs))} data-v-56dc26ac><div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between" data-v-56dc26ac><div data-v-56dc26ac><div class="${ssrRenderClass([mutedText.value, "mb-2 flex items-center gap-2 text-sm"])}" data-v-56dc26ac>`);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:squares-four-fill",
        class: "h-4 w-4 text-rich-orange"
      }, null, _parent));
      _push(`<span data-v-56dc26ac>Employee Portal</span>`);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:caret-right",
        class: "h-3 w-3"
      }, null, _parent));
      _push(`<span class="${ssrRenderClass([unref(isDark) ? "text-white" : "text-gray-900", "font-medium"])}" data-v-56dc26ac>Dashboard</span></div><h1 class="text-2xl font-bold tracking-tight sm:text-3xl" data-v-56dc26ac> Hello, ${ssrInterpolate(unref(auth).user?.full_name?.split(" ")[0] || "Employee")}! </h1><p class="${ssrRenderClass([mutedText.value, "mt-1 text-sm"])}" data-v-56dc26ac>${ssrInterpolate(currentScope.value === "LOCAL" ? "Your personal office workspace overview." : "Organisation-wide document stream and analytics.")}</p></div><div class="flex flex-wrap items-center gap-3" data-v-56dc26ac><div class="${ssrRenderClass([unref(isDark) ? "bg-white/[0.04] border-white/10 backdrop-blur-md" : "bg-white border-gray-200 shadow-sm", "relative flex items-center gap-1 rounded-2xl border p-1.5"])}" data-v-56dc26ac><div class="absolute inset-y-1.5 rounded-xl bg-rich-orange shadow-lg shadow-rich-orange/30 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]" style="${ssrRenderStyle(indicatorStyle.value)}" data-v-56dc26ac></div><!--[-->`);
      ssrRenderList(scopeOptions, (opt) => {
        _push(`<button type="button" class="${ssrRenderClass([currentScope.value === opt.value ? "text-white" : unref(isDark) ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-700", "relative z-10 flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors duration-200 select-none"])}" data-v-56dc26ac>`);
        _push(ssrRenderComponent(_component_Icon, {
          name: opt.icon,
          class: "h-3.5 w-3.5 flex-none"
        }, null, _parent));
        _push(`<span class="whitespace-nowrap" data-v-56dc26ac>${ssrInterpolate(opt.label)}</span></button>`);
      });
      _push(`<!--]--></div>`);
      if (unref(auth).currentOrg) {
        _push(`<div class="${ssrRenderClass([unref(isDark) ? "bg-white/[0.04] border-white/10 text-gray-300" : "bg-white border-gray-200 text-gray-700", "inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm"])}" data-v-56dc26ac>`);
        _push(ssrRenderComponent(_component_Icon, {
          name: "ph:building-office-fill",
          class: "h-4 w-4 text-rich-orange"
        }, null, _parent));
        _push(`<span class="font-semibold" data-v-56dc26ac>${ssrInterpolate(unref(auth).currentOrg.name)}</span><span class="font-mono text-xs opacity-50" data-v-56dc26ac>${ssrInterpolate(unref(auth).currentOrg.code)}</span></div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div></div><div class="${ssrRenderClass([currentScope.value === "LOCAL" ? unref(isDark) ? "border-rich-orange/20 bg-rich-orange/5" : "border-orange-200 bg-orange-50" : unref(isDark) ? "border-white/10 bg-white/[0.03]" : "border-gray-200 bg-gray-50", "flex items-center gap-3 rounded-xl border px-4 py-3 text-sm"])}" data-v-56dc26ac><div class="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-rich-orange/10" data-v-56dc26ac>`);
      _push(ssrRenderComponent(_component_Icon, {
        name: currentScope.value === "LOCAL" ? "ph:buildings-fill" : "ph:globe-hemisphere-west-fill",
        class: "h-4 w-4 text-rich-orange"
      }, null, _parent));
      _push(`</div><div class="min-w-0 flex-1" data-v-56dc26ac><p class="font-semibold text-rich-orange text-[11px] uppercase tracking-widest" data-v-56dc26ac>${ssrInterpolate(currentScope.value === "LOCAL" ? "Small Picture — Office View" : "Big Picture — Organisation View")}</p><p class="${ssrRenderClass([mutedText.value, "mt-0.5 text-xs"])}" data-v-56dc26ac>${ssrInterpolate(currentScope.value === "LOCAL" ? `Showing data scoped to your ${myOffices.value.length} sub-office${myOffices.value.length === 1 ? "" : "s"} within ${unref(auth).currentOrg?.name || "your organisation"}.` : `Showing all ${queueSummary.value.total} in-flight documents across the entire organisation.`)}</p></div><div class="flex items-center gap-2" data-v-56dc26ac><span class="${ssrRenderClass([unref(isDark) ? "border-rich-orange/30 text-rich-orange" : "border-rich-orange/30 text-rich-orange", "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"])}" data-v-56dc26ac><span class="h-1.5 w-1.5 animate-pulse rounded-full bg-rich-orange" data-v-56dc26ac></span> Live </span>`);
      _push(ssrRenderComponent(_component_NuxtLink, {
        to: `/employee/ai?scope=${currentScope.value}`,
        class: ["inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition hover:scale-[1.03]", unref(isDark) ? "border-white/10 bg-white/5 text-gray-300 hover:border-rich-orange/30 hover:text-rich-orange" : "border-gray-200 bg-white text-gray-500 hover:border-rich-orange/30 hover:text-rich-orange"]
      }, {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(ssrRenderComponent(_component_Icon, {
              name: "ph:sparkle-fill",
              class: "h-3 w-3"
            }, null, _parent2, _scopeId));
            _push2(` Ask AI `);
          } else {
            return [
              createVNode(_component_Icon, {
                name: "ph:sparkle-fill",
                class: "h-3 w-3"
              }),
              createTextVNode(" Ask AI ")
            ];
          }
        }),
        _: 1
      }, _parent));
      _push(`</div></div><div class="grid grid-cols-2 gap-4 sm:grid-cols-4" data-v-56dc26ac><!--[-->`);
      ssrRenderList(kpiCards.value, (card, i) => {
        _push(`<div class="dashboard-card flex items-start gap-4 p-5 transition-all" style="${ssrRenderStyle({ transitionDelay: `${i * 40}ms` })}" data-v-56dc26ac><span class="${ssrRenderClass([card.iconBg, "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"])}" data-v-56dc26ac>`);
        _push(ssrRenderComponent(_component_Icon, {
          name: card.icon,
          class: ["h-5 w-5", card.iconColor]
        }, null, _parent));
        _push(`</span><div class="min-w-0" data-v-56dc26ac><p class="${ssrRenderClass([mutedText.value, "text-[10px] font-bold uppercase tracking-wider"])}" data-v-56dc26ac>${ssrInterpolate(card.label)}</p><p class="mt-1 text-2xl font-bold" data-v-56dc26ac>`);
        if (ledgerLoading.value) {
          _push(`<span class="inline-block h-6 w-12 animate-pulse rounded-lg bg-white/10" data-v-56dc26ac></span>`);
        } else {
          _push(`<span data-v-56dc26ac>${ssrInterpolate(card.value)}</span>`);
        }
        _push(`</p><p class="${ssrRenderClass([card.trendColor, "mt-0.5 text-[10px]"])}" data-v-56dc26ac>${ssrInterpolate(card.trend)}</p></div></div>`);
      });
      _push(`<!--]--></div>`);
      if (currentScope.value === "GLOBAL") {
        _push(`<div class="grid grid-cols-2 gap-3 sm:grid-cols-5" data-v-56dc26ac><!--[-->`);
        ssrRenderList(pipelineChips.value, (chip) => {
          _push(`<div class="${ssrRenderClass([unref(isDark) ? "border-white/10 bg-white/[0.03]" : "border-gray-200 bg-white", "flex flex-col items-center justify-center gap-1 rounded-xl border py-3 text-center transition-all"])}" data-v-56dc26ac><span class="${ssrRenderClass([chip.dot, "h-2 w-2 rounded-full"])}" data-v-56dc26ac></span><p class="text-xl font-bold" data-v-56dc26ac>${ssrInterpolate(chip.count)}</p><p class="${ssrRenderClass([mutedText.value, "text-[10px] font-semibold uppercase tracking-wider"])}" data-v-56dc26ac>${ssrInterpolate(chip.label)}</p></div>`);
        });
        _push(`<!--]--></div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`<div class="grid grid-cols-1 gap-5 lg:grid-cols-5" data-v-56dc26ac><section class="dashboard-card lg:col-span-3 flex flex-col overflow-hidden" data-v-56dc26ac><div class="${ssrRenderClass([unref(isDark) ? "border-white/5" : "border-gray-100", "flex items-center justify-between border-b px-6 py-4"])}" data-v-56dc26ac><div data-v-56dc26ac><h2 class="text-sm font-bold" data-v-56dc26ac>${ssrInterpolate(currentScope.value === "LOCAL" ? "Personal Action Ledger" : "Organisation Document Stream")}</h2><p class="${ssrRenderClass([mutedText.value, "mt-0.5 text-[11px]"])}" data-v-56dc26ac>${ssrInterpolate(currentScope.value === "LOCAL" ? "Documents in your offices or uploaded by you" : "All document transactions across the organisation")}</p></div><div class="flex items-center gap-2" data-v-56dc26ac><span class="${ssrRenderClass([currentScope.value === "LOCAL" ? "border-rich-orange/30 bg-rich-orange/10 text-rich-orange" : unref(isDark) ? "border-white/20 bg-white/5 text-gray-300" : "border-gray-300 bg-gray-100 text-gray-600", "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-all duration-300"])}" data-v-56dc26ac>`);
      _push(ssrRenderComponent(_component_Icon, {
        name: currentScope.value === "LOCAL" ? "ph:shield-check-fill" : "ph:globe-simple-fill",
        class: "h-2.5 w-2.5"
      }, null, _parent));
      _push(` ${ssrInterpolate(currentScope.value === "LOCAL" ? "Isolated" : "Org-Wide")}</span>`);
      _push(ssrRenderComponent(_component_NuxtLink, {
        to: `/employee/documents`,
        class: "text-xs font-semibold text-rich-orange transition-colors hover:text-[#e95a0b]"
      }, {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(` View all → `);
          } else {
            return [
              createTextVNode(" View all → ")
            ];
          }
        }),
        _: 1
      }, _parent));
      _push(`</div></div>`);
      if (ledgerLoading.value) {
        _push(`<div class="flex-1 space-y-3 p-5" data-v-56dc26ac><!--[-->`);
        ssrRenderList(5, (n) => {
          _push(`<div class="${ssrRenderClass([unref(isDark) ? "bg-white/5" : "bg-gray-100", "h-14 animate-pulse rounded-xl"])}" data-v-56dc26ac></div>`);
        });
        _push(`<!--]--></div>`);
      } else if (ledger.value.length) {
        _push(`<div class="${ssrRenderClass([unref(isDark) ? "divide-white/5" : "divide-gray-100", "flex-1 overflow-y-auto divide-y"])}" data-v-56dc26ac><!--[-->`);
        ssrRenderList(ledger.value.slice(0, 12), (doc) => {
          _push(`<div class="${ssrRenderClass([unref(isDark) ? "hover:bg-white/[0.025]" : "hover:bg-gray-50", "flex items-start gap-4 px-6 py-4 transition-colors"])}" data-v-56dc26ac><span class="${ssrRenderClass([doc.is_own_upload ? "bg-rich-orange/10" : unref(isDark) ? "bg-purple-500/10" : "bg-purple-50", "mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"])}" data-v-56dc26ac>`);
          _push(ssrRenderComponent(_component_Icon, {
            name: doc.is_own_upload ? "ph:upload-simple-fill" : "ph:buildings-fill",
            class: ["h-4 w-4", doc.is_own_upload ? "text-rich-orange" : "text-purple-500"]
          }, null, _parent));
          _push(`</span><div class="min-w-0 flex-1" data-v-56dc26ac><p class="${ssrRenderClass([unref(isDark) ? "text-gray-100" : "text-gray-800", "truncate text-sm font-semibold"])}" data-v-56dc26ac>${ssrInterpolate(doc.title || "Untitled Document")}</p><div class="${ssrRenderClass([mutedText.value, "mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0 text-[11px]"])}" data-v-56dc26ac>`);
          if (doc.origin_label || doc.office_label) {
            _push(`<span class="flex items-center gap-1" data-v-56dc26ac>`);
            _push(ssrRenderComponent(_component_Icon, {
              name: "ph:buildings",
              class: "h-3 w-3"
            }, null, _parent));
            _push(` ${ssrInterpolate(doc.origin_label || doc.office_label)}</span>`);
          } else {
            _push(`<!---->`);
          }
          _push(`<span data-v-56dc26ac>${ssrInterpolate(formatDate(doc.created_at))}</span><span class="${ssrRenderClass([doc.is_own_upload ? "text-rich-orange" : "text-purple-500", "font-medium"])}" data-v-56dc26ac>${ssrInterpolate(doc.is_own_upload ? "You uploaded" : "Routed in")}</span>`);
          if (doc.tracking_status && doc.tracking_status !== "CREATED") {
            _push(`<span class="${ssrRenderClass([trackingBadge(doc.tracking_status), "rounded-full px-1.5 py-0.5 font-semibold"])}" data-v-56dc26ac>${ssrInterpolate(doc.tracking_status?.replace("_", " "))}</span>`);
          } else {
            _push(`<!---->`);
          }
          _push(`</div></div><span class="${ssrRenderClass([statusClass(doc.status), "flex-shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"])}" data-v-56dc26ac>${ssrInterpolate(doc.status || "—")}</span></div>`);
        });
        _push(`<!--]--></div>`);
      } else {
        _push(`<div class="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-14 text-center" data-v-56dc26ac><div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-rich-orange/10" data-v-56dc26ac>`);
        _push(ssrRenderComponent(_component_Icon, {
          name: "ph:clipboard-text",
          class: "h-7 w-7 text-rich-orange/50"
        }, null, _parent));
        _push(`</div><p class="${ssrRenderClass([unref(isDark) ? "text-gray-300" : "text-gray-700", "font-semibold"])}" data-v-56dc26ac>${ssrInterpolate(currentScope.value === "LOCAL" ? "No documents in your personal ledger." : "No documents in the organisation yet.")}</p><p class="${ssrRenderClass([mutedText.value, "text-xs"])}" data-v-56dc26ac>${ssrInterpolate(currentScope.value === "LOCAL" ? "Upload a document from one of your offices to get started." : "Documents will appear here once uploaded.")}</p></div>`);
      }
      _push(`</section><div class="lg:col-span-2 flex flex-col gap-5" data-v-56dc26ac><div class="dashboard-card p-5" data-v-56dc26ac><div class="mb-4 flex items-center justify-between" data-v-56dc26ac><div data-v-56dc26ac><h2 class="text-sm font-bold" data-v-56dc26ac>My Sub-Offices</h2><p class="${ssrRenderClass([mutedText.value, "mt-0.5 text-[11px]"])}" data-v-56dc26ac>Registered branches</p></div>`);
      _push(ssrRenderComponent(_component_NuxtLink, {
        to: "/employee/offices",
        class: "text-xs font-semibold text-rich-orange transition-colors hover:text-[#e95a0b]"
      }, {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(` Manage → `);
          } else {
            return [
              createTextVNode(" Manage → ")
            ];
          }
        }),
        _: 1
      }, _parent));
      _push(`</div>`);
      if (officesLoading.value) {
        _push(`<div class="space-y-2" data-v-56dc26ac><!--[-->`);
        ssrRenderList(2, (n) => {
          _push(`<div class="${ssrRenderClass([unref(isDark) ? "bg-white/5" : "bg-gray-100", "h-10 animate-pulse rounded-xl"])}" data-v-56dc26ac></div>`);
        });
        _push(`<!--]--></div>`);
      } else if (myOffices.value.length) {
        _push(`<div class="space-y-2" data-v-56dc26ac><!--[-->`);
        ssrRenderList(myOffices.value.slice(0, 4), (office) => {
          _push(`<div class="${ssrRenderClass([unref(isDark) ? "border-white/5 hover:bg-white/[0.03]" : "border-gray-100 hover:bg-gray-50", "flex items-center gap-3 rounded-xl border p-3 transition-colors"])}" data-v-56dc26ac><span class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-rich-orange/10" data-v-56dc26ac>`);
          _push(ssrRenderComponent(_component_Icon, {
            name: "ph:buildings-fill",
            class: "h-3.5 w-3.5 text-rich-orange"
          }, null, _parent));
          _push(`</span><div class="min-w-0 flex-1" data-v-56dc26ac><p class="${ssrRenderClass([unref(isDark) ? "text-gray-200" : "text-gray-800", "truncate text-xs font-semibold"])}" data-v-56dc26ac>${ssrInterpolate(office.name)}</p><p class="${ssrRenderClass([mutedText.value, "font-mono text-[10px]"])}" data-v-56dc26ac>${ssrInterpolate(office.code || `OFF-${String(office.id).padStart(6, "0")}`)}</p></div>`);
          _push(ssrRenderComponent(_component_Icon, {
            name: "ph:qr-code",
            class: "h-4 w-4 text-gray-300"
          }, null, _parent));
          _push(`</div>`);
        });
        _push(`<!--]-->`);
        if (myOffices.value.length > 4) {
          _push(`<p class="${ssrRenderClass([mutedText.value, "text-center text-[11px]"])}" data-v-56dc26ac> +${ssrInterpolate(myOffices.value.length - 4)} more </p>`);
        } else {
          _push(`<!---->`);
        }
        _push(`</div>`);
      } else {
        _push(`<div class="flex flex-col items-center gap-3 py-6 text-center" data-v-56dc26ac>`);
        _push(ssrRenderComponent(_component_Icon, {
          name: "ph:building-office",
          class: "h-8 w-8 text-gray-300"
        }, null, _parent));
        _push(`<p class="${ssrRenderClass([mutedText.value, "text-xs"])}" data-v-56dc26ac>No offices assigned yet.</p>`);
        _push(ssrRenderComponent(_component_NuxtLink, {
          to: "/employee/offices",
          class: "text-xs font-semibold text-rich-orange hover:text-[#e95a0b]"
        }, {
          default: withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              _push2(` Register one → `);
            } else {
              return [
                createTextVNode(" Register one → ")
              ];
            }
          }),
          _: 1
        }, _parent));
        _push(`</div>`);
      }
      _push(`</div>`);
      if (currentScope.value === "LOCAL") {
        _push(`<div class="dashboard-card flex-1 p-5" data-v-56dc26ac><div class="mb-4 flex items-center justify-between" data-v-56dc26ac><h2 class="text-sm font-bold" data-v-56dc26ac>Assigned Tasks</h2>`);
        _push(ssrRenderComponent(_component_NuxtLink, {
          to: "/employee/working",
          class: "text-xs font-semibold text-rich-orange hover:text-[#e95a0b]"
        }, {
          default: withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              _push2(` View all → `);
            } else {
              return [
                createTextVNode(" View all → ")
              ];
            }
          }),
          _: 1
        }, _parent));
        _push(`</div><div class="space-y-2.5" data-v-56dc26ac><!--[-->`);
        ssrRenderList(tasks, (task) => {
          _push(`<div class="${ssrRenderClass([unref(isDark) ? "border-white/5 hover:bg-white/[0.03]" : "border-gray-100 hover:bg-gray-50", "flex items-center gap-3 rounded-xl border p-3 transition-colors"])}" data-v-56dc26ac><span class="${ssrRenderClass([task.priority === "High" ? "bg-red-500/10 text-red-500" : task.priority === "Medium" ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500", "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-[10px] font-bold"])}" data-v-56dc26ac>${ssrInterpolate(task.priority[0])}</span><div class="min-w-0 flex-1" data-v-56dc26ac><p class="${ssrRenderClass([unref(isDark) ? "text-gray-200" : "text-gray-800", "truncate text-xs font-medium"])}" data-v-56dc26ac>${ssrInterpolate(task.title)}</p><p class="${ssrRenderClass([mutedText.value, "mt-0.5 text-[10px]"])}" data-v-56dc26ac>Due ${ssrInterpolate(task.due)}</p></div><span class="${ssrRenderClass([task.status === "In Progress" ? "bg-rich-orange/10 text-rich-orange" : unref(isDark) ? "bg-white/5 text-gray-400" : "bg-gray-100 text-gray-500", "flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"])}" data-v-56dc26ac>${ssrInterpolate(task.status)}</span></div>`);
        });
        _push(`<!--]--></div></div>`);
      } else {
        _push(`<div class="dashboard-card flex-1 p-5" data-v-56dc26ac><div class="mb-4 flex items-center justify-between" data-v-56dc26ac><div data-v-56dc26ac><h2 class="text-sm font-bold" data-v-56dc26ac>Tracking Queue</h2><p class="${ssrRenderClass([mutedText.value, "mt-0.5 text-[11px]"])}" data-v-56dc26ac>Live org-wide pipeline</p></div>`);
        _push(ssrRenderComponent(_component_NuxtLink, {
          to: "/employee/working",
          class: "text-xs font-semibold text-rich-orange hover:text-[#e95a0b]"
        }, {
          default: withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              _push2(` Full queue → `);
            } else {
              return [
                createTextVNode(" Full queue → ")
              ];
            }
          }),
          _: 1
        }, _parent));
        _push(`</div>`);
        if (queueLoading.value) {
          _push(`<div class="space-y-2" data-v-56dc26ac><!--[-->`);
          ssrRenderList(4, (n) => {
            _push(`<div class="${ssrRenderClass([unref(isDark) ? "bg-white/5" : "bg-gray-100", "h-10 animate-pulse rounded-xl"])}" data-v-56dc26ac></div>`);
          });
          _push(`<!--]--></div>`);
        } else {
          _push(`<div class="space-y-2.5" data-v-56dc26ac><!--[-->`);
          ssrRenderList(queueStats.value, (stat) => {
            _push(`<div class="${ssrRenderClass([unref(isDark) ? "border-white/5 bg-white/[0.02]" : "border-gray-100 bg-gray-50", "flex items-center gap-3 rounded-xl border p-3"])}" data-v-56dc26ac><span class="${ssrRenderClass([stat.dot, "h-2.5 w-2.5 flex-none rounded-full"])}" data-v-56dc26ac></span><span class="${ssrRenderClass([unref(isDark) ? "text-gray-300" : "text-gray-700", "flex-1 text-xs font-medium"])}" data-v-56dc26ac>${ssrInterpolate(stat.label)}</span><span class="${ssrRenderClass([unref(isDark) ? "text-white" : "text-gray-900", "text-sm font-bold"])}" data-v-56dc26ac>${ssrInterpolate(stat.count)}</span></div>`);
          });
          _push(`<!--]--><div class="${ssrRenderClass([unref(isDark) ? "border-rich-orange/20 bg-rich-orange/5" : "border-orange-200 bg-orange-50", "mt-2 rounded-xl border px-3 py-2.5 text-center text-[11px] font-semibold text-rich-orange"])}" data-v-56dc26ac>${ssrInterpolate(queueSummary.value.total)} total in-flight documents </div></div>`);
        }
        _push(`</div>`);
      }
      _push(`</div></div></div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/employee/dashboard.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const dashboard = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-56dc26ac"]]);

export { dashboard as default };
//# sourceMappingURL=dashboard-B0EIqdGy.mjs.map
