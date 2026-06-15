import { defineComponent, ref, mergeProps, unref, useSSRContext } from 'vue';
import { ssrRenderComponent, ssrRenderAttrs, ssrRenderClass, ssrRenderAttr, ssrInterpolate, ssrIncludeBooleanAttr } from 'vue/server-renderer';
import __nuxt_component_0 from './index-BRIQYxw1.mjs';
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
  __name: "SettingsPanel",
  __ssrInlineRender: true,
  setup(__props) {
    const auth = useAuthStore();
    const { isDark } = useTheme();
    const isLoggingOut = ref(false);
    return (_ctx, _push, _parent, _attrs) => {
      const _component_Icon = __nuxt_component_0;
      _push(`<section${ssrRenderAttrs(mergeProps({
        class: ["rounded-lg border p-6 shadow-card", unref(isDark) ? "border-card-border bg-card-dark text-white" : "border-gray-200 bg-white text-rich-black"]
      }, _attrs))}><div class="mb-3 h-1 w-12 rounded-full bg-rich-orange"></div><div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h1 class="text-2xl font-bold tracking-tight">Settings</h1><p class="${ssrRenderClass([unref(isDark) ? "text-gray-400" : "text-gray-500", "mt-2 text-sm"])}"> Manage the FlowVision dashboard appearance. </p></div><button type="button" role="switch"${ssrRenderAttr("aria-checked", unref(isDark))} class="${ssrRenderClass([unref(isDark) ? "bg-rich-orange focus:ring-offset-rich-black" : "bg-gray-300 focus:ring-offset-white", "relative h-8 w-14 rounded-full transition focus:outline-none focus:ring-2 focus:ring-[#FF620C] focus:ring-offset-2"])}"><span class="${ssrRenderClass([unref(isDark) ? "left-7" : "left-1", "absolute top-1 h-6 w-6 rounded-full bg-white shadow transition"])}"></span></button></div><div class="${ssrRenderClass([unref(isDark) ? "border-card-border bg-rich-black/40" : "border-gray-200 bg-gray-50", "mt-6 rounded-lg border p-4"])}"><p class="text-sm font-semibold">${ssrInterpolate(unref(isDark) ? "Dark Mode" : "Light Mode")}</p><p class="${ssrRenderClass([unref(isDark) ? "text-gray-400" : "text-gray-500", "mt-1 text-xs"])}"> Backgrounds, borders, surfaces, and text colors respond to the shared theme state. </p></div><div class="${ssrRenderClass([unref(isDark) ? "border-card-border bg-rich-black/40" : "border-gray-200 bg-gray-50", "mt-6 rounded-lg border p-4"])}"><p class="text-sm font-semibold">Account</p><p class="${ssrRenderClass([unref(isDark) ? "text-gray-400" : "text-gray-500", "mt-1 text-xs"])}"> Signed in as <span class="${ssrRenderClass([unref(isDark) ? "text-gray-300" : "text-gray-700", "font-medium"])}">${ssrInterpolate(unref(auth).user?.email || "your account")}</span></p><button type="button" class="${ssrRenderClass([unref(isDark) ? "border-red-500/30 text-red-400 hover:border-red-500/50" : "border-red-200 text-red-600 hover:border-red-300", "mt-4 inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition hover:bg-red-500/10 active:scale-[0.98]"])}"${ssrIncludeBooleanAttr(isLoggingOut.value) ? " disabled" : ""}>`);
      if (isLoggingOut.value) {
        _push(ssrRenderComponent(_component_Icon, {
          name: "ph:spinner-gap",
          class: "h-4 w-4 animate-spin"
        }, null, _parent));
      } else {
        _push(ssrRenderComponent(_component_Icon, {
          name: "ph:sign-out",
          class: "h-4 w-4"
        }, null, _parent));
      }
      _push(` ${ssrInterpolate(isLoggingOut.value ? "Signing out…" : "Log out")}</button></div></section>`);
    };
  }
});
const _sfc_setup$1 = _sfc_main$1.setup;
_sfc_main$1.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/client/SettingsPanel.vue");
  return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
const SettingsPanel = Object.assign(_sfc_main$1, { __name: "ClientSettingsPanel" });
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "settings",
  __ssrInlineRender: true,
  setup(__props) {
    return (_ctx, _push, _parent, _attrs) => {
      _push(ssrRenderComponent(SettingsPanel, _attrs, null, _parent));
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/client/settings.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=settings-WheTPnHE.mjs.map
