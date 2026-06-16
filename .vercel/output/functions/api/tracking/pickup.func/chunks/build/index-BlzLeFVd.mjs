import __nuxt_component_0 from './index-CSZJBLRw.mjs';
import { defineComponent, ref, reactive, computed, mergeProps, unref, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderClass, ssrInterpolate, ssrRenderComponent, ssrRenderList, ssrRenderTeleport, ssrRenderAttr, ssrIncludeBooleanAttr } from 'vue/server-renderer';
import { _ as _export_sfc, a as useAuthStore, u as useTheme } from './server.mjs';
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

const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "OfficeQrCard",
  __ssrInlineRender: true,
  props: {
    office: {}
  },
  emits: ["edit", "delete"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const { isDark } = useTheme();
    const derivedCode = computed(() => `OFF-${String(props.office.id).padStart(6, "0")}`);
    const qrUri = computed(() => `flowvision://office/${props.office.id}`);
    const qrDataUrl = ref(null);
    const formatDate = (value) => value ? new Intl.DateTimeFormat("en", { month: "short", day: "2-digit", year: "numeric" }).format(new Date(value)) : "—";
    return (_ctx, _push, _parent, _attrs) => {
      const _component_Icon = __nuxt_component_0;
      _push(`<article${ssrRenderAttrs(mergeProps({
        class: ["group relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl", unref(isDark) ? "border-white/10 bg-[#1A1A1A] shadow-xl shadow-black/30" : "border-gray-200 bg-white shadow-card"]
      }, _attrs))}><div class="h-1 w-full bg-gradient-to-r from-rich-orange via-[#ff8040] to-rich-orange/40"></div><div class="flex flex-1 flex-col gap-4 p-5"><div class="flex items-start justify-between gap-3"><div class="min-w-0 flex-1"><div class="flex items-center gap-2">`);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:buildings-fill",
        class: "h-4 w-4 flex-none text-rich-orange"
      }, null, _parent));
      _push(`<h3 class="${ssrRenderClass([unref(isDark) ? "text-white" : "text-gray-900", "truncate text-base font-bold"])}">${ssrInterpolate(__props.office.name)}</h3></div><p class="mt-1 font-mono text-[11px] font-semibold text-rich-orange">${ssrInterpolate(__props.office.code || derivedCode.value)}</p></div><div class="flex flex-shrink-0 items-center gap-1"><button type="button" class="${ssrRenderClass([unref(isDark) ? "text-gray-400" : "text-gray-500", "inline-flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-rich-orange/10 hover:text-rich-orange"])}" title="Edit office">`);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:pencil-simple-bold",
        class: "h-3.5 w-3.5"
      }, null, _parent));
      _push(`</button><button type="button" class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-500/10" title="Delete office">`);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:trash-bold",
        class: "h-3.5 w-3.5"
      }, null, _parent));
      _push(`</button></div></div><div class="flex flex-col items-center gap-3"><div class="${ssrRenderClass([unref(isDark) ? "border-white/10" : "border-gray-100", "relative flex h-44 w-44 items-center justify-center rounded-2xl border bg-white p-3 shadow-sm transition-shadow group-hover:shadow-md"])}">`);
      if (qrDataUrl.value) {
        _push(`<img${ssrRenderAttr("src", qrDataUrl.value)}${ssrRenderAttr("alt", `QR code for ${__props.office.name}`)} class="h-full w-full object-contain">`);
      } else {
        _push(`<div class="flex flex-col items-center gap-2">`);
        _push(ssrRenderComponent(_component_Icon, {
          name: "ph:spinner-gap",
          class: "h-8 w-8 animate-spin text-rich-orange"
        }, null, _parent));
        _push(`<span class="${ssrRenderClass([unref(isDark) ? "text-gray-500" : "text-gray-400", "text-[10px]"])}">Generating…</span></div>`);
      }
      _push(`</div><p class="${ssrRenderClass([unref(isDark) ? "text-gray-500" : "text-gray-400", "text-center font-mono text-[10px]"])}">${ssrInterpolate(qrUri.value)}</p></div><div class="${ssrRenderClass([unref(isDark) ? "border-white/5 bg-white/[0.03]" : "border-gray-100 bg-gray-50", "grid grid-cols-2 gap-3 rounded-xl border p-3 text-center"])}"><div><p class="${ssrRenderClass([unref(isDark) ? "text-white" : "text-gray-900", "text-sm font-bold"])}">${ssrInterpolate(__props.office.doc_count ?? "—")}</p><p class="${ssrRenderClass([unref(isDark) ? "text-gray-500" : "text-gray-400", "mt-0.5 text-[10px]"])}">Documents</p></div><div><p class="${ssrRenderClass([unref(isDark) ? "text-white" : "text-gray-900", "text-sm font-bold"])}">${ssrInterpolate(formatDate(__props.office.created_at))}</p><p class="${ssrRenderClass([unref(isDark) ? "text-gray-500" : "text-gray-400", "mt-0.5 text-[10px]"])}">Created</p></div></div><button type="button"${ssrIncludeBooleanAttr(!qrDataUrl.value) ? " disabled" : ""} class="${ssrRenderClass([unref(isDark) ? "border-rich-orange/30 bg-rich-orange/10 text-rich-orange hover:bg-rich-orange/20" : "border-rich-orange/30 bg-orange-50 text-rich-orange hover:bg-orange-100", "flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"])}">`);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:download-simple-bold",
        class: "h-3.5 w-3.5"
      }, null, _parent));
      _push(` Download QR Code </button></div></article>`);
    };
  }
});
const _sfc_setup$1 = _sfc_main$1.setup;
_sfc_main$1.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/employee/OfficeQrCard.vue");
  return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
const OfficeQrCard = Object.assign(_sfc_main$1, { __name: "EmployeeOfficeQrCard" });
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "index",
  __ssrInlineRender: true,
  setup(__props) {
    const auth = useAuthStore();
    const { isDark } = useTheme();
    const offices = ref([]);
    const loading = ref(false);
    const saving = ref(false);
    const drawerOpen = ref(false);
    const drawerMode = ref("create");
    const editingId = ref(null);
    const form = reactive({ name: "", code: "" });
    const glassSurface = computed(
      () => isDark.value ? "border-white/10 bg-white/[0.04]" : "border-gray-200 bg-white"
    );
    const mutedText = computed(() => isDark.value ? "text-gray-400" : "text-gray-500");
    const inputClass = computed(
      () => isDark.value ? "border-white/10 bg-[#111111] text-white placeholder:text-gray-500" : "border-gray-200 bg-white text-gray-900 placeholder:text-gray-400"
    );
    const openEdit = (office) => {
      drawerMode.value = "edit";
      editingId.value = office.id;
      form.name = office.name;
      form.code = office.code ?? "";
      drawerOpen.value = true;
    };
    const handleDelete = async (id) => {
      if (!confirm("Delete this office? This cannot be undone.")) return;
      try {
        await $fetch("/api/office", { method: "DELETE", params: { id } });
        offices.value = offices.value.filter((o) => String(o.id) !== String(id));
      } catch (err) {
        console.error("[EmployeeOffices] delete error:", err);
      }
    };
    return (_ctx, _push, _parent, _attrs) => {
      const _component_Icon = __nuxt_component_0;
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "space-y-6 pb-24 lg:pb-8" }, _attrs))} data-v-9d832e13><div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between" data-v-9d832e13><div data-v-9d832e13><div class="mb-3 h-1 w-14 rounded-full bg-rich-orange" data-v-9d832e13></div><h1 class="${ssrRenderClass([unref(isDark) ? "text-white" : "text-gray-900", "text-2xl font-bold tracking-tight"])}" data-v-9d832e13> My Sub-Branch Offices </h1><p class="${ssrRenderClass([mutedText.value, "mt-1 text-sm"])}" data-v-9d832e13> Registered under <span class="${ssrRenderClass([unref(isDark) ? "text-gray-200" : "text-gray-700", "font-semibold"])}" data-v-9d832e13>${ssrInterpolate(unref(auth).currentOrg?.name || `Org ${unref(auth).user?.org_id}`)}</span></p></div><button type="button" class="inline-flex items-center gap-2 rounded-xl bg-rich-orange px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rich-orange/25 transition-all duration-200 hover:scale-[1.02] hover:bg-[#e95a0b] active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-rich-orange/50" data-v-9d832e13>`);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:plus-bold",
        class: "h-4 w-4"
      }, null, _parent));
      _push(` Register New Office </button></div><div class="grid grid-cols-1 gap-3 sm:grid-cols-3" data-v-9d832e13><div class="${ssrRenderClass([glassSurface.value, "col-span-1 sm:col-span-2 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm"])}" data-v-9d832e13><div class="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-rich-orange/10" data-v-9d832e13>`);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:shield-check-fill",
        class: "h-4 w-4 text-rich-orange"
      }, null, _parent));
      _push(`</div><div class="min-w-0" data-v-9d832e13><p class="text-[11px] font-bold uppercase tracking-widest text-rich-orange" data-v-9d832e13>Isolated Scope</p><p class="${ssrRenderClass([mutedText.value, "mt-0.5 truncate text-xs"])}" data-v-9d832e13> org_id <span class="${ssrRenderClass([unref(isDark) ? "text-gray-200" : "text-gray-700", "font-mono font-bold"])}" data-v-9d832e13>${ssrInterpolate(unref(auth).user?.org_id)}</span> · user <span class="${ssrRenderClass([unref(isDark) ? "text-gray-200" : "text-gray-700", "font-mono font-bold"])}" data-v-9d832e13>${ssrInterpolate(unref(auth).user?.user_id)}</span></p></div></div><div class="${ssrRenderClass([glassSurface.value, "flex items-center gap-3 rounded-xl border px-4 py-3"])}" data-v-9d832e13><div class="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-rich-orange/10" data-v-9d832e13>`);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:buildings-fill",
        class: "h-4 w-4 text-rich-orange"
      }, null, _parent));
      _push(`</div><div data-v-9d832e13><p class="text-[11px] font-bold uppercase tracking-widest text-rich-orange" data-v-9d832e13>Offices</p><p class="${ssrRenderClass([unref(isDark) ? "text-white" : "text-gray-900", "mt-0.5 text-xl font-bold"])}" data-v-9d832e13>${ssrInterpolate(offices.value.length)}</p></div></div></div>`);
      if (loading.value) {
        _push(`<div class="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3" data-v-9d832e13><!--[-->`);
        ssrRenderList(3, (n) => {
          _push(`<div class="${ssrRenderClass([unref(isDark) ? "bg-white/5 border-white/5" : "bg-gray-100 border-gray-200", "h-[420px] animate-pulse rounded-2xl border"])}" data-v-9d832e13></div>`);
        });
        _push(`<!--]--></div>`);
      } else if (offices.value.length) {
        _push(`<div class="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3" data-v-9d832e13><!--[-->`);
        ssrRenderList(offices.value, (office) => {
          _push(ssrRenderComponent(OfficeQrCard, {
            key: office.id,
            office,
            onEdit: openEdit,
            onDelete: handleDelete
          }, null, _parent));
        });
        _push(`<!--]--></div>`);
      } else {
        _push(`<div class="${ssrRenderClass([unref(isDark) ? "border-white/10 bg-white/[0.02]" : "border-gray-200 bg-gray-50", "flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed px-6 text-center"])}" data-v-9d832e13><div class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rich-orange/10" data-v-9d832e13>`);
        _push(ssrRenderComponent(_component_Icon, {
          name: "ph:buildings-fill",
          class: "h-8 w-8 text-rich-orange/60"
        }, null, _parent));
        _push(`</div><p class="${ssrRenderClass([unref(isDark) ? "text-gray-200" : "text-gray-800", "font-bold"])}" data-v-9d832e13>No offices registered yet</p><p class="${ssrRenderClass([mutedText.value, "mt-1 text-sm"])}" data-v-9d832e13> Register your first sub-branch to start routing documents. </p><button type="button" class="mt-5 inline-flex items-center gap-2 rounded-xl bg-rich-orange px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-rich-orange/25 transition hover:bg-[#e95a0b]" data-v-9d832e13>`);
        _push(ssrRenderComponent(_component_Icon, {
          name: "ph:plus-bold",
          class: "h-4 w-4"
        }, null, _parent));
        _push(` Register Office </button></div>`);
      }
      ssrRenderTeleport(_push, (_push2) => {
        if (drawerOpen.value) {
          _push2(`<div class="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm" data-v-9d832e13></div>`);
        } else {
          _push2(`<!---->`);
        }
        if (drawerOpen.value) {
          _push2(`<aside class="${ssrRenderClass([unref(isDark) ? "bg-[#111111] border-white/10" : "bg-white border-gray-200", "fixed bottom-0 right-0 top-0 z-[90] flex w-full max-w-lg flex-col border-l shadow-2xl"])}" data-v-9d832e13><header class="${ssrRenderClass([unref(isDark) ? "border-white/10" : "border-gray-200", "flex items-start justify-between gap-4 border-b px-6 py-5"])}" data-v-9d832e13><div data-v-9d832e13><div class="mb-1 h-0.5 w-8 rounded-full bg-rich-orange" data-v-9d832e13></div><p class="text-[10px] font-bold uppercase tracking-widest text-rich-orange" data-v-9d832e13>${ssrInterpolate(drawerMode.value === "create" ? "Register" : "Update")}</p><h2 class="${ssrRenderClass([unref(isDark) ? "text-white" : "text-gray-900", "mt-1 text-xl font-bold"])}" data-v-9d832e13>${ssrInterpolate(drawerMode.value === "create" ? "New Sub-Branch Office" : "Edit Office")}</h2></div><button type="button" class="${ssrRenderClass([unref(isDark) ? "text-gray-400 hover:bg-white/5" : "text-gray-400 hover:bg-gray-100", "inline-flex h-9 w-9 items-center justify-center rounded-xl transition"])}" data-v-9d832e13>`);
          _push2(ssrRenderComponent(_component_Icon, {
            name: "ph:x-bold",
            class: "h-4 w-4"
          }, null, _parent));
          _push2(`</button></header><div class="flex-1 space-y-5 overflow-y-auto px-6 py-6" data-v-9d832e13><label class="block" data-v-9d832e13><span class="${ssrRenderClass([unref(isDark) ? "text-gray-200" : "text-gray-800", "text-sm font-semibold"])}" data-v-9d832e13> Office Name <span class="text-red-500" data-v-9d832e13>*</span></span><input${ssrRenderAttr("value", form.name)} type="text" placeholder="e.g. Accounting Dept, HR Sub-Branch" class="${ssrRenderClass([inputClass.value, "mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-rich-orange"])}" required data-v-9d832e13></label><label class="block" data-v-9d832e13><span class="${ssrRenderClass([unref(isDark) ? "text-gray-200" : "text-gray-800", "text-sm font-semibold"])}" data-v-9d832e13> Office Code <span class="${ssrRenderClass([mutedText.value, "ml-1 text-[11px] font-normal"])}" data-v-9d832e13>(auto-generated if blank)</span></span><input${ssrRenderAttr("value", form.code)} type="text" placeholder="e.g. ACC-001" class="${ssrRenderClass([inputClass.value, "mt-2 w-full rounded-xl border px-4 py-3 font-mono text-sm uppercase outline-none transition focus:border-transparent focus:ring-2 focus:ring-rich-orange"])}" maxlength="20" data-v-9d832e13></label><div class="${ssrRenderClass([unref(isDark) ? "border-rich-orange/20 bg-rich-orange/5" : "border-orange-200 bg-orange-50", "rounded-xl border p-4"])}" data-v-9d832e13><div class="flex items-center gap-2 text-sm font-semibold text-rich-orange" data-v-9d832e13>`);
          _push2(ssrRenderComponent(_component_Icon, {
            name: "ph:shield-check-fill",
            class: "h-4 w-4"
          }, null, _parent));
          _push2(` Data Isolation Active </div><p class="${ssrRenderClass([mutedText.value, "mt-2 text-xs leading-relaxed"])}" data-v-9d832e13> Registered under <strong data-v-9d832e13>org_id ${ssrInterpolate(unref(auth).user?.org_id)}</strong> and assigned exclusively to your account <strong data-v-9d832e13>(user ${ssrInterpolate(unref(auth).user?.user_id)})</strong>. No cross-tenant data is accessible. </p></div>`);
          if (drawerMode.value === "create" && form.name) {
            _push2(`<div class="${ssrRenderClass([unref(isDark) ? "border-white/10 bg-white/[0.03]" : "border-gray-200 bg-gray-50", "flex flex-col items-center gap-3 rounded-xl border p-5"])}" data-v-9d832e13><p class="${ssrRenderClass([mutedText.value, "text-xs font-semibold uppercase tracking-wider"])}" data-v-9d832e13> QR Preview (generated after save) </p><div class="flex h-28 w-28 items-center justify-center rounded-xl border border-gray-100 bg-white shadow-sm" data-v-9d832e13>`);
            _push2(ssrRenderComponent(_component_Icon, {
              name: "ph:qr-code",
              class: "h-14 w-14 text-gray-300"
            }, null, _parent));
            _push2(`</div><p class="text-center font-mono text-[10px] text-gray-400" data-v-9d832e13>flowvision://office/[NEW_ID]</p></div>`);
          } else {
            _push2(`<!---->`);
          }
          _push2(`</div><footer class="${ssrRenderClass([unref(isDark) ? "border-white/10" : "border-gray-200", "flex items-center justify-end gap-3 border-t px-6 py-4"])}" data-v-9d832e13><button type="button" class="${ssrRenderClass([unref(isDark) ? "border-white/10 text-gray-300 hover:bg-white/5" : "border-gray-200 text-gray-700 hover:bg-gray-50", "rounded-xl border px-4 py-2.5 text-sm font-semibold transition"])}" data-v-9d832e13> Cancel </button><button type="button"${ssrIncludeBooleanAttr(!form.name || saving.value) ? " disabled" : ""} class="inline-flex items-center gap-2 rounded-xl bg-rich-orange px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rich-orange/25 transition-all hover:bg-[#e95a0b] disabled:cursor-not-allowed disabled:opacity-50" data-v-9d832e13>`);
          if (saving.value) {
            _push2(ssrRenderComponent(_component_Icon, {
              name: "ph:spinner-gap",
              class: "h-4 w-4 animate-spin"
            }, null, _parent));
          } else {
            _push2(`<!---->`);
          }
          _push2(` ${ssrInterpolate(saving.value ? "Saving…" : drawerMode.value === "create" ? "Register Office" : "Save Changes")}</button></footer></aside>`);
        } else {
          _push2(`<!---->`);
        }
      }, "body", false, _parent);
      _push(`</div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/employee/offices/index.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const index = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-9d832e13"]]);

export { index as default };
//# sourceMappingURL=index-BlzLeFVd.mjs.map
