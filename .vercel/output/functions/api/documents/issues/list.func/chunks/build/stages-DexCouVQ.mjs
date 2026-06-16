import { defineComponent, ref, reactive, computed, mergeProps, unref, useSSRContext } from 'vue';
import { ssrRenderComponent, ssrRenderAttrs, ssrRenderClass, ssrRenderList, ssrInterpolate, ssrRenderTeleport, ssrRenderAttr, ssrIncludeBooleanAttr, ssrLooseContain, ssrLooseEqual } from 'vue/server-renderer';
import __nuxt_component_0 from './index-BYCkTpU3.mjs';
import { _ as _export_sfc, a as useAuthStore, u as useTheme } from './server.mjs';
import { u as useOfficeStore } from './office-DcDivY2T.mjs';
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

const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "EmployeeStagesView",
  __ssrInlineRender: true,
  setup(__props) {
    useAuthStore();
    const officeStore = useOfficeStore();
    const { isDark } = useTheme();
    const stages = ref([]);
    const stageSteps = ref({});
    const myOffices = ref([]);
    const loading = ref(false);
    const creating = ref(false);
    const drawerOpen = ref(false);
    const isDropTarget = ref(null);
    const isDropZoneActive = ref(false);
    ref(null);
    ref(null);
    const activeOfficeFilter = ref(null);
    const scopeMode = ref("all");
    const scopeOptions = [
      { label: "All", value: "all" },
      { label: "Global", value: "global" },
      { label: "Local", value: "local" }
    ];
    const stageForm = reactive({
      name: "",
      office_id: ""
    });
    const selectedCheckpoints = ref([]);
    const allOffices = computed(() => officeStore.offices);
    const filteredStages = computed(() => {
      let list = [...stages.value];
      if (scopeMode.value === "global") list = list.filter((s) => !s.office_id);
      if (scopeMode.value === "local") list = list.filter((s) => !!s.office_id);
      if (activeOfficeFilter.value) {
        list = list.filter((s) => s.office_id && String(s.office_id) === activeOfficeFilter.value);
      }
      return list;
    });
    const glassSurface = computed(
      () => isDark.value ? "border-white/10 bg-white/[0.04]" : "border-gray-200 bg-white"
    );
    const cardSurface = computed(
      () => isDark.value ? "border-white/10 bg-[#1A1A1A] shadow-xl shadow-black/30" : "border-gray-200 bg-white shadow-card"
    );
    const borderClass = computed(() => isDark.value ? "border-white/5" : "border-gray-100");
    const mutedText = computed(() => isDark.value ? "text-gray-400" : "text-gray-500");
    const inputClass = computed(
      () => isDark.value ? "border-white/10 bg-rich-black text-white placeholder:text-gray-500" : "border-gray-200 bg-white text-gray-900 placeholder:text-gray-400"
    );
    const getSteps = (stageId) => stageSteps.value[stageId] ?? [];
    const getStepCount = (stageId) => getSteps(stageId).length;
    const getOfficeName = (id) => allOffices.value.find((o) => String(o.id) === String(id))?.name || "Unknown office";
    const isMyOffice = (id) => myOffices.value.some((o) => String(o.id) === String(id));
    return (_ctx, _push, _parent, _attrs) => {
      const _component_Icon = __nuxt_component_0;
      _push(`<section${ssrRenderAttrs(mergeProps({
        class: ["w-full space-y-6 pb-24 lg:pb-8", unref(isDark) ? "text-white" : "text-gray-900"]
      }, _attrs))} data-v-d8a25401><div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between" data-v-d8a25401><div data-v-d8a25401><div class="mb-3 h-1 w-14 rounded-full bg-rich-orange" data-v-d8a25401></div><h1 class="text-2xl font-bold tracking-tight sm:text-3xl" data-v-d8a25401>Local Route Builder</h1><p class="${ssrRenderClass([mutedText.value, "mt-1 text-sm"])}" data-v-d8a25401> Build custom routing sequences scoped to your sub-office branches </p></div><div class="flex items-center gap-2" data-v-d8a25401><div class="${ssrRenderClass([glassSurface.value, "flex items-center rounded-xl border p-1 text-xs font-semibold"])}" data-v-d8a25401><!--[-->`);
      ssrRenderList(scopeOptions, (opt) => {
        _push(`<button type="button" class="${ssrRenderClass([scopeMode.value === opt.value ? "bg-rich-orange text-white shadow-sm" : unref(isDark) ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-800", "rounded-lg px-3 py-1.5 transition-all"])}" data-v-d8a25401>${ssrInterpolate(opt.label)}</button>`);
      });
      _push(`<!--]--></div><button type="button" class="inline-flex min-h-11 items-center gap-2 rounded-xl bg-rich-orange px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rich-orange/25 transition-all duration-200 hover:bg-[#e95a0b] active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-rich-orange/50" data-v-d8a25401>`);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:plus-bold",
        class: "h-4 w-4"
      }, null, _parent));
      _push(` Create Route </button></div></div><div class="flex flex-wrap items-center gap-3" data-v-d8a25401><div class="${ssrRenderClass([glassSurface.value, "inline-flex items-center gap-2.5 rounded-xl border px-4 py-2 text-sm backdrop-blur-sm"])}" data-v-d8a25401>`);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:shield-check-fill",
        class: "h-4 w-4 text-rich-orange"
      }, null, _parent));
      _push(`<span class="${ssrRenderClass(mutedText.value)}" data-v-d8a25401> Showing <span class="${ssrRenderClass([unref(isDark) ? "text-gray-200" : "text-gray-700", "font-semibold"])}" data-v-d8a25401>${ssrInterpolate(scopeMode.value === "global" ? "org-wide global" : scopeMode.value === "local" ? "my local" : "all")}</span> routes · ${ssrInterpolate(filteredStages.value.length)} template${ssrInterpolate(filteredStages.value.length === 1 ? "" : "s")}</span></div><div class="flex flex-wrap gap-2" data-v-d8a25401><!--[-->`);
      ssrRenderList(myOffices.value, (office) => {
        _push(`<button type="button" class="${ssrRenderClass([activeOfficeFilter.value === String(office.id) ? "border-rich-orange/50 bg-rich-orange/10 text-rich-orange" : unref(isDark) ? "border-white/10 text-gray-400 hover:border-rich-orange/30 hover:text-rich-orange" : "border-gray-200 text-gray-500 hover:border-rich-orange/40 hover:text-rich-orange", "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition"])}" data-v-d8a25401>`);
        _push(ssrRenderComponent(_component_Icon, {
          name: "ph:buildings-fill",
          class: "h-3 w-3"
        }, null, _parent));
        _push(` ${ssrInterpolate(office.name)}</button>`);
      });
      _push(`<!--]--></div></div>`);
      if (loading.value) {
        _push(`<div class="space-y-4" data-v-d8a25401><!--[-->`);
        ssrRenderList(3, (n) => {
          _push(`<div class="${ssrRenderClass([unref(isDark) ? "bg-white/5 border-white/5" : "bg-gray-100 border-gray-200", "h-32 animate-pulse rounded-2xl border"])}" data-v-d8a25401></div>`);
        });
        _push(`<!--]--></div>`);
      } else if (filteredStages.value.length) {
        _push(`<div class="space-y-4" data-v-d8a25401><!--[-->`);
        ssrRenderList(filteredStages.value, (stage) => {
          _push(`<article class="${ssrRenderClass([[cardSurface.value, isDropTarget.value === stage.stage_id ? "ring-2 ring-rich-orange/50 border-rich-orange" : ""], "overflow-hidden rounded-2xl border shadow-card backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"])}" data-v-d8a25401><header class="${ssrRenderClass([borderClass.value, "flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between"])}" data-v-d8a25401><div class="flex items-center gap-3" data-v-d8a25401><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-rich-orange text-sm font-bold text-white shadow-sm shadow-rich-orange/30" data-v-d8a25401>${ssrInterpolate(stage.step_number)}</div><div data-v-d8a25401><div class="flex items-center gap-2" data-v-d8a25401><h2 class="text-base font-bold" data-v-d8a25401>${ssrInterpolate(stage.name)}</h2><span class="${ssrRenderClass([stage.scope === "local" ? "bg-rich-orange/15 text-rich-orange" : unref(isDark) ? "bg-white/5 text-gray-400" : "bg-gray-100 text-gray-500", "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"])}" data-v-d8a25401>${ssrInterpolate(stage.scope === "local" ? stage.office_name || "Local" : "Global")}</span></div><p class="${ssrRenderClass([mutedText.value, "text-xs"])}" data-v-d8a25401>${ssrInterpolate(getStepCount(stage.stage_id))} checkpoint${ssrInterpolate(getStepCount(stage.stage_id) === 1 ? "" : "s")} mapped </p></div></div><div class="flex items-center gap-1" data-v-d8a25401>`);
          if (stage.scope === "local") {
            _push(`<button type="button" class="${ssrRenderClass([mutedText.value, "inline-flex h-9 w-9 items-center justify-center rounded-xl transition hover:bg-rich-orange/10 hover:text-rich-orange"])}" title="Move up" data-v-d8a25401>`);
            _push(ssrRenderComponent(_component_Icon, {
              name: "ph:arrow-up-bold",
              class: "h-4 w-4"
            }, null, _parent));
            _push(`</button>`);
          } else {
            _push(`<!---->`);
          }
          if (stage.scope === "local") {
            _push(`<button type="button" class="${ssrRenderClass([mutedText.value, "inline-flex h-9 w-9 items-center justify-center rounded-xl transition hover:bg-rich-orange/10 hover:text-rich-orange"])}" title="Move down" data-v-d8a25401>`);
            _push(ssrRenderComponent(_component_Icon, {
              name: "ph:arrow-down-bold",
              class: "h-4 w-4"
            }, null, _parent));
            _push(`</button>`);
          } else {
            _push(`<!---->`);
          }
          if (stage.scope === "local") {
            _push(`<button type="button" class="inline-flex h-9 w-9 items-center justify-center rounded-xl text-red-500 transition hover:bg-red-500/10" title="Delete route" data-v-d8a25401>`);
            _push(ssrRenderComponent(_component_Icon, {
              name: "ph:trash-bold",
              class: "h-4 w-4"
            }, null, _parent));
            _push(`</button>`);
          } else {
            _push(`<!---->`);
          }
          _push(`</div></header><div class="p-5" data-v-d8a25401><div class="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-rich-orange" data-v-d8a25401><span class="h-px flex-1 bg-rich-orange/20" data-v-d8a25401></span> Flow Path <span class="h-px flex-1 bg-rich-orange/20" data-v-d8a25401></span></div><div class="flex flex-wrap items-center gap-2" data-v-d8a25401><!--[-->`);
          ssrRenderList(getSteps(stage.stage_id), (step, i) => {
            _push(`<!--[--><div class="${ssrRenderClass([unref(isDark) ? "border-white/10 bg-white/[0.04]" : "border-gray-200 bg-gray-50", "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition"])}" data-v-d8a25401><div class="flex h-6 w-6 flex-none items-center justify-center rounded-lg bg-rich-orange text-[10px] font-bold text-white" data-v-d8a25401>${ssrInterpolate(step.step_number)}</div><span class="font-semibold" data-v-d8a25401>${ssrInterpolate(getOfficeName(step.office_id))}</span>`);
            if (stage.scope === "local") {
              _push(`<button type="button" class="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-red-500 transition hover:bg-red-500/10" data-v-d8a25401>`);
              _push(ssrRenderComponent(_component_Icon, {
                name: "ph:x-bold",
                class: "h-3 w-3"
              }, null, _parent));
              _push(`</button>`);
            } else {
              _push(`<!---->`);
            }
            _push(`</div>`);
            if (i < getSteps(stage.stage_id).length - 1) {
              _push(ssrRenderComponent(_component_Icon, {
                name: "ph:arrow-right-bold",
                class: "h-3.5 w-3.5 flex-none text-rich-orange/50"
              }, null, _parent));
            } else {
              _push(`<!---->`);
            }
            _push(`<!--]-->`);
          });
          _push(`<!--]-->`);
          if (!getSteps(stage.stage_id).length) {
            _push(`<div class="${ssrRenderClass([[unref(isDark) ? "border-white/10" : "border-gray-200", mutedText.value], "rounded-xl border border-dashed p-4 text-center text-sm w-full"])}" data-v-d8a25401> Drag an office here or use &quot;Add to Route&quot; from the sidebar. </div>`);
          } else {
            _push(`<!---->`);
          }
          _push(`</div></div></article>`);
        });
        _push(`<!--]--></div>`);
      } else {
        _push(`<div class="${ssrRenderClass([unref(isDark) ? "border-white/10 bg-white/[0.02]" : "border-gray-200 bg-gray-50", "flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed px-6 text-center"])}" data-v-d8a25401><div class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rich-orange/10" data-v-d8a25401>`);
        _push(ssrRenderComponent(_component_Icon, {
          name: "ph:path-bold",
          class: "h-8 w-8 text-rich-orange/60"
        }, null, _parent));
        _push(`</div><p class="${ssrRenderClass([unref(isDark) ? "text-gray-200" : "text-gray-800", "font-bold"])}" data-v-d8a25401>No route templates</p><p class="${ssrRenderClass([mutedText.value, "mt-1 text-sm"])}" data-v-d8a25401>${ssrInterpolate(scopeMode.value === "local" ? "Create a local route for one of your sub-offices." : "No routes exist yet.")}</p><button type="button" class="mt-5 inline-flex items-center gap-2 rounded-xl bg-rich-orange px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-rich-orange/25 transition hover:bg-[#e95a0b]" data-v-d8a25401>`);
        _push(ssrRenderComponent(_component_Icon, {
          name: "ph:plus-bold",
          class: "h-4 w-4"
        }, null, _parent));
        _push(` Create Route </button></div>`);
      }
      ssrRenderTeleport(_push, (_push2) => {
        if (drawerOpen.value) {
          _push2(`<div class="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm" data-v-d8a25401></div>`);
        } else {
          _push2(`<!---->`);
        }
        if (drawerOpen.value) {
          _push2(`<form class="${ssrRenderClass([unref(isDark) ? "bg-[#111111]/95 backdrop-blur-xl border-white/10" : "bg-white border-gray-200", "fixed bottom-0 right-0 top-0 z-[90] flex w-full max-w-xl flex-col border-l shadow-2xl"])}" data-v-d8a25401><header class="${ssrRenderClass([unref(isDark) ? "border-white/10" : "border-gray-200", "flex items-start justify-between gap-4 border-b px-6 py-5"])}" data-v-d8a25401><div data-v-d8a25401><div class="mb-1 h-0.5 w-8 rounded-full bg-rich-orange" data-v-d8a25401></div><p class="text-[10px] font-bold uppercase tracking-widest text-rich-orange" data-v-d8a25401>Route Template</p><h2 class="${ssrRenderClass([unref(isDark) ? "text-white" : "text-gray-900", "mt-1 text-xl font-bold"])}" data-v-d8a25401>Create Local Route</h2><p class="${ssrRenderClass([mutedText.value, "mt-0.5 text-xs"])}" data-v-d8a25401>Scoped to your selected office branch</p></div><button type="button" class="${ssrRenderClass([unref(isDark) ? "text-gray-400 hover:bg-white/5" : "text-gray-400 hover:bg-gray-100", "inline-flex h-9 w-9 items-center justify-center rounded-xl transition"])}" data-v-d8a25401>`);
          _push2(ssrRenderComponent(_component_Icon, {
            name: "ph:x-bold",
            class: "h-4 w-4"
          }, null, _parent));
          _push2(`</button></header><div class="flex-1 space-y-6 overflow-y-auto px-6 py-6" data-v-d8a25401><label class="block" data-v-d8a25401><span class="${ssrRenderClass([unref(isDark) ? "text-gray-200" : "text-gray-800", "text-sm font-semibold"])}" data-v-d8a25401> Route Name <span class="text-red-500" data-v-d8a25401>*</span></span><input${ssrRenderAttr("value", stageForm.name)} type="text" placeholder="e.g. HR Document Review" class="${ssrRenderClass([inputClass.value, "mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-rich-orange"])}" required data-v-d8a25401></label><label class="block" data-v-d8a25401><span class="${ssrRenderClass([unref(isDark) ? "text-gray-200" : "text-gray-800", "text-sm font-semibold"])}" data-v-d8a25401> Owning Office <span class="text-red-500" data-v-d8a25401>*</span></span><p class="${ssrRenderClass([mutedText.value, "mt-0.5 text-xs"])}" data-v-d8a25401>This route will be scoped to the selected sub-branch</p><select class="${ssrRenderClass([inputClass.value, "mt-2 w-full rounded-xl border px-3 py-3 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-rich-orange"])}" required data-v-d8a25401><option value="" data-v-d8a25401${ssrIncludeBooleanAttr(Array.isArray(stageForm.office_id) ? ssrLooseContain(stageForm.office_id, "") : ssrLooseEqual(stageForm.office_id, "")) ? " selected" : ""}>Select your office…</option><!--[-->`);
          ssrRenderList(myOffices.value, (o) => {
            _push2(`<option${ssrRenderAttr("value", String(o.id))} data-v-d8a25401${ssrIncludeBooleanAttr(Array.isArray(stageForm.office_id) ? ssrLooseContain(stageForm.office_id, String(o.id)) : ssrLooseEqual(stageForm.office_id, String(o.id))) ? " selected" : ""}>${ssrInterpolate(o.name)}</option>`);
          });
          _push2(`<!--]--></select></label><section data-v-d8a25401><div class="mb-3 flex items-center justify-between gap-3" data-v-d8a25401><div data-v-d8a25401><h3 class="${ssrRenderClass([unref(isDark) ? "text-gray-200" : "text-gray-800", "text-sm font-semibold"])}" data-v-d8a25401>Available Checkpoints</h3><p class="${ssrRenderClass([mutedText.value, "mt-0.5 text-xs"])}" data-v-d8a25401>Click or drag offices to build the sequence</p></div>`);
          _push2(ssrRenderComponent(_component_Icon, {
            name: "ph:buildings",
            class: "h-4 w-4 text-rich-orange"
          }, null, _parent));
          _push2(`</div><div class="space-y-2" data-v-d8a25401><!--[-->`);
          ssrRenderList(allOffices.value, (office) => {
            _push2(`<button type="button" draggable="true" class="${ssrRenderClass([unref(isDark) ? "border-white/10 bg-white/[0.03]" : "border-gray-200 bg-gray-50", "flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition hover:border-rich-orange/50 hover:bg-rich-orange/5"])}" data-v-d8a25401><div class="min-w-0" data-v-d8a25401><span class="truncate font-semibold" data-v-d8a25401>${ssrInterpolate(office.name)}</span>`);
            if (isMyOffice(office.id)) {
              _push2(`<span class="ml-2 rounded-full bg-rich-orange/10 px-1.5 py-0.5 text-[10px] font-bold text-rich-orange" data-v-d8a25401>Mine</span>`);
            } else {
              _push2(`<!---->`);
            }
            _push2(`</div>`);
            _push2(ssrRenderComponent(_component_Icon, {
              name: "ph:plus-circle",
              class: "h-4 w-4 flex-none text-rich-orange"
            }, null, _parent));
            _push2(`</button>`);
          });
          _push2(`<!--]-->`);
          if (!allOffices.value.length) {
            _push2(`<div class="${ssrRenderClass([[unref(isDark) ? "border-white/10" : "border-gray-200", mutedText.value], "rounded-xl border border-dashed p-4 text-center text-xs"])}" data-v-d8a25401> No offices found in your organisation. </div>`);
          } else {
            _push2(`<!---->`);
          }
          _push2(`</div></section><section data-v-d8a25401><div class="mb-3 flex items-center justify-between gap-3" data-v-d8a25401><div data-v-d8a25401><h3 class="${ssrRenderClass([unref(isDark) ? "text-gray-200" : "text-gray-800", "text-sm font-semibold"])}" data-v-d8a25401>Route Sequence</h3><p class="${ssrRenderClass([mutedText.value, "mt-0.5 text-xs"])}" data-v-d8a25401>${ssrInterpolate(selectedCheckpoints.value.length)} checkpoint${ssrInterpolate(selectedCheckpoints.value.length === 1 ? "" : "s")} in order </p></div>`);
          _push2(ssrRenderComponent(_component_Icon, {
            name: "ph:path-bold",
            class: "h-4 w-4 text-rich-orange"
          }, null, _parent));
          _push2(`</div><div class="${ssrRenderClass([[
            unref(isDark) ? "border-white/10 bg-white/[0.02]" : "border-gray-200 bg-gray-50",
            isDropZoneActive.value ? "border-rich-orange ring-2 ring-rich-orange/30 bg-rich-orange/5" : ""
          ], "min-h-32 space-y-2 rounded-xl border p-3 transition-all"])}" data-v-d8a25401><!--[-->`);
          ssrRenderList(selectedCheckpoints.value, (cp, i) => {
            _push2(`<div draggable="true" class="${ssrRenderClass([unref(isDark) ? "border-white/10 bg-[#1A1A1A]" : "border-gray-200 bg-white", "flex items-center gap-3 rounded-xl border p-3 transition"])}" data-v-d8a25401>`);
            _push2(ssrRenderComponent(_component_Icon, {
              name: "ph:dots-six-vertical-bold",
              class: "h-4 w-4 flex-none cursor-grab text-rich-orange"
            }, null, _parent));
            _push2(`<div class="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-rich-orange text-[11px] font-bold text-white" data-v-d8a25401>${ssrInterpolate(i + 1)}</div><span class="flex-1 truncate text-sm font-semibold" data-v-d8a25401>${ssrInterpolate(cp.name)}</span><div class="flex items-center gap-1" data-v-d8a25401><button type="button" class="inline-flex h-7 w-7 items-center justify-center rounded-lg transition hover:bg-rich-orange/10 hover:text-rich-orange"${ssrIncludeBooleanAttr(i === 0) ? " disabled" : ""} data-v-d8a25401>`);
            _push2(ssrRenderComponent(_component_Icon, {
              name: "ph:caret-up-bold",
              class: "h-3.5 w-3.5"
            }, null, _parent));
            _push2(`</button><button type="button" class="inline-flex h-7 w-7 items-center justify-center rounded-lg transition hover:bg-rich-orange/10 hover:text-rich-orange"${ssrIncludeBooleanAttr(i === selectedCheckpoints.value.length - 1) ? " disabled" : ""} data-v-d8a25401>`);
            _push2(ssrRenderComponent(_component_Icon, {
              name: "ph:caret-down-bold",
              class: "h-3.5 w-3.5"
            }, null, _parent));
            _push2(`</button><button type="button" class="inline-flex h-7 w-7 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-500/10" data-v-d8a25401>`);
            _push2(ssrRenderComponent(_component_Icon, {
              name: "ph:x-bold",
              class: "h-3.5 w-3.5"
            }, null, _parent));
            _push2(`</button></div></div>`);
          });
          _push2(`<!--]-->`);
          if (!selectedCheckpoints.value.length) {
            _push2(`<div class="${ssrRenderClass([[unref(isDark) ? "border-white/10" : "border-gray-200", mutedText.value], "rounded-xl border border-dashed p-6 text-center text-xs"])}" data-v-d8a25401> Drop or click offices above to build the route. </div>`);
          } else {
            _push2(`<!---->`);
          }
          _push2(`</div></section></div><footer class="${ssrRenderClass([unref(isDark) ? "border-white/10" : "border-gray-200", "flex justify-end gap-3 border-t px-6 py-4"])}" data-v-d8a25401><button type="button" class="${ssrRenderClass([unref(isDark) ? "border-white/10 text-gray-300 hover:bg-white/5" : "border-gray-200 text-gray-700 hover:bg-gray-50", "rounded-xl border px-4 py-2.5 text-sm font-semibold transition"])}" data-v-d8a25401> Cancel </button><button type="submit"${ssrIncludeBooleanAttr(!stageForm.name || !stageForm.office_id || creating.value) ? " disabled" : ""} class="inline-flex items-center gap-2 rounded-xl bg-rich-orange px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rich-orange/25 transition hover:bg-[#e95a0b] disabled:cursor-not-allowed disabled:opacity-50" data-v-d8a25401>`);
          if (creating.value) {
            _push2(ssrRenderComponent(_component_Icon, {
              name: "ph:spinner-gap",
              class: "h-4 w-4 animate-spin"
            }, null, _parent));
          } else {
            _push2(`<!---->`);
          }
          _push2(` ${ssrInterpolate(creating.value ? "Creating…" : "Create Route")}</button></footer></form>`);
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
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/employee/EmployeeStagesView.vue");
  return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
const EmployeeStagesView = /* @__PURE__ */ Object.assign(_export_sfc(_sfc_main$1, [["__scopeId", "data-v-d8a25401"]]), { __name: "EmployeeStagesView" });
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "stages",
  __ssrInlineRender: true,
  setup(__props) {
    return (_ctx, _push, _parent, _attrs) => {
      _push(ssrRenderComponent(EmployeeStagesView, _attrs, null, _parent));
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/employee/stages.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=stages-DexCouVQ.mjs.map
