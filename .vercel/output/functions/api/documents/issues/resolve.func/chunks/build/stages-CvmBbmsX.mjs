import { defineComponent, ref, reactive, computed, mergeProps, unref, useSSRContext } from 'vue';
import { ssrRenderComponent, ssrRenderAttrs, ssrRenderClass, ssrInterpolate, ssrRenderList, ssrIncludeBooleanAttr, ssrRenderTeleport, ssrRenderAttr } from 'vue/server-renderer';
import __nuxt_component_0 from './index-CSZJBLRw.mjs';
import { _ as _export_sfc, a as useAuthStore, u as useTheme } from './server.mjs';
import { u as useOfficeStore } from './office-DcDivY2T.mjs';
import { u as useStageStore } from './stage-DmVB2S1_.mjs';
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
import '@vue/shared';

const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "stageComp",
  __ssrInlineRender: true,
  setup(__props) {
    const authStore = useAuthStore();
    const officeStore = useOfficeStore();
    const stageStore = useStageStore();
    const { isDark } = useTheme();
    ref(null);
    const dropTargetStageId = ref(null);
    const isStageDrawerOpen = ref(false);
    const isWorkflowDropTarget = ref(false);
    ref(null);
    ref(null);
    const selectedWorkflowOffices = ref([]);
    const stageForm = reactive({
      name: ""
    });
    const fallbackOrg = {
      name: "FlowVision Operations",
      code: "FV-OPS"
    };
    const currentOrgName = computed(() => authStore.currentOrg?.name || fallbackOrg.name);
    const currentOrgCode = computed(() => authStore.currentOrg?.code || fallbackOrg.code);
    const organizationLabel = computed(() => `${currentOrgName.value} / ${currentOrgCode.value}`);
    const sortedStages = computed(() => stageStore.sortedStages);
    const surfaceClass = computed(() => isDark.value ? "border-card-border bg-[#1A1A1A] shadow-card-dark" : "border-gray-200 bg-white");
    const borderClass = computed(() => isDark.value ? "border-card-border" : "border-gray-200");
    const mutedTextClass = computed(() => isDark.value ? "text-gray-400" : "text-gray-500");
    const inputClass = computed(() => isDark.value ? "border-card-border bg-rich-black text-white placeholder:text-gray-500" : "border-gray-200 bg-white text-rich-black placeholder:text-gray-400");
    const getStageSequence = (stageId) => {
      return stageStore.stageOfficeSequences[stageId] || [];
    };
    const getOfficeName = (officeId) => {
      return officeStore.offices.find((office) => Number(office.id) === Number(officeId))?.name || "Unknown office";
    };
    const getUserName = (userId) => {
      return officeStore.usersUnderOrg.find((user) => Number(user.user_id) === Number(userId))?.full_name || "Unassigned";
    };
    return (_ctx, _push, _parent, _attrs) => {
      const _component_Icon = __nuxt_component_0;
      _push(`<section${ssrRenderAttrs(mergeProps({
        class: ["w-full space-y-6 pb-24 lg:pb-8", unref(isDark) ? "text-white" : "text-rich-black"]
      }, _attrs))} data-v-fb9129d7><div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between" data-v-fb9129d7><div data-v-fb9129d7><div class="mb-3 h-1 w-14 rounded-full bg-rich-orange" data-v-fb9129d7></div><h1 class="text-2xl font-bold tracking-tight sm:text-3xl" data-v-fb9129d7>Sequential Stage Builder</h1><p class="${ssrRenderClass([mutedTextClass.value, "mt-1 text-sm"])}" data-v-fb9129d7>${ssrInterpolate(organizationLabel.value)} / asynchronous office milestones </p></div><button type="button" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-rich-orange px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-rich-orange/20 transition hover:bg-[#e95a0b] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-rich-orange" data-v-fb9129d7>`);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:plus-bold",
        class: "h-4 w-4"
      }, null, _parent));
      _push(` Create Stage </button></div><div class="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full" data-v-fb9129d7><aside class="w-full" data-v-fb9129d7><article class="${ssrRenderClass([surfaceClass.value, "rounded-lg border p-5 shadow-card"])}" data-v-fb9129d7><div class="mb-4 flex items-center justify-between gap-3" data-v-fb9129d7><div data-v-fb9129d7><h2 class="text-base font-semibold" data-v-fb9129d7>Available Offices</h2><p class="${ssrRenderClass([mutedTextClass.value, "mt-1 text-xs"])}" data-v-fb9129d7> Offices can be reused across multiple stages. </p></div>`);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:buildings",
        class: "h-5 w-5 text-rich-orange"
      }, null, _parent));
      _push(`</div><div class="space-y-3" data-v-fb9129d7><!--[-->`);
      ssrRenderList(unref(officeStore).offices, (office) => {
        _push(`<div class="${ssrRenderClass([unref(isDark) ? "border-card-border bg-rich-black/40" : "border-gray-200 bg-gray-50", "w-full rounded-lg border p-3 transition hover:border-rich-orange/70"])}" draggable="true" data-v-fb9129d7><div class="w-full flex items-center justify-between gap-3" data-v-fb9129d7><div class="min-w-0" data-v-fb9129d7><p class="truncate text-sm font-semibold" data-v-fb9129d7>${ssrInterpolate(office.name)}</p><p class="${ssrRenderClass([mutedTextClass.value, "mt-1 truncate text-xs"])}" data-v-fb9129d7>${ssrInterpolate(getUserName(office.assigned_user))}</p></div>`);
        _push(ssrRenderComponent(_component_Icon, {
          name: "ph:dots-six-vertical-bold",
          class: "mt-0.5 h-4 w-4 flex-none text-rich-orange"
        }, null, _parent));
        _push(`</div><div class="mt-3 grid grid-cols-1 gap-2" data-v-fb9129d7><!--[-->`);
        ssrRenderList(sortedStages.value, (stage) => {
          _push(`<button type="button" class="${ssrRenderClass([unref(isDark) ? "border-card-border bg-card-dark" : "border-gray-200 bg-white", "rounded-md border px-2.5 py-2 text-left text-xs font-semibold transition hover:border-rich-orange hover:text-rich-orange"])}" data-v-fb9129d7> Add to ${ssrInterpolate(stage.name)}</button>`);
        });
        _push(`<!--]--></div></div>`);
      });
      _push(`<!--]-->`);
      if (!unref(officeStore).offices.length) {
        _push(`<div class="${ssrRenderClass([[borderClass.value, mutedTextClass.value], "rounded-lg border border-dashed p-6 text-center text-sm"])}" data-v-fb9129d7> Create offices first, then map them into stage timelines. </div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div></article></aside><div class="w-full space-y-5 lg:col-span-2" data-v-fb9129d7><!--[-->`);
      ssrRenderList(sortedStages.value, (stage) => {
        _push(`<article class="${ssrRenderClass([[surfaceClass.value, dropTargetStageId.value === stage.stage_id ? "border-rich-orange ring-2 ring-rich-orange/30" : ""], "rounded-lg border shadow-card transition"])}" data-v-fb9129d7><header class="${ssrRenderClass([borderClass.value, "flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between"])}" data-v-fb9129d7><div class="flex items-center gap-3" data-v-fb9129d7><div class="flex h-10 w-10 items-center justify-center rounded-full bg-rich-orange text-sm font-bold text-white" data-v-fb9129d7>${ssrInterpolate(stage.step_number)}</div><div data-v-fb9129d7><h2 class="text-lg font-bold" data-v-fb9129d7>${ssrInterpolate(stage.name)}</h2><p class="${ssrRenderClass([mutedTextClass.value, "text-xs"])}" data-v-fb9129d7>${ssrInterpolate(getStageSequence(stage.stage_id).length)} office milestones mapped </p></div></div><div class="flex items-center gap-2" data-v-fb9129d7><button type="button" class="inline-flex h-9 w-9 items-center justify-center rounded-lg transition hover:bg-rich-orange/10 hover:text-rich-orange" title="Move stage up" data-v-fb9129d7>`);
        _push(ssrRenderComponent(_component_Icon, {
          name: "ph:arrow-up-bold",
          class: "h-4 w-4"
        }, null, _parent));
        _push(`</button><button type="button" class="inline-flex h-9 w-9 items-center justify-center rounded-lg transition hover:bg-rich-orange/10 hover:text-rich-orange" title="Move stage down" data-v-fb9129d7>`);
        _push(ssrRenderComponent(_component_Icon, {
          name: "ph:arrow-down-bold",
          class: "h-4 w-4"
        }, null, _parent));
        _push(`</button><button type="button" class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-500/10" title="Delete stage" data-v-fb9129d7>`);
        _push(ssrRenderComponent(_component_Icon, {
          name: "ph:trash",
          class: "h-4 w-4"
        }, null, _parent));
        _push(`</button></div></header><div class="p-5" data-v-fb9129d7><div class="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-rich-orange" data-v-fb9129d7><span class="h-px flex-1 bg-rich-orange/30" data-v-fb9129d7></span> Flow path <span class="h-px flex-1 bg-rich-orange/30" data-v-fb9129d7></span></div><div class="space-y-3" data-v-fb9129d7><!--[-->`);
        ssrRenderList(getStageSequence(stage.stage_id), (item, index) => {
          _push(`<div class="${ssrRenderClass([unref(isDark) ? "border-card-border bg-rich-black/50" : "border-gray-200 bg-gray-50", "w-full flex flex-col gap-3 rounded-lg border p-3 transition sm:flex-row sm:items-center sm:justify-between"])}" data-v-fb9129d7><div class="flex min-w-0 flex-1 items-center gap-3" data-v-fb9129d7><div class="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-rich-orange text-xs font-bold text-white" data-v-fb9129d7>${ssrInterpolate(item.step_number)}</div><div class="min-w-0" data-v-fb9129d7><p class="truncate text-sm font-semibold" data-v-fb9129d7>${ssrInterpolate(getOfficeName(item.office_id))}</p><p class="${ssrRenderClass([mutedTextClass.value, "text-xs"])}" data-v-fb9129d7> Stage sequence step ${ssrInterpolate(item.step_number)}</p></div></div><div class="flex items-center justify-end gap-1" data-v-fb9129d7><button type="button" class="inline-flex h-9 w-9 items-center justify-center rounded-lg transition hover:bg-rich-orange/10 hover:text-rich-orange"${ssrIncludeBooleanAttr(index === 0) ? " disabled" : ""} data-v-fb9129d7>`);
          _push(ssrRenderComponent(_component_Icon, {
            name: "ph:caret-up-bold",
            class: "h-4 w-4"
          }, null, _parent));
          _push(`</button><button type="button" class="inline-flex h-9 w-9 items-center justify-center rounded-lg transition hover:bg-rich-orange/10 hover:text-rich-orange"${ssrIncludeBooleanAttr(index === getStageSequence(stage.stage_id).length - 1) ? " disabled" : ""} data-v-fb9129d7>`);
          _push(ssrRenderComponent(_component_Icon, {
            name: "ph:caret-down-bold",
            class: "h-4 w-4"
          }, null, _parent));
          _push(`</button><button type="button" class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-500/10" data-v-fb9129d7>`);
          _push(ssrRenderComponent(_component_Icon, {
            name: "ph:x-bold",
            class: "h-4 w-4"
          }, null, _parent));
          _push(`</button></div></div>`);
        });
        _push(`<!--]-->`);
        if (!getStageSequence(stage.stage_id).length) {
          _push(`<div class="${ssrRenderClass([dropTargetStageId.value === stage.stage_id ? "border-rich-orange bg-rich-orange/10 text-rich-orange" : [borderClass.value, mutedTextClass.value], "rounded-lg border border-dashed p-8 text-center text-sm transition"])}" data-v-fb9129d7> Drag an office here or use an Add button from the office pool. </div>`);
        } else {
          _push(`<!---->`);
        }
        _push(`</div></div></article>`);
      });
      _push(`<!--]-->`);
      if (!sortedStages.value.length) {
        _push(`<div class="${ssrRenderClass([[surfaceClass.value, borderClass.value], "rounded-lg border border-dashed p-10 text-center"])}" data-v-fb9129d7>`);
        _push(ssrRenderComponent(_component_Icon, {
          name: "ph:path-bold",
          class: "mx-auto mb-3 h-12 w-12 text-rich-orange"
        }, null, _parent));
        _push(`<h2 class="text-lg font-bold" data-v-fb9129d7>No stages yet</h2><p class="${ssrRenderClass([mutedTextClass.value, "mt-1 text-sm"])}" data-v-fb9129d7> Create a stage, then build its office route sequence before saving. </p></div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div></div>`);
      ssrRenderTeleport(_push, (_push2) => {
        if (isStageDrawerOpen.value) {
          _push2(`<div class="fixed inset-0 z-[80] bg-black/55 backdrop-blur-sm" data-v-fb9129d7></div>`);
        } else {
          _push2(`<!---->`);
        }
        if (isStageDrawerOpen.value) {
          _push2(`<form class="${ssrRenderClass([surfaceClass.value, "fixed bottom-0 right-0 top-0 z-[90] flex w-full max-w-xl flex-col border-l shadow-2xl"])}" data-v-fb9129d7><header class="${ssrRenderClass([borderClass.value, "border-b px-5 py-5"])}" data-v-fb9129d7><p class="text-xs font-semibold uppercase tracking-wide text-rich-orange" data-v-fb9129d7>Workflow</p><h2 class="mt-1 text-xl font-bold" data-v-fb9129d7>Create Stage</h2><p class="${ssrRenderClass([mutedTextClass.value, "mt-1 text-xs"])}" data-v-fb9129d7> Step order is computed automatically from your route sequence. </p></header><div class="flex-1 space-y-6 overflow-y-auto px-5 py-5" data-v-fb9129d7><label class="block" data-v-fb9129d7><span class="text-sm font-semibold" data-v-fb9129d7>Stage Name</span><input${ssrRenderAttr("value", stageForm.name)} type="text" placeholder="e.g. Quality Review" class="${ssrRenderClass([inputClass.value, "mt-2 w-full rounded-lg border px-4 py-3 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-rich-orange"])}" required data-v-fb9129d7></label><section data-v-fb9129d7><div class="mb-3 flex items-center justify-between gap-3" data-v-fb9129d7><div data-v-fb9129d7><h3 class="text-sm font-semibold" data-v-fb9129d7>Available Offices</h3><p class="${ssrRenderClass([mutedTextClass.value, "mt-1 text-xs"])}" data-v-fb9129d7> Click or drag an office into the route sequence below. </p></div>`);
          _push2(ssrRenderComponent(_component_Icon, {
            name: "ph:buildings",
            class: "h-4 w-4 text-rich-orange"
          }, null, _parent));
          _push2(`</div><div class="space-y-2" data-v-fb9129d7><!--[-->`);
          ssrRenderList(unref(officeStore).offices, (office) => {
            _push2(`<button type="button" draggable="true" class="${ssrRenderClass([unref(isDark) ? "border-card-border bg-rich-black/40" : "border-gray-200 bg-gray-50", "flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition hover:border-rich-orange/70 hover:bg-rich-orange/5"])}" data-v-fb9129d7><span class="truncate font-semibold" data-v-fb9129d7>${ssrInterpolate(office.name)}</span>`);
            _push2(ssrRenderComponent(_component_Icon, {
              name: "ph:plus-circle",
              class: "h-4 w-4 flex-none text-rich-orange"
            }, null, _parent));
            _push2(`</button>`);
          });
          _push2(`<!--]-->`);
          if (!unref(officeStore).offices.length) {
            _push2(`<div class="${ssrRenderClass([[borderClass.value, mutedTextClass.value], "rounded-lg border border-dashed p-4 text-center text-xs"])}" data-v-fb9129d7> No offices available. Create offices first. </div>`);
          } else {
            _push2(`<!---->`);
          }
          _push2(`</div></section><section data-v-fb9129d7><div class="mb-3 flex items-center justify-between gap-3" data-v-fb9129d7><div data-v-fb9129d7><h3 class="text-sm font-semibold" data-v-fb9129d7>Selected Route Sequence</h3><p class="${ssrRenderClass([mutedTextClass.value, "mt-1 text-xs"])}" data-v-fb9129d7>${ssrInterpolate(selectedWorkflowOffices.value.length)} milestone${ssrInterpolate(selectedWorkflowOffices.value.length === 1 ? "" : "s")} in order </p></div>`);
          _push2(ssrRenderComponent(_component_Icon, {
            name: "ph:path-bold",
            class: "h-4 w-4 text-rich-orange"
          }, null, _parent));
          _push2(`</div><div class="${ssrRenderClass([[
            unref(isDark) ? "border-card-border bg-rich-black/30" : "border-gray-200 bg-gray-50",
            isWorkflowDropTarget.value ? "border-rich-orange ring-2 ring-rich-orange/30" : ""
          ], "min-h-32 space-y-2 rounded-lg border p-3 transition"])}" data-v-fb9129d7><!--[-->`);
          ssrRenderList(selectedWorkflowOffices.value, (item, index) => {
            _push2(`<div draggable="true" class="${ssrRenderClass([unref(isDark) ? "border-card-border bg-card-dark" : "border-gray-200 bg-white", "flex items-center gap-3 rounded-lg border p-3 transition"])}" data-v-fb9129d7>`);
            _push2(ssrRenderComponent(_component_Icon, {
              name: "ph:dots-six-vertical-bold",
              class: "h-4 w-4 flex-none cursor-grab text-rich-orange"
            }, null, _parent));
            _push2(`<div class="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-rich-orange text-xs font-bold text-white" data-v-fb9129d7>${ssrInterpolate(item.step_number)}</div><div class="min-w-0 flex-1" data-v-fb9129d7><p class="truncate text-sm font-semibold" data-v-fb9129d7>${ssrInterpolate(item.name)}</p><p class="${ssrRenderClass([mutedTextClass.value, "text-xs"])}" data-v-fb9129d7>Auto step ${ssrInterpolate(item.step_number)}</p></div><div class="flex items-center gap-1" data-v-fb9129d7><button type="button" class="inline-flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-rich-orange/10 hover:text-rich-orange"${ssrIncludeBooleanAttr(index === 0) ? " disabled" : ""} title="Move up" data-v-fb9129d7>`);
            _push2(ssrRenderComponent(_component_Icon, {
              name: "ph:caret-up-bold",
              class: "h-4 w-4"
            }, null, _parent));
            _push2(`</button><button type="button" class="inline-flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-rich-orange/10 hover:text-rich-orange"${ssrIncludeBooleanAttr(index === selectedWorkflowOffices.value.length - 1) ? " disabled" : ""} title="Move down" data-v-fb9129d7>`);
            _push2(ssrRenderComponent(_component_Icon, {
              name: "ph:caret-down-bold",
              class: "h-4 w-4"
            }, null, _parent));
            _push2(`</button><button type="button" class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-500/10" title="Remove" data-v-fb9129d7>`);
            _push2(ssrRenderComponent(_component_Icon, {
              name: "ph:x-bold",
              class: "h-4 w-4"
            }, null, _parent));
            _push2(`</button></div></div>`);
          });
          _push2(`<!--]-->`);
          if (!selectedWorkflowOffices.value.length) {
            _push2(`<div class="${ssrRenderClass([[borderClass.value, mutedTextClass.value], "rounded-lg border border-dashed p-6 text-center text-xs"])}" data-v-fb9129d7> Drop or click offices above to build the route sequence. </div>`);
          } else {
            _push2(`<!---->`);
          }
          _push2(`</div></section></div><footer class="${ssrRenderClass([borderClass.value, "flex justify-end gap-3 border-t px-5 py-4"])}" data-v-fb9129d7><button type="button" class="${ssrRenderClass([borderClass.value, "rounded-lg border px-4 py-2.5 text-sm font-semibold transition hover:bg-black/5 dark:hover:bg-white/5"])}" data-v-fb9129d7> Cancel </button><button type="submit" class="rounded-lg bg-rich-orange px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e95a0b]" data-v-fb9129d7> Create Stage </button></footer></form>`);
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
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/client/stages/stageComp.vue");
  return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
const StageView = /* @__PURE__ */ Object.assign(_export_sfc(_sfc_main$1, [["__scopeId", "data-v-fb9129d7"]]), { __name: "ClientStagesStageComp" });
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "stages",
  __ssrInlineRender: true,
  setup(__props) {
    return (_ctx, _push, _parent, _attrs) => {
      _push(ssrRenderComponent(StageView, _attrs, null, _parent));
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/client/stages.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=stages-CvmBbmsX.mjs.map
