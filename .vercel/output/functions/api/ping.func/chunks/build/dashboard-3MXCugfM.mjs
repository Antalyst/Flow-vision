import __nuxt_component_0 from './index-CSZJBLRw.mjs';
import { _ as __nuxt_component_3 } from './nuxt-link-BkIUUJ0e.mjs';
import { defineComponent, mergeProps, unref, withCtx, createTextVNode, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderClass, ssrRenderComponent, ssrInterpolate, ssrRenderList } from 'vue/server-renderer';
import { a as useAuthStore, u as useTheme } from './server.mjs';
import '@iconify/vue';
import '@iconify/utils/lib/css/icon';
import '../_/nitro.mjs';
import 'node:crypto';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'mysql2/promise';
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
    const kpiCards = [
      { label: "Active Deliveries", value: "7", trend: "+2 today", trendUp: true, icon: "ph:package-fill", iconBg: "bg-amber-500/10", iconColor: "text-amber-500" },
      { label: "Completed Today", value: "14", trend: "+5 vs yesterday", trendUp: true, icon: "ph:check-circle-fill", iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
      { label: "Pending Pickup", value: "3", trend: "Same as yesterday", trendUp: false, icon: "ph:clock-countdown-fill", iconBg: "bg-rose-500/10", iconColor: "text-rose-500" }
    ];
    const deliveries = [
      { id: 1, label: "Document Batch #44 — Subsidy Forms", destination: "Municipal Hall, Bldg A", time: "9:30 AM", status: "In Transit" },
      { id: 2, label: "Legal File — Case Ref. LG-221", destination: "Regional Office 3", time: "11:00 AM", status: "Pending" },
      { id: 3, label: "ID Verification Pack — Batch 7", destination: "Records Archive", time: "8:15 AM", status: "Delivered" }
    ];
    return (_ctx, _push, _parent, _attrs) => {
      const _component_Icon = __nuxt_component_0;
      const _component_NuxtLink = __nuxt_component_3;
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "space-y-6" }, _attrs))}><div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"><div><div class="${ssrRenderClass([unref(isDark) ? "text-gray-400" : "text-gray-500", "flex items-center gap-2 text-sm mb-2"])}">`);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:squares-four-fill",
        class: "w-4 h-4 text-amber-500"
      }, null, _parent));
      _push(`<span>Messenger Portal</span>`);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:caret-right",
        class: "w-3 h-3"
      }, null, _parent));
      _push(`<span class="${ssrRenderClass(unref(isDark) ? "text-white font-medium" : "text-gray-900 font-medium")}">Dashboard</span></div><h1 class="${ssrRenderClass([unref(isDark) ? "text-white" : "text-gray-900", "text-2xl font-bold tracking-tight"])}"> Hello, ${ssrInterpolate(unref(auth).user?.full_name?.split(" ")[0] || "Messenger")}! </h1><p class="${ssrRenderClass([unref(isDark) ? "text-gray-400" : "text-gray-500", "mt-1 text-sm"])}"> Here are your active deliveries and status overview. </p></div>`);
      if (unref(auth).currentOrg) {
        _push(`<div class="${ssrRenderClass([unref(isDark) ? "bg-card-dark border-card-border text-gray-300" : "bg-white border-gray-200 text-gray-700", "inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm"])}">`);
        _push(ssrRenderComponent(_component_Icon, {
          name: "ph:building-office-fill",
          class: "w-4 h-4 text-amber-500"
        }, null, _parent));
        _push(`<div><span class="font-semibold">${ssrInterpolate(unref(auth).currentOrg.name)}</span><span class="ml-2 text-xs font-mono opacity-60">${ssrInterpolate(unref(auth).currentOrg.code)}</span></div></div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div><div class="grid grid-cols-1 sm:grid-cols-3 gap-5"><!--[-->`);
      ssrRenderList(kpiCards, (card) => {
        _push(`<div class="dashboard-card p-5 flex items-start gap-4"><span class="${ssrRenderClass([card.iconBg, "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"])}">`);
        _push(ssrRenderComponent(_component_Icon, {
          name: card.icon,
          class: ["w-5 h-5", card.iconColor]
        }, null, _parent));
        _push(`</span><div><p class="${ssrRenderClass([unref(isDark) ? "text-gray-400" : "text-gray-500", "text-xs font-semibold uppercase tracking-wider"])}">${ssrInterpolate(card.label)}</p><p class="${ssrRenderClass([unref(isDark) ? "text-white" : "text-gray-900", "mt-1 text-2xl font-bold"])}">${ssrInterpolate(card.value)}</p><p class="${ssrRenderClass([card.trendUp ? "text-emerald-500" : "text-red-500", "mt-0.5 text-xs"])}">${ssrInterpolate(card.trend)}</p></div></div>`);
      });
      _push(`<!--]--></div><div class="dashboard-card p-6"><div class="flex items-center justify-between mb-5"><h2 class="${ssrRenderClass([unref(isDark) ? "text-white" : "text-gray-900", "text-sm font-semibold"])}">Active Deliveries</h2>`);
      _push(ssrRenderComponent(_component_NuxtLink, {
        to: "/messenger/deliveries",
        class: "text-xs font-semibold text-amber-500 hover:text-amber-400 transition-colors"
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
      _push(`</div><div class="space-y-3"><!--[-->`);
      ssrRenderList(deliveries, (delivery) => {
        _push(`<div class="${ssrRenderClass([unref(isDark) ? "border-card-border hover:bg-white/[0.02]" : "border-gray-100 hover:bg-gray-50", "flex items-center gap-4 rounded-xl border p-4 transition-colors"])}"><span class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-amber-500/10">`);
        _push(ssrRenderComponent(_component_Icon, {
          name: "ph:package-fill",
          class: "w-4 h-4 text-amber-500"
        }, null, _parent));
        _push(`</span><div class="flex-1 min-w-0"><p class="${ssrRenderClass([unref(isDark) ? "text-gray-200" : "text-gray-800", "text-sm font-medium truncate"])}">${ssrInterpolate(delivery.label)}</p><p class="${ssrRenderClass([unref(isDark) ? "text-gray-500" : "text-gray-400", "text-xs mt-0.5"])}">${ssrInterpolate(delivery.destination)} · ${ssrInterpolate(delivery.time)}</p></div><span class="${ssrRenderClass([delivery.status === "In Transit" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : delivery.status === "Delivered" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400", "flex-shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"])}">${ssrInterpolate(delivery.status)}</span></div>`);
      });
      _push(`<!--]-->`);
      if (deliveries.length === 0) {
        _push(`<p class="${ssrRenderClass([unref(isDark) ? "text-gray-500" : "text-gray-400", "py-8 text-center text-sm"])}"> No active deliveries. </p>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div></div></div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/messenger/dashboard.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=dashboard-3MXCugfM.mjs.map
