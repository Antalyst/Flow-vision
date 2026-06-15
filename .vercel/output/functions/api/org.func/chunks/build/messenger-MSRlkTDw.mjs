import __nuxt_component_0 from './index-BRIQYxw1.mjs';
import { _ as __nuxt_component_3 } from './nuxt-link-UB6UxD5C.mjs';
import { computed, ref, watch, mergeProps, unref, withCtx, createVNode, toDisplayString, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderClass, ssrRenderComponent, ssrRenderAttr, ssrRenderTeleport, ssrInterpolate, ssrRenderSlot, ssrRenderList } from 'vue/server-renderer';
import { _ as _export_sfc, a as useAuthStore, b as useTheme, u as useRoute } from './server.mjs';
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

const _sfc_main$2 = {
  __name: "MessengerNav",
  __ssrInlineRender: true,
  setup(__props) {
    const { isDark } = useTheme();
    const route = useRoute();
    const isActive = (to) => route.path === to || route.path.startsWith(`${to}/`);
    const deliveryItems = [
      { to: "/messenger/dashboard", label: "Dashboard", icon: "ph:squares-four-fill" },
      { to: "/messenger/scan", label: "QR Scanner", icon: "ph:scan-fill" },
      { to: "/messenger/deliveries", label: "Deliveries", icon: "ph:package-fill" },
      { to: "/messenger/history", label: "History", icon: "ph:clock-counter-clockwise-fill" }
    ];
    const accountItems = [
      { to: "/messenger/settings", label: "Settings", icon: "ph:gear-six-fill" }
    ];
    return (_ctx, _push, _parent, _attrs) => {
      const _component_NuxtLink = __nuxt_component_3;
      const _component_Icon = __nuxt_component_0;
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "space-y-6" }, _attrs))} data-v-fa48cea5><div data-v-fa48cea5><p class="${ssrRenderClass([unref(isDark) ? "text-gray-500" : "text-gray-400", "px-3 mb-2 text-[10px] font-bold uppercase tracking-widest"])}" data-v-fa48cea5>Deliveries</p><div class="space-y-0.5" data-v-fa48cea5><!--[-->`);
      ssrRenderList(deliveryItems, (item) => {
        _push(ssrRenderComponent(_component_NuxtLink, {
          key: item.to,
          to: item.to,
          class: ["nav-item w-full", { "nav-item-messenger-active": isActive(item.to) }]
        }, {
          default: withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              _push2(ssrRenderComponent(_component_Icon, {
                name: item.icon,
                class: "w-5 h-5 flex-none"
              }, null, _parent2, _scopeId));
              _push2(`<span class="truncate" data-v-fa48cea5${_scopeId}>${ssrInterpolate(item.label)}</span>`);
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
      _push(`<!--]--></div></div><div data-v-fa48cea5><p class="${ssrRenderClass([unref(isDark) ? "text-gray-500" : "text-gray-400", "px-3 mb-2 text-[10px] font-bold uppercase tracking-widest"])}" data-v-fa48cea5>Account</p><div class="space-y-0.5" data-v-fa48cea5><!--[-->`);
      ssrRenderList(accountItems, (item) => {
        _push(ssrRenderComponent(_component_NuxtLink, {
          key: item.to,
          to: item.to,
          class: ["nav-item w-full", { "nav-item-messenger-active": isActive(item.to) }]
        }, {
          default: withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              _push2(ssrRenderComponent(_component_Icon, {
                name: item.icon,
                class: "w-5 h-5 flex-none"
              }, null, _parent2, _scopeId));
              _push2(`<span class="truncate" data-v-fa48cea5${_scopeId}>${ssrInterpolate(item.label)}</span>`);
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
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/messenger/MessengerNav.vue");
  return _sfc_setup$2 ? _sfc_setup$2(props, ctx) : void 0;
};
const __nuxt_component_1 = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["__scopeId", "data-v-fa48cea5"]]);
const _sfc_main$1 = {
  __name: "MessengerSidebarFooter",
  __ssrInlineRender: true,
  props: { user: { type: Object, default: null } },
  emits: ["logout"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const { isDark } = useTheme();
    const displayName = computed(() => props.user?.full_name || "Messenger");
    const displayEmail = computed(() => props.user?.email || "");
    const initials = computed(() => {
      const parts = displayName.value.split(" ");
      return parts.length >= 2 ? (parts[0][0] + parts.at(-1)[0]).toUpperCase() : displayName.value.substring(0, 2).toUpperCase();
    });
    return (_ctx, _push, _parent, _attrs) => {
      const _component_Icon = __nuxt_component_0;
      _push(`<div${ssrRenderAttrs(_attrs)}><div class="${ssrRenderClass([unref(isDark) ? "hover:bg-card-dark" : "hover:bg-gray-50", "flex items-center gap-3 px-2 py-2 rounded-xl"])}"><div class="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-none bg-amber-500/10 text-amber-600 dark:text-amber-400">${ssrInterpolate(unref(initials))}</div><div class="flex-1 min-w-0"><p class="${ssrRenderClass([unref(isDark) ? "text-white" : "text-gray-900", "text-sm font-semibold truncate"])}">${ssrInterpolate(unref(displayName))}</p><p class="${ssrRenderClass([unref(isDark) ? "text-gray-500" : "text-gray-400", "text-[11px] truncate"])}">${ssrInterpolate(unref(displayEmail))}</p></div></div><button type="button" class="mt-2 w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors text-red-500 hover:bg-red-500/10">`);
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
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/messenger/MessengerSidebarFooter.vue");
  return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
const _sfc_main = {
  __name: "messenger",
  __ssrInlineRender: true,
  setup(__props) {
    const auth = useAuthStore();
    const { isDark } = useTheme();
    const route = useRoute();
    const brandLogo = computed(() => isDark.value ? "/logo/new-logo.png" : "/logo/new-logo-dark.png");
    const mobileMenuOpen = ref(false);
    const mobileNavItems = [
      { to: "/messenger/dashboard", label: "Dashboard", icon: "ph:squares-four-fill" },
      { to: "/messenger/scan", label: "Scan", icon: "ph:scan-fill" },
      { to: "/messenger/deliveries", label: "Deliveries", icon: "ph:package-fill" },
      { to: "/messenger/settings", label: "Settings", icon: "ph:gear-six-fill" }
    ];
    const isActive = (to) => route.path === to || route.path.startsWith(`${to}/`);
    watch(() => route.path, () => {
      mobileMenuOpen.value = false;
    });
    return (_ctx, _push, _parent, _attrs) => {
      const _component_Icon = __nuxt_component_0;
      const _component_MessengerNav = __nuxt_component_1;
      const _component_MessengerSidebarFooter = _sfc_main$1;
      const _component_NuxtLink = __nuxt_component_3;
      _push(`<div${ssrRenderAttrs(mergeProps({
        class: ["w-full h-full min-h-screen flex flex-col md:flex-row overflow-hidden font-dashboard transition-colors duration-300", unref(isDark) ? "bg-rich-black text-white" : "bg-surface text-heading-dark"]
      }, _attrs))} data-v-b221cb8a><div class="${ssrRenderClass([unref(isDark) ? "bg-card-dark border-card-border" : "bg-white border-gray-200", "md:hidden flex items-center justify-between px-4 py-3 border-b sticky top-0 z-50"])}" data-v-b221cb8a><button class="p-2 -ml-2 rounded-xl transition hover:bg-gray-100 dark:hover:bg-rich-black/50" data-v-b221cb8a>`);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:list",
        class: "w-6 h-6 text-gray-700 dark:text-gray-300"
      }, null, _parent));
      _push(`</button><div class="flex items-center gap-2" data-v-b221cb8a><img${ssrRenderAttr("src", unref(brandLogo))} alt="FlowVision" class="w-8 h-8" data-v-b221cb8a><span class="text-base font-bold tracking-tight text-gray-900 dark:text-white" data-v-b221cb8a>FlowVision</span></div><span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20" data-v-b221cb8a> Messenger </span></div>`);
      ssrRenderTeleport(_push, (_push2) => {
        if (mobileMenuOpen.value) {
          _push2(`<div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] md:hidden" data-v-b221cb8a></div>`);
        } else {
          _push2(`<!---->`);
        }
        if (mobileMenuOpen.value) {
          _push2(`<aside class="${ssrRenderClass([unref(isDark) ? "bg-card-dark border-r border-card-border" : "bg-white border-r border-gray-200", "fixed left-0 top-0 bottom-0 w-[280px] z-[70] md:hidden overflow-y-auto"])}" data-v-b221cb8a><div class="p-4" data-v-b221cb8a><div class="flex items-center justify-between mb-6" data-v-b221cb8a><div class="flex items-center gap-2.5" data-v-b221cb8a><img${ssrRenderAttr("src", unref(brandLogo))} alt="FlowVision" class="w-8 h-8" data-v-b221cb8a><span class="text-lg font-bold tracking-tight text-gray-900 dark:text-white" data-v-b221cb8a>FlowVision</span></div><button class="p-2 rounded-xl transition hover:bg-gray-100 dark:hover:bg-rich-black/50" data-v-b221cb8a>`);
          _push2(ssrRenderComponent(_component_Icon, {
            name: "ph:x",
            class: "w-5 h-5 text-gray-500"
          }, null, _parent));
          _push2(`</button></div>`);
          _push2(ssrRenderComponent(_component_MessengerNav, null, null, _parent));
          _push2(ssrRenderComponent(_component_MessengerSidebarFooter, {
            user: unref(auth).user,
            onLogout: ($event) => unref(auth).logout()
          }, null, _parent));
          _push2(`</div></aside>`);
        } else {
          _push2(`<!---->`);
        }
      }, "body", false, _parent);
      _push(`<div class="flex min-h-0 w-full flex-1 overflow-hidden" data-v-b221cb8a><aside class="${ssrRenderClass([unref(isDark) ? "bg-sidebar-dark border-card-border" : "bg-white border-gray-200", "hidden md:flex md:w-60 h-full flex-shrink-0 flex-col border-r"])}" data-v-b221cb8a><div class="px-5 pt-5 pb-2 flex-none" data-v-b221cb8a><div class="flex items-center gap-2.5 mb-5" data-v-b221cb8a><img${ssrRenderAttr("src", unref(brandLogo))} alt="FlowVision" class="w-9 h-9" data-v-b221cb8a><span class="text-base font-bold tracking-tight text-gray-900 dark:text-white" data-v-b221cb8a>FlowVision</span></div><div class="flex flex-wrap items-center gap-2 mb-5" data-v-b221cb8a><span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20" data-v-b221cb8a><span class="w-1.5 h-1.5 rounded-full bg-amber-500" data-v-b221cb8a></span> Messenger </span>`);
      if (unref(auth).user?.org_id) {
        _push(`<span class="${ssrRenderClass([unref(isDark) ? "bg-white/5 text-gray-400" : "bg-gray-100 text-gray-500", "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"])}" data-v-b221cb8a>`);
        _push(ssrRenderComponent(_component_Icon, {
          name: "ph:building-office",
          class: "w-3 h-3"
        }, null, _parent));
        _push(` Org ${ssrInterpolate(unref(auth).user.org_id)}</span>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div></div><nav class="flex-1 px-3 overflow-y-auto" data-v-b221cb8a>`);
      _push(ssrRenderComponent(_component_MessengerNav, null, null, _parent));
      _push(`</nav><div class="${ssrRenderClass([unref(isDark) ? "border-card-border" : "border-gray-200", "flex-none border-t px-3 py-3"])}" data-v-b221cb8a>`);
      _push(ssrRenderComponent(_component_MessengerSidebarFooter, {
        user: unref(auth).user,
        onLogout: ($event) => unref(auth).logout()
      }, null, _parent));
      _push(`</div></aside><main class="${ssrRenderClass([unref(isDark) ? "bg-rich-black" : "bg-surface", "relative z-0 h-full min-w-0 flex-1 overflow-y-auto p-4 md:p-8"])}" data-v-b221cb8a>`);
      if (!unref(auth).user?.org_id) {
        _push(`<div class="flex h-full min-h-[320px] items-center justify-center" data-v-b221cb8a><div class="${ssrRenderClass([unref(isDark) ? "bg-card-dark border-card-border" : "bg-white border-gray-200", "w-full max-w-sm rounded-xl border p-8 text-center"])}" data-v-b221cb8a>`);
        _push(ssrRenderComponent(_component_Icon, {
          name: "ph:building-office-slash",
          class: "mx-auto mb-4 w-12 h-12 text-amber-500/60"
        }, null, _parent));
        _push(`<h2 class="${ssrRenderClass([unref(isDark) ? "text-white" : "text-gray-900", "text-lg font-bold mb-2"])}" data-v-b221cb8a>No organisation assigned</h2><p class="${ssrRenderClass([unref(isDark) ? "text-gray-400" : "text-gray-500", "text-sm"])}" data-v-b221cb8a> Your account hasn&#39;t been linked to an organisation yet. Contact your administrator. </p></div></div>`);
      } else {
        _push(`<div class="w-full" data-v-b221cb8a>`);
        ssrRenderSlot(_ctx.$slots, "default", {}, null, _push, _parent);
        _push(`</div>`);
      }
      _push(`</main></div><nav class="${ssrRenderClass([unref(isDark) ? "bg-card-dark border-card-border" : "bg-white border-gray-200", "md:hidden fixed bottom-0 left-0 right-0 z-50 border-t safe-area-bottom"])}" data-v-b221cb8a><div class="flex items-center justify-around px-2 py-2" data-v-b221cb8a><!--[-->`);
      ssrRenderList(mobileNavItems, (item) => {
        _push(ssrRenderComponent(_component_NuxtLink, {
          key: item.to,
          to: item.to,
          class: ["flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors min-w-[56px]", isActive(item.to) ? "text-amber-500" : unref(isDark) ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"]
        }, {
          default: withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              _push2(ssrRenderComponent(_component_Icon, {
                name: item.icon,
                class: "w-5 h-5"
              }, null, _parent2, _scopeId));
              _push2(`<span class="text-[10px] font-semibold" data-v-b221cb8a${_scopeId}>${ssrInterpolate(item.label)}</span>`);
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
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("layouts/messenger.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const messenger = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-b221cb8a"]]);

export { messenger as default };
//# sourceMappingURL=messenger-MSRlkTDw.mjs.map
