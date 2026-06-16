import __nuxt_component_0 from './index-CSZJBLRw.mjs';
import { _ as __nuxt_component_3 } from './nuxt-link-BkIUUJ0e.mjs';
import { computed, ref, watch, mergeProps, unref, withCtx, createVNode, toDisplayString, openBlock, createBlock, createCommentVNode, defineComponent, reactive, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderClass, ssrRenderComponent, ssrRenderAttr, ssrRenderTeleport, ssrRenderSlot, ssrRenderList, ssrInterpolate, ssrIncludeBooleanAttr } from 'vue/server-renderer';
import { _ as _export_sfc, a as useAuthStore, u as useTheme, f as useRoute } from './server.mjs';
import { p as provideDashboardEntrance } from './useDashboardEntrance-W2ntCYX9.mjs';
import '@iconify/vue';
import '@iconify/utils/lib/css/icon';
import '../_/nitro.mjs';
import 'node:crypto';
import 'mysql2/promise';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
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

const _sfc_main$3 = {
  __name: "SidebarNav",
  __ssrInlineRender: true,
  setup(__props) {
    const { isDark } = useTheme();
    const route = useRoute();
    const isActive = (to) => route.path === to || route.path.startsWith(`${to}/`);
    const mainNavItems = [
      { to: "/client/dashboard", label: "Dashboard", icon: "ph:squares-four-fill" },
      { to: "/client/user-management", label: "User Management", icon: "ph:users-three-fill" },
      { to: "/client/documents", label: "Documents", icon: "ph:files-fill", badge: true },
      { to: "/client/office", label: "Office", icon: "icomoon-free:office", badge: true },
      { to: "/client/stages", label: "Stages", icon: "ph:steps-fill" },
      { to: "/client/current-working", label: "Current Working", icon: "ph:briefcase-fill" },
      { to: "/client/ai", label: "AI", icon: "ph:brain-fill" }
    ];
    const analyticsNavItems = [
      { to: "/client/sla-compliance", label: "SLA Compliance", icon: "ph:shield-check-fill" },
      { to: "/client/workload-analytics", label: "Workload Analytics", icon: "ph:chart-line-up-fill" },
      { to: "/client/reports", label: "Reports", icon: "ph:chart-bar-fill" }
    ];
    const supportNavItems = [
      { to: "/client/feedback", label: "Feedback", icon: "ph:chat-circle-text-fill" },
      { to: "/client/help", label: "Help & Support", icon: "ph:question-fill" },
      { to: "/client/settings", label: "Settings", icon: "ph:gear-six-fill" }
    ];
    return (_ctx, _push, _parent, _attrs) => {
      const _component_NuxtLink = __nuxt_component_3;
      const _component_Icon = __nuxt_component_0;
      _push(`<div${ssrRenderAttrs(_attrs)}><div class="mb-4"><p class="${ssrRenderClass([unref(isDark) ? "text-gray-500" : "text-gray-400", "px-3 mb-2 text-[10px] font-bold uppercase tracking-widest"])}">Main Navigation</p><div class="space-y-0.5"><!--[-->`);
      ssrRenderList(mainNavItems, (item) => {
        _push(ssrRenderComponent(_component_NuxtLink, {
          key: item.to,
          to: item.to,
          class: ["nav-item w-full", { "nav-item-active": isActive(item.to) }]
        }, {
          default: withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              _push2(ssrRenderComponent(_component_Icon, {
                name: item.icon,
                class: "w-5 h-5 flex-none"
              }, null, _parent2, _scopeId));
              _push2(`<span class="truncate"${_scopeId}>${ssrInterpolate(item.label)}</span>`);
              if (item.badge) {
                _push2(ssrRenderComponent(_component_Icon, {
                  name: "ph:caret-down",
                  class: "w-3 h-3 ml-auto text-gray-400"
                }, null, _parent2, _scopeId));
              } else {
                _push2(`<!---->`);
              }
            } else {
              return [
                createVNode(_component_Icon, {
                  name: item.icon,
                  class: "w-5 h-5 flex-none"
                }, null, 8, ["name"]),
                createVNode("span", { class: "truncate" }, toDisplayString(item.label), 1),
                item.badge ? (openBlock(), createBlock(_component_Icon, {
                  key: 0,
                  name: "ph:caret-down",
                  class: "w-3 h-3 ml-auto text-gray-400"
                })) : createCommentVNode("", true)
              ];
            }
          }),
          _: 2
        }, _parent));
      });
      _push(`<!--]--></div></div><div class="mb-4"><p class="${ssrRenderClass([unref(isDark) ? "text-gray-500" : "text-gray-400", "px-3 mb-2 text-[10px] font-bold uppercase tracking-widest"])}">Analytics &amp; Insights</p><div class="space-y-0.5"><!--[-->`);
      ssrRenderList(analyticsNavItems, (item) => {
        _push(ssrRenderComponent(_component_NuxtLink, {
          key: item.to,
          to: item.to,
          class: ["nav-item w-full", { "nav-item-active": isActive(item.to) }]
        }, {
          default: withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              _push2(ssrRenderComponent(_component_Icon, {
                name: item.icon,
                class: "w-5 h-5 flex-none"
              }, null, _parent2, _scopeId));
              _push2(`<span class="truncate"${_scopeId}>${ssrInterpolate(item.label)}</span>`);
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
      _push(`<!--]--></div></div><div><p class="${ssrRenderClass([unref(isDark) ? "text-gray-500" : "text-gray-400", "px-3 mb-2 text-[10px] font-bold uppercase tracking-widest"])}">Support</p><div class="space-y-0.5"><!--[-->`);
      ssrRenderList(supportNavItems, (item) => {
        _push(ssrRenderComponent(_component_NuxtLink, {
          key: item.to,
          to: item.to,
          class: ["nav-item w-full", { "nav-item-active": isActive(item.to) }]
        }, {
          default: withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              _push2(ssrRenderComponent(_component_Icon, {
                name: item.icon,
                class: "w-5 h-5 flex-none"
              }, null, _parent2, _scopeId));
              _push2(`<span class="truncate"${_scopeId}>${ssrInterpolate(item.label)}</span>`);
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
const _sfc_setup$3 = _sfc_main$3.setup;
_sfc_main$3.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/SidebarNav.vue");
  return _sfc_setup$3 ? _sfc_setup$3(props, ctx) : void 0;
};
const __nuxt_component_1 = Object.assign(_sfc_main$3, { __name: "SidebarNav" });
const _sfc_main$2 = {
  __name: "SidebarProfile",
  __ssrInlineRender: true,
  props: {
    user: { type: Object, default: null }
  },
  emits: ["logout"],
  setup(__props) {
    const props = __props;
    const { isDark } = useTheme();
    const displayName = computed(() => props.user?.full_name || "FlowVision User");
    const displayEmail = computed(() => props.user?.email || "user@flowvision.com");
    const userInitials = computed(() => {
      const name = displayName.value;
      const parts = name.split(" ");
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    });
    return (_ctx, _push, _parent, _attrs) => {
      const _component_Icon = __nuxt_component_0;
      _push(`<div${ssrRenderAttrs(mergeProps({
        class: ["flex items-center gap-3 px-2 py-2 rounded-xl cursor-pointer transition-colors group", unref(isDark) ? "hover:bg-card-dark" : "hover:bg-gray-50"]
      }, _attrs))}><div class="${ssrRenderClass([unref(isDark) ? "bg-rich-orange/[0.15] text-rich-orange" : "bg-rich-orange/10 text-rich-orange", "w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-none"])}">${ssrInterpolate(unref(userInitials))}</div><div class="flex-1 min-w-0"><p class="${ssrRenderClass([unref(isDark) ? "text-white" : "text-gray-900", "text-sm font-semibold truncate"])}">${ssrInterpolate(unref(displayName))}</p><p class="${ssrRenderClass([unref(isDark) ? "text-gray-500" : "text-gray-400", "text-[11px] truncate"])}">${ssrInterpolate(unref(displayEmail))}</p></div>`);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:caret-up-down",
        class: "w-4 h-4 flex-none text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
      }, null, _parent));
      _push(`</div>`);
    };
  }
};
const _sfc_setup$2 = _sfc_main$2.setup;
_sfc_main$2.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/SidebarProfile.vue");
  return _sfc_setup$2 ? _sfc_setup$2(props, ctx) : void 0;
};
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "org",
  __ssrInlineRender: true,
  setup(__props) {
    const auth = useAuthStore();
    const { isDark } = useTheme();
    const brandLogo = computed(() => isDark.value ? "/logo/new-logo.png" : "/logo/new-logo-dark.png");
    const orgData = reactive({
      name: "",
      user_id: auth.user?.user_id
    });
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "flex min-h-[calc(100vh-4rem)] items-center justify-center p-4" }, _attrs))}><div class="${ssrRenderClass([unref(isDark) ? "border-card-border bg-card-dark text-white" : "border-gray-200 bg-white text-rich-black", "w-full max-w-lg rounded-lg border p-8 shadow-card"])}"><div class="mb-8 text-center"><div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg"><img${ssrRenderAttr("src", unref(brandLogo))} class="h-10 w-10" alt="FlowVision"></div><h1 class="text-2xl font-bold tracking-tight">Welcome to FlowVision</h1><p class="${ssrRenderClass([unref(isDark) ? "text-gray-400" : "text-gray-500", "mt-2 text-sm"])}"> Create your organization workspace to continue. </p></div><form class="space-y-5"><label class="block"><span class="${ssrRenderClass([unref(isDark) ? "text-gray-400" : "text-gray-500", "text-xs font-semibold uppercase tracking-wide"])}"> Organization Name </span><input${ssrRenderAttr("value", orgData.name)} type="text" placeholder="e.g. Acme Corporation" required class="${ssrRenderClass([unref(isDark) ? "border-card-border bg-rich-black text-white placeholder:text-gray-500" : "border-gray-200 bg-white text-rich-black placeholder:text-gray-400", "mt-2 w-full rounded-lg border px-4 py-3 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-rich-orange"])}"></label><button type="submit" class="w-full rounded-lg bg-rich-orange px-4 py-3 text-sm font-bold text-white transition hover:bg-[#e95a0b] active:scale-[0.98]"${ssrIncludeBooleanAttr(unref(auth).isLoading) ? " disabled" : ""}> Setup Organization </button></form></div></div>`);
    };
  }
});
const _sfc_setup$1 = _sfc_main$1.setup;
_sfc_main$1.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/client/org.vue");
  return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
const ClientOrgSetup = Object.assign(_sfc_main$1, { __name: "ClientOrg" });
const _sfc_main = {
  __name: "client",
  __ssrInlineRender: true,
  setup(__props) {
    const auth = useAuthStore();
    const { isDark } = useTheme();
    const route = useRoute();
    const { entranceVisibleClass } = provideDashboardEntrance();
    const brandLogo = computed(() => isDark.value ? "/logo/new-logo.png" : "/logo/new-logo-dark.png");
    const mobileMenuOpen = ref(false);
    const mobileNavItems = [
      { to: "/client/dashboard", label: "Dashboard", icon: "ph:squares-four-fill" },
      { to: "/client/documents", label: "Documents", icon: "ph:files-fill" },
      { to: "/client/ai", label: "AI", icon: "ph:brain-fill" },
      { to: "/client/reports", label: "Reports", icon: "ph:chart-bar-fill" },
      { to: "/client/settings", label: "Settings", icon: "ph:gear-six-fill" }
    ];
    const isActive = (to) => route.path === to || route.path.startsWith(`${to}/`);
    watch(() => route.path, () => {
      mobileMenuOpen.value = false;
    });
    return (_ctx, _push, _parent, _attrs) => {
      const _component_Icon = __nuxt_component_0;
      const _component_SidebarNav = __nuxt_component_1;
      const _component_SidebarProfile = _sfc_main$2;
      const _component_NuxtLink = __nuxt_component_3;
      _push(`<div${ssrRenderAttrs(mergeProps({
        class: ["w-full h-full min-h-screen flex flex-col md:flex-row overflow-hidden font-dashboard transition-colors duration-300", unref(isDark) ? "bg-rich-black text-white" : "bg-surface text-heading-dark"]
      }, _attrs))} data-v-d70067a8><div class="${ssrRenderClass([unref(entranceVisibleClass), "fv-enter-header md:hidden flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-card-border bg-white dark:bg-card-dark sticky top-0 z-50"])}" data-v-d70067a8><button class="p-2 -ml-2 rounded-xl hover:bg-gray-100 dark:hover:bg-rich-black/50 transition" data-v-d70067a8>`);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:list",
        class: "w-6 h-6 text-gray-700 dark:text-gray-300"
      }, null, _parent));
      _push(`</button><div class="flex items-center gap-2" data-v-d70067a8><div class="w-14 h-14 rounded-xl flex items-center justify-center" data-v-d70067a8><img${ssrRenderAttr("src", unref(brandLogo))} alt="FlowVision Logo" class="w-10 h-10" data-v-d70067a8></div><span class="text-base font-bold text-gray-900 dark:text-white tracking-tight" data-v-d70067a8>FlowVision</span></div><button class="p-2 -mr-2 rounded-xl hover:bg-gray-100 dark:hover:bg-rich-black/50 transition" data-v-d70067a8>`);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:bell",
        class: "w-5 h-5 text-gray-500 dark:text-gray-400"
      }, null, _parent));
      _push(`</button></div>`);
      ssrRenderTeleport(_push, (_push2) => {
        if (mobileMenuOpen.value) {
          _push2(`<div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] md:hidden" data-v-d70067a8></div>`);
        } else {
          _push2(`<!---->`);
        }
        if (mobileMenuOpen.value) {
          _push2(`<aside class="${ssrRenderClass([unref(isDark) ? "bg-card-dark border-r border-card-border" : "bg-white border-r border-gray-200", "fixed left-0 top-0 bottom-0 w-[280px] z-[70] md:hidden overflow-y-auto"])}" data-v-d70067a8><div class="p-4" data-v-d70067a8><div class="flex items-center justify-between mb-6" data-v-d70067a8><div class="flex items-center gap-2.5" data-v-d70067a8><div class="w-14 h-14 rounded-xl flex items-center justify-center" data-v-d70067a8><img${ssrRenderAttr("src", unref(brandLogo))} alt="FlowVision Logo" class="w-10 h-10" data-v-d70067a8></div><span class="text-lg font-bold text-gray-900 dark:text-white tracking-tight" data-v-d70067a8>FlowVision</span></div><button class="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-rich-black/50 transition" data-v-d70067a8>`);
          _push2(ssrRenderComponent(_component_Icon, {
            name: "ph:x",
            class: "w-5 h-5 text-gray-500"
          }, null, _parent));
          _push2(`</button></div>`);
          _push2(ssrRenderComponent(_component_SidebarNav, null, null, _parent));
          _push2(ssrRenderComponent(_component_SidebarProfile, {
            user: unref(auth).user,
            onLogout: ($event) => unref(auth).logout()
          }, null, _parent));
          _push2(`</div></aside>`);
        } else {
          _push2(`<!---->`);
        }
      }, "body", false, _parent);
      _push(`<div class="flex min-h-0 w-full flex-1 overflow-hidden" data-v-d70067a8><aside class="${ssrRenderClass([[unref(isDark) ? "bg-sidebar-dark border-card-border" : "bg-white border-gray-200", unref(entranceVisibleClass)], "fv-enter-sidebar relative z-30 hidden md:flex md:w-64 h-full flex-shrink-0 flex-col overflow-hidden border-r"])}" data-v-d70067a8><div class="px-5 pt-5 pb-2 flex-none" data-v-d70067a8><div class="flex items-center gap-2 mb-6" data-v-d70067a8><div class="w-14 h-14 rounded-xl flex items-center justify-center" data-v-d70067a8><img${ssrRenderAttr("src", unref(brandLogo))} alt="FlowVision Logo" class="w-10 h-10" data-v-d70067a8></div><span class="text-lg font-bold text-gray-900 dark:text-white tracking-tight" data-v-d70067a8>FlowVision</span><button class="ml-auto p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-card-dark transition" data-v-d70067a8>`);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:sidebar-simple",
        class: "w-4 h-4 text-gray-400"
      }, null, _parent));
      _push(`</button></div><div class="relative mb-5" data-v-d70067a8>`);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:magnifying-glass",
        class: "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
      }, null, _parent));
      _push(`<input type="text" placeholder="Search anything" class="${ssrRenderClass([unref(isDark) ? "bg-rich-black/50 border-card-border text-gray-300 placeholder:text-gray-500 focus:border-rich-orange/50" : "bg-gray-50 border-gray-200 text-gray-700 placeholder:text-gray-400 focus:border-rich-orange/50", "w-full pl-9 pr-16 py-2.5 rounded-xl text-xs outline-none transition border"])}" data-v-d70067a8><div class="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1" data-v-d70067a8><kbd class="${ssrRenderClass([unref(isDark) ? "bg-card-border text-gray-400" : "bg-gray-200 text-gray-500", "px-1.5 py-0.5 rounded text-[10px] font-semibold"])}" data-v-d70067a8>⌘</kbd><kbd class="${ssrRenderClass([unref(isDark) ? "bg-card-border text-gray-400" : "bg-gray-200 text-gray-500", "px-1.5 py-0.5 rounded text-[10px] font-semibold"])}" data-v-d70067a8>K</kbd></div></div></div><nav class="flex-1 px-3 overflow-y-auto" data-v-d70067a8>`);
      _push(ssrRenderComponent(_component_SidebarNav, null, null, _parent));
      _push(`</nav><div class="${ssrRenderClass([unref(isDark) ? "border-card-border" : "border-gray-200", "flex-none border-t px-3 py-3"])}" data-v-d70067a8>`);
      _push(ssrRenderComponent(_component_SidebarProfile, {
        user: unref(auth).user,
        onLogout: ($event) => unref(auth).logout()
      }, null, _parent));
      _push(`</div></aside><main class="${ssrRenderClass([unref(isDark) ? "bg-rich-black" : "bg-surface", "relative z-0 h-full min-w-0 flex-1 overflow-y-auto p-4 md:p-8"])}" data-v-d70067a8><div class="w-full" data-v-d70067a8>`);
      if (unref(auth).needsOrgSetup) {
        _push(ssrRenderComponent(ClientOrgSetup, null, null, _parent));
      } else {
        ssrRenderSlot(_ctx.$slots, "default", {}, null, _push, _parent);
      }
      _push(`</div></main></div><nav class="${ssrRenderClass([unref(isDark) ? "bg-card-dark border-card-border" : "bg-white border-gray-200", "md:hidden fixed bottom-0 left-0 right-0 z-50 border-t safe-area-bottom"])}" data-v-d70067a8><div class="flex items-center justify-around px-2 py-2" data-v-d70067a8><!--[-->`);
      ssrRenderList(mobileNavItems, (item) => {
        _push(ssrRenderComponent(_component_NuxtLink, {
          key: item.to,
          to: item.to,
          class: ["flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors min-w-[56px]", isActive(item.to) ? "text-rich-orange" : unref(isDark) ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"]
        }, {
          default: withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              _push2(ssrRenderComponent(_component_Icon, {
                name: item.icon,
                class: "w-5 h-5"
              }, null, _parent2, _scopeId));
              _push2(`<span class="text-[10px] font-semibold" data-v-d70067a8${_scopeId}>${ssrInterpolate(item.label)}</span>`);
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
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("layouts/client.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const client = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-d70067a8"]]);

export { client as default };
//# sourceMappingURL=client-Bzl06tMc.mjs.map
