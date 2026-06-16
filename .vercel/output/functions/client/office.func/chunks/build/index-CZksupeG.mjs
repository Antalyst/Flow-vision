import { defineComponent, ref, watch, computed, mergeProps, unref, reactive, withCtx, createTextVNode, nextTick, useSSRContext } from 'vue';
import { ssrRenderComponent, ssrRenderAttrs, ssrRenderClass, ssrInterpolate, ssrRenderStyle, ssrRenderList, ssrRenderAttr, ssrIncludeBooleanAttr, ssrLooseContain, ssrLooseEqual, ssrRenderTeleport } from 'vue/server-renderer';
import __nuxt_component_0 from './index-BYCkTpU3.mjs';
import { _ as _export_sfc, a as useAuthStore, u as useTheme, b as useNuxtApp } from './server.mjs';
import { u as useStageStore } from './stage-DmVB2S1_.mjs';
import { _ as __nuxt_component_3 } from './nuxt-link-BkIUUJ0e.mjs';
import { D as DocumentLivePreview, a as DocumentPrintCanvas } from './documentLivePreview-B-QzPkTO.mjs';
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
import 'pdf-lib';
import 'qrcode';
import 'docx-preview';

const _sfc_main$3 = /* @__PURE__ */ defineComponent({
  __name: "EmployeeDocUploadModal",
  __ssrInlineRender: true,
  props: {
    isOpen: { type: Boolean },
    offices: {},
    scope: {}
  },
  emits: ["close", "uploaded"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const stageStore = useStageStore();
    const officeStore = useOfficeStore();
    useAuthStore();
    const { isDark } = useTheme();
    const routeTab = ref("global");
    const routeTabs = [
      { value: "global", label: "Global", icon: "ph:globe-hemisphere-west-fill" },
      { value: "local", label: "Local", icon: "ph:buildings-fill" }
    ];
    ref(null);
    const selectedFile = ref(null);
    const selectedOriginOfficeId = ref("");
    const selectedStageId = ref("");
    const selectedStrategy = ref("embedded");
    const selectedQrSize = ref(120);
    const currentTrackingId = ref("");
    const isDragging = ref(false);
    const errorMessage = ref("");
    const uploading = ref(false);
    const aiAnalysis = ref(null);
    const printQrDataUrl = ref("");
    const allStages = computed(() => stageStore.stages);
    const visibleRoutes = computed(() => {
      if (routeTab.value === "global") {
        return allStages.value.filter((s) => !s.office_id);
      }
      if (!selectedOriginOfficeId.value) {
        const myOfficeIds = props.offices.map((o) => String(o.id));
        return allStages.value.filter((s) => s.office_id && myOfficeIds.includes(String(s.office_id)));
      }
      return allStages.value.filter((s) => s.office_id && String(s.office_id) === selectedOriginOfficeId.value);
    });
    const resolveOfficeName = (officeId) => {
      if (officeId == null) return "Unknown Office";
      const fromStore = officeStore.offices.find((o) => String(o.id) === String(officeId));
      if (fromStore) return fromStore.name;
      const fromProps = props.offices.find((o) => String(o.id) === String(officeId));
      return fromProps?.name || `Office ${String(officeId).slice(0, 8)}`;
    };
    const selectedOriginOfficeName = computed(() => {
      if (!selectedOriginOfficeId.value) return "";
      const found = props.offices.find((o) => String(o.id) === selectedOriginOfficeId.value);
      return found?.name || "";
    });
    const getRouteSteps = (stageId) => {
      const seq = stageStore.stageOfficeSequences[stageId] || [];
      return [...seq].sort((a, b) => a.step_number - b.step_number);
    };
    const getRouteStops = (stageId) => getRouteSteps(stageId).slice(0, 3).map((s) => resolveOfficeName(s.office_id));
    const selectedTimelineSteps = computed(() => {
      if (!selectedStageId.value) return [];
      return getRouteSteps(selectedStageId.value);
    });
    const selectedRouteName = computed(() => {
      if (!selectedStageId.value) return "";
      return allStages.value.find((s) => String(s.stage_id) === selectedStageId.value)?.name || "";
    });
    const finalDestinationName = computed(() => {
      const steps = selectedTimelineSteps.value;
      if (!steps.length) return "—";
      return resolveOfficeName(steps[steps.length - 1].office_id);
    });
    const canSubmit = computed(
      () => !!selectedFile.value && !!selectedOriginOfficeId.value && !!selectedStageId.value && !uploading.value
    );
    const surfaceClass = computed(
      () => isDark.value ? "bg-[#111111]/95 backdrop-blur-xl border-white/10" : "border-gray-200 bg-white"
    );
    const borderClass = computed(() => isDark.value ? "border-white/10" : "border-gray-200");
    const mutedClass = computed(() => isDark.value ? "text-gray-400" : "text-gray-500");
    const headingClass = computed(() => isDark.value ? "text-white" : "text-gray-900");
    const inputClass = computed(
      () => isDark.value ? "border-white/10 bg-rich-black text-white placeholder:text-gray-500" : "border-gray-200 bg-white text-gray-900 placeholder:text-gray-400"
    );
    const optionStyle = computed(
      () => isDark.value ? { backgroundColor: "#1A1A1A", color: "#ffffff" } : { backgroundColor: "#ffffff", color: "#121212" }
    );
    watch(
      () => props.isOpen,
      (open) => {
        if (!open) return;
        if (!stageStore.stages.length) stageStore.fetchStages();
        if (!officeStore.offices.length) officeStore.fetchOffices();
      }
    );
    const formatSize = (bytes) => {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };
    return (_ctx, _push, _parent, _attrs) => {
      const _component_Icon = __nuxt_component_0;
      const _component_NuxtLink = __nuxt_component_3;
      ssrRenderTeleport(_push, (_push2) => {
        if (__props.isOpen) {
          _push2(`<div class="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm" data-v-53ca7b25></div>`);
        } else {
          _push2(`<!---->`);
        }
        if (__props.isOpen) {
          _push2(`<form class="${ssrRenderClass([surfaceClass.value, "fixed bottom-0 right-0 top-0 z-[90] flex w-full max-w-5xl flex-col border-l shadow-2xl"])}" data-v-53ca7b25><header class="${ssrRenderClass([borderClass.value, "flex items-start justify-between gap-4 border-b px-6 py-5"])}" data-v-53ca7b25><div data-v-53ca7b25><div class="mb-1 h-0.5 w-8 rounded-full bg-rich-orange" data-v-53ca7b25></div><p class="text-[10px] font-bold uppercase tracking-widest text-rich-orange" data-v-53ca7b25>${ssrInterpolate(__props.scope === "LOCAL" ? "Office Document" : "Organisation Document")}</p><h2 class="${ssrRenderClass([headingClass.value, "mt-1 text-xl font-bold"])}" data-v-53ca7b25>Upload &amp; Analyze</h2><p class="${ssrRenderClass([mutedClass.value, "mt-0.5 text-xs"])}" data-v-53ca7b25> AI-analyzed, then split-stored across Supabase and blob storage. </p></div><button type="button" class="inline-flex h-10 w-10 items-center justify-center rounded-xl transition hover:bg-rich-orange/10 hover:text-rich-orange" aria-label="Close" data-v-53ca7b25>`);
          _push2(ssrRenderComponent(_component_Icon, {
            name: "ph:x-bold",
            class: ["h-4 w-4", headingClass.value]
          }, null, _parent));
          _push2(`</button></header><div class="flex flex-1 flex-col gap-5 overflow-hidden px-6 py-5 lg:flex-row" data-v-53ca7b25><div class="w-full overflow-y-auto lg:w-7/12" data-v-53ca7b25>`);
          _push2(ssrRenderComponent(DocumentLivePreview, {
            file: selectedFile.value,
            "tracking-id": currentTrackingId.value,
            "print-strategy": selectedStrategy.value
          }, null, _parent));
          _push2(`</div><div class="w-full space-y-5 overflow-y-auto lg:w-5/12" data-v-53ca7b25><div data-v-53ca7b25><label class="block" data-v-53ca7b25><span class="text-sm font-semibold text-rich-orange" data-v-53ca7b25> Origin Office <span class="text-red-500" data-v-53ca7b25>*</span></span><p class="${ssrRenderClass([mutedClass.value, "mt-0.5 text-[11px]"])}" data-v-53ca7b25> The physical branch where this hard-copy originates. </p><select class="${ssrRenderClass([inputClass.value, "mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-rich-orange"])}" required data-v-53ca7b25><option value="" style="${ssrRenderStyle(optionStyle.value)}" data-v-53ca7b25${ssrIncludeBooleanAttr(Array.isArray(selectedOriginOfficeId.value) ? ssrLooseContain(selectedOriginOfficeId.value, "") : ssrLooseEqual(selectedOriginOfficeId.value, "")) ? " selected" : ""}>Select your office…</option><!--[-->`);
          ssrRenderList(__props.offices, (office) => {
            _push2(`<option${ssrRenderAttr("value", String(office.id))} style="${ssrRenderStyle(optionStyle.value)}" data-v-53ca7b25${ssrIncludeBooleanAttr(Array.isArray(selectedOriginOfficeId.value) ? ssrLooseContain(selectedOriginOfficeId.value, String(office.id)) : ssrLooseEqual(selectedOriginOfficeId.value, String(office.id))) ? " selected" : ""}>${ssrInterpolate(office.name)}</option>`);
          });
          _push2(`<!--]--></select>`);
          if (!__props.offices.length) {
            _push2(`<p class="mt-1.5 text-xs text-amber-500" data-v-53ca7b25> No offices assigned. Register a sub-office first in My Offices. </p>`);
          } else {
            _push2(`<!---->`);
          }
          _push2(`</label></div><label class="${ssrRenderClass([isDragging.value ? "border-rich-orange bg-rich-orange/10" : borderClass.value, "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-7 text-center transition"])}" data-v-53ca7b25>`);
          _push2(ssrRenderComponent(_component_Icon, {
            name: "ph:cloud-arrow-up",
            class: "h-9 w-9 text-rich-orange"
          }, null, _parent));
          _push2(`<div data-v-53ca7b25><p class="${ssrRenderClass([headingClass.value, "text-sm font-semibold"])}" data-v-53ca7b25>${ssrInterpolate(selectedFile.value ? selectedFile.value.name : "Drop a file here or click to browse")}</p><p class="${ssrRenderClass([mutedClass.value, "mt-1 text-xs"])}" data-v-53ca7b25>PDF, DOCX, XLSX, TXT, CSV supported</p></div><input type="file" class="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.json" data-v-53ca7b25></label>`);
          if (selectedFile.value) {
            _push2(`<div class="${ssrRenderClass([unref(isDark) ? "border-white/10 bg-rich-black/40" : "border-gray-200 bg-gray-50", "flex items-center justify-between gap-3 rounded-xl border p-3 text-sm"])}" data-v-53ca7b25><div class="flex min-w-0 items-center gap-3" data-v-53ca7b25>`);
            _push2(ssrRenderComponent(_component_Icon, {
              name: "ph:file-text",
              class: "h-5 w-5 flex-none text-rich-orange"
            }, null, _parent));
            _push2(`<div class="min-w-0" data-v-53ca7b25><p class="${ssrRenderClass([headingClass.value, "truncate font-semibold"])}" data-v-53ca7b25>${ssrInterpolate(selectedFile.value.name)}</p><p class="${ssrRenderClass([mutedClass.value, "text-xs"])}" data-v-53ca7b25>${ssrInterpolate(formatSize(selectedFile.value.size))}</p></div></div><button type="button" class="inline-flex h-8 w-8 items-center justify-center rounded-xl text-red-500 transition hover:bg-red-500/10" aria-label="Remove file" data-v-53ca7b25>`);
            _push2(ssrRenderComponent(_component_Icon, {
              name: "ph:trash",
              class: "h-4 w-4"
            }, null, _parent));
            _push2(`</button></div>`);
          } else {
            _push2(`<!---->`);
          }
          _push2(`<div data-v-53ca7b25><div class="flex items-center justify-between gap-3" data-v-53ca7b25><div data-v-53ca7b25><span class="${ssrRenderClass([headingClass.value, "text-sm font-semibold"])}" data-v-53ca7b25> Routing Pathway <span class="text-red-500" data-v-53ca7b25>*</span></span><p class="${ssrRenderClass([mutedClass.value, "mt-0.5 text-[11px]"])}" data-v-53ca7b25> Where the messenger must physically carry this document. </p></div><div class="${ssrRenderClass([unref(isDark) ? "border-white/10 bg-white/[0.04]" : "border-gray-200 bg-gray-100", "flex flex-none items-center rounded-xl border p-0.5 text-xs"])}" data-v-53ca7b25><!--[-->`);
          ssrRenderList(routeTabs, (tab) => {
            _push2(`<button type="button" class="${ssrRenderClass([routeTab.value === tab.value ? "bg-rich-orange text-white shadow" : unref(isDark) ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-700", "flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition-all duration-200 select-none"])}" data-v-53ca7b25>`);
            _push2(ssrRenderComponent(_component_Icon, {
              name: tab.icon,
              class: "h-3 w-3"
            }, null, _parent));
            _push2(` ${ssrInterpolate(tab.label)}</button>`);
          });
          _push2(`<!--]--></div></div><p class="${ssrRenderClass([mutedClass.value, "mt-2 text-[11px]"])}" data-v-53ca7b25>`);
          if (routeTab.value === "global") {
            _push2(`<span data-v-53ca7b25>`);
            _push2(ssrRenderComponent(_component_Icon, {
              name: "ph:globe-hemisphere-west-fill",
              class: "inline h-3 w-3 text-rich-orange"
            }, null, _parent));
            _push2(` Organisation-wide routes created by your Client Admin — available to all offices. </span>`);
          } else {
            _push2(`<span data-v-53ca7b25>`);
            _push2(ssrRenderComponent(_component_Icon, {
              name: "ph:buildings-fill",
              class: "inline h-3 w-3 text-rich-orange"
            }, null, _parent));
            _push2(` Custom routes built specifically for <span class="font-semibold text-rich-orange" data-v-53ca7b25>${ssrInterpolate(selectedOriginOfficeName.value || "your office")}</span>. </span>`);
          }
          _push2(`</p><div class="${ssrRenderClass([{ "opacity-50 pointer-events-none": !selectedOriginOfficeId.value && routeTab.value === "local" }, "mt-3 max-h-52 space-y-2 overflow-y-auto pr-0.5"])}" data-v-53ca7b25>`);
          if (routeTab.value === "local" && !selectedOriginOfficeId.value) {
            _push2(`<div class="${ssrRenderClass([unref(isDark) ? "border-white/10 text-gray-500" : "border-gray-200 text-gray-400", "flex items-center gap-2 rounded-xl border border-dashed px-4 py-3 text-xs"])}" data-v-53ca7b25>`);
            _push2(ssrRenderComponent(_component_Icon, {
              name: "ph:warning",
              class: "h-4 w-4 text-amber-500"
            }, null, _parent));
            _push2(` Select your origin office first to see local routes. </div>`);
          } else if (!visibleRoutes.value.length) {
            _push2(`<div class="${ssrRenderClass([unref(isDark) ? "border-white/10 text-gray-500" : "border-gray-200 text-gray-400", "flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-5 text-center text-xs"])}" data-v-53ca7b25>`);
            _push2(ssrRenderComponent(_component_Icon, {
              name: "ph:path",
              class: ["h-6 w-6", mutedClass.value]
            }, null, _parent));
            _push2(`<span data-v-53ca7b25> No ${ssrInterpolate(routeTab.value === "global" ? "global" : "local")} routes found. `);
            if (routeTab.value === "local") {
              _push2(`<!--[-->`);
              _push2(ssrRenderComponent(_component_NuxtLink, {
                to: "/employee/stages",
                class: "text-rich-orange hover:underline"
              }, {
                default: withCtx((_, _push3, _parent2, _scopeId) => {
                  if (_push3) {
                    _push3(`Create one`);
                  } else {
                    return [
                      createTextVNode("Create one")
                    ];
                  }
                }),
                _: 1
              }, _parent));
              _push2(` in Stages. <!--]-->`);
            } else {
              _push2(`<!---->`);
            }
            _push2(`</span></div>`);
          } else {
            _push2(`<!---->`);
          }
          _push2(`<!--[-->`);
          ssrRenderList(visibleRoutes.value, (stage) => {
            _push2(`<button type="button" class="${ssrRenderClass([selectedStageId.value === String(stage.stage_id) ? unref(isDark) ? "border-rich-orange bg-rich-orange/10 shadow-md shadow-rich-orange/10" : "border-rich-orange bg-orange-50 shadow-md shadow-rich-orange/10" : unref(isDark) ? "border-white/10 hover:bg-white/[0.03]" : "border-gray-200 hover:bg-gray-50", "group w-full rounded-xl border px-4 py-3 text-left transition-all duration-200 hover:border-rich-orange/40"])}" data-v-53ca7b25><div class="flex items-start justify-between gap-2" data-v-53ca7b25><div class="min-w-0 flex-1" data-v-53ca7b25><div class="flex items-center gap-2" data-v-53ca7b25><div class="${ssrRenderClass([selectedStageId.value === String(stage.stage_id) ? "bg-rich-orange" : unref(isDark) ? "border border-white/20" : "border border-gray-300", "flex h-4 w-4 flex-none items-center justify-center rounded-full transition-all"])}" data-v-53ca7b25>`);
            if (selectedStageId.value === String(stage.stage_id)) {
              _push2(ssrRenderComponent(_component_Icon, {
                name: "ph:check-bold",
                class: "h-2.5 w-2.5 text-white"
              }, null, _parent));
            } else {
              _push2(`<!---->`);
            }
            _push2(`</div><span class="${ssrRenderClass([headingClass.value, "text-sm font-semibold"])}" data-v-53ca7b25>${ssrInterpolate(stage.name)}</span></div>`);
            if (getRouteSteps(stage.stage_id).length) {
              _push2(`<div class="mt-2 flex flex-wrap gap-1" data-v-53ca7b25><!--[-->`);
              ssrRenderList(getRouteStops(stage.stage_id), (stop, idx) => {
                _push2(`<span class="${ssrRenderClass([unref(isDark) ? "border-white/10 bg-white/5 text-gray-300" : "border-gray-200 bg-gray-100 text-gray-600", "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium"])}" data-v-53ca7b25><span class="h-1 w-1 rounded-full bg-rich-orange/60" data-v-53ca7b25></span> ${ssrInterpolate(stop)}</span>`);
              });
              _push2(`<!--]-->`);
              if (getRouteSteps(stage.stage_id).length > 3) {
                _push2(`<span class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium text-rich-orange" data-v-53ca7b25> +${ssrInterpolate(getRouteSteps(stage.stage_id).length - 3)} more </span>`);
              } else {
                _push2(`<!---->`);
              }
              _push2(`</div>`);
            } else {
              _push2(`<!---->`);
            }
            _push2(`</div><div class="flex flex-none flex-col items-end gap-1.5" data-v-53ca7b25><span class="${ssrRenderClass([routeTab.value === "global" ? "border-blue-400/30 bg-blue-400/10 text-blue-400" : "border-rich-orange/30 bg-rich-orange/10 text-rich-orange", "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold"])}" data-v-53ca7b25>`);
            _push2(ssrRenderComponent(_component_Icon, {
              name: routeTab.value === "global" ? "ph:globe-hemisphere-west-fill" : "ph:buildings-fill",
              class: "h-2.5 w-2.5"
            }, null, _parent));
            _push2(` ${ssrInterpolate(routeTab.value === "global" ? "Global" : "Local")}</span><span class="${ssrRenderClass([mutedClass.value, "text-[10px]"])}" data-v-53ca7b25>${ssrInterpolate(getRouteSteps(stage.stage_id).length)} stop${ssrInterpolate(getRouteSteps(stage.stage_id).length !== 1 ? "s" : "")}</span></div></div></button>`);
          });
          _push2(`<!--]--></div>`);
          if (selectedStageId.value && selectedTimelineSteps.value.length) {
            _push2(`<div class="${ssrRenderClass([unref(isDark) ? "border-rich-orange/20 bg-rich-orange/[0.03]" : "border-orange-200 bg-orange-50/60", "mt-4 overflow-hidden rounded-xl border"])}" data-v-53ca7b25><div class="${ssrRenderClass([unref(isDark) ? "border-rich-orange/15" : "border-orange-200/70", "flex items-center justify-between border-b px-4 py-2.5"])}" data-v-53ca7b25><div class="flex items-center gap-2" data-v-53ca7b25>`);
            _push2(ssrRenderComponent(_component_Icon, {
              name: "ph:path-fill",
              class: "h-3.5 w-3.5 text-rich-orange"
            }, null, _parent));
            _push2(`<span class="text-[11px] font-bold uppercase tracking-wider text-rich-orange" data-v-53ca7b25>Route Preview</span></div><span class="${ssrRenderClass([mutedClass.value, "text-[10px]"])}" data-v-53ca7b25>${ssrInterpolate(selectedTimelineSteps.value.length + 1)} stops · Messenger run </span></div><div class="overflow-x-auto px-4 py-4" data-v-53ca7b25><div class="flex min-w-max items-start gap-0" data-v-53ca7b25><div class="flex flex-col items-center" style="${ssrRenderStyle({ "min-width": "80px" })}" data-v-53ca7b25><div class="relative flex h-10 w-10 items-center justify-center rounded-full bg-rich-orange shadow-lg shadow-rich-orange/40" data-v-53ca7b25>`);
            _push2(ssrRenderComponent(_component_Icon, {
              name: "ph:map-pin-fill",
              class: "h-5 w-5 text-white"
            }, null, _parent));
            _push2(`<span class="absolute inset-0 animate-ping rounded-full bg-rich-orange opacity-20" data-v-53ca7b25></span></div><p class="mt-2 max-w-[76px] text-center text-[10px] font-bold leading-tight text-rich-orange" style="${ssrRenderStyle({ "word-break": "break-word" })}" data-v-53ca7b25>${ssrInterpolate(selectedOriginOfficeName.value || "Origin")}</p><span class="mt-0.5 rounded-full bg-rich-orange/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-rich-orange" data-v-53ca7b25> Origin </span></div><!--[-->`);
            ssrRenderList(selectedTimelineSteps.value, (step, idx) => {
              _push2(`<!--[--><div class="flex items-center" style="${ssrRenderStyle({ "padding-top": "14px", "min-width": "40px" })}" data-v-53ca7b25><div class="${ssrRenderClass([unref(isDark) ? "bg-rich-orange/30" : "bg-rich-orange/40", "h-px flex-1"])}" data-v-53ca7b25></div>`);
              _push2(ssrRenderComponent(_component_Icon, {
                name: "ph:caret-right-fill",
                class: "h-3 w-3 flex-none text-rich-orange/50"
              }, null, _parent));
              _push2(`</div><div class="flex flex-col items-center" style="${ssrRenderStyle({ "min-width": "80px" })}" data-v-53ca7b25><div class="${ssrRenderClass([idx === selectedTimelineSteps.value.length - 1 ? "border-rich-orange bg-rich-orange text-white shadow-lg shadow-rich-orange/30" : unref(isDark) ? "border-rich-orange/60 bg-rich-orange/10 text-rich-orange" : "border-rich-orange bg-orange-50 text-rich-orange", "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all"])}" data-v-53ca7b25>`);
              if (idx === selectedTimelineSteps.value.length - 1) {
                _push2(ssrRenderComponent(_component_Icon, {
                  name: "ph:flag-checkered-fill",
                  class: "h-4 w-4"
                }, null, _parent));
              } else {
                _push2(`<span class="text-xs font-bold" data-v-53ca7b25>${ssrInterpolate(idx + 1)}</span>`);
              }
              _push2(`</div><p class="${ssrRenderClass([headingClass.value, "mt-2 max-w-[76px] text-center text-[10px] font-semibold leading-tight"])}" style="${ssrRenderStyle({ "word-break": "break-word" })}" data-v-53ca7b25>${ssrInterpolate(resolveOfficeName(step.office_id))}</p><span class="${ssrRenderClass([idx === selectedTimelineSteps.value.length - 1 ? "font-bold text-rich-orange" : mutedClass.value, "mt-0.5 text-[9px]"])}" data-v-53ca7b25>${ssrInterpolate(idx === selectedTimelineSteps.value.length - 1 ? "Final Stop" : `Stop ${idx + 1}`)}</span></div><!--]-->`);
            });
            _push2(`<!--]--></div></div><div class="${ssrRenderClass([unref(isDark) ? "border-rich-orange/15" : "border-orange-200/70", "border-t px-4 py-2.5 text-[10px]"])}" data-v-53ca7b25><div class="${ssrRenderClass([mutedClass.value, "flex items-center gap-3 flex-wrap"])}" data-v-53ca7b25><span class="flex items-center gap-1" data-v-53ca7b25>`);
            _push2(ssrRenderComponent(_component_Icon, {
              name: "ph:buildings-fill",
              class: "h-3 w-3 text-rich-orange"
            }, null, _parent));
            _push2(`<strong class="text-rich-orange" data-v-53ca7b25>${ssrInterpolate(selectedOriginOfficeName.value || "—")}</strong></span>`);
            _push2(ssrRenderComponent(_component_Icon, {
              name: "ph:arrow-right",
              class: "h-3 w-3"
            }, null, _parent));
            _push2(`<span data-v-53ca7b25>${ssrInterpolate(selectedTimelineSteps.value.length)} office${ssrInterpolate(selectedTimelineSteps.value.length !== 1 ? "s" : "")} in route</span>`);
            _push2(ssrRenderComponent(_component_Icon, {
              name: "ph:arrow-right",
              class: "h-3 w-3"
            }, null, _parent));
            _push2(`<span class="flex items-center gap-1" data-v-53ca7b25>`);
            _push2(ssrRenderComponent(_component_Icon, {
              name: "ph:flag-checkered-fill",
              class: "h-3 w-3 text-rich-orange"
            }, null, _parent));
            _push2(`<strong class="text-rich-orange" data-v-53ca7b25>${ssrInterpolate(finalDestinationName.value)}</strong></span></div></div></div>`);
          } else {
            _push2(`<!---->`);
          }
          _push2(`</div><div data-v-53ca7b25><span class="${ssrRenderClass([headingClass.value, "text-sm font-semibold"])}" data-v-53ca7b25>QR Code Placement Strategy</span><div class="mt-2 space-y-2" data-v-53ca7b25><label class="${ssrRenderClass([selectedStrategy.value === "embedded" ? "border-rich-orange bg-rich-orange/5" : unref(isDark) ? "border-white/10" : "border-gray-200", "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition"])}" data-v-53ca7b25><input${ssrIncludeBooleanAttr(ssrLooseEqual(selectedStrategy.value, "embedded")) ? " checked" : ""} type="radio" value="embedded" class="mt-1 accent-[#FF620C]" data-v-53ca7b25><span data-v-53ca7b25><span class="${ssrRenderClass([headingClass.value, "block text-sm font-semibold"])}" data-v-53ca7b25>Embed with Document Content</span><span class="${ssrRenderClass([mutedClass.value, "block text-xs"])}" data-v-53ca7b25> Prints tracking metadata directly alongside the document payload. </span></span></label><label class="${ssrRenderClass([selectedStrategy.value === "standalone" ? "border-rich-orange bg-rich-orange/5" : unref(isDark) ? "border-white/10" : "border-gray-200", "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition"])}" data-v-53ca7b25><input${ssrIncludeBooleanAttr(ssrLooseEqual(selectedStrategy.value, "standalone")) ? " checked" : ""} type="radio" value="standalone" class="mt-1 accent-[#FF620C]" data-v-53ca7b25><span data-v-53ca7b25><span class="${ssrRenderClass([headingClass.value, "block text-sm font-semibold"])}" data-v-53ca7b25>Standalone Tracking Trailer Page</span><span class="${ssrRenderClass([mutedClass.value, "block text-xs"])}" data-v-53ca7b25> Keeps document pages clean and appends a dedicated tracking sheet. </span></span></label></div></div>`);
          if (selectedStrategy.value === "standalone") {
            _push2(`<label class="block" data-v-53ca7b25><span class="${ssrRenderClass([headingClass.value, "text-sm font-semibold"])}" data-v-53ca7b25>Trailer QR Print Size</span><select class="${ssrRenderClass([inputClass.value, "mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-rich-orange"])}" data-v-53ca7b25><option${ssrRenderAttr("value", 50)} style="${ssrRenderStyle(optionStyle.value)}" data-v-53ca7b25${ssrIncludeBooleanAttr(Array.isArray(selectedQrSize.value) ? ssrLooseContain(selectedQrSize.value, 50) : ssrLooseEqual(selectedQrSize.value, 50)) ? " selected" : ""}>Small (50px × 50px)</option><option${ssrRenderAttr("value", 120)} style="${ssrRenderStyle(optionStyle.value)}" data-v-53ca7b25${ssrIncludeBooleanAttr(Array.isArray(selectedQrSize.value) ? ssrLooseContain(selectedQrSize.value, 120) : ssrLooseEqual(selectedQrSize.value, 120)) ? " selected" : ""}>Medium (120px × 120px)</option><option${ssrRenderAttr("value", 200)} style="${ssrRenderStyle(optionStyle.value)}" data-v-53ca7b25${ssrIncludeBooleanAttr(Array.isArray(selectedQrSize.value) ? ssrLooseContain(selectedQrSize.value, 200) : ssrLooseEqual(selectedQrSize.value, 200)) ? " selected" : ""}>Large (200px × 200px)</option></select></label>`);
          } else {
            _push2(`<!---->`);
          }
          if (errorMessage.value) {
            _push2(`<p class="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500" data-v-53ca7b25>${ssrInterpolate(errorMessage.value)}</p>`);
          } else {
            _push2(`<!---->`);
          }
          if (aiAnalysis.value) {
            _push2(`<div class="${ssrRenderClass([unref(isDark) ? "border-white/10 bg-white/[0.03]" : "border-gray-200 bg-gray-50", "rounded-xl border p-4"])}" data-v-53ca7b25><div class="flex items-center gap-2 text-sm font-semibold text-rich-orange" data-v-53ca7b25>`);
            _push2(ssrRenderComponent(_component_Icon, {
              name: "ph:sparkle-fill",
              class: "h-4 w-4"
            }, null, _parent));
            _push2(` AI Analysis </div><p class="${ssrRenderClass([headingClass.value, "mt-2 text-sm font-semibold"])}" data-v-53ca7b25>${ssrInterpolate(aiAnalysis.value.title)}</p><p class="${ssrRenderClass([mutedClass.value, "mt-1 text-xs leading-5"])}" data-v-53ca7b25>${ssrInterpolate(aiAnalysis.value.description)}</p></div>`);
          } else {
            _push2(`<!---->`);
          }
          _push2(`</div></div><footer class="${ssrRenderClass([borderClass.value, "flex items-center justify-between gap-3 border-t px-6 py-4"])}" data-v-53ca7b25><div class="flex min-w-0 items-center gap-2" data-v-53ca7b25>`);
          if (selectedStageId.value) {
            _push2(`<div class="${ssrRenderClass([unref(isDark) ? "border-rich-orange/20 bg-rich-orange/5" : "border-orange-200 bg-orange-50", "flex min-w-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold text-rich-orange"])}" data-v-53ca7b25>`);
            _push2(ssrRenderComponent(_component_Icon, {
              name: "ph:path-fill",
              class: "h-3 w-3 flex-none"
            }, null, _parent));
            _push2(`<span class="truncate" data-v-53ca7b25>${ssrInterpolate(selectedRouteName.value)}</span>`);
            _push2(ssrRenderComponent(_component_Icon, {
              name: "ph:x-bold",
              class: "h-2.5 w-2.5 flex-none cursor-pointer hover:text-red-400",
              onClick: ($event) => selectedStageId.value = ""
            }, null, _parent));
            _push2(`</div>`);
          } else {
            _push2(`<!---->`);
          }
          _push2(`</div><div class="flex items-center gap-3" data-v-53ca7b25><button type="button" class="${ssrRenderClass([unref(isDark) ? "border-white/10 text-white" : "border-gray-200 text-gray-900", "rounded-xl border px-4 py-2.5 text-sm font-semibold transition hover:bg-black/5 dark:hover:bg-white/5"])}" data-v-53ca7b25> Cancel </button><button type="submit" class="inline-flex items-center gap-2 rounded-xl bg-rich-orange px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rich-orange/25 transition hover:bg-[#e95a0b] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"${ssrIncludeBooleanAttr(!canSubmit.value) ? " disabled" : ""} data-v-53ca7b25>`);
          if (uploading.value) {
            _push2(ssrRenderComponent(_component_Icon, {
              name: "ph:spinner-gap",
              class: "h-4 w-4 animate-spin"
            }, null, _parent));
          } else {
            _push2(ssrRenderComponent(_component_Icon, {
              name: "ph:printer",
              class: "h-4 w-4"
            }, null, _parent));
          }
          _push2(` ${ssrInterpolate(uploading.value ? "Saving…" : "Print & Save")}</button></div></footer></form>`);
        } else {
          _push2(`<!---->`);
        }
        _push2(ssrRenderComponent(DocumentPrintCanvas, { "qr-data-url": printQrDataUrl.value }, null, _parent));
      }, "body", false, _parent);
    };
  }
});
const _sfc_setup$3 = _sfc_main$3.setup;
_sfc_main$3.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/employee/documents/EmployeeDocUploadModal.vue");
  return _sfc_setup$3 ? _sfc_setup$3(props, ctx) : void 0;
};
const EmployeeDocUploadModal = /* @__PURE__ */ Object.assign(_export_sfc(_sfc_main$3, [["__scopeId", "data-v-53ca7b25"]]), { __name: "EmployeeDocumentsEmployeeDocUploadModal" });
const useSupabaseClient = () => {
  return useNuxtApp().$supabase.client;
};
function useIssueChatRealtime(orgId, issueId, onEvent) {
  const supabase = useSupabaseClient();
  const channelRef = ref(null);
  const teardown = async () => {
    if (channelRef.value) {
      await supabase.removeChannel(channelRef.value);
      channelRef.value = null;
    }
  };
  const subscribe = async () => {
    await teardown();
    const oid = orgId.value;
    const iid = issueId.value;
    if (!oid || !iid) return;
    const channelName = `org:${oid}:issue:${iid}`;
    const channel = supabase.channel(channelName);
    channel.on("broadcast", { event: "new_message" }, ({ payload }) => {
      onEvent("new_message", payload);
    }).on("broadcast", { event: "issue_created" }, ({ payload }) => {
      onEvent("issue_created", payload);
    }).on("broadcast", { event: "issue_resolved" }, ({ payload }) => {
      onEvent("issue_resolved", payload);
    }).subscribe();
    channelRef.value = channel;
  };
  watch([orgId, issueId], () => {
    subscribe();
  }, { immediate: true });
  return { resubscribe: subscribe };
}
const _sfc_main$2 = /* @__PURE__ */ defineComponent({
  __name: "DocumentIssueChatPanel",
  __ssrInlineRender: true,
  props: {
    document: {},
    offices: {}
  },
  emits: ["updated"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const auth = useAuthStore();
    const { isDark } = useTheme();
    const showReportForm = ref(false);
    const activeIssue = ref(null);
    const messages = ref([]);
    const draftMessage = ref("");
    const loadingMessages = ref(false);
    const sending = ref(false);
    const reporting = ref(false);
    const resolving = ref(false);
    const reportError = ref("");
    const isTyping = ref(false);
    const messagesEl = ref(null);
    const reportForm = reactive({
      title: "",
      reported_by_office_id: "",
      message_text: ""
    });
    const orgId = computed(() => String(auth.user?.org_id ?? ""));
    const issueId = computed(() => activeIssue.value?.id ?? null);
    const mutedText = computed(() => isDark.value ? "text-gray-400" : "text-gray-500");
    const inputClass = computed(
      () => isDark.value ? "border-white/10 bg-rich-black text-white placeholder:text-gray-500" : "border-gray-200 bg-white text-gray-900 placeholder:text-gray-400"
    );
    const canReportDiscrepancy = computed(
      () => props.document.tracking_status === "ARRIVED_AT_OFFICE" && !activeIssue.value && !showReportForm.value
    );
    const canResolveIssue = computed(() => {
      if (!activeIssue.value || activeIssue.value.status !== "OPEN") return false;
      if (auth.user?.role === "client") return true;
      return props.offices.some(
        (o) => String(o.id) === String(activeIssue.value.reported_by_office_id)
      );
    });
    const scrollToBottom = async () => {
      await nextTick();
      if (messagesEl.value) {
        messagesEl.value.scrollTop = messagesEl.value.scrollHeight;
      }
    };
    const fetchIssueState = async () => {
      if (!props.document?.id) return;
      try {
        const res = await $fetch("/api/documents/issues/list", {
          params: { document_id: props.document.id }
        });
        activeIssue.value = res.openIssue;
        if (res.openIssue) {
          await fetchMessages(res.openIssue.id);
        } else {
          messages.value = [];
        }
      } catch (err) {
        console.error("[IssueChat] fetchIssueState:", err);
      }
    };
    const fetchMessages = async (id) => {
      loadingMessages.value = true;
      try {
        const res = await $fetch(
          "/api/documents/issues/messages",
          { params: { issue_id: id, limit: 200 } }
        );
        messages.value = res.data ?? [];
        await scrollToBottom();
      } catch (err) {
        console.error("[IssueChat] fetchMessages:", err);
      } finally {
        loadingMessages.value = false;
      }
    };
    const isOwnMessage = (msg) => String(msg.sender_id) === String(auth.user?.user_id);
    const speakerTier = (msg) => {
      if (msg.sender_role === "client") return "Organisation Admin";
      if (String(msg.sender_id) === String(props.document.user_id)) return "Originating Office Admin";
      if (activeIssue.value && String(msg.sender_id) !== String(props.document.user_id)) {
        return "Registrar Branch Reviewer";
      }
      return "Office Reviewer";
    };
    const tierBadgeClass = (msg) => {
      if (msg.sender_role === "client") {
        return isDark.value ? "border-blue-400/30 bg-blue-400/10 text-blue-300" : "border-blue-400/30 bg-blue-50 text-blue-600";
      }
      if (String(msg.sender_id) === String(props.document.user_id)) {
        return "border-rich-orange/30 bg-rich-orange/10 text-rich-orange";
      }
      return isDark.value ? "border-teal-400/30 bg-teal-400/10 text-teal-300" : "border-teal-400/30 bg-teal-50 text-teal-700";
    };
    const initials = (name) => {
      if (!name) return "?";
      return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
    };
    const fmtTime = (v) => new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(v));
    useIssueChatRealtime(orgId, issueId, async (event) => {
      if (event === "new_message" && activeIssue.value) {
        await fetchMessages(activeIssue.value.id);
      }
      if (event === "issue_resolved") {
        activeIssue.value = null;
        messages.value = [];
        emit("updated", { tracking_status: "ARRIVED_AT_OFFICE", issueClosed: true });
      }
    });
    watch(
      () => props.document?.id,
      () => {
        showReportForm.value = false;
        fetchIssueState();
      },
      { immediate: true }
    );
    watch(
      () => props.document?.tracking_status,
      (status) => {
        if (status === "DISCREPANCY_REPORTED" && !activeIssue.value) {
          fetchIssueState();
        }
      }
    );
    return (_ctx, _push, _parent, _attrs) => {
      const _component_Icon = __nuxt_component_0;
      _push(`<section${ssrRenderAttrs(mergeProps({
        class: ["relative flex flex-col border-t", unref(isDark) ? "border-white/10 bg-white/[0.02]" : "border-gray-200 bg-gray-50/80"]
      }, _attrs))} data-v-b90a8b64>`);
      if (canReportDiscrepancy.value) {
        _push(`<div class="px-6 py-4" data-v-b90a8b64><button type="button" class="group flex w-full items-center justify-center gap-2.5 rounded-xl border-2 border-rich-orange/40 bg-rich-orange/10 px-4 py-3.5 text-sm font-bold text-rich-orange shadow-lg shadow-rich-orange/10 transition-all duration-300 hover:border-rich-orange hover:bg-rich-orange hover:text-white hover:shadow-rich-orange/30 active:scale-[0.98]" data-v-b90a8b64>`);
        _push(ssrRenderComponent(_component_Icon, {
          name: "ph:warning-fill",
          class: "h-5 w-5 transition-transform group-hover:scale-110"
        }, null, _parent));
        _push(` Report Document Discrepancy </button><p class="${ssrRenderClass([mutedText.value, "mt-2 text-center text-[11px]"])}" data-v-b90a8b64> Flag missing pages, skipped signatures, or other hard-copy problems. </p></div>`);
      } else {
        _push(`<!---->`);
      }
      if (activeIssue.value) {
        _push(`<div class="${ssrRenderClass([unref(isDark) ? "bg-slate-900/40" : "bg-white/60", "flex min-h-[280px] flex-1 flex-col backdrop-blur-md"])}" data-v-b90a8b64><div class="${ssrRenderClass([unref(isDark) ? "border-white/10" : "border-gray-200/80", "flex items-start justify-between gap-3 border-b px-5 py-3.5"])}" data-v-b90a8b64><div class="min-w-0" data-v-b90a8b64><div class="flex items-center gap-2" data-v-b90a8b64>`);
        _push(ssrRenderComponent(_component_Icon, {
          name: "ph:chat-circle-dots-fill",
          class: "h-4 w-4 text-rich-orange"
        }, null, _parent));
        _push(`<p class="text-[10px] font-bold uppercase tracking-widest text-rich-orange" data-v-b90a8b64>Issue Thread</p><span class="${ssrRenderClass([activeIssue.value.status === "OPEN" ? "border-amber-400/40 bg-amber-400/10 text-amber-400" : "border-green-400/40 bg-green-400/10 text-green-400", "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase"])}" data-v-b90a8b64><span class="${ssrRenderClass([activeIssue.value.status === "OPEN" ? "animate-pulse" : "", "h-1.5 w-1.5 rounded-full bg-current"])}" data-v-b90a8b64></span> ${ssrInterpolate(activeIssue.value.status)}</span></div><p class="${ssrRenderClass([unref(isDark) ? "text-white" : "text-gray-900", "mt-1 truncate text-sm font-semibold"])}" data-v-b90a8b64>${ssrInterpolate(activeIssue.value.title)}</p></div>`);
        if (canResolveIssue.value) {
          _push(`<button type="button" class="inline-flex flex-none items-center gap-1.5 rounded-xl border border-green-500/30 bg-green-500/10 px-3 py-1.5 text-[11px] font-semibold text-green-500 transition hover:bg-green-500/20 disabled:opacity-50"${ssrIncludeBooleanAttr(resolving.value) ? " disabled" : ""} data-v-b90a8b64>`);
          if (resolving.value) {
            _push(ssrRenderComponent(_component_Icon, {
              name: "ph:spinner-gap",
              class: "h-3.5 w-3.5 animate-spin"
            }, null, _parent));
          } else {
            _push(ssrRenderComponent(_component_Icon, {
              name: "ph:check-circle-fill",
              class: "h-3.5 w-3.5"
            }, null, _parent));
          }
          _push(` Mark as Resolved </button>`);
        } else {
          _push(`<!---->`);
        }
        _push(`</div><div class="flex-1 space-y-3 overflow-y-auto px-5 py-4" data-v-b90a8b64>`);
        if (loadingMessages.value) {
          _push(`<div class="${ssrRenderClass([mutedText.value, "flex items-center justify-center py-8"])}" data-v-b90a8b64>`);
          _push(ssrRenderComponent(_component_Icon, {
            name: "ph:spinner-gap",
            class: "mr-2 h-5 w-5 animate-spin text-rich-orange"
          }, null, _parent));
          _push(` Loading conversation… </div>`);
        } else if (messages.value.length) {
          _push(`<!--[-->`);
          ssrRenderList(messages.value, (msg) => {
            _push(`<article class="${ssrRenderClass([isOwnMessage(msg) ? "flex-row-reverse" : "", "flex gap-3"])}" data-v-b90a8b64><div class="${ssrRenderClass([isOwnMessage(msg) ? "bg-rich-orange text-white shadow-md shadow-rich-orange/30" : unref(isDark) ? "bg-white/10 text-gray-300" : "bg-gray-200 text-gray-700", "flex h-8 w-8 flex-none items-center justify-center rounded-full text-[11px] font-bold"])}" data-v-b90a8b64>${ssrInterpolate(initials(msg.sender_name))}</div><div class="${ssrRenderClass([isOwnMessage(msg) ? "border-rich-orange/30 bg-rich-orange/10" : unref(isDark) ? "border-white/10 bg-white/[0.06]" : "border-gray-200 bg-white/80", "max-w-[78%] rounded-2xl border px-3.5 py-2.5 shadow-sm backdrop-blur-sm"])}" data-v-b90a8b64><div class="mb-1.5 flex flex-wrap items-center gap-1.5" data-v-b90a8b64><span class="${ssrRenderClass([unref(isDark) ? "text-white" : "text-gray-900", "text-xs font-semibold"])}" data-v-b90a8b64>${ssrInterpolate(msg.sender_name || "Unknown")}</span><span class="${ssrRenderClass([tierBadgeClass(msg), "inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"])}" data-v-b90a8b64>${ssrInterpolate(speakerTier(msg))}</span></div><p class="${ssrRenderClass([unref(isDark) ? "text-gray-200" : "text-gray-800", "text-sm leading-relaxed"])}" data-v-b90a8b64>${ssrInterpolate(msg.message_text)}</p><p class="${ssrRenderClass([mutedText.value, "mt-1.5 text-[10px]"])}" data-v-b90a8b64>${ssrInterpolate(fmtTime(msg.created_at))}</p></div></article>`);
          });
          _push(`<!--]-->`);
        } else {
          _push(`<div class="${ssrRenderClass([mutedText.value, "py-8 text-center text-sm"])}" data-v-b90a8b64> No messages yet. Start the conversation below. </div>`);
        }
        if (isTyping.value) {
          _push(`<div class="flex items-center gap-2 px-1" data-v-b90a8b64><span class="flex gap-1" data-v-b90a8b64><span class="h-1.5 w-1.5 animate-bounce rounded-full bg-rich-orange [animation-delay:0ms]" data-v-b90a8b64></span><span class="h-1.5 w-1.5 animate-bounce rounded-full bg-rich-orange [animation-delay:120ms]" data-v-b90a8b64></span><span class="h-1.5 w-1.5 animate-bounce rounded-full bg-rich-orange [animation-delay:240ms]" data-v-b90a8b64></span></span><span class="text-[11px] font-medium text-rich-orange" data-v-b90a8b64>Composing…</span></div>`);
        } else {
          _push(`<!---->`);
        }
        _push(`</div>`);
        if (activeIssue.value.status === "OPEN") {
          _push(`<form class="${ssrRenderClass([unref(isDark) ? "border-white/10" : "border-gray-200/80", "border-t px-4 py-3"])}" data-v-b90a8b64><div class="${ssrRenderClass([unref(isDark) ? "border-white/10 bg-white/[0.04]" : "border-gray-200 bg-white/70", "flex items-end gap-2 rounded-xl border p-2 backdrop-blur-md transition-all focus-within:border-rich-orange/50 focus-within:ring-2 focus-within:ring-rich-orange/20"])}" data-v-b90a8b64><textarea rows="2" placeholder="Describe the discrepancy or reply to the branch…" class="max-h-28 min-h-[44px] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-gray-400" data-v-b90a8b64>${ssrInterpolate(draftMessage.value)}</textarea><button type="submit" class="inline-flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-rich-orange text-white shadow-lg shadow-rich-orange/25 transition hover:bg-[#e95a0b] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"${ssrIncludeBooleanAttr(!draftMessage.value.trim() || sending.value) ? " disabled" : ""} aria-label="Send message" data-v-b90a8b64>`);
          if (sending.value) {
            _push(ssrRenderComponent(_component_Icon, {
              name: "ph:spinner-gap",
              class: "h-4 w-4 animate-spin"
            }, null, _parent));
          } else {
            _push(ssrRenderComponent(_component_Icon, {
              name: "ph:paper-plane-right-fill",
              class: "h-4 w-4"
            }, null, _parent));
          }
          _push(`</button></div></form>`);
        } else {
          _push(`<!---->`);
        }
        _push(`</div>`);
      } else {
        _push(`<!---->`);
      }
      if (showReportForm.value) {
        _push(`<div class="${ssrRenderClass([unref(isDark) ? "bg-black/70" : "bg-white/80", "absolute inset-0 z-20 flex flex-col backdrop-blur-md"])}" data-v-b90a8b64><div class="${ssrRenderClass([unref(isDark) ? "border-white/10" : "border-gray-200", "flex items-center justify-between border-b px-6 py-4"])}" data-v-b90a8b64><div data-v-b90a8b64><p class="text-[10px] font-bold uppercase tracking-widest text-rich-orange" data-v-b90a8b64>Flag Discrepancy</p><h3 class="${ssrRenderClass([unref(isDark) ? "text-white" : "text-gray-900", "text-base font-bold"])}" data-v-b90a8b64>Report Document Issue</h3></div><button type="button" class="${ssrRenderClass([unref(isDark) ? "hover:bg-white/5" : "hover:bg-gray-100", "inline-flex h-9 w-9 items-center justify-center rounded-xl transition"])}" data-v-b90a8b64>`);
        _push(ssrRenderComponent(_component_Icon, {
          name: "ph:x-bold",
          class: "h-4 w-4"
        }, null, _parent));
        _push(`</button></div><form class="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5" data-v-b90a8b64><label class="block" data-v-b90a8b64><span class="text-sm font-semibold text-rich-orange" data-v-b90a8b64>Issue Summary <span class="text-red-500" data-v-b90a8b64>*</span></span><input${ssrRenderAttr("value", reportForm.title)} type="text" maxlength="255" placeholder="e.g. Missing signature on page 3" class="${ssrRenderClass([inputClass.value, "mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-rich-orange"])}" required data-v-b90a8b64></label><label class="block" data-v-b90a8b64><span class="text-sm font-semibold" data-v-b90a8b64>Reporting Office <span class="text-red-500" data-v-b90a8b64>*</span></span><select class="${ssrRenderClass([inputClass.value, "mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-rich-orange"])}" required data-v-b90a8b64><option value="" data-v-b90a8b64${ssrIncludeBooleanAttr(Array.isArray(reportForm.reported_by_office_id) ? ssrLooseContain(reportForm.reported_by_office_id, "") : ssrLooseEqual(reportForm.reported_by_office_id, "")) ? " selected" : ""}>Select your office…</option><!--[-->`);
        ssrRenderList(__props.offices, (o) => {
          _push(`<option${ssrRenderAttr("value", String(o.id))} data-v-b90a8b64${ssrIncludeBooleanAttr(Array.isArray(reportForm.reported_by_office_id) ? ssrLooseContain(reportForm.reported_by_office_id, String(o.id)) : ssrLooseEqual(reportForm.reported_by_office_id, String(o.id))) ? " selected" : ""}>${ssrInterpolate(o.name)}</option>`);
        });
        _push(`<!--]--></select></label><label class="block flex-1" data-v-b90a8b64><span class="text-sm font-semibold" data-v-b90a8b64>Initial Message</span><textarea rows="4" placeholder="Describe what is wrong with the physical hard copy…" class="${ssrRenderClass([inputClass.value, "mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-rich-orange"])}" data-v-b90a8b64>${ssrInterpolate(reportForm.message_text)}</textarea></label>`);
        if (reportError.value) {
          _push(`<p class="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-500" data-v-b90a8b64>${ssrInterpolate(reportError.value)}</p>`);
        } else {
          _push(`<!---->`);
        }
        _push(`<div class="mt-auto flex justify-end gap-3 pt-2" data-v-b90a8b64><button type="button" class="${ssrRenderClass([unref(isDark) ? "border-white/10 text-gray-300" : "border-gray-200 text-gray-700", "rounded-xl border px-4 py-2.5 text-sm font-semibold transition"])}" data-v-b90a8b64> Cancel </button><button type="submit" class="inline-flex items-center gap-2 rounded-xl bg-rich-orange px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rich-orange/25 transition hover:bg-[#e95a0b] disabled:opacity-50"${ssrIncludeBooleanAttr(reporting.value || !reportForm.title.trim() || !reportForm.reported_by_office_id) ? " disabled" : ""} data-v-b90a8b64>`);
        if (reporting.value) {
          _push(ssrRenderComponent(_component_Icon, {
            name: "ph:spinner-gap",
            class: "h-4 w-4 animate-spin"
          }, null, _parent));
        } else {
          _push(ssrRenderComponent(_component_Icon, {
            name: "ph:warning-fill",
            class: "h-4 w-4"
          }, null, _parent));
        }
        _push(` Submit Report </button></div></form></div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</section>`);
    };
  }
});
const _sfc_setup$2 = _sfc_main$2.setup;
_sfc_main$2.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/employee/documents/DocumentIssueChatPanel.vue");
  return _sfc_setup$2 ? _sfc_setup$2(props, ctx) : void 0;
};
const DocumentIssueChatPanel = /* @__PURE__ */ Object.assign(_export_sfc(_sfc_main$2, [["__scopeId", "data-v-b90a8b64"]]), { __name: "EmployeeDocumentsDocumentIssueChatPanel" });
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "index",
  __ssrInlineRender: true,
  setup(__props) {
    const auth = useAuthStore();
    const stageStore = useStageStore();
    const { isDark } = useTheme();
    const currentScope = ref("LOCAL");
    const docs = ref([]);
    const myOffices = ref([]);
    const loading = ref(false);
    const isUploadOpen = ref(false);
    const selectedDoc = ref(null);
    const search = ref("");
    const officeFilter = ref("all");
    const statusFilter = ref("all");
    const trackingFilter = ref("all");
    const detailQrUrl = ref("");
    const scopeOptions = [
      { value: "LOCAL", label: "Office View", icon: "ph:buildings-fill" },
      { value: "GLOBAL", label: "Org View", icon: "ph:globe-hemisphere-west-fill" }
    ];
    ref({});
    const indicatorStyle = ref({ left: "6px", width: "120px" });
    watch(currentScope, () => reloadData());
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
    const metaCell = computed(
      () => isDark.value ? "border-white/10 bg-white/[0.03]" : "border-gray-200 bg-gray-50"
    );
    const kpiCards = computed(() => [
      {
        label: "Total Docs",
        value: docs.value.length,
        icon: "ph:files-fill",
        iconBg: "bg-rich-orange/10",
        iconColor: "text-rich-orange",
        trend: currentScope.value === "LOCAL" ? "In your offices" : "Org-wide",
        trendColor: "text-rich-orange"
      },
      {
        label: "My Uploads",
        value: docs.value.filter((d) => d.is_own_upload).length,
        icon: "ph:user-fill",
        iconBg: "bg-blue-500/10",
        iconColor: "text-blue-400",
        trend: "Registered by you",
        trendColor: isDark.value ? "text-gray-500" : "text-gray-400"
      },
      {
        label: "In Transit",
        value: docs.value.filter((d) => d.tracking_status === "IN_TRANSIT").length,
        icon: "ph:van-fill",
        iconBg: "bg-purple-500/10",
        iconColor: "text-purple-400",
        trend: "Moving now",
        trendColor: "text-purple-400"
      },
      {
        label: "Completed",
        value: docs.value.filter((d) => d.tracking_status === "COMPLETED").length,
        icon: "ph:check-circle-fill",
        iconBg: "bg-green-500/10",
        iconColor: "text-green-400",
        trend: "Fully delivered",
        trendColor: "text-green-400"
      }
    ]);
    const filtered = computed(() => {
      const q = search.value.trim().toLowerCase();
      return docs.value.filter((doc) => {
        if (officeFilter.value === "own" && !doc.is_own_upload) return false;
        if (officeFilter.value !== "all" && officeFilter.value !== "own") {
          const docOff = String(doc.office_id ?? doc.current_office_id ?? "");
          const ori = String(doc.origin_office_id ?? "");
          if (docOff !== officeFilter.value && ori !== officeFilter.value) return false;
        }
        if (statusFilter.value !== "all" && doc.status !== statusFilter.value) return false;
        if (trackingFilter.value !== "all" && (doc.tracking_status || "CREATED") !== trackingFilter.value) return false;
        if (q && !doc.title?.toLowerCase().includes(q) && !doc.description?.toLowerCase().includes(q)) return false;
        return true;
      });
    });
    const detailStageName = computed(() => {
      const id = selectedDoc.value?.stage_id;
      if (id == null) return "";
      return stageStore.stages.find((s) => String(s.stage_id) === String(id))?.name || "";
    });
    const detailSteps = computed(() => {
      const id = selectedDoc.value?.stage_id;
      if (id == null) return [];
      const seq = stageStore.stageOfficeSequences[id] || [];
      return [...seq].sort((a, b) => a.step_number - b.step_number).map((step) => ({
        ...step,
        office_name: resolveOfficeName(step.office_id)
      }));
    });
    const resolveOfficeName = (officeId) => {
      if (officeId == null) return "Unknown Office";
      const found = myOffices.value.find((o) => String(o.id) === String(officeId));
      return found?.name || `Office ${String(officeId).slice(0, 6)}`;
    };
    const currentStepNumber = computed(() => {
      const officeId = selectedDoc.value?.current_office_id || selectedDoc.value?.office_id;
      return detailSteps.value.find((s) => String(s.office_id) === String(officeId))?.step_number || detailSteps.value[0]?.step_number || 0;
    });
    const detailProgressPct = computed(() => {
      const total = detailSteps.value.length;
      if (!total) return 0;
      const done = detailSteps.value.filter((s) => isStepDone(s)).length;
      return Math.round(done / total * 100);
    });
    const isStepDone = (step) => step.step_number < currentStepNumber.value;
    const isStepCurrent = (step) => step.step_number === currentStepNumber.value;
    const isStepUpcoming = (step) => step.step_number > currentStepNumber.value;
    const stepNodeClass = (step) => {
      if (isStepDone(step)) return "bg-rich-orange text-white border-rich-orange";
      if (isStepCurrent(step)) return "border-rich-orange/40 text-rich-orange bg-rich-orange/10 animate-pulse";
      return isDark.value ? "border-white/10 text-gray-500" : "border-gray-200 text-gray-400";
    };
    const stepLabelClass = (step) => {
      if (isStepDone(step) || isStepCurrent(step)) return "text-rich-orange";
      return isDark.value ? "text-gray-500" : "text-gray-400";
    };
    const stepStateLabel = (step) => {
      if (isStepDone(step)) return "Completed";
      if (isStepCurrent(step)) return "Current Checkpoint";
      return "Upcoming";
    };
    const statusClass = (s) => {
      switch ((s || "Pending").toLowerCase()) {
        case "approved":
          return "text-green-500 border-green-500/30 bg-green-500/10";
        case "rejected":
          return "text-red-500 border-red-500/30 bg-red-500/10";
        case "processing":
          return "text-blue-400 border-blue-400/30 bg-blue-400/10";
        case "in review":
          return "text-blue-400 border-blue-400/30 bg-blue-400/10";
        default:
          return "text-rich-orange border-rich-orange/30 bg-rich-orange/10";
      }
    };
    const trackingClass = (s) => {
      switch (s) {
        case "COMPLETED":
          return "text-green-500 border-green-500/30 bg-green-500/10";
        case "IN_TRANSIT":
          return "text-blue-400 border-blue-400/30 bg-blue-400/10";
        case "PICKED_UP":
          return "text-purple-400 border-purple-400/30 bg-purple-400/10";
        case "ARRIVED_AT_OFFICE":
          return "text-teal-400 border-teal-400/30 bg-teal-400/10";
        case "DISCREPANCY_REPORTED":
          return "text-amber-400 border-amber-400/30 bg-amber-400/10";
        default:
          return "text-rich-orange border-rich-orange/30 bg-rich-orange/10";
      }
    };
    const trackingLabel = (s) => {
      switch (s) {
        case "COMPLETED":
          return "Completed";
        case "IN_TRANSIT":
          return "In Transit";
        case "PICKED_UP":
          return "Picked Up";
        case "ARRIVED_AT_OFFICE":
          return "At Office";
        case "DISCREPANCY_REPORTED":
          return "Discrepancy";
        default:
          return "Created";
      }
    };
    const fmtDate = (v) => {
      if (!v) return "-";
      return new Intl.DateTimeFormat("en", { month: "short", day: "2-digit", year: "numeric" }).format(new Date(v));
    };
    const fetchDocs = async () => {
      const orgId = auth.user?.org_id;
      const userId = auth.user?.user_id;
      if (!orgId || !userId) return;
      loading.value = true;
      try {
        const res = await $fetch("/api/employee/ledger", {
          params: { orgId, userId, scope: currentScope.value, limit: 200 }
        });
        docs.value = res.data ?? [];
      } catch (err) {
        console.error("[EmployeeDocs] fetchDocs:", err);
      } finally {
        loading.value = false;
      }
    };
    const reloadData = () => {
      fetchDocs();
    };
    const handleUploadSuccess = () => {
      isUploadOpen.value = false;
      fetchDocs();
    };
    const handleIssueUpdated = (payload) => {
      if (selectedDoc.value) {
        selectedDoc.value = {
          ...selectedDoc.value,
          tracking_status: payload.tracking_status
        };
      }
      const idx = docs.value.findIndex((d) => d.id === selectedDoc.value?.id);
      if (idx !== -1) {
        docs.value[idx] = {
          ...docs.value[idx],
          tracking_status: payload.tracking_status
        };
      }
    };
    return (_ctx, _push, _parent, _attrs) => {
      const _component_Icon = __nuxt_component_0;
      _push(`<section${ssrRenderAttrs(mergeProps({
        class: ["w-full max-w-[1800px] mx-auto space-y-6 pb-24 lg:pb-8", unref(isDark) ? "text-white" : "text-gray-900"]
      }, _attrs))} data-v-6e0e949a><div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between" data-v-6e0e949a><div data-v-6e0e949a><div class="mb-3 h-1 w-14 rounded-full bg-rich-orange" data-v-6e0e949a></div><h1 class="text-2xl font-bold tracking-tight sm:text-3xl" data-v-6e0e949a>Document Management</h1><p class="${ssrRenderClass([mutedText.value, "mt-1 text-sm"])}" data-v-6e0e949a>${ssrInterpolate(currentScope.value === "LOCAL" ? "Documents scoped to your sub-office branches." : "Organisation-wide document stream and analytics.")}</p></div><div class="flex flex-wrap items-center gap-3" data-v-6e0e949a><div class="${ssrRenderClass([unref(isDark) ? "bg-white/[0.04] border-white/10 backdrop-blur-md" : "bg-white border-gray-200 shadow-sm", "relative flex items-center gap-1 rounded-2xl border p-1.5"])}" data-v-6e0e949a><div class="absolute inset-y-1.5 rounded-xl bg-rich-orange shadow-lg shadow-rich-orange/30 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]" style="${ssrRenderStyle(indicatorStyle.value)}" data-v-6e0e949a></div><!--[-->`);
      ssrRenderList(scopeOptions, (opt) => {
        _push(`<button type="button" class="${ssrRenderClass([currentScope.value === opt.value ? "text-white" : unref(isDark) ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-700", "relative z-10 flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors duration-200 select-none"])}" data-v-6e0e949a>`);
        _push(ssrRenderComponent(_component_Icon, {
          name: opt.icon,
          class: "h-3.5 w-3.5 flex-none"
        }, null, _parent));
        _push(`<span class="whitespace-nowrap" data-v-6e0e949a>${ssrInterpolate(opt.label)}</span></button>`);
      });
      _push(`<!--]--></div><button type="button" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-rich-orange px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rich-orange/25 transition-all hover:bg-[#e95a0b] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-rich-orange/50" data-v-6e0e949a>`);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:upload-simple-bold",
        class: "h-4 w-4"
      }, null, _parent));
      _push(` Upload Document </button></div></div><div class="${ssrRenderClass([currentScope.value === "LOCAL" ? unref(isDark) ? "border-rich-orange/20 bg-rich-orange/5" : "border-orange-200 bg-orange-50" : unref(isDark) ? "border-white/10 bg-white/[0.03]" : "border-gray-200 bg-gray-50", "flex items-center gap-3 rounded-xl border px-4 py-3 text-sm"])}" data-v-6e0e949a><div class="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-rich-orange/10" data-v-6e0e949a>`);
      _push(ssrRenderComponent(_component_Icon, {
        name: currentScope.value === "LOCAL" ? "ph:buildings-fill" : "ph:globe-hemisphere-west-fill",
        class: "h-4 w-4 text-rich-orange"
      }, null, _parent));
      _push(`</div><div class="min-w-0 flex-1" data-v-6e0e949a><p class="text-[11px] font-bold uppercase tracking-widest text-rich-orange" data-v-6e0e949a>${ssrInterpolate(currentScope.value === "LOCAL" ? "Small Picture — Office View" : "Big Picture — Organisation View")}</p><p class="${ssrRenderClass([mutedText.value, "mt-0.5 text-xs"])}" data-v-6e0e949a>${ssrInterpolate(currentScope.value === "LOCAL" ? `Showing documents scoped to your ${myOffices.value.length} sub-office${myOffices.value.length !== 1 ? "s" : ""}.` : `Showing all ${docs.value.length} documents across the entire organisation.`)}</p></div><span class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border-rich-orange/30 text-rich-orange" data-v-6e0e949a><span class="h-1.5 w-1.5 animate-pulse rounded-full bg-rich-orange" data-v-6e0e949a></span> Live </span></div><div class="grid grid-cols-2 gap-4 sm:grid-cols-4" data-v-6e0e949a><!--[-->`);
      ssrRenderList(kpiCards.value, (card, i) => {
        _push(`<div class="${ssrRenderClass([glassSurface.value, "flex items-start gap-4 rounded-xl border p-5 backdrop-blur-sm transition-all"])}" style="${ssrRenderStyle({ transitionDelay: `${i * 40}ms` })}" data-v-6e0e949a><span class="${ssrRenderClass([card.iconBg, "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"])}" data-v-6e0e949a>`);
        _push(ssrRenderComponent(_component_Icon, {
          name: card.icon,
          class: ["h-5 w-5", card.iconColor]
        }, null, _parent));
        _push(`</span><div class="min-w-0" data-v-6e0e949a><p class="${ssrRenderClass([mutedText.value, "text-[10px] font-bold uppercase tracking-wider"])}" data-v-6e0e949a>${ssrInterpolate(card.label)}</p><p class="mt-1 text-2xl font-bold" data-v-6e0e949a>`);
        if (loading.value) {
          _push(`<span class="${ssrRenderClass([unref(isDark) ? "bg-white/10" : "bg-gray-200", "inline-block h-6 w-12 animate-pulse rounded-lg"])}" data-v-6e0e949a></span>`);
        } else {
          _push(`<span data-v-6e0e949a>${ssrInterpolate(card.value)}</span>`);
        }
        _push(`</p><p class="${ssrRenderClass([card.trendColor, "mt-0.5 text-[10px]"])}" data-v-6e0e949a>${ssrInterpolate(card.trend)}</p></div></div>`);
      });
      _push(`<!--]--></div><div class="${ssrRenderClass([glassSurface.value, "flex flex-col gap-3 rounded-xl border p-4 backdrop-blur-sm sm:flex-row sm:items-center"])}" data-v-6e0e949a><div class="${ssrRenderClass([unref(isDark) ? "border-white/10 bg-rich-black/40 focus-within:border-rich-orange" : "border-gray-200 bg-gray-50 focus-within:border-rich-orange", "flex flex-1 items-center gap-2 rounded-xl border px-3 py-2.5 transition-all"])}" data-v-6e0e949a>`);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:magnifying-glass",
        class: ["h-4 w-4 flex-none", mutedText.value]
      }, null, _parent));
      _push(`<input${ssrRenderAttr("value", search.value)} type="search" placeholder="Search by title or description…" class="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-gray-400" data-v-6e0e949a></div><select class="${ssrRenderClass([inputClass.value, "rounded-xl border px-3 py-2.5 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-rich-orange sm:w-56"])}" data-v-6e0e949a><option value="all" data-v-6e0e949a${ssrIncludeBooleanAttr(Array.isArray(officeFilter.value) ? ssrLooseContain(officeFilter.value, "all") : ssrLooseEqual(officeFilter.value, "all")) ? " selected" : ""}>All My Offices</option><option value="own" data-v-6e0e949a${ssrIncludeBooleanAttr(Array.isArray(officeFilter.value) ? ssrLooseContain(officeFilter.value, "own") : ssrLooseEqual(officeFilter.value, "own")) ? " selected" : ""}>My Uploads Only</option><!--[-->`);
      ssrRenderList(myOffices.value, (o) => {
        _push(`<option${ssrRenderAttr("value", String(o.id))} data-v-6e0e949a${ssrIncludeBooleanAttr(Array.isArray(officeFilter.value) ? ssrLooseContain(officeFilter.value, String(o.id)) : ssrLooseEqual(officeFilter.value, String(o.id))) ? " selected" : ""}>${ssrInterpolate(o.name)}</option>`);
      });
      _push(`<!--]--></select><select class="${ssrRenderClass([inputClass.value, "rounded-xl border px-3 py-2.5 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-rich-orange sm:w-44"])}" data-v-6e0e949a><option value="all" data-v-6e0e949a${ssrIncludeBooleanAttr(Array.isArray(statusFilter.value) ? ssrLooseContain(statusFilter.value, "all") : ssrLooseEqual(statusFilter.value, "all")) ? " selected" : ""}>All Statuses</option><option value="Pending" data-v-6e0e949a${ssrIncludeBooleanAttr(Array.isArray(statusFilter.value) ? ssrLooseContain(statusFilter.value, "Pending") : ssrLooseEqual(statusFilter.value, "Pending")) ? " selected" : ""}>Pending</option><option value="Processing" data-v-6e0e949a${ssrIncludeBooleanAttr(Array.isArray(statusFilter.value) ? ssrLooseContain(statusFilter.value, "Processing") : ssrLooseEqual(statusFilter.value, "Processing")) ? " selected" : ""}>Processing</option><option value="Approved" data-v-6e0e949a${ssrIncludeBooleanAttr(Array.isArray(statusFilter.value) ? ssrLooseContain(statusFilter.value, "Approved") : ssrLooseEqual(statusFilter.value, "Approved")) ? " selected" : ""}>Approved</option><option value="Rejected" data-v-6e0e949a${ssrIncludeBooleanAttr(Array.isArray(statusFilter.value) ? ssrLooseContain(statusFilter.value, "Rejected") : ssrLooseEqual(statusFilter.value, "Rejected")) ? " selected" : ""}>Rejected</option></select><select class="${ssrRenderClass([inputClass.value, "rounded-xl border px-3 py-2.5 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-rich-orange sm:w-44"])}" data-v-6e0e949a><option value="all" data-v-6e0e949a${ssrIncludeBooleanAttr(Array.isArray(trackingFilter.value) ? ssrLooseContain(trackingFilter.value, "all") : ssrLooseEqual(trackingFilter.value, "all")) ? " selected" : ""}>All Tracking</option><option value="CREATED" data-v-6e0e949a${ssrIncludeBooleanAttr(Array.isArray(trackingFilter.value) ? ssrLooseContain(trackingFilter.value, "CREATED") : ssrLooseEqual(trackingFilter.value, "CREATED")) ? " selected" : ""}>Created</option><option value="PICKED_UP" data-v-6e0e949a${ssrIncludeBooleanAttr(Array.isArray(trackingFilter.value) ? ssrLooseContain(trackingFilter.value, "PICKED_UP") : ssrLooseEqual(trackingFilter.value, "PICKED_UP")) ? " selected" : ""}>Picked Up</option><option value="IN_TRANSIT" data-v-6e0e949a${ssrIncludeBooleanAttr(Array.isArray(trackingFilter.value) ? ssrLooseContain(trackingFilter.value, "IN_TRANSIT") : ssrLooseEqual(trackingFilter.value, "IN_TRANSIT")) ? " selected" : ""}>In Transit</option><option value="ARRIVED_AT_OFFICE" data-v-6e0e949a${ssrIncludeBooleanAttr(Array.isArray(trackingFilter.value) ? ssrLooseContain(trackingFilter.value, "ARRIVED_AT_OFFICE") : ssrLooseEqual(trackingFilter.value, "ARRIVED_AT_OFFICE")) ? " selected" : ""}>At Office</option><option value="COMPLETED" data-v-6e0e949a${ssrIncludeBooleanAttr(Array.isArray(trackingFilter.value) ? ssrLooseContain(trackingFilter.value, "COMPLETED") : ssrLooseEqual(trackingFilter.value, "COMPLETED")) ? " selected" : ""}>Completed</option></select></div><article class="${ssrRenderClass([cardSurface.value, "overflow-hidden rounded-xl border shadow-card backdrop-blur-sm"])}" data-v-6e0e949a><div class="${ssrRenderClass([borderClass.value, "flex items-center justify-between border-b px-5 py-4"])}" data-v-6e0e949a><div data-v-6e0e949a><h2 class="text-base font-bold" data-v-6e0e949a>${ssrInterpolate(currentScope.value === "LOCAL" ? "Isolated Document Ledger" : "Organisation Document Directory")}</h2><p class="${ssrRenderClass([mutedText.value, "mt-0.5 text-xs"])}" data-v-6e0e949a>${ssrInterpolate(filtered.value.length)} document${ssrInterpolate(filtered.value.length === 1 ? "" : "s")} in scope </p></div><div class="flex items-center gap-2" data-v-6e0e949a><span class="${ssrRenderClass([currentScope.value === "LOCAL" ? "border-rich-orange/30 bg-rich-orange/5 text-rich-orange" : unref(isDark) ? "border-white/10 bg-white/5 text-gray-400" : "border-gray-200 bg-gray-50 text-gray-500", "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase"])}" data-v-6e0e949a>`);
      _push(ssrRenderComponent(_component_Icon, {
        name: currentScope.value === "LOCAL" ? "ph:buildings-fill" : "ph:globe-hemisphere-west-fill",
        class: "h-3 w-3"
      }, null, _parent));
      _push(` ${ssrInterpolate(currentScope.value === "LOCAL" ? "Office Scope" : "Org Scope")}</span>`);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:files-fill",
        class: "h-5 w-5 text-rich-orange"
      }, null, _parent));
      _push(`</div></div><div class="overflow-x-auto" data-v-6e0e949a><table class="min-w-full text-left text-sm" data-v-6e0e949a><thead class="${ssrRenderClass(unref(isDark) ? "bg-rich-black/50 text-gray-400" : "bg-gray-50 text-gray-500")}" data-v-6e0e949a><tr data-v-6e0e949a><th class="px-5 py-3 text-xs font-semibold uppercase tracking-wide" data-v-6e0e949a>Document</th><th class="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide" data-v-6e0e949a>Office</th><th class="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide" data-v-6e0e949a>Origin</th><th class="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide" data-v-6e0e949a>Source</th><th class="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide" data-v-6e0e949a>Tracking</th><th class="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide" data-v-6e0e949a>Date</th><th class="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide" data-v-6e0e949a>Status</th></tr></thead><tbody data-v-6e0e949a>`);
      if (loading.value) {
        _push(`<!--[-->`);
        ssrRenderList(5, (n) => {
          _push(`<tr class="${ssrRenderClass([borderClass.value, "border-t"])}" data-v-6e0e949a><td class="px-5 py-4" data-v-6e0e949a><div class="${ssrRenderClass([unref(isDark) ? "bg-white/10" : "bg-gray-200", "h-4 w-48 animate-pulse rounded-lg"])}" data-v-6e0e949a></div><div class="${ssrRenderClass([unref(isDark) ? "bg-white/5" : "bg-gray-100", "mt-1 h-3 w-32 animate-pulse rounded-lg"])}" data-v-6e0e949a></div></td><!--[-->`);
          ssrRenderList(6, (k) => {
            _push(`<td class="px-5 py-4" data-v-6e0e949a><div class="${ssrRenderClass([unref(isDark) ? "bg-white/10" : "bg-gray-200", "h-4 w-20 animate-pulse rounded-lg"])}" data-v-6e0e949a></div></td>`);
          });
          _push(`<!--]--></tr>`);
        });
        _push(`<!--]-->`);
      } else if (filtered.value.length) {
        _push(`<!--[-->`);
        ssrRenderList(filtered.value, (doc) => {
          _push(`<tr class="${ssrRenderClass([[borderClass.value, unref(isDark) ? "hover:bg-white/[0.03]" : "hover:bg-gray-50"], "cursor-pointer border-t transition-colors duration-150"])}" data-v-6e0e949a><td class="min-w-72 px-5 py-4" data-v-6e0e949a><div class="flex items-start gap-2" data-v-6e0e949a>`);
          if (doc.is_own_upload) {
            _push(`<div class="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-rich-orange/15" title="Your upload" data-v-6e0e949a>`);
            _push(ssrRenderComponent(_component_Icon, {
              name: "ph:user-fill",
              class: "h-2.5 w-2.5 text-rich-orange"
            }, null, _parent));
            _push(`</div>`);
          } else {
            _push(`<!---->`);
          }
          _push(`<div class="min-w-0" data-v-6e0e949a><p class="font-semibold" data-v-6e0e949a>${ssrInterpolate(doc.title)}</p><p class="${ssrRenderClass([mutedText.value, "mt-0.5 line-clamp-1 max-w-xs text-xs"])}" data-v-6e0e949a>${ssrInterpolate(doc.description || "—")}</p></div></div></td><td class="whitespace-nowrap px-5 py-4 text-xs" data-v-6e0e949a><span class="${ssrRenderClass([unref(isDark) ? "border-white/10 bg-white/5 text-gray-300" : "border-gray-200 bg-gray-50 text-gray-700", "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-semibold"])}" data-v-6e0e949a>`);
          _push(ssrRenderComponent(_component_Icon, {
            name: "ph:buildings-fill",
            class: "h-3 w-3 text-rich-orange"
          }, null, _parent));
          _push(` ${ssrInterpolate(doc.office_label || doc.current_label || "Unassigned")}</span></td><td class="${ssrRenderClass([mutedText.value, "whitespace-nowrap px-5 py-4 text-xs"])}" data-v-6e0e949a>${ssrInterpolate(doc.origin_label || "—")}</td><td class="whitespace-nowrap px-5 py-4" data-v-6e0e949a><span class="${ssrRenderClass([doc.is_own_upload ? "bg-rich-orange/10 text-rich-orange border-rich-orange/20" : unref(isDark) ? "bg-white/5 border-white/10 text-gray-400" : "bg-gray-100 border-gray-200 text-gray-600", "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold"])}" data-v-6e0e949a>${ssrInterpolate(doc.is_own_upload ? "My Upload" : "Routed In")}</span></td><td class="whitespace-nowrap px-5 py-4" data-v-6e0e949a><span class="${ssrRenderClass([trackingClass(doc.tracking_status), "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold"])}" data-v-6e0e949a><span class="${ssrRenderClass([doc.tracking_status === "IN_TRANSIT" ? "animate-pulse" : "", "h-1.5 w-1.5 rounded-full bg-current"])}" data-v-6e0e949a></span> ${ssrInterpolate(trackingLabel(doc.tracking_status))}</span></td><td class="${ssrRenderClass([mutedText.value, "whitespace-nowrap px-5 py-4 text-xs"])}" data-v-6e0e949a>${ssrInterpolate(fmtDate(doc.created_at))}</td><td class="whitespace-nowrap px-5 py-4" data-v-6e0e949a><span class="${ssrRenderClass([statusClass(doc.status), "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold"])}" data-v-6e0e949a><span class="${ssrRenderClass([doc.status === "Pending" ? "animate-pulse" : "", "h-1.5 w-1.5 rounded-full bg-current"])}" data-v-6e0e949a></span> ${ssrInterpolate(doc.status || "Pending")}</span></td></tr>`);
        });
        _push(`<!--]-->`);
      } else {
        _push(`<tr data-v-6e0e949a><td colspan="7" class="px-5 py-16 text-center" data-v-6e0e949a><div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rich-orange/10" data-v-6e0e949a>`);
        _push(ssrRenderComponent(_component_Icon, {
          name: "ph:file-dashed",
          class: "h-8 w-8 text-rich-orange"
        }, null, _parent));
        _push(`</div><p class="font-bold" data-v-6e0e949a>No documents in scope.</p><p class="${ssrRenderClass([mutedText.value, "mt-1 text-xs"])}" data-v-6e0e949a>${ssrInterpolate(currentScope.value === "LOCAL" ? "Upload a document from your office or adjust the office filter." : "No organisation documents found. Try adjusting the search.")}</p><button type="button" class="mt-4 inline-flex items-center gap-2 rounded-xl bg-rich-orange px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rich-orange/25 transition hover:bg-[#e95a0b]" data-v-6e0e949a>`);
        _push(ssrRenderComponent(_component_Icon, {
          name: "ph:upload-simple-bold",
          class: "h-4 w-4"
        }, null, _parent));
        _push(` Upload Document </button></td></tr>`);
      }
      _push(`</tbody></table></div></article>`);
      ssrRenderTeleport(_push, (_push2) => {
        if (selectedDoc.value) {
          _push2(`<div class="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm" data-v-6e0e949a></div>`);
        } else {
          _push2(`<!---->`);
        }
        if (selectedDoc.value) {
          _push2(`<aside class="${ssrRenderClass([unref(isDark) ? "bg-[#111111]/95 backdrop-blur-xl border-white/10" : "bg-white border-gray-200", "fixed bottom-0 right-0 top-0 z-[90] flex w-full lg:w-[60%] lg:max-w-4xl flex-col border-l shadow-2xl"])}" data-v-6e0e949a><header class="${ssrRenderClass([unref(isDark) ? "border-white/10" : "border-gray-200", "flex items-start justify-between gap-4 border-b px-6 py-5"])}" data-v-6e0e949a><div class="min-w-0" data-v-6e0e949a><div class="mb-1 h-0.5 w-8 rounded-full bg-rich-orange" data-v-6e0e949a></div><p class="text-[10px] font-bold uppercase tracking-widest text-rich-orange" data-v-6e0e949a>Document Detail</p><h2 class="${ssrRenderClass([unref(isDark) ? "text-white" : "text-gray-900", "mt-1 truncate text-lg font-bold"])}" data-v-6e0e949a>${ssrInterpolate(selectedDoc.value.title)}</h2></div><button type="button" class="${ssrRenderClass([unref(isDark) ? "text-gray-400 hover:bg-white/5" : "text-gray-400 hover:bg-gray-100", "inline-flex h-9 w-9 flex-none items-center justify-center rounded-xl transition"])}" data-v-6e0e949a>`);
          _push2(ssrRenderComponent(_component_Icon, {
            name: "ph:x-bold",
            class: "h-4 w-4"
          }, null, _parent));
          _push2(`</button></header><div class="flex min-h-0 flex-1 flex-col overflow-hidden" data-v-6e0e949a><div class="flex-1 space-y-5 overflow-y-auto px-6 py-6" data-v-6e0e949a><div class="flex flex-wrap gap-2" data-v-6e0e949a><span class="${ssrRenderClass([trackingClass(selectedDoc.value.tracking_status), "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold"])}" data-v-6e0e949a><span class="${ssrRenderClass([selectedDoc.value.tracking_status === "IN_TRANSIT" ? "animate-pulse" : "", "h-1.5 w-1.5 rounded-full bg-current"])}" data-v-6e0e949a></span> ${ssrInterpolate(trackingLabel(selectedDoc.value.tracking_status))}</span><span class="${ssrRenderClass([statusClass(selectedDoc.value.status), "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold"])}" data-v-6e0e949a><span class="${ssrRenderClass([selectedDoc.value.status === "Pending" ? "animate-pulse" : "", "h-1.5 w-1.5 rounded-full bg-current"])}" data-v-6e0e949a></span> ${ssrInterpolate(selectedDoc.value.status || "Pending")}</span><span class="${ssrRenderClass([selectedDoc.value.is_own_upload ? "bg-rich-orange/10 border-rich-orange/20 text-rich-orange" : unref(isDark) ? "bg-white/5 border-white/10 text-gray-400" : "bg-gray-100 border-gray-200 text-gray-600", "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold"])}" data-v-6e0e949a>${ssrInterpolate(selectedDoc.value.is_own_upload ? "My Upload" : "Routed In")}</span></div><div class="grid grid-cols-2 gap-3" data-v-6e0e949a><div class="${ssrRenderClass([metaCell.value, "rounded-xl border p-3"])}" data-v-6e0e949a><p class="text-[10px] font-bold uppercase tracking-wider text-rich-orange" data-v-6e0e949a>Current Office</p><p class="mt-1 text-sm font-semibold" data-v-6e0e949a>${ssrInterpolate(selectedDoc.value.office_label || selectedDoc.value.current_label || "Unassigned")}</p></div><div class="${ssrRenderClass([metaCell.value, "rounded-xl border p-3"])}" data-v-6e0e949a><p class="text-[10px] font-bold uppercase tracking-wider text-rich-orange" data-v-6e0e949a>Registered</p><p class="mt-1 text-sm font-semibold" data-v-6e0e949a>${ssrInterpolate(fmtDate(selectedDoc.value.created_at))}</p></div>`);
          if (selectedDoc.value.origin_label) {
            _push2(`<div class="${ssrRenderClass([metaCell.value, "rounded-xl border p-3"])}" data-v-6e0e949a><p class="text-[10px] font-bold uppercase tracking-wider text-rich-orange" data-v-6e0e949a>Origin Office</p><p class="mt-1 text-sm font-semibold" data-v-6e0e949a>${ssrInterpolate(selectedDoc.value.origin_label)}</p></div>`);
          } else {
            _push2(`<!---->`);
          }
          _push2(`<div class="${ssrRenderClass([metaCell.value, "rounded-xl border p-3"])}"${ssrRenderAttr("class-list", selectedDoc.value.origin_label ? "" : "col-span-2")} data-v-6e0e949a><p class="text-[10px] font-bold uppercase tracking-wider text-rich-orange" data-v-6e0e949a>Stage / Route</p><p class="mt-1 text-sm font-semibold" data-v-6e0e949a>${ssrInterpolate(detailStageName.value || "Unassigned")}</p></div></div>`);
          if (selectedDoc.value.description) {
            _push2(`<div class="${ssrRenderClass([metaCell.value, "rounded-xl border p-4"])}" data-v-6e0e949a><p class="mb-2 text-[10px] font-bold uppercase tracking-wider text-rich-orange" data-v-6e0e949a>Description</p><p class="${ssrRenderClass([mutedText.value, "text-sm leading-relaxed"])}" data-v-6e0e949a>${ssrInterpolate(selectedDoc.value.description)}</p></div>`);
          } else {
            _push2(`<!---->`);
          }
          _push2(`<div class="${ssrRenderClass([unref(isDark) ? "border-white/10 bg-[#0a0a0a]" : "border-gray-200 bg-gray-50", "rounded-xl border p-4"])}" data-v-6e0e949a><p class="mb-3 text-[10px] font-bold uppercase tracking-wider text-rich-orange" data-v-6e0e949a>QR Tracking Code</p><div class="flex items-center gap-4" data-v-6e0e949a><div class="flex h-[110px] w-[110px] flex-none items-center justify-center rounded-xl bg-white p-2 shadow-sm" data-v-6e0e949a>`);
          if (detailQrUrl.value) {
            _push2(`<img${ssrRenderAttr("src", detailQrUrl.value)} alt="Document QR" class="h-full w-full" data-v-6e0e949a>`);
          } else {
            _push2(ssrRenderComponent(_component_Icon, {
              name: "ph:qr-code",
              class: "h-10 w-10 text-gray-300"
            }, null, _parent));
          }
          _push2(`</div><div class="min-w-0" data-v-6e0e949a><p class="${ssrRenderClass([unref(isDark) ? "text-gray-200" : "text-gray-800", "break-all font-mono text-sm"])}" data-v-6e0e949a>${ssrInterpolate(selectedDoc.value.qr_code_data || "N/A")}</p><p class="${ssrRenderClass([mutedText.value, "mt-2 text-xs"])}" data-v-6e0e949a> Scan to link physical hard-copy to this digital record. </p></div></div></div><section data-v-6e0e949a><div class="mb-4 flex items-center gap-2 text-sm font-semibold text-rich-orange" data-v-6e0e949a>`);
          _push2(ssrRenderComponent(_component_Icon, {
            name: "ph:path",
            class: "h-4 w-4"
          }, null, _parent));
          _push2(` Fulfillment Pipeline </div>`);
          if (detailSteps.value.length) {
            _push2(`<div class="mb-4" data-v-6e0e949a><div class="${ssrRenderClass([mutedText.value, "mb-1.5 flex items-center justify-between text-[10px] font-semibold"])}" data-v-6e0e949a><span data-v-6e0e949a>Progress</span><span data-v-6e0e949a>${ssrInterpolate(detailProgressPct.value)}%</span></div><div class="${ssrRenderClass([unref(isDark) ? "bg-white/10" : "bg-gray-200", "h-1.5 w-full overflow-hidden rounded-full"])}" data-v-6e0e949a><div class="h-full rounded-full bg-rich-orange transition-all duration-700" style="${ssrRenderStyle({ width: `${detailProgressPct.value}%` })}" data-v-6e0e949a></div></div></div>`);
          } else {
            _push2(`<!---->`);
          }
          if (detailSteps.value.length) {
            _push2(`<div class="relative space-y-0" data-v-6e0e949a><!--[-->`);
            ssrRenderList(detailSteps.value, (step, idx) => {
              _push2(`<div class="relative flex gap-4 pb-6 last:pb-0" data-v-6e0e949a>`);
              if (idx < detailSteps.value.length - 1) {
                _push2(`<div class="${ssrRenderClass([isStepDone(step) ? "bg-rich-orange" : unref(isDark) ? "bg-white/10" : "bg-gray-200", "absolute left-[15px] top-8 h-full w-0.5"])}" data-v-6e0e949a></div>`);
              } else {
                _push2(`<!---->`);
              }
              _push2(`<div class="${ssrRenderClass([stepNodeClass(step), "relative z-10 flex h-8 w-8 flex-none items-center justify-center rounded-full border text-xs font-bold transition"])}" data-v-6e0e949a>`);
              if (isStepDone(step)) {
                _push2(ssrRenderComponent(_component_Icon, {
                  name: "ph:check-bold",
                  class: "h-4 w-4"
                }, null, _parent));
              } else {
                _push2(`<span data-v-6e0e949a>${ssrInterpolate(step.step_number)}</span>`);
              }
              _push2(`</div><div class="min-w-0 flex-1 pt-1" data-v-6e0e949a><p class="${ssrRenderClass([isStepUpcoming(step) ? mutedText.value : unref(isDark) ? "text-white" : "text-gray-900", "text-sm font-semibold"])}" data-v-6e0e949a>${ssrInterpolate(step.office_name)}</p><p class="${ssrRenderClass([stepLabelClass(step), "mt-0.5 text-xs"])}" data-v-6e0e949a>${ssrInterpolate(stepStateLabel(step))} · Step ${ssrInterpolate(step.step_number)}</p></div></div>`);
            });
            _push2(`<!--]--></div>`);
          } else {
            _push2(`<div class="${ssrRenderClass([unref(isDark) ? "border-white/10 text-gray-500" : "border-gray-200 text-gray-400", "rounded-xl border border-dashed p-6 text-center text-sm"])}" data-v-6e0e949a> No workflow steps mapped to this document&#39;s stage. </div>`);
          }
          _push2(`</section></div>`);
          _push2(ssrRenderComponent(DocumentIssueChatPanel, {
            document: selectedDoc.value,
            offices: myOffices.value,
            onUpdated: handleIssueUpdated
          }, null, _parent));
          _push2(`</div></aside>`);
        } else {
          _push2(`<!---->`);
        }
      }, "body", false, _parent);
      _push(ssrRenderComponent(EmployeeDocUploadModal, {
        "is-open": isUploadOpen.value,
        offices: myOffices.value,
        scope: currentScope.value,
        onClose: ($event) => isUploadOpen.value = false,
        onUploaded: handleUploadSuccess
      }, null, _parent));
      _push(`</section>`);
    };
  }
});
const _sfc_setup$1 = _sfc_main$1.setup;
_sfc_main$1.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/employee/documents/index.vue");
  return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
const EmployeeDocumentsPage = /* @__PURE__ */ Object.assign(_export_sfc(_sfc_main$1, [["__scopeId", "data-v-6e0e949a"]]), { __name: "EmployeeDocuments" });
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "index",
  __ssrInlineRender: true,
  setup(__props) {
    return (_ctx, _push, _parent, _attrs) => {
      _push(ssrRenderComponent(EmployeeDocumentsPage, _attrs, null, _parent));
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/employee/documents/index.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=index-CZksupeG.mjs.map
