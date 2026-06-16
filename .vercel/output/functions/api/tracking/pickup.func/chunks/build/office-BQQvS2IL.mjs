import { defineComponent, computed, ref, reactive, mergeProps, unref, useSSRContext } from 'vue';
import { ssrRenderComponent, ssrRenderAttrs, ssrRenderClass, ssrInterpolate, ssrRenderAttr, ssrRenderList, ssrRenderTeleport, ssrIncludeBooleanAttr, ssrLooseContain, ssrLooseEqual } from 'vue/server-renderer';
import __nuxt_component_0 from './index-BYCkTpU3.mjs';
import { _ as _export_sfc, a as useAuthStore, u as useTheme } from './server.mjs';
import { u as useOfficeStore } from './office-DcDivY2T.mjs';
import '@iconify/vue';
import '@iconify/utils/lib/css/icon';
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
import '../routes/renderer.mjs';
import 'vue-bundle-renderer/runtime';
import 'unhead/server';
import 'devalue';
import 'unhead/utils';
import 'pinia';
import 'vue-router';
import '@vue/shared';

const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "officeComp",
  __ssrInlineRender: true,
  setup(__props) {
    const authStore = useAuthStore();
    const officeStore = useOfficeStore();
    const { isDark } = useTheme();
    const fallbackOrg = {
      org_id: 101,
      name: "FlowVision Operations",
      code: "FV-OPS"
    };
    const currentOrgId = computed(() => Number(authStore.currentOrg?.org_id || authStore.user?.org_id || fallbackOrg.org_id));
    const currentOrgName = computed(() => authStore.currentOrg?.name || fallbackOrg.name);
    const currentOrgCode = computed(() => authStore.currentOrg?.code || fallbackOrg.code);
    const organizationLabel = computed(() => `${currentOrgName.value} / ${currentOrgCode.value}`);
    const searchQuery = ref("");
    const isDrawerOpen = ref(false);
    const drawerMode = ref("create");
    ref(null);
    const form = reactive({
      name: "",
      assigned_user: ""
    });
    const employeesList = computed(() => officeStore.usersUnderOrg);
    const usersUnderOrg = employeesList;
    const filteredOffices = computed(() => {
      const query = searchQuery.value.trim().toLowerCase();
      const offices = officeStore.offices;
      if (!query) return offices;
      return offices.filter((office) => {
        return [
          office.id,
          office.name,
          getUserName(office.assigned_user)
        ].some((value) => String(value).toLowerCase().includes(query));
      });
    });
    const surfaceClass = computed(() => isDark.value ? "border-card-border bg-[#1A1A1A] shadow-card-dark" : "border-gray-200 bg-white");
    const borderClass = computed(() => isDark.value ? "border-card-border" : "border-gray-200");
    const mutedTextClass = computed(() => isDark.value ? "text-gray-400" : "text-gray-500");
    const inputClass = computed(() => isDark.value ? "border-card-border bg-rich-black text-white placeholder:text-gray-500" : "border-gray-200 bg-white text-rich-black placeholder:text-gray-400");
    const getUserName = (userId) => {
      return usersUnderOrg.value.find((u) => String(u.user_id) === String(userId))?.full_name || "Unassigned";
    };
    const formatDate = (value) => {
      if (!value) return "-";
      return new Intl.DateTimeFormat("en", {
        month: "short",
        day: "2-digit",
        year: "numeric"
      }).format(new Date(value));
    };
    return (_ctx, _push, _parent, _attrs) => {
      const _component_Icon = __nuxt_component_0;
      _push(`<section${ssrRenderAttrs(mergeProps({
        class: ["w-full space-y-6 pb-24 lg:pb-8 animate-fade-in", unref(isDark) ? "text-white" : "text-rich-black"]
      }, _attrs))} data-v-8e7be306><div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between" data-v-8e7be306><div data-v-8e7be306><div class="mb-3 h-1 w-14 rounded-full bg-rich-orange" data-v-8e7be306></div><h1 class="text-2xl font-bold tracking-tight sm:text-3xl" data-v-8e7be306>Offices Management</h1><p class="${ssrRenderClass([mutedTextClass.value, "mt-1 text-sm animate-pulse"])}" data-v-8e7be306>${ssrInterpolate(organizationLabel.value)}</p></div><button type="button" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#FF620C] px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-rich-orange/20 transition hover:bg-[#e95a0b] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-rich-orange" data-v-8e7be306>`);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:plus-bold",
        class: "h-4 w-4"
      }, null, _parent));
      _push(` Create New Office </button></div><div class="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full" data-v-8e7be306><article class="${ssrRenderClass([surfaceClass.value, "overflow-hidden rounded-lg border shadow-card lg:col-span-2 transition-all duration-300"])}" data-v-8e7be306><div class="${ssrRenderClass([borderClass.value, "flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between"])}" data-v-8e7be306><div data-v-8e7be306><h2 class="text-base font-semibold" data-v-8e7be306>Office Directory</h2><p class="${ssrRenderClass([mutedTextClass.value, "mt-1 text-xs"])}" data-v-8e7be306>${ssrInterpolate(filteredOffices.value.length)} offices linked to ${ssrInterpolate(currentOrgName.value)}</p></div><div class="${ssrRenderClass([unref(isDark) ? "border-card-border bg-rich-black/40 focus-within:border-rich-orange" : "border-gray-200 bg-gray-50 focus-within:border-rich-orange", "flex items-center gap-2 rounded-lg border px-3 py-2 transition-all"])}" data-v-8e7be306>`);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:magnifying-glass",
        class: ["h-4 w-4", mutedTextClass.value]
      }, null, _parent));
      _push(`<input${ssrRenderAttr("value", searchQuery.value)} type="search" placeholder="Search offices" class="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-gray-400 sm:w-56" data-v-8e7be306></div></div><div class="overflow-x-auto" data-v-8e7be306><table class="min-w-full text-left text-sm" data-v-8e7be306><thead class="${ssrRenderClass(unref(isDark) ? "bg-rich-black/50 text-gray-400" : "bg-gray-50 text-gray-500")}" data-v-8e7be306><tr data-v-8e7be306><th class="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide" data-v-8e7be306>Name</th><th class="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide" data-v-8e7be306>Assigned User</th><th class="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide" data-v-8e7be306>Created</th><th class="whitespace-nowrap px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide" data-v-8e7be306>Actions</th></tr></thead><tbody data-v-8e7be306><!--[-->`);
      ssrRenderList(filteredOffices.value, (office) => {
        _push(`<tr class="${ssrRenderClass([[borderClass.value, unref(isDark) ? "hover:bg-white/[0.03]" : "hover:bg-gray-50"], "border-t transition-colors duration-150"])}" data-v-8e7be306><td class="min-w-48 px-5 py-4" data-v-8e7be306><div class="font-semibold" data-v-8e7be306>${ssrInterpolate(office.name)}</div></td><td class="whitespace-nowrap px-5 py-4" data-v-8e7be306>${ssrInterpolate(getUserName(office.assigned_user))}</td><td class="${ssrRenderClass([mutedTextClass.value, "whitespace-nowrap px-5 py-4"])}" data-v-8e7be306>${ssrInterpolate(formatDate(office.created_at))}</td><td class="whitespace-nowrap px-5 py-4" data-v-8e7be306><div class="flex justify-end gap-2" data-v-8e7be306><button type="button" class="inline-flex h-9 w-9 items-center justify-center rounded-lg transition hover:text-rich-orange hover:bg-rich-orange/10" aria-label="Edit Office" title="Edit Office" data-v-8e7be306>`);
        _push(ssrRenderComponent(_component_Icon, {
          name: "ph:pencil-simple-line",
          class: "h-4 w-4"
        }, null, _parent));
        _push(`</button><button type="button" class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-500/10" aria-label="Delete" title="Delete" data-v-8e7be306>`);
        _push(ssrRenderComponent(_component_Icon, {
          name: "ph:trash",
          class: "h-4 w-4"
        }, null, _parent));
        _push(`</button></div></td></tr>`);
      });
      _push(`<!--]-->`);
      if (!filteredOffices.value.length) {
        _push(`<tr data-v-8e7be306><td colspan="5" class="${ssrRenderClass([mutedTextClass.value, "px-5 py-12 text-center"])}" data-v-8e7be306> No offices match the current filters or no offices have been created. </td></tr>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</tbody></table></div></article><aside class="space-y-5" data-v-8e7be306><article class="${ssrRenderClass([surfaceClass.value, "rounded-lg border p-5 shadow-card transition-all duration-300"])}" data-v-8e7be306><div class="mb-5 flex items-center justify-between gap-3" data-v-8e7be306><div data-v-8e7be306><h2 class="text-base font-semibold" data-v-8e7be306>Settings</h2><p class="${ssrRenderClass([mutedTextClass.value, "mt-1 text-xs"])}" data-v-8e7be306>Workspace appearance</p></div>`);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:gear-six",
        class: "h-5 w-5 text-rich-orange"
      }, null, _parent));
      _push(`</div><div class="${ssrRenderClass([unref(isDark) ? "border-card-border bg-rich-black/40" : "border-gray-200 bg-gray-50", "flex items-center justify-between rounded-lg border p-4"])}" data-v-8e7be306><div data-v-8e7be306><p class="text-sm font-semibold" data-v-8e7be306>${ssrInterpolate(unref(isDark) ? "Dark Mode" : "Light Mode")}</p><p class="${ssrRenderClass([mutedTextClass.value, "mt-1 text-xs"])}" data-v-8e7be306>Global dashboard theme</p></div><button type="button" role="switch"${ssrRenderAttr("aria-checked", unref(isDark))} class="${ssrRenderClass([unref(isDark) ? "bg-rich-orange focus:ring-offset-rich-black" : "bg-gray-300 focus:ring-offset-white", "relative h-7 w-12 rounded-full transition focus:outline-none focus:ring-2 focus:ring-[#FF620C] focus:ring-offset-2"])}" data-v-8e7be306><span class="${ssrRenderClass([unref(isDark) ? "left-6" : "left-1", "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition"])}" data-v-8e7be306></span></button></div></article><article class="${ssrRenderClass([surfaceClass.value, "rounded-lg border p-5 shadow-card transition-all duration-300"])}" data-v-8e7be306><div class="mb-5 flex items-center justify-between gap-3" data-v-8e7be306><div data-v-8e7be306><h2 class="text-base font-semibold" data-v-8e7be306>Organization</h2><p class="${ssrRenderClass([mutedTextClass.value, "mt-1 text-xs"])}" data-v-8e7be306>Quick config metadata</p></div>`);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:buildings",
        class: "h-5 w-5 text-rich-orange"
      }, null, _parent));
      _push(`</div><dl class="space-y-4" data-v-8e7be306><div class="${ssrRenderClass([borderClass.value, "flex items-center justify-between gap-4 border-b pb-3"])}" data-v-8e7be306><dt class="${ssrRenderClass([mutedTextClass.value, "text-xs uppercase tracking-wide"])}" data-v-8e7be306>Name</dt><dd class="text-right text-sm font-semibold" data-v-8e7be306>${ssrInterpolate(currentOrgName.value)}</dd></div><div class="${ssrRenderClass([borderClass.value, "flex items-center justify-between gap-4 border-b pb-3"])}" data-v-8e7be306><dt class="${ssrRenderClass([mutedTextClass.value, "text-xs uppercase tracking-wide"])}" data-v-8e7be306>Code</dt><dd class="font-mono text-sm font-semibold" data-v-8e7be306>${ssrInterpolate(currentOrgCode.value)}</dd></div><div class="${ssrRenderClass([borderClass.value, "flex items-center justify-between gap-4 border-b pb-3"])}" data-v-8e7be306><dt class="${ssrRenderClass([mutedTextClass.value, "text-xs uppercase tracking-wide"])}" data-v-8e7be306>Assignable Users</dt><dd class="text-sm font-semibold" data-v-8e7be306>${ssrInterpolate(unref(usersUnderOrg).length)}</dd></div><div class="flex items-center justify-between gap-4" data-v-8e7be306><dt class="${ssrRenderClass([mutedTextClass.value, "text-xs uppercase tracking-wide"])}" data-v-8e7be306>Workflow</dt><dd class="text-sm font-semibold" data-v-8e7be306>Decoupled</dd></div></dl></article></aside></div>`);
      ssrRenderTeleport(_push, (_push2) => {
        if (isDrawerOpen.value) {
          _push2(`<div class="fixed inset-0 z-[80] bg-black/55 backdrop-blur-sm" data-v-8e7be306></div>`);
        } else {
          _push2(`<!---->`);
        }
        if (isDrawerOpen.value) {
          _push2(`<form class="${ssrRenderClass([surfaceClass.value, "fixed bottom-0 right-0 top-0 z-[90] flex w-full max-w-xl flex-col border-l shadow-2xl transition-all duration-300"])}" data-v-8e7be306><header class="${ssrRenderClass([borderClass.value, "flex items-start justify-between gap-4 border-b px-5 py-5"])}" data-v-8e7be306><div data-v-8e7be306><p class="text-xs font-semibold uppercase tracking-wide text-rich-orange" data-v-8e7be306>${ssrInterpolate(drawerMode.value === "create" ? "Create" : "Update")}</p><h2 class="mt-1 text-xl font-bold" data-v-8e7be306>${ssrInterpolate(drawerMode.value === "create" ? "Create Office" : "Edit Office")}</h2></div><button type="button" class="inline-flex h-10 w-10 items-center justify-center rounded-lg transition hover:text-rich-orange hover:bg-rich-orange/10" aria-label="Close drawer" data-v-8e7be306>`);
          _push2(ssrRenderComponent(_component_Icon, {
            name: "ph:x-bold",
            class: "h-4 w-4"
          }, null, _parent));
          _push2(`</button></header><div class="flex-1 space-y-5 overflow-y-auto px-5 py-5" data-v-8e7be306><label class="block" data-v-8e7be306><span class="text-sm font-semibold" data-v-8e7be306>Office Name</span><input${ssrRenderAttr("value", form.name)} type="text" placeholder="e.g. Singapore Operations" class="${ssrRenderClass([inputClass.value, "mt-2 w-full rounded-lg border px-4 py-3 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-rich-orange"])}" required data-v-8e7be306></label><label class="block" data-v-8e7be306><span class="text-sm font-semibold" data-v-8e7be306>Assigned User</span><select class="${ssrRenderClass([inputClass.value, "mt-2 w-full rounded-lg border px-4 py-3 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-rich-orange"])}" required data-v-8e7be306><option disabled value="" data-v-8e7be306${ssrIncludeBooleanAttr(Array.isArray(form.assigned_user) ? ssrLooseContain(form.assigned_user, "") : ssrLooseEqual(form.assigned_user, "")) ? " selected" : ""}>Select a user</option><!--[-->`);
          ssrRenderList(employeesList.value, (user) => {
            _push2(`<option${ssrRenderAttr("value", user.user_id)} data-v-8e7be306${ssrIncludeBooleanAttr(Array.isArray(form.assigned_user) ? ssrLooseContain(form.assigned_user, user.user_id) : ssrLooseEqual(form.assigned_user, user.user_id)) ? " selected" : ""}>${ssrInterpolate(user.full_name)}</option>`);
          });
          _push2(`<!--]--></select><p class="${ssrRenderClass([mutedTextClass.value, "mt-2 text-xs animate-pulse"])}" data-v-8e7be306> Assignable users are retrieved from the current organization (org_id: ${ssrInterpolate(currentOrgId.value)}). </p></label><div class="${ssrRenderClass([unref(isDark) ? "border-card-border bg-rich-black/40" : "border-gray-200 bg-gray-50", "rounded-lg border p-4 text-sm"])}" data-v-8e7be306><div class="flex items-center gap-2 font-semibold" data-v-8e7be306>`);
          _push2(ssrRenderComponent(_component_Icon, {
            name: "ph:shield-check",
            class: "h-4 w-4 text-rich-orange"
          }, null, _parent));
          _push2(` Security &amp; Data Integrity Guard </div><p class="${ssrRenderClass([mutedTextClass.value, "mt-2 text-xs leading-5"])}" data-v-8e7be306> Strict DB schema validation: Office creations default \`stage_id\` to \`NULL\`. Assignable users are verified against org ID. </p></div></div><footer class="${ssrRenderClass([borderClass.value, "flex items-center justify-end gap-3 border-t px-5 py-4"])}" data-v-8e7be306><button type="button" class="${ssrRenderClass([unref(isDark) ? "border-card-border" : "border-gray-200", "rounded-lg border px-4 py-2.5 text-sm font-semibold transition hover:bg-black/5 dark:hover:bg-white/5"])}" data-v-8e7be306> Cancel </button><button type="submit" class="rounded-lg bg-[#FF620C] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e95a0b] active:scale-[0.98]" data-v-8e7be306>${ssrInterpolate(drawerMode.value === "create" ? "Create Office" : "Save Changes")}</button></footer></form>`);
        } else {
          _push2(`<!---->`);
        }
      }, "body", false, _parent);
      _push(`</section>`);
    };
  }
});
const _sfc_setup$1 = _sfc_main$1.setup;
_sfc_main$1.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/client/offices/officeComp.vue");
  return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
const OfficeView = /* @__PURE__ */ Object.assign(_export_sfc(_sfc_main$1, [["__scopeId", "data-v-8e7be306"]]), { __name: "ClientOfficesOfficeComp" });
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "office",
  __ssrInlineRender: true,
  setup(__props) {
    return (_ctx, _push, _parent, _attrs) => {
      _push(ssrRenderComponent(OfficeView, _attrs, null, _parent));
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/client/office.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=office-BQQvS2IL.mjs.map
