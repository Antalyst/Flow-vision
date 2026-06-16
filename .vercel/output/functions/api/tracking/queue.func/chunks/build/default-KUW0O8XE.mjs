import { _ as __nuxt_component_3 } from './nuxt-link-BkIUUJ0e.mjs';
import { ref, watch, mergeProps, withCtx, createTextVNode, unref, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderAttr, ssrRenderComponent, ssrRenderList, ssrRenderClass, ssrInterpolate, ssrRenderDynamicModel, ssrIncludeBooleanAttr, ssrLooseContain, ssrRenderSlot } from 'vue/server-renderer';
import { V as publicAssetsURL } from '../_/nitro.mjs';
import { a as useAuthStore, k as _imports_1, j as useState } from './server.mjs';
import { defineStore } from 'pinia';
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
import 'vue-router';
import '@supabase/ssr';
import '@vue/shared';
import '@iconify/vue';

const _imports_0 = publicAssetsURL("/logo/new-logo.png");
const useLoading = () => {
  const isLoading = useState("global_loading", () => false);
  const startLoading = () => isLoading.value = true;
  const stopLoading = () => isLoading.value = false;
  return {
    isLoading,
    startLoading,
    stopLoading
  };
};
const useEmployeeAuthStore = defineStore("employeeAuth", {
  state: () => ({
    loading: false,
    orgId: 0
  }),
  getters: {
    currentUser: (state) => {
      const authStore = useAuthStore();
      return authStore.user;
    },
    isAuthenticated: (state) => {
      const authStore = useAuthStore();
      return authStore.isLoggedIn;
    }
  },
  actions: {
    async fetchOrgCode(credentials) {
      this.loading = true;
      try {
        const normalizedCode = (credentials.code || "").trim();
        const res = await $fetch("/api/org/getOrdCode", {
          method: "POST",
          body: { code: normalizedCode }
        });
        if (res.success) {
          this.orgId = res.rows.org_id;
          return res.rows;
        } else {
          return "Invalid Code";
        }
      } catch (error) {
        console.error("Store Error:", error);
        throw error;
      } finally {
        this.loading = false;
      }
    }
  }
});
const _sfc_main = {
  __name: "default",
  __ssrInlineRender: true,
  setup(__props) {
    useLoading();
    useEmployeeAuthStore();
    const showPassword = ref(false);
    useAuthStore();
    const accTypeData = ref([]);
    const selectedType = ref(null);
    const registerModal = ref(false);
    const userRole = ref("");
    const loginModal = ref(false);
    ref(false);
    ref(null);
    const selectedTypeName = ref("");
    const login = ref({
      email: "",
      password: "",
      rememberMe: false
    });
    const form = ref({
      full_name: "",
      email: "",
      acctype_id: selectedType.value,
      role: userRole.value,
      birth_date: "",
      password: "",
      confirm_password: "",
      org_code: ""
    });
    watch(selectedType, (newVal) => {
      if (newVal === 1) {
        userRole.value = "client";
      } else {
        userRole.value = "employee";
      }
    });
    return (_ctx, _push, _parent, _attrs) => {
      const _component_nuxt_link = __nuxt_component_3;
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "min-h-screen w-full font-primary sticky top-0 relative" }, _attrs))}><nav class="flex justify-between items-center p-4 bg-rich-black text-white m-5 mx-60 rounded-full shadow-md"><div class="flex items-center"><img class="w-[40px] h-auto pl-4"${ssrRenderAttr("src", _imports_0)} alt="FlowVision Logo"></div><div class="hidden md:block"><ul class="flex md:pl-52 gap-8 justify-center"><li class="cursor-pointer transition">`);
      _push(ssrRenderComponent(_component_nuxt_link, { to: "/" }, {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`Home`);
          } else {
            return [
              createTextVNode("Home")
            ];
          }
        }),
        _: 1
      }, _parent));
      _push(`</li><li class="cursor-pointer transition">`);
      _push(ssrRenderComponent(_component_nuxt_link, { to: "/tracking" }, {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`Tracking`);
          } else {
            return [
              createTextVNode("Tracking")
            ];
          }
        }),
        _: 1
      }, _parent));
      _push(`</li><li class="cursor-pointer transition">`);
      _push(ssrRenderComponent(_component_nuxt_link, { to: "/about" }, {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`About`);
          } else {
            return [
              createTextVNode("About")
            ];
          }
        }),
        _: 1
      }, _parent));
      _push(`</li><li class="cursor-pointer transition"><button>Contact</button></li></ul></div><div class="flex items-center justify-center gap-4"><div class="flex gap-2"><button class="px-4 py-2 text-md font-medium hover:text-rich-orange transition">Sign in</button><button class="px-5 py-2 text-md font-medium bg-white text-rich-black rounded-full hover:bg-rich-orange hover:text-white transition shadow-sm"> Get started </button></div></div></nav>`);
      if (unref(registerModal)) {
        _push(`<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"><div class="relative bg-white w-full max-w-5xl min-h-[600px] rounded-md shadow-2xl overflow-hidden flex"><div class="hidden lg:flex flex-1 relative bg-[url(&#39;/bg/bg.png&#39;)] bg-cover bg-center items-center justify-center p-12"><div class="absolute inset-0 bg-black/20"></div><div class="relative z-10 text-center"><img${ssrRenderAttr("src", _imports_1)} class="w-20 mx-auto mb-4 brightness-0 invert" alt="FlowVision"><h1 class="text-4xl font-bold text-white tracking-tight">Join FlowVision</h1><p class="text-white/80 mt-2">Start managing your workflow today.</p></div></div><div class="flex-1 bg-white p-8 md:p-10 flex flex-col justify-center relative overflow-y-auto max-h-[90vh]"><button class="absolute top-6 right-8 text-3xl text-gray-400 hover:text-gray-800 transition"> × </button><div class="w-full max-w-md mx-auto"><div class="mb-6 text-center lg:text-left"><h1 class="text-3xl font-bold text-gray-900 mb-1">Create Account</h1><p class="text-gray-500 text-sm">Select your account type to get started.</p></div><div class="flex bg-gray-100 p-1 rounded-md w-full mb-6"><!--[-->`);
        ssrRenderList(unref(accTypeData), (accType) => {
          _push(`<button type="button" class="${ssrRenderClass([
            "flex-1 py-2 rounded-md text-sm font-bold transition-all capitalize",
            unref(selectedType) === accType.acctype_id ? "bg-white text-[#F77934] shadow-sm" : "text-gray-500 hover:text-gray-700"
          ])}">${ssrInterpolate(accType.name)}</button>`);
        });
        _push(`<!--]--></div><form class="grid grid-cols-1 md:grid-cols-2 gap-4"><div class="flex flex-col gap-1 md:col-span-2"><label class="text-xs font-bold text-gray-700 uppercase">Full name</label><input${ssrRenderAttr("value", unref(form).full_name)} class="w-full px-4 py-2 rounded-md border border-gray-300 outline-none focus:border-[#F77934] transition-colors" type="text" required placeholder="Juan D. Dela Cruz"></div><div class="flex flex-col gap-1 md:col-span-2"><label class="text-xs font-bold text-gray-700 uppercase">Email</label><input${ssrRenderAttr("value", unref(form).email)} class="w-full px-4 py-2 rounded-md border border-gray-300 outline-none focus:border-[#F77934] transition-colors" type="email" required placeholder="example@gmail.com"></div>`);
        if (unref(selectedTypeName) === "employee") {
          _push(`<div class="flex flex-col gap-1 md:col-span-2"><label class="text-xs font-bold text-[#F77934] uppercase">Organization Code</label><input${ssrRenderAttr("value", unref(form).org_code)} class="w-full px-4 py-2 rounded-md border border-[#F77934] outline-none bg-orange-50/30" type="text" required placeholder="Enter provided code"></div>`);
        } else {
          _push(`<!---->`);
        }
        _push(`<div class="flex flex-col gap-1 md:col-span-2"><label class="text-xs font-bold text-gray-700 uppercase">Birth Date</label><input${ssrRenderAttr("value", unref(form).birth_date)} type="date" class="w-full px-4 py-2 rounded-md border border-gray-300 outline-none focus:border-[#F77934] transition-colors text-gray-700"></div><div class="flex flex-col gap-1"><label class="text-xs font-bold text-gray-700 uppercase">Password</label><input${ssrRenderAttr("value", unref(form).password)} class="w-full px-4 py-2 rounded-md border border-gray-300 outline-none focus:border-[#F77934] transition-colors" type="password" required></div><div class="flex flex-col gap-1"><label class="text-xs font-bold text-gray-700 uppercase">Confirm</label><input${ssrRenderAttr("value", unref(form).confirm_password)} class="w-full px-4 py-2 rounded-md border border-gray-300 outline-none focus:border-[#F77934] transition-colors" type="password" required></div><button type="submit" class="md:col-span-2 w-full bg-[#F77934] hover:bg-[#e06b2a] text-white py-3 rounded-md font-bold mt-2 transition-colors"> Create Account </button></form><p class="mt-6 text-center text-sm text-gray-500"> Already have an account? <button class="font-bold text-[#F77934] hover:underline ml-1">Sign in</button></p></div></div></div></div>`);
      } else {
        _push(`<!---->`);
      }
      if (unref(loginModal)) {
        _push(`<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"><div class="relative bg-white w-full max-w-5xl min-h-[600px] rounded-md shadow-2xl overflow-hidden flex"><div class="hidden lg:flex flex-1 relative bg-[url(&#39;/bg/bg.png&#39;)] bg-cover bg-center items-center justify-center p-12"><div class="absolute inset-0 bg-black/20"></div><div class="relative z-10 text-center"><img${ssrRenderAttr("src", _imports_1)} class="w-20 mx-auto mb-4 brightness-0 invert" alt="FlowVision"><h1 class="text-4xl font-bold text-white tracking-tight">FlowVision</h1></div></div><div class="flex-1 bg-white p-8 md:p-16 flex flex-col justify-center relative"><button class="absolute top-6 right-8 text-3xl text-gray-400 hover:text-gray-800 transition"> × </button><div class="w-full max-w-sm mx-auto"><div class="mb-8"><h1 class="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1><p class="text-gray-500 text-sm">Please enter your details to sign in.</p></div><form class="flex flex-col gap-4"><div class="flex flex-col gap-1.5"><label class="text-sm font-semibold text-gray-700">Email Address</label><input${ssrRenderAttr("value", unref(login).email)} type="email" required placeholder="name@company.com" class="w-full px-4 py-2.5 rounded-md border border-gray-300 outline-none focus:border-[#F77934] transition-colors"></div><div class="flex flex-col gap-1.5"><label class="text-sm font-semibold text-gray-700">Password</label><div class="relative w-full"><input${ssrRenderDynamicModel(unref(showPassword) ? "text" : "password", unref(login).password, null)}${ssrRenderAttr("type", unref(showPassword) ? "text" : "password")} required placeholder="••••••••" class="w-full px-4 py-2.5 rounded-md border border-gray-300 outline-none focus:border-[#F77934] transition-colors pr-12"><button type="button" class="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-[#F77934]"><span class="text-xs font-bold uppercase">${ssrInterpolate(unref(showPassword) ? "Hide" : "Show")}</span></button></div></div><div class="flex items-center justify-between mt-1"><label class="flex items-center gap-2 cursor-pointer"><input${ssrIncludeBooleanAttr(Array.isArray(unref(login).rememberMe) ? ssrLooseContain(unref(login).rememberMe, null) : unref(login).rememberMe) ? " checked" : ""} type="checkbox" class="w-4 h-4 rounded-md accent-[#F77934]"><span class="text-sm text-gray-600">Remember me</span></label><button type="button" class="text-sm font-medium text-[#F77934] hover:underline"> Forgot password? </button></div><button type="submit" class="w-full bg-[#F77934] hover:bg-[#e06b2a] text-white py-2.5 rounded-md font-bold mt-4 transition-colors"> Sign in </button></form><p class="mt-8 text-center text-sm text-gray-500"> Don&#39;t have an account? <button class="font-bold text-[#F77934] hover:underline ml-1">Create account</button></p></div></div></div></div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`<main class="w-full p-2">`);
      ssrRenderSlot(_ctx.$slots, "default", {}, null, _push, _parent);
      _push(`</main></div>`);
    };
  }
};
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("layouts/default.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=default-KUW0O8XE.mjs.map
