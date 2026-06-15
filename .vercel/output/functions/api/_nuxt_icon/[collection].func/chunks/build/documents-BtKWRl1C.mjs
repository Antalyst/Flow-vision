import { defineComponent, ref, computed, mergeProps, unref, watch, useSSRContext } from 'vue';
import { ssrRenderComponent, ssrRenderAttrs, ssrRenderClass, ssrRenderAttr, ssrIncludeBooleanAttr, ssrLooseContain, ssrLooseEqual, ssrRenderList, ssrInterpolate, ssrRenderTeleport, ssrRenderStyle } from 'vue/server-renderer';
import __nuxt_component_0 from './index-BRIQYxw1.mjs';
import { a as useAuthStore, b as useTheme, _ as _export_sfc } from './server.mjs';
import { u as useOfficeStore } from './office-DcDivY2T.mjs';
import { u as useStageStore } from './stage-DmVB2S1_.mjs';
import { defineStore } from 'pinia';
import QRCode from 'qrcode';
import { D as DocumentLivePreview, a as DocumentPrintCanvas } from './documentLivePreview-DDUjJXsW.mjs';
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
import 'vue-router';
import '@supabase/ssr';
import 'pdf-lib';
import 'docx-preview';

const ALLOWED_ROLES = ["client", "employee"];
const useDocumentStore = defineStore("document", {
  state: () => ({
    documents: [],
    loading: false,
    uploading: false,
    lastAnalysis: null
  }),
  getters: {
    currentOrgIdRaw() {
      const authStore = useAuthStore();
      const orgId = authStore.currentOrg?.org_id ?? authStore.user?.org_id;
      if (orgId == null || orgId === "") return null;
      return String(orgId);
    },
    canUploadDocuments() {
      const authStore = useAuthStore();
      const role = authStore.user?.role;
      return !!authStore.isLoggedIn && !!role && ALLOWED_ROLES.includes(role);
    }
  },
  actions: {
    async fetchDocuments() {
      const orgId = this.currentOrgIdRaw;
      if (!orgId) {
        console.warn("[Document Store]: skipped fetch — no org_id");
        return [];
      }
      this.loading = true;
      try {
        const res = await $fetch("/api/documents", {
          params: { orgId }
        });
        this.documents = res?.data ?? [];
        return this.documents;
      } catch (error) {
        console.error("Error fetching documents:", error);
        return [];
      } finally {
        this.loading = false;
      }
    },
    async uploadDocument(file, options) {
      if (!this.canUploadDocuments) {
        return { success: false, error: "You are not permitted to upload documents." };
      }
      const org_id = this.currentOrgIdRaw;
      if (!org_id) {
        return { success: false, error: "Missing organization ID." };
      }
      if (!file) {
        return { success: false, error: "No file selected." };
      }
      const {
        officeId = null,
        stageId = null,
        qrCode = null,
        printStrategy = null,
        stickerSize = null
      } = options || {};
      const formData = new FormData();
      formData.append("file", file);
      formData.append("org_id", org_id);
      if (officeId != null && officeId !== "") {
        formData.append("office_id", String(officeId));
      }
      if (stageId != null && stageId !== "") {
        formData.append("stage_id", String(stageId));
      }
      if (qrCode != null && qrCode !== "") {
        formData.append("qr_code_data", String(qrCode));
      }
      if (printStrategy != null && printStrategy !== "") {
        formData.append("print_strategy", String(printStrategy));
      }
      if (stickerSize != null && stickerSize !== "") {
        formData.append("sticker_size", String(stickerSize));
      }
      this.uploading = true;
      try {
        const res = await $fetch("/api/documents/upload", {
          method: "POST",
          body: formData
        });
        if (res?.success && res.metadata) {
          this.documents.unshift(res.metadata);
          this.lastAnalysis = {
            title: res.metadata.title,
            description: res.metadata.description
          };
          return { success: true, data: res.metadata };
        }
        return { success: false, error: res?.message || "Upload failed" };
      } catch (error) {
        console.error("Error uploading document:", error);
        return {
          success: false,
          error: error?.data?.message || error?.message || "Upload failed"
        };
      } finally {
        this.uploading = false;
      }
    },
    clearLastAnalysis() {
      this.lastAnalysis = null;
    }
  }
});
const _sfc_main$3 = /* @__PURE__ */ defineComponent({
  __name: "documentUploadModal",
  __ssrInlineRender: true,
  props: {
    isOpen: { type: Boolean },
    officeId: {}
  },
  emits: ["close", "uploaded"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const documentStore = useDocumentStore();
    const stageStore = useStageStore();
    const { isDark } = useTheme();
    ref(null);
    const selectedFile = ref(null);
    const selectedStageId = ref("");
    const selectedStrategy = ref("embedded");
    const selectedQrSize = ref(120);
    const currentTrackingId = ref("");
    const isDragging = ref(false);
    const errorMessage = ref("");
    const printQrDataUrl = ref("");
    watch(
      () => props.isOpen,
      (open) => {
        if (open && !stageStore.stages.length) {
          stageStore.fetchStages();
        }
      }
    );
    const surfaceClass = computed(
      () => isDark.value ? "border-card-border bg-[#1A1A1A] shadow-card-dark" : "border-gray-200 bg-white"
    );
    const borderClass = computed(() => isDark.value ? "border-card-border" : "border-gray-200");
    const mutedTextClass = computed(() => isDark.value ? "text-gray-400" : "text-gray-500");
    const headingClass = computed(() => isDark.value ? "text-white" : "text-rich-black");
    const inputClass = computed(
      () => isDark.value ? "border-card-border bg-rich-black text-white placeholder:text-gray-500" : "border-gray-200 bg-white text-rich-black placeholder:text-gray-400"
    );
    const optionStyle = computed(
      () => isDark.value ? { backgroundColor: "#1A1A1A", color: "#ffffff" } : { backgroundColor: "#ffffff", color: "#121212" }
    );
    const canSubmit = computed(
      () => documentStore.canUploadDocuments && !!selectedFile.value && !!selectedStageId.value && !documentStore.uploading
    );
    const formatSize = (bytes) => {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };
    return (_ctx, _push, _parent, _attrs) => {
      const _component_Icon = __nuxt_component_0;
      ssrRenderTeleport(_push, (_push2) => {
        if (__props.isOpen) {
          _push2(`<div class="fixed inset-0 z-[80] bg-black/55 backdrop-blur-sm" data-v-2d2624de></div>`);
        } else {
          _push2(`<!---->`);
        }
        if (__props.isOpen) {
          _push2(`<form class="${ssrRenderClass([surfaceClass.value, "fixed bottom-0 right-0 top-0 z-[90] flex w-full max-w-5xl flex-col border-l shadow-2xl"])}" data-v-2d2624de><header class="${ssrRenderClass([borderClass.value, "flex items-start justify-between gap-4 border-b px-5 py-5"])}" data-v-2d2624de><div data-v-2d2624de><p class="text-xs font-semibold uppercase tracking-wide text-rich-orange" data-v-2d2624de>Documents</p><h2 class="${ssrRenderClass([headingClass.value, "mt-1 text-xl font-bold"])}" data-v-2d2624de>Upload &amp; Analyze</h2><p class="${ssrRenderClass([mutedTextClass.value, "mt-1 text-xs"])}" data-v-2d2624de> The file is AI-analyzed, then split-stored across Supabase and blob storage. </p></div><button type="button" class="inline-flex h-10 w-10 items-center justify-center rounded-lg transition hover:text-rich-orange hover:bg-rich-orange/10" aria-label="Close" data-v-2d2624de>`);
          _push2(ssrRenderComponent(_component_Icon, {
            name: "ph:x-bold",
            class: ["h-4 w-4", headingClass.value]
          }, null, _parent));
          _push2(`</button></header><div class="flex flex-1 flex-col gap-5 overflow-hidden px-5 py-5 lg:flex-row" data-v-2d2624de><div class="w-full overflow-y-auto lg:w-7/12" data-v-2d2624de>`);
          _push2(ssrRenderComponent(DocumentLivePreview, {
            file: selectedFile.value,
            "tracking-id": currentTrackingId.value,
            "print-strategy": selectedStrategy.value
          }, null, _parent));
          _push2(`</div><div class="w-full space-y-5 overflow-y-auto lg:w-5/12" data-v-2d2624de>`);
          if (!unref(documentStore).canUploadDocuments) {
            _push2(`<div class="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-500" data-v-2d2624de> Your account role is not permitted to upload documents. </div>`);
          } else {
            _push2(`<!---->`);
          }
          _push2(`<label class="${ssrRenderClass([[
            isDragging.value ? "border-rich-orange bg-rich-orange/10" : borderClass.value,
            unref(documentStore).canUploadDocuments ? "" : "pointer-events-none opacity-50"
          ], "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 text-center transition"])}" data-v-2d2624de>`);
          _push2(ssrRenderComponent(_component_Icon, {
            name: "ph:cloud-arrow-up",
            class: "h-10 w-10 text-rich-orange"
          }, null, _parent));
          _push2(`<div data-v-2d2624de><p class="${ssrRenderClass([headingClass.value, "text-sm font-semibold"])}" data-v-2d2624de>${ssrInterpolate(selectedFile.value ? selectedFile.value.name : "Drop a file here or click to browse")}</p><p class="${ssrRenderClass([mutedTextClass.value, "mt-1 text-xs"])}" data-v-2d2624de> PDF, DOCX, XLSX, TXT, CSV supported </p></div><input type="file" class="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.json" data-v-2d2624de></label><label class="block" data-v-2d2624de><span class="${ssrRenderClass([headingClass.value, "text-sm font-semibold"])}" data-v-2d2624de>Target Workflow Stage</span><select class="${ssrRenderClass([inputClass.value, "mt-2 w-full rounded-lg border px-4 py-3 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-rich-orange"])}" required data-v-2d2624de><option value="" disabled style="${ssrRenderStyle(optionStyle.value)}" data-v-2d2624de${ssrIncludeBooleanAttr(Array.isArray(selectedStageId.value) ? ssrLooseContain(selectedStageId.value, "") : ssrLooseEqual(selectedStageId.value, "")) ? " selected" : ""}>Select a workflow stage</option><!--[-->`);
          ssrRenderList(unref(stageStore).stages, (stage) => {
            _push2(`<option${ssrRenderAttr("value", String(stage.stage_id))} style="${ssrRenderStyle(optionStyle.value)}" data-v-2d2624de${ssrIncludeBooleanAttr(Array.isArray(selectedStageId.value) ? ssrLooseContain(selectedStageId.value, String(stage.stage_id)) : ssrLooseEqual(selectedStageId.value, String(stage.stage_id))) ? " selected" : ""}>${ssrInterpolate(stage.name)}</option>`);
          });
          _push2(`<!--]--></select>`);
          if (!unref(stageStore).stages.length) {
            _push2(`<p class="${ssrRenderClass([mutedTextClass.value, "mt-2 text-xs"])}" data-v-2d2624de> No stages available. Create a stage first in the Stages workspace. </p>`);
          } else {
            _push2(`<!---->`);
          }
          _push2(`</label>`);
          if (selectedFile.value) {
            _push2(`<div class="${ssrRenderClass([unref(isDark) ? "border-card-border bg-rich-black/40" : "border-gray-200 bg-gray-50", "flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"])}" data-v-2d2624de><div class="flex min-w-0 items-center gap-3" data-v-2d2624de>`);
            _push2(ssrRenderComponent(_component_Icon, {
              name: "ph:file-text",
              class: "h-5 w-5 flex-none text-rich-orange"
            }, null, _parent));
            _push2(`<div class="min-w-0" data-v-2d2624de><p class="${ssrRenderClass([headingClass.value, "truncate font-semibold"])}" data-v-2d2624de>${ssrInterpolate(selectedFile.value.name)}</p><p class="${ssrRenderClass([mutedTextClass.value, "text-xs"])}" data-v-2d2624de>${ssrInterpolate(formatSize(selectedFile.value.size))}</p></div></div><button type="button" class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-500/10" aria-label="Remove file" data-v-2d2624de>`);
            _push2(ssrRenderComponent(_component_Icon, {
              name: "ph:trash",
              class: "h-4 w-4"
            }, null, _parent));
            _push2(`</button></div>`);
          } else {
            _push2(`<!---->`);
          }
          _push2(`<div data-v-2d2624de><span class="${ssrRenderClass([headingClass.value, "text-sm font-semibold"])}" data-v-2d2624de>QR Code Placement Strategy</span><div class="mt-2 space-y-2" data-v-2d2624de><label class="${ssrRenderClass([selectedStrategy.value === "embedded" ? "border-rich-orange bg-rich-orange/5" : unref(isDark) ? "border-card-border" : "border-gray-200", "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition"])}" data-v-2d2624de><input${ssrIncludeBooleanAttr(ssrLooseEqual(selectedStrategy.value, "embedded")) ? " checked" : ""} type="radio" value="embedded" class="mt-1 accent-[#FF620C]" data-v-2d2624de><span data-v-2d2624de><span class="${ssrRenderClass([headingClass.value, "block text-sm font-semibold"])}" data-v-2d2624de>Embed with Document Content</span><span class="${ssrRenderClass([mutedTextClass.value, "block text-xs"])}" data-v-2d2624de> Prints tracking metadata directly alongside the document payload. </span></span></label><label class="${ssrRenderClass([selectedStrategy.value === "standalone" ? "border-rich-orange bg-rich-orange/5" : unref(isDark) ? "border-card-border" : "border-gray-200", "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition"])}" data-v-2d2624de><input${ssrIncludeBooleanAttr(ssrLooseEqual(selectedStrategy.value, "standalone")) ? " checked" : ""} type="radio" value="standalone" class="mt-1 accent-[#FF620C]" data-v-2d2624de><span data-v-2d2624de><span class="${ssrRenderClass([headingClass.value, "block text-sm font-semibold"])}" data-v-2d2624de>Standalone Tracking Trailer Page</span><span class="${ssrRenderClass([mutedTextClass.value, "block text-xs"])}" data-v-2d2624de> Keeps document pages clean and appends a dedicated tracking sheet to the end. </span></span></label></div></div>`);
          if (selectedStrategy.value === "standalone") {
            _push2(`<label class="block" data-v-2d2624de><span class="${ssrRenderClass([headingClass.value, "text-sm font-semibold"])}" data-v-2d2624de>Trailer QR Print Size</span><select class="${ssrRenderClass([inputClass.value, "mt-2 w-full rounded-lg border px-4 py-3 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-rich-orange"])}" data-v-2d2624de><option${ssrRenderAttr("value", 50)} style="${ssrRenderStyle(optionStyle.value)}" data-v-2d2624de${ssrIncludeBooleanAttr(Array.isArray(selectedQrSize.value) ? ssrLooseContain(selectedQrSize.value, 50) : ssrLooseEqual(selectedQrSize.value, 50)) ? " selected" : ""}>Small (50px × 50px)</option><option${ssrRenderAttr("value", 120)} style="${ssrRenderStyle(optionStyle.value)}" data-v-2d2624de${ssrIncludeBooleanAttr(Array.isArray(selectedQrSize.value) ? ssrLooseContain(selectedQrSize.value, 120) : ssrLooseEqual(selectedQrSize.value, 120)) ? " selected" : ""}>Medium (120px × 120px)</option><option${ssrRenderAttr("value", 200)} style="${ssrRenderStyle(optionStyle.value)}" data-v-2d2624de${ssrIncludeBooleanAttr(Array.isArray(selectedQrSize.value) ? ssrLooseContain(selectedQrSize.value, 200) : ssrLooseEqual(selectedQrSize.value, 200)) ? " selected" : ""}>Large (200px × 200px)</option></select></label>`);
          } else {
            _push2(`<!---->`);
          }
          if (errorMessage.value) {
            _push2(`<p class="text-sm text-red-500" data-v-2d2624de>${ssrInterpolate(errorMessage.value)}</p>`);
          } else {
            _push2(`<!---->`);
          }
          if (unref(documentStore).lastAnalysis) {
            _push2(`<div class="${ssrRenderClass([unref(isDark) ? "border-card-border bg-rich-black/40" : "border-gray-200 bg-gray-50", "rounded-lg border p-4"])}" data-v-2d2624de><div class="flex items-center gap-2 text-sm font-semibold text-rich-orange" data-v-2d2624de>`);
            _push2(ssrRenderComponent(_component_Icon, {
              name: "ph:sparkle",
              class: "h-4 w-4"
            }, null, _parent));
            _push2(` AI Analysis </div><p class="${ssrRenderClass([headingClass.value, "mt-2 text-sm font-semibold"])}" data-v-2d2624de>${ssrInterpolate(unref(documentStore).lastAnalysis.title)}</p><p class="${ssrRenderClass([mutedTextClass.value, "mt-1 text-xs leading-5"])}" data-v-2d2624de>${ssrInterpolate(unref(documentStore).lastAnalysis.description)}</p></div>`);
          } else {
            _push2(`<!---->`);
          }
          _push2(`</div></div><footer class="${ssrRenderClass([borderClass.value, "flex items-center justify-end gap-3 border-t px-5 py-4"])}" data-v-2d2624de><button type="button" class="${ssrRenderClass([unref(isDark) ? "border-card-border text-white" : "border-gray-200 text-rich-black", "rounded-lg border px-4 py-2.5 text-sm font-semibold transition hover:bg-black/5 dark:hover:bg-white/5"])}" data-v-2d2624de> Cancel </button><button type="submit" class="inline-flex items-center gap-2 rounded-lg bg-[#FF620C] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e95a0b] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"${ssrIncludeBooleanAttr(!canSubmit.value) ? " disabled" : ""} data-v-2d2624de>`);
          if (unref(documentStore).uploading) {
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
          _push2(` ${ssrInterpolate(unref(documentStore).uploading ? "Saving…" : "Print & Save")}</button></footer></form>`);
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
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/client/documents/documentUploadModal.vue");
  return _sfc_setup$3 ? _sfc_setup$3(props, ctx) : void 0;
};
const DocumentUploadModal = /* @__PURE__ */ Object.assign(_export_sfc(_sfc_main$3, [["__scopeId", "data-v-2d2624de"]]), { __name: "ClientDocumentsDocumentUploadModal" });
const _sfc_main$2 = /* @__PURE__ */ defineComponent({
  __name: "documentDetailModal",
  __ssrInlineRender: true,
  props: {
    isOpen: { type: Boolean },
    document: {}
  },
  emits: ["close"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const officeStore = useOfficeStore();
    const stageStore = useStageStore();
    const qrDataUrl = ref("");
    watch(
      () => [props.isOpen, props.document?.qr_code_data],
      async () => {
        if (props.isOpen && props.document?.qr_code_data) {
          try {
            qrDataUrl.value = await QRCode.toDataURL(props.document.qr_code_data, {
              margin: 1,
              width: 200
            });
          } catch {
            qrDataUrl.value = "";
          }
        } else {
          qrDataUrl.value = "";
        }
      },
      { immediate: true }
    );
    watch(
      () => props.isOpen,
      (open) => {
        if (open && !stageStore.stages.length) {
          stageStore.fetchStages();
        }
      }
    );
    const stageName = computed(() => {
      const stageId = props.document?.stage_id;
      if (stageId == null) return "";
      return stageStore.stages.find((s) => String(s.stage_id) === String(stageId))?.name || "";
    });
    const steps = computed(() => {
      const stageId = props.document?.stage_id;
      if (stageId == null) return [];
      const seq = stageStore.stageOfficeSequences[stageId] || [];
      return [...seq].sort((a, b) => a.step_number - b.step_number).map((step) => ({
        ...step,
        office_name: getOfficeName(step.office_id)
      }));
    });
    const currentStep = computed(() => {
      const officeId = props.document?.office_id;
      return steps.value.find((s) => String(s.office_id) === String(officeId)) || steps.value[0] || null;
    });
    const currentStepNumber = computed(() => currentStep.value?.step_number ?? 0);
    const isCompleted = (step) => step.step_number < currentStepNumber.value;
    const isCurrent = (step) => step.step_number === currentStepNumber.value;
    const isUpcoming = (step) => step.step_number > currentStepNumber.value;
    const getOfficeName = (officeId) => {
      if (officeId == null) return "Unassigned";
      return officeStore.offices.find((office) => String(office.id) === String(officeId))?.name || "Unknown office";
    };
    const nodeClass = (step) => {
      if (isCompleted(step)) return "bg-[#FF620C] text-white border-[#FF620C]";
      if (isCurrent(step)) return "text-[#FF620C] border border-[#FF620C]/30 bg-[#FF620C]/10 animate-pulse";
      return "border-[#2A2A2A] text-gray-500";
    };
    const labelClass = (step) => {
      if (isCompleted(step) || isCurrent(step)) return "text-[#FF620C]";
      return "text-gray-500";
    };
    const stateLabel = (step) => {
      if (isCompleted(step)) return "Completed";
      if (isCurrent(step)) return "Current Checkpoint";
      return "Upcoming";
    };
    const statusClass = (status) => {
      switch ((status || "Pending").toLowerCase()) {
        case "approved":
          return "text-green-500 border-green-500/30 bg-green-500/10";
        case "rejected":
          return "text-red-500 border-red-500/30 bg-red-500/10";
        case "processing":
        case "in review":
          return "text-blue-400 border-blue-400/30 bg-blue-400/10";
        case "pending":
        default:
          return "text-[#FF620C] border-[#FF620C]/30 bg-[#FF620C]/10";
      }
    };
    const formatDate = (value) => {
      if (!value) return "-";
      return new Intl.DateTimeFormat("en", {
        month: "short",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }).format(new Date(value));
    };
    return (_ctx, _push, _parent, _attrs) => {
      const _component_Icon = __nuxt_component_0;
      ssrRenderTeleport(_push, (_push2) => {
        if (__props.isOpen) {
          _push2(`<div class="fixed inset-0 z-[80] bg-black/55 backdrop-blur-sm" data-v-daed16c8></div>`);
        } else {
          _push2(`<!---->`);
        }
        if (__props.isOpen && __props.document) {
          _push2(`<aside class="fixed bottom-0 right-0 top-0 z-[90] flex w-full max-w-xl flex-col border-l text-white shadow-2xl bg-[#1A1A1A] border-[#2A2A2A]" data-v-daed16c8><header class="flex items-start justify-between gap-4 border-b border-[#2A2A2A] px-5 py-5" data-v-daed16c8><div data-v-daed16c8><p class="text-xs font-semibold uppercase tracking-wide text-[#FF620C]" data-v-daed16c8>Document</p><h2 class="mt-1 text-xl font-bold" data-v-daed16c8>${ssrInterpolate(__props.document.title)}</h2><span class="${ssrRenderClass([statusClass(__props.document.status), "mt-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold"])}" data-v-daed16c8><span class="${ssrRenderClass([__props.document.status === "Pending" ? "animate-pulse" : "", "h-1.5 w-1.5 rounded-full bg-current"])}" data-v-daed16c8></span> ${ssrInterpolate(__props.document.status || "Pending")}</span></div><button type="button" class="inline-flex h-10 w-10 items-center justify-center rounded-lg transition hover:bg-[#FF620C]/10 hover:text-[#FF620C]" aria-label="Close" data-v-daed16c8>`);
          _push2(ssrRenderComponent(_component_Icon, {
            name: "ph:x-bold",
            class: "h-4 w-4"
          }, null, _parent));
          _push2(`</button></header><div class="flex-1 space-y-6 overflow-y-auto px-5 py-5" data-v-daed16c8><section class="rounded-lg border border-[#2A2A2A] bg-rich-black/40 p-4" data-v-daed16c8><div class="flex items-center gap-2 text-sm font-semibold text-[#FF620C]" data-v-daed16c8>`);
          _push2(ssrRenderComponent(_component_Icon, {
            name: "ph:info",
            class: "h-4 w-4"
          }, null, _parent));
          _push2(` Metadata </div><dl class="mt-3 space-y-3 text-sm" data-v-daed16c8><div data-v-daed16c8><dt class="text-xs uppercase tracking-wide text-gray-500" data-v-daed16c8>Description</dt><dd class="mt-1 leading-5 text-gray-300" data-v-daed16c8>${ssrInterpolate(__props.document.description)}</dd></div><div class="grid grid-cols-2 gap-4" data-v-daed16c8><div data-v-daed16c8><dt class="text-xs uppercase tracking-wide text-gray-500" data-v-daed16c8>Created</dt><dd class="mt-1 text-gray-300" data-v-daed16c8>${ssrInterpolate(formatDate(__props.document.created_at))}</dd></div><div data-v-daed16c8><dt class="text-xs uppercase tracking-wide text-gray-500" data-v-daed16c8>Target Office</dt><dd class="mt-1 text-gray-300" data-v-daed16c8>${ssrInterpolate(getOfficeName(__props.document.office_id))}</dd></div></div><div data-v-daed16c8><dt class="text-xs uppercase tracking-wide text-gray-500" data-v-daed16c8>Workflow</dt><dd class="mt-1 text-gray-300" data-v-daed16c8>${ssrInterpolate(stageName.value || "Unassigned")}</dd></div></dl><div class="mt-4 flex items-center gap-4 rounded-lg border border-[#2A2A2A] bg-[#121212] p-4" data-v-daed16c8><div class="flex h-[120px] w-[120px] flex-none items-center justify-center rounded-md bg-white p-2" data-v-daed16c8>`);
          if (qrDataUrl.value) {
            _push2(`<img${ssrRenderAttr("src", qrDataUrl.value)} alt="Document QR code" class="h-full w-full" data-v-daed16c8>`);
          } else {
            _push2(ssrRenderComponent(_component_Icon, {
              name: "ph:qr-code",
              class: "h-12 w-12 text-gray-400"
            }, null, _parent));
          }
          _push2(`</div><div class="min-w-0" data-v-daed16c8><p class="text-xs uppercase tracking-wide text-gray-500" data-v-daed16c8>QR Tracking Code</p><p class="mt-1 break-all font-mono text-sm text-gray-300" data-v-daed16c8>${ssrInterpolate(__props.document.qr_code_data || "N/A")}</p><p class="mt-2 text-xs text-gray-500" data-v-daed16c8>Scan to align the physical document with this record.</p></div></div></section><section data-v-daed16c8><div class="mb-4 flex items-center gap-2 text-sm font-semibold text-[#FF620C]" data-v-daed16c8>`);
          _push2(ssrRenderComponent(_component_Icon, {
            name: "ph:path",
            class: "h-4 w-4"
          }, null, _parent));
          _push2(` Workflow Tracker </div>`);
          if (steps.value.length) {
            _push2(`<div class="relative space-y-0" data-v-daed16c8><!--[-->`);
            ssrRenderList(steps.value, (step, index) => {
              _push2(`<div class="relative flex gap-4 pb-6 last:pb-0" data-v-daed16c8>`);
              if (index < steps.value.length - 1) {
                _push2(`<div class="${ssrRenderClass([isCompleted(step) ? "bg-[#FF620C]" : "bg-[#2A2A2A]", "absolute left-[15px] top-8 h-full w-0.5"])}" data-v-daed16c8></div>`);
              } else {
                _push2(`<!---->`);
              }
              _push2(`<div class="${ssrRenderClass([nodeClass(step), "relative z-10 flex h-8 w-8 flex-none items-center justify-center rounded-full border text-xs font-bold transition"])}" data-v-daed16c8>`);
              if (isCompleted(step)) {
                _push2(ssrRenderComponent(_component_Icon, {
                  name: "ph:check-bold",
                  class: "h-4 w-4"
                }, null, _parent));
              } else {
                _push2(`<span data-v-daed16c8>${ssrInterpolate(step.step_number)}</span>`);
              }
              _push2(`</div><div class="min-w-0 flex-1 pt-1" data-v-daed16c8><p class="${ssrRenderClass([isUpcoming(step) ? "text-gray-500" : "text-white", "text-sm font-semibold"])}" data-v-daed16c8>${ssrInterpolate(step.office_name)}</p><p class="${ssrRenderClass([labelClass(step), "mt-0.5 text-xs"])}" data-v-daed16c8>${ssrInterpolate(stateLabel(step))} · Step ${ssrInterpolate(step.step_number)}</p></div></div>`);
            });
            _push2(`<!--]--></div>`);
          } else {
            _push2(`<div class="rounded-lg border border-dashed border-[#2A2A2A] p-6 text-center text-sm text-gray-500" data-v-daed16c8> No workflow steps are mapped to this document&#39;s stage. </div>`);
          }
          _push2(`</section></div></aside>`);
        } else {
          _push2(`<!---->`);
        }
      }, "body", false, _parent);
    };
  }
});
const _sfc_setup$2 = _sfc_main$2.setup;
_sfc_main$2.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/client/documents/documentDetailModal.vue");
  return _sfc_setup$2 ? _sfc_setup$2(props, ctx) : void 0;
};
const DocumentDetailModal = /* @__PURE__ */ Object.assign(_export_sfc(_sfc_main$2, [["__scopeId", "data-v-daed16c8"]]), { __name: "ClientDocumentsDocumentDetailModal" });
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "index",
  __ssrInlineRender: true,
  setup(__props) {
    useAuthStore();
    const officeStore = useOfficeStore();
    useStageStore();
    const documentStore = useDocumentStore();
    const { isDark } = useTheme();
    const isUploadModalOpen = ref(false);
    const isDetailModalOpen = ref(false);
    const selectedDocument = ref(null);
    const searchQuery = ref("");
    const officeFilter = ref("all");
    const surfaceClass = computed(
      () => isDark.value ? "border-card-border bg-[#1A1A1A] shadow-card-dark" : "border-gray-200 bg-white"
    );
    const borderClass = computed(() => isDark.value ? "border-card-border" : "border-gray-200");
    const mutedTextClass = computed(() => isDark.value ? "text-gray-400" : "text-gray-500");
    const inputClass = computed(
      () => isDark.value ? "border-card-border bg-rich-black text-white placeholder:text-gray-500" : "border-gray-200 bg-white text-rich-black placeholder:text-gray-400"
    );
    const filteredDocuments = computed(() => {
      const query = searchQuery.value.trim().toLowerCase();
      return documentStore.documents.filter((doc) => {
        const matchesOffice = officeFilter.value === "all" || String(doc.office_id) === officeFilter.value;
        const matchesQuery = !query || [doc.title, doc.description].some(
          (value) => String(value || "").toLowerCase().includes(query)
        );
        return matchesOffice && matchesQuery;
      });
    });
    const getOfficeName = (officeId) => {
      if (officeId == null) return "Unassigned";
      return officeStore.offices.find((office) => String(office.id) === String(officeId))?.name || "Unassigned";
    };
    const formatDate = (value) => {
      if (!value) return "-";
      return new Intl.DateTimeFormat("en", {
        month: "short",
        day: "2-digit",
        year: "numeric"
      }).format(new Date(value));
    };
    const statusClass = (status) => {
      switch ((status || "Pending").toLowerCase()) {
        case "approved":
          return "text-green-500 border-green-500/30 bg-green-500/10";
        case "rejected":
          return "text-red-500 border-red-500/30 bg-red-500/10";
        case "processing":
        case "in review":
          return "text-blue-400 border-blue-400/30 bg-blue-400/10";
        case "pending":
        default:
          return "text-[#FF620C] border-[#FF620C]/30 bg-[#FF620C]/10";
      }
    };
    const handleUploadSuccess = () => {
      isUploadModalOpen.value = false;
      documentStore.fetchDocuments();
    };
    return (_ctx, _push, _parent, _attrs) => {
      const _component_Icon = __nuxt_component_0;
      _push(`<section${ssrRenderAttrs(mergeProps({
        class: ["w-full max-w-[1800px] mx-auto space-y-6 pb-24 lg:pb-8 font-dashboard animate-fade-in", unref(isDark) ? "text-white" : "text-rich-black"]
      }, _attrs))}><div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><div class="mb-3 h-1 w-14 rounded-full bg-rich-orange"></div><h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Document Management</h1><p class="${ssrRenderClass([mutedTextClass.value, "mt-1 text-sm"])}"> Upload, track, and monitor AI-analyzed organizational documents </p></div><button type="button" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#FF620C] px-4 py-2 font-medium text-white shadow-sm shadow-rich-orange/20 transition duration-200 hover:bg-[#F77934] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-rich-orange">`);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:plus-bold",
        class: "h-4 w-4"
      }, null, _parent));
      _push(` Upload Document </button></div><div class="${ssrRenderClass([surfaceClass.value, "flex flex-col gap-3 rounded-lg border p-4 shadow-card sm:flex-row sm:items-center"])}"><div class="${ssrRenderClass([unref(isDark) ? "border-card-border bg-rich-black/40 focus-within:border-rich-orange" : "border-gray-200 bg-gray-50 focus-within:border-rich-orange", "flex flex-1 items-center gap-2 rounded-lg border px-3 py-2 transition-all"])}">`);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:magnifying-glass",
        class: ["h-4 w-4", mutedTextClass.value]
      }, null, _parent));
      _push(`<input${ssrRenderAttr("value", searchQuery.value)} type="search" placeholder="Search by title or description" class="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-gray-400"></div><select class="${ssrRenderClass([inputClass.value, "rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-rich-orange sm:w-64"])}"><option value="all"${ssrIncludeBooleanAttr(Array.isArray(officeFilter.value) ? ssrLooseContain(officeFilter.value, "all") : ssrLooseEqual(officeFilter.value, "all")) ? " selected" : ""}>All Departments / Offices</option><!--[-->`);
      ssrRenderList(unref(officeStore).offices, (office) => {
        _push(`<option${ssrRenderAttr("value", String(office.id))}${ssrIncludeBooleanAttr(Array.isArray(officeFilter.value) ? ssrLooseContain(officeFilter.value, String(office.id)) : ssrLooseEqual(officeFilter.value, String(office.id))) ? " selected" : ""}>${ssrInterpolate(office.name)}</option>`);
      });
      _push(`<!--]--></select></div><article class="${ssrRenderClass([surfaceClass.value, "overflow-hidden rounded-lg border shadow-card"])}"><div class="${ssrRenderClass([borderClass.value, "flex items-center justify-between border-b px-5 py-4"])}"><div><h2 class="text-base font-semibold">Document Directory</h2><p class="${ssrRenderClass([mutedTextClass.value, "mt-1 text-xs"])}">${ssrInterpolate(filteredDocuments.value.length)} document${ssrInterpolate(filteredDocuments.value.length === 1 ? "" : "s")} tracked </p></div>`);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:files",
        class: "h-5 w-5 text-rich-orange"
      }, null, _parent));
      _push(`</div><div class="overflow-x-auto"><table class="min-w-full text-left text-sm"><thead class="${ssrRenderClass(unref(isDark) ? "bg-rich-black/50 text-gray-400" : "bg-gray-50 text-gray-500")}"><tr><th class="px-5 py-3 text-xs font-semibold uppercase tracking-wide">Document</th><th class="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide">Target Office</th><th class="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide">Uploaded By</th><th class="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide">Created</th><th class="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide">Status</th></tr></thead><tbody>`);
      if (unref(documentStore).loading) {
        _push(`<tr><td colspan="5" class="${ssrRenderClass([mutedTextClass.value, "px-5 py-12 text-center"])}">`);
        _push(ssrRenderComponent(_component_Icon, {
          name: "ph:spinner-gap",
          class: "mx-auto mb-2 h-6 w-6 animate-spin text-rich-orange"
        }, null, _parent));
        _push(` Loading documents… </td></tr>`);
      } else if (filteredDocuments.value.length) {
        _push(`<!--[-->`);
        ssrRenderList(filteredDocuments.value, (doc) => {
          _push(`<tr class="${ssrRenderClass([[borderClass.value, unref(isDark) ? "hover:bg-white/[0.03]" : "hover:bg-gray-50"], "cursor-pointer border-t transition-colors duration-150"])}"><td class="min-w-72 px-5 py-4"><div class="font-semibold">${ssrInterpolate(doc.title)}</div><div class="${ssrRenderClass([mutedTextClass.value, "mt-1 line-clamp-2 max-w-md text-xs"])}">${ssrInterpolate(doc.description)}</div></td><td class="whitespace-nowrap px-5 py-4">${ssrInterpolate(getOfficeName(doc.office_id))}</td><td class="whitespace-nowrap px-5 py-4">${ssrInterpolate(doc.uploader_name || "Unknown")}</td><td class="${ssrRenderClass([mutedTextClass.value, "whitespace-nowrap px-5 py-4"])}">${ssrInterpolate(formatDate(doc.created_at))}</td><td class="whitespace-nowrap px-5 py-4"><span class="${ssrRenderClass([statusClass(doc.status), "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold"])}"><span class="${ssrRenderClass([doc.status === "Pending" ? "animate-pulse" : "", "h-1.5 w-1.5 rounded-full bg-current"])}"></span> ${ssrInterpolate(doc.status || "Pending")}</span></td></tr>`);
        });
        _push(`<!--]-->`);
      } else {
        _push(`<tr><td colspan="5" class="px-5 py-16 text-center">`);
        _push(ssrRenderComponent(_component_Icon, {
          name: "ph:file-dashed",
          class: "mx-auto mb-3 h-12 w-12 text-rich-orange"
        }, null, _parent));
        _push(`<p class="font-semibold">No documents found.</p><p class="${ssrRenderClass([mutedTextClass.value, "mt-1 text-xs"])}"> Click &quot;Upload Document&quot; to get started. </p></td></tr>`);
      }
      _push(`</tbody></table></div></article>`);
      _push(ssrRenderComponent(DocumentUploadModal, {
        "is-open": isUploadModalOpen.value,
        onClose: ($event) => isUploadModalOpen.value = false,
        onUploaded: handleUploadSuccess
      }, null, _parent));
      _push(ssrRenderComponent(DocumentDetailModal, {
        "is-open": isDetailModalOpen.value,
        document: selectedDocument.value,
        onClose: ($event) => isDetailModalOpen.value = false
      }, null, _parent));
      _push(`</section>`);
    };
  }
});
const _sfc_setup$1 = _sfc_main$1.setup;
_sfc_main$1.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/client/documents/index.vue");
  return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
const DocumentsView = Object.assign(_sfc_main$1, { __name: "ClientDocuments" });
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "documents",
  __ssrInlineRender: true,
  setup(__props) {
    return (_ctx, _push, _parent, _attrs) => {
      _push(ssrRenderComponent(DocumentsView, _attrs, null, _parent));
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/client/documents.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=documents-BtKWRl1C.mjs.map
