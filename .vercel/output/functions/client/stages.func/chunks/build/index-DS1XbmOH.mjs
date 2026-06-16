import { mergeProps, unref, ref, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderAttr, ssrRenderStyle, ssrInterpolate } from 'vue/server-renderer';
import { PDFDocument } from 'pdf-lib';
import QRCode from 'qrcode';
import { renderAsync } from 'docx-preview';

const _sfc_main = {
  __name: "index",
  __ssrInlineRender: true,
  setup(__props) {
    const useDocProcessor = () => {
      const isProcessing2 = ref(false);
      const processedUrl2 = ref(null);
      const trackingId2 = ref("");
      const fileExtension2 = ref("");
      const wordPreviewContainer2 = ref(null);
      const qrBase642 = ref("");
      const processDocument2 = async (file) => {
        if (!file) return;
        const nameParts = file.name.split(".");
        fileExtension2.value = nameParts.pop().toLowerCase();
        isProcessing2.value = true;
        try {
          trackingId2.value = `FLOW-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
          const arrayBuffer = await file.arrayBuffer();
          qrBase642.value = await QRCode.toDataURL(trackingId2.value, { margin: 1, width: 200 });
          if (fileExtension2.value === "pdf") {
            const pdfDoc = await PDFDocument.load(arrayBuffer);
            const qrImage = await pdfDoc.embedPng(qrBase642.value);
            const pages = pdfDoc.getPages();
            pages.forEach((page) => {
              const { width, height } = page.getSize();
              page.drawImage(qrImage, {
                x: width - 70,
                y: height - 70,
                width: 50,
                height: 50
              });
            });
            const pdfBytes = await pdfDoc.save();
            processedUrl2.value = URL.createObjectURL(new Blob([pdfBytes], { type: "application/pdf" }));
          } else if (fileExtension2.value === "docx") {
            if (wordPreviewContainer2.value) wordPreviewContainer2.value.innerHTML = "";
            await renderAsync(arrayBuffer, wordPreviewContainer2.value);
            processedUrl2.value = URL.createObjectURL(new Blob([arrayBuffer], { type: file.type }));
          }
        } catch (error) {
          console.error(error);
          alert("Error rendering document");
        } finally {
          isProcessing2.value = false;
        }
      };
      const printDocument2 = () => {
        if (fileExtension2.value === "pdf") {
          const printWin = (void 0).open(processedUrl2.value);
          printWin.onload = () => {
            printWin.focus();
            printWin.print();
          };
        } else if (fileExtension2.value === "docx") {
          const printWin = (void 0).open("", "_blank");
          const docHtml = wordPreviewContainer2.value.innerHTML;
          printWin.document.write(`
        <html>
          <head>
            <style>
              @page { margin: 0; }
              body { margin: 0; padding: 0; background: white; }
          
              .qr-container { 
                position: fixed; 
                top: 40px; 
                right: 40px; 
                width: 40px; 
                height: 40px; 
                z-index: 999; 
              }
              .docx-wrapper { background: white !important; padding: 0 !important; }
              .docx { box-shadow: none !important; margin: 0 !important; width: 100% !important; }
              img { width: 100%; }
            </style>
          </head>
          <body>
            <div class="qr-container"><img src="${qrBase642.value}" /></div>
            ${docHtml}
          </body>
        </html>
      `);
          printWin.document.close();
          printWin.focus();
          setTimeout(() => {
            printWin.print();
            printWin.close();
          }, 500);
        }
      };
      return { processDocument: processDocument2, printDocument: printDocument2, isProcessing: isProcessing2, processedUrl: processedUrl2, trackingId: trackingId2, fileExtension: fileExtension2, wordPreviewContainer: wordPreviewContainer2, qrBase64: qrBase642 };
    };
    const { isProcessing, processedUrl, trackingId, fileExtension, qrBase64 } = useDocProcessor();
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "bg-gray-100 p-6" }, _attrs))}><div class="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[80vh]"><div class="bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col border border-gray-200 relative"><div class="p-3 bg-gray-50 border-b font-bold text-xs text-gray-400 uppercase tracking-widest text-center"> Live Document Preview </div><div class="flex-grow overflow-auto bg-gray-50 relative">`);
      if (unref(fileExtension) === "docx" && unref(qrBase64)) {
        _push(`<div class="absolute top-8 right-8 z-50 p-1 bg-white shadow-lg border border-gray-200 pointer-events-none"><img${ssrRenderAttr("src", unref(qrBase64))} class="w-[60px] h-[60px]" alt="Tracking QR"></div>`);
      } else {
        _push(`<!---->`);
      }
      if (unref(processedUrl) && unref(fileExtension) === "pdf") {
        _push(`<object${ssrRenderAttr("data", unref(processedUrl))} type="application/pdf" class="w-full h-full"></object>`);
      } else {
        _push(`<!---->`);
      }
      _push(`<div class="p-4 bg-white min-h-full" style="${ssrRenderStyle(unref(fileExtension) === "docx" ? null : { display: "none" })}"></div>`);
      if (!unref(processedUrl)) {
        _push(`<div class="h-full flex items-center justify-center text-gray-300 italic text-sm"> No document loaded </div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div></div><div class="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-center"><div class="relative border-2 border-dashed border-gray-200 rounded-xl p-12 text-center hover:border-blue-500 transition-all cursor-pointer bg-gray-50"><input type="file" accept=".pdf,.docx" class="absolute inset-0 opacity-0 cursor-pointer">`);
      if (unref(isProcessing)) {
        _push(`<div class="animate-pulse flex flex-col items-center"><div class="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div><p class="text-xs text-blue-500 font-bold uppercase">Processing File...</p></div>`);
      } else {
        _push(`<p class="text-gray-500 font-medium">Click to upload PDF or DOCX</p>`);
      }
      _push(`</div>`);
      if (unref(trackingId)) {
        _push(`<div class="mt-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 shadow-sm"><p class="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">Document Identity</p><p class="font-mono text-2xl font-black text-blue-700">${ssrInterpolate(unref(trackingId))}</p><div class="mt-4 flex items-center justify-between"><button class="bg-blue-600 text-white px-6 py-2 rounded-lg text-xs font-bold uppercase hover:bg-blue-700 transition-colors shadow-lg"> Print Now </button></div></div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div></div></div>`);
    };
  }
};
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/index.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=index-DS1XbmOH.mjs.map
