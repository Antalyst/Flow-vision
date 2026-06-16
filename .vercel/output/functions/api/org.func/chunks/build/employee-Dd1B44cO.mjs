import __nuxt_component_0 from './index-BYCkTpU3.mjs';
import { _ as __nuxt_component_3 } from './nuxt-link-BkIUUJ0e.mjs';
import { computed, ref, watch, mergeProps, unref, withCtx, createVNode, toDisplayString, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderClass, ssrRenderComponent, ssrRenderAttr, ssrRenderTeleport, ssrInterpolate, ssrRenderSlot, ssrRenderList } from 'vue/server-renderer';
import { _ as _export_sfc, a as useAuthStore, u as useTheme, f as useRoute } from './server.mjs';
import '@iconify/vue';
import '@iconify/utils/lib/css/icon';
import '../_/nitro.mjs';
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
import '../routes/renderer.mjs';
import 'vue-bundle-renderer/runtime';
import 'unhead/server';
import 'devalue';
import 'unhead/utils';
import 'pinia';
import 'vue-router';
import '@supabase/ssr';
import '@vue/shared';

const _sfc_main$2 = {
  __name: "EmployeeNav",
  __ssrInlineRender: true,
  setup(__props) {
    const { isDark } = useTheme();
    const route = useRoute();
    const isActive = (to) => route.path === to || route.path.startsWith(`${to}/`);
    const workspaceItems = [
      { to: "/employee/dashboard", label: "Dashboard", icon: "ph:squares-four-fill" },
      { to: "/employee/offices", label: "My Offices", icon: "ph:buildings-fill" },
      { to: "/employee/working", label: "Current Working", icon: "ph:briefcase-fill" },
      { to: "/employee/stages", label: "Stages", icon: "ph:steps-fill" },
      { to: "/employee/documents", label: "Documents", icon: "ph:files-fill" },
      { to: "/employee/ai", label: "AI Intelligence", icon: "ph:sparkle-fill" }
    ];
    const accountItems = [
      { to: "/employee/settings", label: "Settings", icon: "ph:gear-six-fill" },
      { to: "/employee/help", label: "Help", icon: "ph:question-fill" }
    ];
    return (_ctx, _push, _parent, _attrs) => {
      const _component_NuxtLink = __nuxt_component_3;
      const _component_Icon = __nuxt_component_0;
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "space-y-6" }, _attrs))} data-v-aa4f1e6d><div data-v-aa4f1e6d><p class="${ssrRenderClass([unref(isDark) ? "text-gray-500" : "text-gray-400", "px-3 mb-2 text-[10px] font-bold uppercase tracking-widest"])}" data-v-aa4f1e6d>Workspace</p><div class="space-y-0.5" data-v-aa4f1e6d><!--[-->`);
      ssrRenderList(workspaceItems, (item) => {
        _push(ssrRenderComponent(_component_NuxtLink, {
          key: item.to,
          to: item.to,
          class: ["nav-item w-full", { "nav-item-employee-active": isActive(item.to) }]
        }, {
          default: withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              _push2(ssrRenderComponent(_component_Icon, {
                name: item.icon,
                class: "w-5 h-5 flex-none"
              }, null, _parent2, _scopeId));
              _push2(`<span class="truncate" data-v-aa4f1e6d${_scopeId}>${ssrInterpolate(item.label)}</span>`);
            } else {
              return [
                createVNode(_component_Icon, {
                  name: item.icon,
                  class: "w-5 h-5 flex-none"
                }, null, 8, ["name"]),
                createVNode("span", { class: "truncate" }, toDisplayString(item.label), 1)
              ];
            }
          }),
          _: 2
        }, _parent));
      });
      _push(`<!--]--></div></div><div data-v-aa4f1e6d><p class="${ssrRenderClass([unref(isDark) ? "text-gray-500" : "text-gray-400", "px-3 mb-2 text-[10px] font-bold uppercase tracking-widest"])}" data-v-aa4f1e6d>Account</p><div class="space-y-0.5" data-v-aa4f1e6d><!--[-->`);
      ssrRenderList(accountItems, (item) => {
        _push(ssrRenderComponent(_component_NuxtLink, {
          key: item.to,
          to: item.to,
          class: ["nav-item w-full", { "nav-item-employee-active": isActive(item.to) }]
        }, {
          default: withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              _push2(ssrRenderComponent(_component_Icon, {
                name: item.icon,
                class: "w-5 h-5 flex-none"
              }, null, _parent2, _scopeId));
              _push2(`<span class="truncate" data-v-aa4f1e6d${_scopeId}>${ssrInterpolate(item.label)}</span>`);
            } else {
              return [
                createVNode(_component_Icon, {
                  name: item.icon,
                  class: "w-5 h-5 flex-none"
                }, null, 8, ["name"]),
                createVNode("span", { class: "truncate" }, toDisplayString(item.label), 1)
              ];
            }
          }),
          _: 2
        }, _parent));
      });
      _push(`<!--]--></div></div></div>`);
    };
  }
};
const _sfc_setup$2 = _sfc_main$2.setup;
_sfc_main$2.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/employee/EmployeeNav.vue");
  return _sfc_setup$2 ? _sfc_setup$2(props, ctx) : void 0;
};
const __nuxt_component_1 = /* @__PURE__ */ Object.assign(_export_sfc(_sfc_main$2, [["__scopeId", "data-v-aa4f1e6d"]]), { __name: "EmployeeNav" });
const _sfc_main$1 = {
  __name: "EmployeeSidebarFooter",
  __ssrInlineRender: true,
  props: { user: { type: Object, default: null } },
  emits: ["logout"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const { isDark } = useTheme();
    const displayName = computed(() => props.user?.full_name || "Employee");
    const displayEmail = computed(() => props.user?.email || "");
    const initials = computed(() => {
      const parts = displayName.value.split(" ");
      return parts.length >= 2 ? (parts[0][0] + parts.at(-1)[0]).toUpperCase() : displayName.value.substring(0, 2).toUpperCase();
    });
    return (_ctx, _push, _parent, _attrs) => {
      const _component_Icon = __nuxt_component_0;
      _push(`<div${ssrRenderAttrs(_attrs)}><div class="${ssrRenderClass([unref(isDark) ? "hover:bg-card-dark" : "hover:bg-gray-50", "flex items-center gap-3 px-2 py-2 rounded-xl"])}"><div class="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-none bg-sky-500/10 text-sky-600 dark:text-sky-400">${ssrInterpolate(unref(initials))}</div><div class="flex-1 min-w-0"><p class="${ssrRenderClass([unref(isDark) ? "text-white" : "text-gray-900", "text-sm font-semibold truncate"])}">${ssrInterpolate(unref(displayName))}</p><p class="${ssrRenderClass([unref(isDark) ? "text-gray-500" : "text-gray-400", "text-[11px] truncate"])}">${ssrInterpolate(unref(displayEmail))}</p></div></div><button type="button" class="mt-2 w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors text-red-500 hover:bg-red-500/10">`);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:sign-out",
        class: "w-4 h-4"
      }, null, _parent));
      _push(` Log out </button></div>`);
    };
  }
};
const _sfc_setup$1 = _sfc_main$1.setup;
_sfc_main$1.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/employee/EmployeeSidebarFooter.vue");
  return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
const _sfc_main = {
  __name: "employee",
  __ssrInlineRender: true,
  setup(__props) {
    const auth = useAuthStore();
    const { isDark } = useTheme();
    const route = useRoute();
    const brandLogo = computed(() => isDark.value ? "/logo/new-logo.png" : "/logo/new-logo-dark.png");
    const mobileMenuOpen = ref(false);
    const mobileNavItems = [
      { to: "/employee/dashboard", label: "Dashboard", icon: "ph:squares-four-fill" },
      { to: "/employee/office", label: "Office", icon: "icomoon-free:office" },
      { to: "/employee/working", label: "Working", icon: "ph:briefcase-fill" },
      { to: "/employee/settings", label: "Settings", icon: "ph:gear-six-fill" }
    ];
    const isActive = (to) => route.path === to || route.path.startsWith(`${to}/`);
    watch(() => route.path, () => {
      mobileMenuOpen.value = false;
    });
    return (_ctx, _push, _parent, _attrs) => {
      const _component_Icon = __nuxt_component_0;
      const _component_EmployeeNav = __nuxt_component_1;
      const _component_EmployeeSidebarFooter = _sfc_main$1;
      const _component_NuxtLink = __nuxt_component_3;
      _push(`<div${ssrRenderAttrs(mergeProps({
        class: ["w-full h-full min-h-screen flex flex-col md:flex-row overflow-hidden font-dashboard transition-colors duration-300", unref(isDark) ? "bg-rich-black text-white" : "bg-surface text-heading-dark"]
      }, _attrs))} data-v-8d09562a><div class="${ssrRenderClass([unref(isDark) ? "bg-card-dark border-card-border" : "bg-white border-gray-200", "md:hidden flex items-center justify-between px-4 py-3 border-b sticky top-0 z-50"])}" data-v-8d09562a><button class="p-2 -ml-2 rounded-xl transition hover:bg-gray-100 dark:hover:bg-rich-black/50" data-v-8d09562a>`);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:list",
        class: "w-6 h-6 text-gray-700 dark:text-gray-300"
      }, null, _parent));
      _push(`</button><div class="flex items-center gap-2" data-v-8d09562a><img${ssrRenderAttr("src", unref(brandLogo))} alt="FlowVision" class="w-8 h-8" data-v-8d09562a><span class="text-base font-bold tracking-tight text-gray-900 dark:text-white" data-v-8d09562a>FlowVision</span></div><div class="flex items-center gap-1" data-v-8d09562a><span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20" data-v-8d09562a> Employee </span></div></div>`);
      ssrRenderTeleport(_push, (_push2) => {
        if (mobileMenuOpen.value) {
          _push2(`<div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] md:hidden" data-v-8d09562a></div>`);
        } else {
          _push2(`<!---->`);
        }
        if (mobileMenuOpen.value) {
          _push2(`<aside class="${ssrRenderClass([unref(isDark) ? "bg-card-dark border-r border-card-border" : "bg-white border-r border-gray-200", "fixed left-0 top-0 bottom-0 w-[280px] z-[70] md:hidden overflow-y-auto"])}" data-v-8d09562a><div class="p-4" data-v-8d09562a><div class="flex items-center justify-between mb-6" data-v-8d09562a><div class="flex items-center gap-2.5" data-v-8d09562a><img${ssrRenderAttr("src", unref(brandLogo))} alt="FlowVision" class="w-8 h-8" data-v-8d09562a><span class="text-lg font-bold tracking-tight text-gray-900 dark:text-white" data-v-8d09562a>FlowVision</span></div><button class="p-2 rounded-xl transition hover:bg-gray-100 dark:hover:bg-rich-black/50" data-v-8d09562a>`);
          _push2(ssrRenderComponent(_component_Icon, {
            name: "ph:x",
            class: "w-5 h-5 text-gray-500"
          }, null, _parent));
          _push2(`</button></div>`);
          _push2(ssrRenderComponent(_component_EmployeeNav, null, null, _parent));
          _push2(ssrRenderComponent(_component_EmployeeSidebarFooter, {
            user: unref(auth).user,
            onLogout: ($event) => unref(auth).logout()
          }, null, _parent));
          _push2(`</div></aside>`);
        } else {
          _push2(`<!---->`);
        }
      }, "body", false, _parent);
      _push(`<div class="flex min-h-0 w-full flex-1 overflow-hidden" data-v-8d09562a><aside class="${ssrRenderClass([unref(isDark) ? "bg-sidebar-dark border-card-border" : "bg-white border-gray-200", "hidden md:flex md:w-64 h-full flex-shrink-0 flex-col border-r"])}" data-v-8d09562a><div class="px-5 pt-5 pb-2 flex-none" data-v-8d09562a><div class="flex items-center gap-2.5 mb-5" data-v-8d09562a><img${ssrRenderAttr("src", unref(brandLogo))} alt="FlowVision" class="w-9 h-9" data-v-8d09562a><div class="flex-1 min-w-0" data-v-8d09562a><span class="block text-base font-bold tracking-tight text-gray-900 dark:text-white" data-v-8d09562a>FlowVision</span></div></div><div class="flex items-center gap-2 mb-5" data-v-8d09562a><span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20" data-v-8d09562a><span class="w-1.5 h-1.5 rounded-full bg-sky-500" data-v-8d09562a></span> Employee </span>`);
      if (unref(auth).user?.org_id) {
        _push(`<span class="${ssrRenderClass([unref(isDark) ? "bg-white/5 text-gray-400" : "bg-gray-100 text-gray-500", "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold truncate max-w-[100px]"])}"${ssrRenderAttr("title", `Org ID: ${unref(auth).user.org_id}`)} data-v-8d09562a>`);
        _push(ssrRenderComponent(_component_Icon, {
          name: "ph:building-office",
          class: "w-3 h-3 flex-shrink-0"
        }, null, _parent));
        _push(` Org ${ssrInterpolate(unref(auth).user.org_id)}</span>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div></div><nav class="flex-1 px-3 overflow-y-auto" data-v-8d09562a>`);
      _push(ssrRenderComponent(_component_EmployeeNav, null, null, _parent));
      _push(`</nav><div class="${ssrRenderClass([unref(isDark) ? "border-card-border" : "border-gray-200", "flex-none border-t px-3 py-3"])}" data-v-8d09562a>`);
      _push(ssrRenderComponent(_component_EmployeeSidebarFooter, {
        user: unref(auth).user,
        onLogout: ($event) => unref(auth).logout()
      }, null, _parent));
      _push(`</div></aside><main class="${ssrRenderClass([unref(isDark) ? "bg-rich-black" : "bg-surface", "relative z-0 h-full min-w-0 flex-1 overflow-y-auto p-4 md:p-8"])}" data-v-8d09562a>`);
      if (!unref(auth).user?.org_id) {
        _push(`<div class="flex h-full min-h-[320px] items-center justify-center" data-v-8d09562a><div class="${ssrRenderClass([unref(isDark) ? "bg-card-dark border-card-border" : "bg-white border-gray-200", "w-full max-w-sm rounded-xl border p-8 text-center"])}" data-v-8d09562a>`);
        _push(ssrRenderComponent(_component_Icon, {
          name: "ph:building-office-slash",
          class: "mx-auto mb-4 w-12 h-12 text-sky-500/60"
        }, null, _parent));
        _push(`<h2 class="${ssrRenderClass([unref(isDark) ? "text-white" : "text-gray-900", "text-lg font-bold mb-2"])}" data-v-8d09562a>No organisation assigned</h2><p class="${ssrRenderClass([unref(isDark) ? "text-gray-400" : "text-gray-500", "text-sm"])}" data-v-8d09562a> Your account hasn&#39;t been linked to an organisation yet. Contact your administrator. </p></div></div>`);
      } else {
        _push(`<div class="w-full" data-v-8d09562a>`);
        ssrRenderSlot(_ctx.$slots, "default", {}, null, _push, _parent);
        _push(`</div>`);
      }
      _push(`</main></div><nav class="${ssrRenderClass([unref(isDark) ? "bg-card-dark border-card-border" : "bg-white border-gray-200", "md:hidden fixed bottom-0 left-0 right-0 z-50 border-t safe-area-bottom"])}" data-v-8d09562a><div class="flex items-center justify-around px-2 py-2" data-v-8d09562a><!--[-->`);
      ssrRenderList(mobileNavItems, (item) => {
        _push(ssrRenderComponent(_component_NuxtLink, {
          key: item.to,
          to: item.to,
          class: ["flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors min-w-[56px]", isActive(item.to) ? "text-sky-500" : unref(isDark) ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"]
        }, {
          default: withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              _push2(ssrRenderComponent(_component_Icon, {
                name: item.icon,
                class: "w-5 h-5"
              }, null, _parent2, _scopeId));
              _push2(`<span class="text-[10px] font-semibold" data-v-8d09562a${_scopeId}>${ssrInterpolate(item.label)}</span>`);
            } else {
              return [
                createVNode(_component_Icon, {
                  name: item.icon,
                  class: "w-5 h-5"
                }, null, 8, ["name"]),
                createVNode("span", { class: "text-[10px] font-semibold" }, toDisplayString(item.label), 1)
              ];
            }
          }),
          _: 2
        }, _parent));
      });
      _push(`<!--]--></div></nav></div>`);
    };
  }
};
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("layouts/employee.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const employee = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-8d09562a"]]);

export { employee as default };
//# sourceMappingURL=employee-Dd1B44cO.mjs.map
