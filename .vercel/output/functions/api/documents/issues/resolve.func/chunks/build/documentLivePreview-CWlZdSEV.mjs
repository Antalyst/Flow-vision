import { defineComponent, ref, watch, mergeProps, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderAttr, ssrRenderStyle, ssrRenderComponent, ssrRenderTeleport } from 'vue/server-renderer';
import __nuxt_component_0 from './index-CSZJBLRw.mjs';
import { PDFDocument } from 'pdf-lib';
import QRCode from 'qrcode';
import { renderAsync } from 'docx-preview';
import { _ as _export_sfc } from './server.mjs';

const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "documentPrintCanvas",
  __ssrInlineRender: true,
  props: {
    qrDataUrl: {}
  },
  setup(__props) {
    return (_ctx, _push, _parent, _attrs) => {
      ssrRenderTeleport(_push, (_push2) => {
        _push2(`<div class="print-root"><div class="print-canvas mx-auto flex items-center justify-center bg-white p-4">`);
        if (__props.qrDataUrl) {
          _push2(`<img${ssrRenderAttr("src", __props.qrDataUrl)} alt="Tracking QR code" class="h-56 w-56">`);
        } else {
          _push2(`<div class="flex h-56 w-56 items-center justify-center border border-black text-xs"> QR UNAVAILABLE </div>`);
        }
        _push2(`</div></div>`);
      }, "body", false, _parent);
    };
  }
});
const _sfc_setup$1 = _sfc_main$1.setup;
_sfc_main$1.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/client/documents/documentPrintCanvas.vue");
  return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
const DocumentPrintCanvas = Object.assign(_sfc_main$1, { __name: "ClientDocumentsDocumentPrintCanvas" });
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "documentLivePreview",
  __ssrInlineRender: true,
  props: {
    file: {},
    trackingId: {},
    printStrategy: { default: "embedded" }
  },
  setup(__props) {
    const props = __props;
    const isProcessing = ref(false);
    const processedUrl = ref(null);
    const fileExtension = ref("");
    const qrBase64 = ref("");
    const wordPreviewContainer = ref(null);
    const revokeProcessedUrl = () => {
      if (processedUrl.value) {
        URL.revokeObjectURL(processedUrl.value);
        processedUrl.value = null;
      }
    };
    const processDocument = async () => {
      const file = props.file;
      revokeProcessedUrl();
      if (!file) {
        fileExtension.value = "";
        qrBase64.value = "";
        if (wordPreviewContainer.value) wordPreviewContainer.value.innerHTML = "";
        return;
      }
      fileExtension.value = file.name.split(".").pop()?.toLowerCase() || "";
      isProcessing.value = true;
      try {
        const arrayBuffer = await file.arrayBuffer();
        qrBase64.value = props.trackingId ? await QRCode.toDataURL(props.trackingId, { margin: 1, width: 200 }) : "";
        if (fileExtension.value === "pdf") {
          const pdfDoc = await PDFDocument.load(arrayBuffer);
          if (props.printStrategy === "embedded" && qrBase64.value) {
            const qrImage = await pdfDoc.embedPng(qrBase64.value);
            const qrSize = 50;
            const margin = 20;
            pdfDoc.getPages().forEach((page) => {
              const { height } = page.getSize();
              page.drawImage(qrImage, { x: margin, y: height - qrSize - margin, width: qrSize, height: qrSize });
            });
          }
          const pdfBytes = await pdfDoc.save();
          processedUrl.value = URL.createObjectURL(new Blob([pdfBytes], { type: "application/pdf" }));
        } else if (fileExtension.value === "docx") {
          if (wordPreviewContainer.value) {
            wordPreviewContainer.value.innerHTML = "";
            await renderAsync(arrayBuffer, wordPreviewContainer.value);
          }
        }
      } catch (error) {
        console.error("[documentLivePreview] render failed:", error);
      } finally {
        isProcessing.value = false;
      }
    };
    watch(
      () => [props.file, props.trackingId, props.printStrategy],
      () => {
        processDocument();
      },
      { immediate: true }
    );
    return (_ctx, _push, _parent, _attrs) => {
      const _component_Icon = __nuxt_component_0;
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "relative mx-auto aspect-[1/1.414] max-h-[550px] overflow-y-auto rounded-lg border border-gray-200 bg-white p-6 text-black shadow-2xl" }, _attrs))} data-v-502e270f><div class="pointer-events-none absolute inset-x-0 top-0 z-40 flex justify-center" data-v-502e270f><span class="mt-2 rounded-full bg-gray-900/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white" data-v-502e270f> Live Document Preview </span></div>`);
      if (isProcessing.value) {
        _push(`<div class="absolute inset-0 z-50 flex flex-col items-center justify-center gap-2 bg-white/80" data-v-502e270f><div class="h-8 w-8 animate-spin rounded-full border-4 border-rich-orange border-t-transparent" data-v-502e270f></div><p class="text-xs font-bold uppercase text-rich-orange" data-v-502e270f>Rendering…</p></div>`);
      } else {
        _push(`<!---->`);
      }
      if (fileExtension.value === "docx" && qrBase64.value && __props.printStrategy === "embedded") {
        _push(`<img${ssrRenderAttr("src", qrBase64.value)} class="pointer-events-none absolute left-6 top-6 z-50 h-[50px] w-[50px] border-0 shadow-none filter-none" alt="Tracking QR" data-v-502e270f>`);
      } else {
        _push(`<!---->`);
      }
      if (processedUrl.value && fileExtension.value === "pdf") {
        _push(`<object${ssrRenderAttr("data", processedUrl.value)} type="application/pdf" class="h-full min-h-[450px] w-full" data-v-502e270f></object>`);
      } else {
        _push(`<!---->`);
      }
      _push(`<div class="docx-render-engine" style="${ssrRenderStyle(fileExtension.value === "docx" ? null : { display: "none" })}" data-v-502e270f></div>`);
      if (!__props.file) {
        _push(`<div class="flex h-full min-h-[450px] flex-col items-center justify-center gap-3 text-center" data-v-502e270f>`);
        _push(ssrRenderComponent(_component_Icon, {
          name: "ph:file-text",
          class: "h-16 w-16 text-gray-200"
        }, null, _parent));
        _push(`<p class="max-w-[240px] text-sm font-medium italic text-gray-300" data-v-502e270f> Subsidy Distribution Report — Sample Document Preview Frame </p></div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/client/documents/documentLivePreview.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const DocumentLivePreview = /* @__PURE__ */ Object.assign(_export_sfc(_sfc_main, [["__scopeId", "data-v-502e270f"]]), { __name: "ClientDocumentsDocumentLivePreview" });

export { DocumentLivePreview as D, DocumentPrintCanvas as a };
//# sourceMappingURL=documentLivePreview-CWlZdSEV.mjs.map
