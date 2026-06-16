import { defineComponent, mergeProps, unref, computed, ref, useSSRContext } from 'vue';
import { ssrRenderComponent, ssrRenderAttrs, ssrRenderClass, ssrRenderList, ssrRenderStyle, ssrInterpolate, ssrRenderAttr, ssrIncludeBooleanAttr, ssrLooseContain } from 'vue/server-renderer';
import { a as useAuthStore, u as useTheme } from './server.mjs';
import __nuxt_component_0 from './index-BYCkTpU3.mjs';
import { u as useDashboardEntrance } from './useDashboardEntrance-W2ntCYX9.mjs';
import '../_/nitro.mjs';
import '@supabase/ssr';
import 'node:crypto';
import '@supabase/functions-js';
import '@supabase/postgrest-js';
import '@supabase/realtime-js';
import '@supabase/storage-js';
import '@supabase/auth-js';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'mysql2/promise';
import '@iconify/utils';
import 'consola';
import 'node:fs';
import 'node:path';
import 'pinia';
import 'vue-router';
import '@vue/shared';
import '@iconify/vue';
import '@iconify/utils/lib/css/icon';
import '../routes/renderer.mjs';
import 'vue-bundle-renderer/runtime';
import 'unhead/server';
import 'devalue';
import 'unhead/utils';

const _sfc_main$6 = /* @__PURE__ */ defineComponent({
  __name: "DashboardHeader",
  __ssrInlineRender: true,
  props: {
    userName: { default: "User" }
  },
  setup(__props) {
    const { isDark } = useTheme();
    return (_ctx, _push, _parent, _attrs) => {
      const _component_Icon = __nuxt_component_0;
      _push(`<div${ssrRenderAttrs(_attrs)}><div class="flex items-center justify-between mb-6"><div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">`);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:squares-four-fill",
        class: "w-4 h-4 text-rich-orange"
      }, null, _parent));
      _push(`<span>Overview</span>`);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:caret-right",
        class: "w-3 h-3"
      }, null, _parent));
      _push(`<span class="text-gray-900 dark:text-white font-medium">Dashboard</span></div><div class="flex items-center gap-3"><button class="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-card-dark transition">`);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:bell",
        class: "w-5 h-5 text-gray-500 dark:text-gray-400"
      }, null, _parent));
      _push(`</button><button class="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-card-dark transition">`);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:gear",
        class: "w-5 h-5 text-gray-500 dark:text-gray-400"
      }, null, _parent));
      _push(`</button></div></div><div class="flex items-center justify-between"><div><h1 class="text-2xl font-bold text-gray-900 dark:text-white">Hello, ${ssrInterpolate(__props.userName)}! 👋</h1><p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Here are the latest insights from your document monitoring.</p></div><div class="flex items-center gap-3"><button class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-white dark:bg-card-dark border border-gray-200 dark:border-card-border text-gray-700 dark:text-gray-300 hover:border-rich-orange transition">`);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:calendar-blank",
        class: "w-4 h-4"
      }, null, _parent));
      _push(`<span>Last week</span>`);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:caret-down",
        class: "w-3 h-3"
      }, null, _parent));
      _push(`</button><button class="${ssrRenderClass([unref(isDark) ? "bg-rich-orange" : "bg-gray-300", "relative w-14 h-7 rounded-full transition-colors duration-300"])}"><span class="${ssrRenderClass([unref(isDark) ? "translate-x-7" : "translate-x-0.5", "absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-300 flex items-center justify-center"])}">`);
      _push(ssrRenderComponent(_component_Icon, {
        name: unref(isDark) ? "ph:moon-fill" : "ph:sun-fill",
        class: ["w-3.5 h-3.5", unref(isDark) ? "text-rich-orange" : "text-amber-500"]
      }, null, _parent));
      _push(`</span></button><button class="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-card-dark transition">`);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:dots-three-vertical-bold",
        class: "w-5 h-5 text-gray-500 dark:text-gray-400"
      }, null, _parent));
      _push(`</button></div></div></div>`);
    };
  }
});
const _sfc_setup$6 = _sfc_main$6.setup;
_sfc_main$6.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/client/dashboard/DashboardHeader.vue");
  return _sfc_setup$6 ? _sfc_setup$6(props, ctx) : void 0;
};
const DashboardHeader = Object.assign(_sfc_main$6, { __name: "ClientDashboardHeader" });
const _sfc_main$5 = {
  __name: "ClientDashboardKpiCard",
  __ssrInlineRender: true,
  props: {
    title: {
      type: String,
      required: true
    },
    value: {
      type: String,
      required: true
    },
    trend: {
      type: String,
      required: true
    },
    trendUp: {
      type: Boolean,
      default: true
    },
    sparklineData: {
      type: Array,
      default: () => [0, 0, 0, 0, 0, 0, 0]
    }
  },
  setup(__props) {
    const props = __props;
    const gradientId = computed(() => {
      const slug = props.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      return `sparkline-gradient-${slug}-${Math.random().toString(36).slice(2, 8)}`;
    });
    const polylinePoints = computed(() => {
      const data = props.sparklineData;
      if (!data || data.length < 2) return "";
      const width = 100;
      const height = 40;
      const padY = 4;
      const usableHeight = height - padY * 2;
      const min = Math.min(...data);
      const max = Math.max(...data);
      const range = max - min || 1;
      const stepX = width / (data.length - 1);
      return data.map((val, i) => {
        const x = i * stepX;
        const y = padY + usableHeight - (val - min) / range * usableHeight;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(" ");
    });
    const areaPoints = computed(() => {
      if (!polylinePoints.value) return "";
      const data = props.sparklineData;
      const width = 100;
      const stepX = width / (data.length - 1);
      const lastX = (data.length - 1) * stepX;
      return `${polylinePoints.value} ${lastX.toFixed(1)},40 0,40`;
    });
    return (_ctx, _push, _parent, _attrs) => {
      const _component_Icon = __nuxt_component_0;
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "dashboard-card dashboard-card-hover p-5 flex flex-col gap-3 relative overflow-hidden" }, _attrs))}><div class="flex items-center justify-between"><h3 class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">${ssrInterpolate(__props.title)}</h3><button type="button" class="text-gray-400 hover:text-rich-orange transition-colors duration-200">`);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:arrows-out-simple",
        class: "w-4 h-4"
      }, null, _parent));
      _push(`</button></div><div class="flex items-end justify-between gap-4"><div class="flex flex-col gap-1"><p class="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">${ssrInterpolate(__props.value)}</p><div class="flex items-center gap-1.5"><span class="${ssrRenderClass([__props.trendUp ? "text-emerald-500" : "text-red-500", "text-xs font-semibold"])}">${ssrInterpolate(__props.trend)}</span><span class="text-xs text-muted">vs last week</span></div></div><svg width="100" height="40" viewBox="0 0 100 40" class="flex-shrink-0" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient${ssrRenderAttr("id", gradientId.value)} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FF620C" stop-opacity="0.3"></stop><stop offset="100%" stop-color="#FF620C" stop-opacity="0.02"></stop></linearGradient></defs><polygon${ssrRenderAttr("points", areaPoints.value)}${ssrRenderAttr("fill", `url(#${gradientId.value})`)}></polygon><polyline${ssrRenderAttr("points", polylinePoints.value)} fill="none" stroke="#FF620C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></polyline></svg></div></div>`);
    };
  }
};
const _sfc_setup$5 = _sfc_main$5.setup;
_sfc_main$5.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/client/dashboard/KpiCard.vue");
  return _sfc_setup$5 ? _sfc_setup$5(props, ctx) : void 0;
};
const totalVolume = "4,790";
const trendPercent = "+8%";
const maxValue = 800;
const avgValue = 400;
const _sfc_main$4 = /* @__PURE__ */ defineComponent({
  __name: "DocumentVolumeChart",
  __ssrInlineRender: true,
  setup(__props) {
    useTheme();
    const chartData = ref([
      { day: "Sun", value: 180 },
      { day: "Mon", value: 320 },
      { day: "Tue", value: 584 },
      { day: "Wed", value: 450 },
      { day: "Thu", value: 380 },
      { day: "Fri", value: 520 },
      { day: "Sat", value: 290 }
    ]);
    const hoveredIndex = ref(-1);
    const yLabels = [
      { label: "800", top: "0%" },
      { label: "600", top: "25%" },
      { label: "400", top: "50%" },
      { label: "200", top: "75%" }
    ];
    const gridLines = ["0%", "25%", "50%", "75%"];
    return (_ctx, _push, _parent, _attrs) => {
      const _component_Icon = __nuxt_component_0;
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "dashboard-card p-6" }, _attrs))}><div class="flex items-center justify-between mb-6"><h3 class="text-sm font-semibold text-gray-900 dark:text-white"> Document Volume Trend </h3><button class="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 dark:border-card-border text-sm text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500 transition-all duration-200 bg-white dark:bg-card-dark">`);
      _push(ssrRenderComponent(_component_Icon, {
        name: "lucide:calendar",
        class: "w-3.5 h-3.5 text-gray-400 dark:text-gray-500"
      }, null, _parent));
      _push(`<span class="font-medium">Last week</span>`);
      _push(ssrRenderComponent(_component_Icon, {
        name: "lucide:chevron-down",
        class: "w-3.5 h-3.5 text-gray-400 dark:text-gray-500"
      }, null, _parent));
      _push(`</button></div><div class="mb-8"><div class="flex items-baseline gap-3"><span class="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">${ssrInterpolate(totalVolume)}</span><span class="text-sm font-semibold text-emerald-500">${ssrInterpolate(trendPercent)}</span><span class="text-sm text-muted"> vs last week </span></div></div><div class="relative" style="${ssrRenderStyle({ "height": "240px" })}"><!--[-->`);
      ssrRenderList(yLabels, (item) => {
        _push(`<div class="absolute right-0 text-xs text-gray-400 dark:text-gray-500 font-medium -translate-y-1/2 select-none" style="${ssrRenderStyle({ top: item.top })}">${ssrInterpolate(item.label)}</div>`);
      });
      _push(`<!--]--><!--[-->`);
      ssrRenderList(gridLines, (line) => {
        _push(`<div class="absolute left-0 right-10 border-t border-gray-100 dark:border-card-border" style="${ssrRenderStyle({ top: line })}"></div>`);
      });
      _push(`<!--]--><div class="absolute left-0 right-10 border-t border-gray-200 dark:border-card-border" style="${ssrRenderStyle({ "top": "100%" })}"></div><div class="absolute left-0 right-10 border-t-2 border-dashed border-rich-orange/40 z-[1]" style="${ssrRenderStyle({ top: (1 - avgValue / maxValue) * 100 + "%" })}"></div><div class="flex items-end justify-between h-full pr-10 pb-8"><!--[-->`);
      ssrRenderList(chartData.value, (item, index) => {
        _push(`<div class="flex flex-col items-center gap-2 flex-1 relative">`);
        if (hoveredIndex.value === index) {
          _push(`<div class="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-semibold px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap z-10 animate-fade-in">${ssrInterpolate(item.day)}: ${ssrInterpolate(item.value)}</div>`);
        } else {
          _push(`<!---->`);
        }
        _push(`<div class="${ssrRenderClass([hoveredIndex.value === index ? "bg-rich-orange scale-[1.02]" : "bg-rich-orange/25 dark:bg-rich-orange/20", "w-full max-w-[48px] rounded-t-lg transition-all duration-300 cursor-pointer"])}" style="${ssrRenderStyle({ height: item.value / maxValue * 100 + "%" })}"></div><span class="absolute -bottom-6 text-xs text-gray-500 dark:text-gray-400 font-medium select-none">${ssrInterpolate(item.day)}</span></div>`);
      });
      _push(`<!--]--></div></div></div>`);
    };
  }
});
const _sfc_setup$4 = _sfc_main$4.setup;
_sfc_main$4.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/client/dashboard/DocumentVolumeChart.vue");
  return _sfc_setup$4 ? _sfc_setup$4(props, ctx) : void 0;
};
const DocumentVolumeChart = Object.assign(_sfc_main$4, { __name: "ClientDashboardDocumentVolumeChart" });
const _sfc_main$3 = /* @__PURE__ */ defineComponent({
  __name: "LatestUpdates",
  __ssrInlineRender: true,
  setup(__props) {
    const activeTab = ref("today");
    const searchQuery = ref("");
    const activities = ref([
      {
        id: 1,
        title: "Document Updated",
        description: "Document #2319 SLA updated",
        time: "11:20 AM",
        type: "update",
        color: "bg-rich-orange",
        iconColor: "text-rich-orange"
      },
      {
        id: 2,
        title: "New Client Added",
        description: "PT. Alpha Indonesia registered",
        time: "11:15 AM",
        type: "client",
        color: "bg-blue-500",
        iconColor: "text-blue-500"
      },
      {
        id: 3,
        title: "Agent Reassigned",
        description: "Document #2322 moved to Michael Wong",
        time: "11:00 AM",
        type: "reassign",
        color: "bg-purple-500",
        iconColor: "text-purple-500"
      },
      {
        id: 4,
        title: "SLA Breach Risk",
        description: 'Document #2320 "Login issue"',
        time: "10:45 AM",
        type: "risk",
        color: "bg-red-500",
        iconColor: "text-red-500"
      },
      {
        id: 5,
        title: "Knowledge Base",
        description: 'New article published: "Login Troubleshooting"',
        time: "10:30 AM",
        type: "knowledge",
        color: "bg-emerald-500",
        iconColor: "text-emerald-500"
      },
      {
        id: 6,
        title: "Customer Feedback",
        description: '"Great support response, thanks Sarah!"',
        time: "10:30 AM",
        type: "feedback",
        color: "bg-teal-500",
        iconColor: "text-teal-500"
      }
    ]);
    const filteredActivities = computed(() => {
      if (!searchQuery.value.trim()) return activities.value;
      const query = searchQuery.value.toLowerCase().trim();
      return activities.value.filter(
        (a) => a.title.toLowerCase().includes(query) || a.description.toLowerCase().includes(query)
      );
    });
    return (_ctx, _push, _parent, _attrs) => {
      const _component_Icon = __nuxt_component_0;
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "dashboard-card p-5 flex flex-col h-full" }, _attrs))}><div class="flex items-center justify-between mb-4"><h3 class="text-sm font-semibold text-gray-900 dark:text-white">Latest Updates</h3><button class="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-rich-black/40 transition-colors">`);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:dots-three-bold",
        class: "w-5 h-5 text-gray-400 dark:text-gray-500"
      }, null, _parent));
      _push(`</button></div><div class="flex bg-gray-100 dark:bg-rich-black/50 p-1 rounded-xl mb-4"><button class="${ssrRenderClass([unref(activeTab) === "today" ? "bg-white dark:bg-card-dark text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700", "flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"])}"> Today </button><button class="${ssrRenderClass([unref(activeTab) === "yesterday" ? "bg-white dark:bg-card-dark text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700", "flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"])}"> Yesterday </button><button class="${ssrRenderClass([unref(activeTab) === "week" ? "bg-white dark:bg-card-dark text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700", "flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"])}"> This week </button></div><div class="relative mb-4">`);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:magnifying-glass",
        class: "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
      }, null, _parent));
      _push(`<input${ssrRenderAttr("value", unref(searchQuery))} placeholder="Search activities" class="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-rich-black/30 border border-gray-200 dark:border-card-border text-gray-700 dark:text-gray-300 placeholder:text-gray-400 outline-none focus:border-rich-orange transition"></div><p class="text-xs text-gray-500 dark:text-gray-400 mb-4"><span class="font-bold text-gray-900 dark:text-white">${ssrInterpolate(unref(filteredActivities).length)}</span> new activities today </p><div class="flex-1 overflow-y-auto space-y-1"><!--[-->`);
      ssrRenderList(unref(filteredActivities), (activity, index) => {
        _push(`<div class="flex gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-rich-black/30 transition-colors cursor-pointer group"><div class="flex flex-col items-center pt-1"><div class="${ssrRenderClass([activity.color, "w-2.5 h-2.5 rounded-full"])}"></div>`);
        if (index < unref(filteredActivities).length - 1) {
          _push(`<div class="w-px flex-1 bg-gray-200 dark:bg-card-border mt-2"></div>`);
        } else {
          _push(`<!---->`);
        }
        _push(`</div><div class="flex-1 min-w-0"><div class="flex items-center justify-between"><h4 class="text-xs font-bold text-gray-900 dark:text-white">${ssrInterpolate(activity.title)}</h4><span class="text-[10px] text-gray-400 dark:text-gray-500 font-medium whitespace-nowrap">${ssrInterpolate(activity.time)}</span></div><p class="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">${ssrInterpolate(activity.description)}</p></div></div>`);
      });
      _push(`<!--]--></div></div>`);
    };
  }
});
const _sfc_setup$3 = _sfc_main$3.setup;
_sfc_main$3.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/client/dashboard/LatestUpdates.vue");
  return _sfc_setup$3 ? _sfc_setup$3(props, ctx) : void 0;
};
const LatestUpdates = Object.assign(_sfc_main$3, { __name: "ClientDashboardLatestUpdates" });
const totalPages = 5;
const _sfc_main$2 = {
  __name: "ClientDashboardDocumentTable",
  __ssrInlineRender: true,
  setup(__props) {
    const searchQuery = ref("");
    const currentPage = ref(1);
    const documents = ref([
      {
        id: "#2319",
        subject: "Payment failed on invoice",
        priority: "High",
        assignedTo: { name: "John Doe", avatar: "JD" },
        status: "In Review",
        statusType: "review",
        createdDate: "2025-08-18",
        slaDue: "2h left",
        selected: false
      },
      {
        id: "#2320",
        subject: "Login issue",
        priority: "Medium",
        assignedTo: { name: "Sarah Lee", avatar: "SL" },
        status: "Delivered",
        statusType: "delivered",
        createdDate: "2025-08-19",
        slaDue: "1h left",
        selected: false
      },
      {
        id: "#2321",
        subject: "Feature request export",
        priority: "Low",
        assignedTo: { name: "John Doe", avatar: "JD" },
        status: "In Progress",
        statusType: "progress",
        createdDate: "2025-08-19",
        slaDue: "1d left",
        selected: false
      },
      {
        id: "#2322",
        subject: "Contract renewal issue",
        priority: "Medium",
        assignedTo: { name: "Michael Wong", avatar: "MW" },
        status: "In Progress",
        statusType: "progress",
        createdDate: "2025-08-20",
        slaDue: "9h left",
        selected: false
      }
    ]);
    const selectAll = ref(false);
    const filteredDocs = computed(() => {
      if (!searchQuery.value) return documents.value;
      const q = searchQuery.value.toLowerCase();
      return documents.value.filter(
        (d) => d.id.toLowerCase().includes(q) || d.subject.toLowerCase().includes(q) || d.assignedTo.name.toLowerCase().includes(q)
      );
    });
    const getPriorityClass = (priority) => {
      const map = { "High": "badge-high", "Medium": "badge-medium", "Low": "badge-low" };
      return map[priority] || "badge-medium";
    };
    const getStatusIcon = (type) => {
      const map = {
        "review": { icon: "ph:clock-fill", color: "text-rich-orange" },
        "delivered": { icon: "ph:check-circle-fill", color: "text-emerald-500" },
        "progress": { icon: "ph:spinner", color: "text-blue-500" }
      };
      return map[type] || map["progress"];
    };
    const getAvatarColor = (initials) => {
      const colors = [
        "bg-rich-orange/20 text-rich-orange",
        "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
        "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
        "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
      ];
      const index = initials.charCodeAt(0) % colors.length;
      return colors[index];
    };
    return (_ctx, _push, _parent, _attrs) => {
      const _component_Icon = __nuxt_component_0;
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "dashboard-card overflow-hidden" }, _attrs))}><div class="flex items-center justify-between p-5 border-b border-gray-200 dark:border-card-border"><h3 class="text-sm font-semibold text-gray-900 dark:text-white">Document Monitoring</h3><div class="flex items-center gap-3"><div class="relative">`);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:magnifying-glass",
        class: "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
      }, null, _parent));
      _push(`<input${ssrRenderAttr("value", unref(searchQuery))} placeholder="Document" class="pl-9 pr-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-rich-black/30 border border-gray-200 dark:border-card-border w-40 outline-none focus:border-rich-orange transition text-gray-700 dark:text-gray-300 placeholder:text-gray-400"></div><button class="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border border-gray-200 dark:border-card-border text-gray-600 dark:text-gray-400 hover:border-rich-orange transition">`);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:funnel",
        class: "w-4 h-4"
      }, null, _parent));
      _push(` Filter </button><button class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-card-dark transition">`);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:dots-three-vertical-bold",
        class: "w-4 h-4 text-gray-500"
      }, null, _parent));
      _push(`</button></div></div><div class="overflow-x-auto"><table class="w-full"><thead><tr class="border-b border-gray-200 dark:border-card-border"><th class="px-5 py-3 w-12"><input type="checkbox"${ssrIncludeBooleanAttr(unref(selectAll)) ? " checked" : ""} class="w-4 h-4 rounded accent-rich-orange"></th><th class="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"> Document ID `);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:arrows-down-up",
        class: "w-3 h-3 inline ml-1 text-gray-400"
      }, null, _parent));
      _push(`</th><th class="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"> Subject `);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:arrows-down-up",
        class: "w-3 h-3 inline ml-1 text-gray-400"
      }, null, _parent));
      _push(`</th><th class="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"> Priority `);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:arrows-down-up",
        class: "w-3 h-3 inline ml-1 text-gray-400"
      }, null, _parent));
      _push(`</th><th class="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"> Assigned To `);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:arrows-down-up",
        class: "w-3 h-3 inline ml-1 text-gray-400"
      }, null, _parent));
      _push(`</th><th class="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"> Status `);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:arrows-down-up",
        class: "w-3 h-3 inline ml-1 text-gray-400"
      }, null, _parent));
      _push(`</th><th class="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"> Created Date `);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:arrows-down-up",
        class: "w-3 h-3 inline ml-1 text-gray-400"
      }, null, _parent));
      _push(`</th><th class="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"> SLA Due `);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:arrows-down-up",
        class: "w-3 h-3 inline ml-1 text-gray-400"
      }, null, _parent));
      _push(`</th><th class="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"> Actions </th></tr></thead><tbody><!--[-->`);
      ssrRenderList(unref(filteredDocs), (doc) => {
        _push(`<tr class="border-b border-gray-100 dark:border-card-border/50 hover:bg-gray-50 dark:hover:bg-rich-black/30 transition-colors cursor-pointer group"><td class="px-5 py-3.5"><input type="checkbox"${ssrIncludeBooleanAttr(Array.isArray(doc.selected) ? ssrLooseContain(doc.selected, null) : doc.selected) ? " checked" : ""} class="w-4 h-4 rounded accent-rich-orange"></td><td class="px-5 py-3.5"><span class="text-xs font-semibold text-gray-900 dark:text-white">${ssrInterpolate(doc.id)}</span></td><td class="px-5 py-3.5"><span class="text-xs text-gray-700 dark:text-gray-300">${ssrInterpolate(doc.subject)}</span></td><td class="px-5 py-3.5"><span class="${ssrRenderClass([getPriorityClass(doc.priority), "badge"])}"><span class="${ssrRenderClass([{
          "bg-red-500": doc.priority === "High",
          "bg-amber-500": doc.priority === "Medium",
          "bg-emerald-500": doc.priority === "Low"
        }, "status-dot"])}"></span> ${ssrInterpolate(doc.priority)}</span></td><td class="px-5 py-3.5"><div class="flex items-center gap-2.5"><div class="${ssrRenderClass([getAvatarColor(doc.assignedTo.avatar), "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold"])}">${ssrInterpolate(doc.assignedTo.avatar)}</div><span class="text-xs text-gray-700 dark:text-gray-300">${ssrInterpolate(doc.assignedTo.name)}</span></div></td><td class="px-5 py-3.5"><div class="flex items-center gap-1.5">`);
        _push(ssrRenderComponent(_component_Icon, {
          name: getStatusIcon(doc.statusType).icon,
          class: ["w-4 h-4", getStatusIcon(doc.statusType).color]
        }, null, _parent));
        _push(`<span class="text-xs text-gray-700 dark:text-gray-300">${ssrInterpolate(doc.status)}</span></div></td><td class="px-5 py-3.5"><span class="text-xs text-gray-500 dark:text-gray-400">${ssrInterpolate(doc.createdDate)}</span></td><td class="px-5 py-3.5"><span class="text-xs text-gray-500 dark:text-gray-400">${ssrInterpolate(doc.slaDue)}</span></td><td class="px-5 py-3.5"><button class="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-card-border transition">`);
        _push(ssrRenderComponent(_component_Icon, {
          name: "ph:dots-three-vertical-bold",
          class: "w-4 h-4 text-gray-500"
        }, null, _parent));
        _push(`</button></td></tr>`);
      });
      _push(`<!--]--></tbody></table></div><div class="flex items-center justify-center gap-2 p-4 border-t border-gray-200 dark:border-card-border"><button class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-card-dark transition disabled:opacity-40 disabled:cursor-not-allowed"${ssrIncludeBooleanAttr(unref(currentPage) === 1) ? " disabled" : ""}>`);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:caret-left",
        class: "w-4 h-4 text-gray-500"
      }, null, _parent));
      _push(`</button><!--[-->`);
      ssrRenderList(totalPages, (i) => {
        _push(`<button class="${ssrRenderClass([unref(currentPage) === i ? "bg-rich-orange" : "bg-gray-300 dark:bg-gray-600", "w-2 h-2 rounded-full transition-colors"])}"></button>`);
      });
      _push(`<!--]--><button class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-card-dark transition disabled:opacity-40 disabled:cursor-not-allowed"${ssrIncludeBooleanAttr(unref(currentPage) === totalPages) ? " disabled" : ""}>`);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:caret-right",
        class: "w-4 h-4 text-gray-500"
      }, null, _parent));
      _push(`</button></div></div>`);
    };
  }
};
const _sfc_setup$2 = _sfc_main$2.setup;
_sfc_main$2.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/client/dashboard/DocumentTable.vue");
  return _sfc_setup$2 ? _sfc_setup$2(props, ctx) : void 0;
};
const _sfc_main$1 = {
  __name: "ClientDashboard",
  __ssrInlineRender: true,
  setup(__props) {
    const auth = useAuthStore();
    const { entranceVisibleClass, cardEnterDelay } = useDashboardEntrance();
    const kpiCards = [
      {
        title: "Total Documents",
        value: "3,484",
        trend: "+7%",
        trendUp: true,
        sparklineData: [30, 45, 28, 55, 43, 65, 52]
      },
      {
        title: "Processing Speed",
        value: "486",
        trend: "+2%",
        trendUp: true,
        sparklineData: [40, 38, 50, 45, 55, 48, 60]
      },
      {
        title: "SLA Compliance Rate",
        value: "92%",
        trend: "-1.3%",
        trendUp: false,
        sparklineData: [80, 85, 78, 90, 88, 75, 82]
      }
    ];
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "space-y-6" }, _attrs))}><div class="${ssrRenderClass([unref(entranceVisibleClass), "fv-enter-header"])}">`);
      _push(ssrRenderComponent(DashboardHeader, {
        "user-name": unref(auth).user?.full_name || "User"
      }, null, _parent));
      _push(`</div><div class="${ssrRenderClass([unref(entranceVisibleClass), "fv-enter-main"])}"><div class="grid grid-cols-1 gap-5 xl:grid-cols-4"><div class="space-y-5 xl:col-span-3"><div class="grid grid-cols-1 gap-5 sm:grid-cols-3"><!--[-->`);
      ssrRenderList(kpiCards, (card, index) => {
        _push(`<div class="${ssrRenderClass([unref(entranceVisibleClass), "fv-enter-card"])}" style="${ssrRenderStyle(unref(cardEnterDelay)(index))}">`);
        _push(ssrRenderComponent(_sfc_main$5, {
          title: card.title,
          value: card.value,
          trend: card.trend,
          "trend-up": card.trendUp,
          "sparkline-data": card.sparklineData
        }, null, _parent));
        _push(`</div>`);
      });
      _push(`<!--]--></div><div class="${ssrRenderClass([unref(entranceVisibleClass), "fv-enter-card"])}" style="${ssrRenderStyle(unref(cardEnterDelay)(3))}">`);
      _push(ssrRenderComponent(DocumentVolumeChart, null, null, _parent));
      _push(`</div></div><div class="${ssrRenderClass([unref(entranceVisibleClass), "xl:col-span-1 fv-enter-card"])}" style="${ssrRenderStyle(unref(cardEnterDelay)(4))}">`);
      _push(ssrRenderComponent(LatestUpdates, null, null, _parent));
      _push(`</div></div></div><div class="${ssrRenderClass([unref(entranceVisibleClass), "fv-enter-card"])}" style="${ssrRenderStyle(unref(cardEnterDelay)(5))}">`);
      _push(ssrRenderComponent(_sfc_main$2, null, null, _parent));
      _push(`</div></div>`);
    };
  }
};
const _sfc_setup$1 = _sfc_main$1.setup;
_sfc_main$1.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/client/dashboard/index.vue");
  return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "dashboard",
  __ssrInlineRender: true,
  setup(__props) {
    return (_ctx, _push, _parent, _attrs) => {
      _push(ssrRenderComponent(_sfc_main$1, _attrs, null, _parent));
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/client/dashboard.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=dashboard-cddtLtpH.mjs.map
