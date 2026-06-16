import process from 'node:process';globalThis._importMeta_=globalThis._importMeta_||{url:"file:///_entry.js",env:process.env};function polyfillDOMMatrix() {
  if (typeof globalThis.DOMMatrix !== "undefined")
    return;
  globalThis.DOMMatrix = class DOMMatrix {
    a;
    b;
    c;
    d;
    e;
    f;
    constructor(init) {
      if (Array.isArray(init) && init.length === 6) {
        this.a = init[0];
        this.b = init[1];
        this.c = init[2];
        this.d = init[3];
        this.e = init[4];
        this.f = init[5];
      } else {
        this.a = 1;
        this.b = 0;
        this.c = 0;
        this.d = 1;
        this.e = 0;
        this.f = 0;
      }
    }
    translateSelf(tx, ty = 0) {
      this.e = this.a * tx + this.c * ty + this.e;
      this.f = this.b * tx + this.d * ty + this.f;
      return this;
    }
    scaleSelf(sx, sy = sx) {
      this.a *= sx;
      this.b *= sx;
      this.c *= sy;
      this.d *= sy;
      return this;
    }
  };
}

function stubBrowserGlobals() {
  polyfillDOMMatrix();
}

let resolvedModule;
const isNode = globalThis.process?.release?.name === "node";
async function getDocumentProxy(data, options = {}) {
  const { getDocument } = await getResolvedPDFJS();
  let nodeDefaults = {};
  if (isNode) {
    try {
      const base = globalThis._importMeta_.resolve("pdfjs-dist/package.json");
      nodeDefaults = {
        disableFontFace: true,
        standardFontDataUrl: new URL("./standard_fonts/", base).href
      };
    } catch {
    }
  }
  const pdf = await getDocument({
    data,
    isEvalSupported: false,
    // See: https://github.com/mozilla/pdf.js/issues/4244#issuecomment-1479534301
    useSystemFonts: true,
    ...nodeDefaults,
    ...options
  }).promise;
  return pdf;
}
async function getResolvedPDFJS() {
  if (!resolvedModule) {
    await resolvePDFJSImport();
  }
  return resolvedModule;
}
async function resolvePDFJSImport(pdfjsResolver, { reload = false } = {}) {
  if (resolvedModule && !reload) {
    return;
  }
  stubBrowserGlobals();
  try {
    resolvedModule = await import('./pdfjs.mjs');
  } catch (error) {
    throw new Error(`Serverless PDF.js bundle could not be resolved: ${error}`);
  }
}
function isPDFDocumentProxy(data) {
  return typeof data === "object" && data !== null && "_pdfInfo" in data;
}
async function extractText$1(data, options = {}) {
  const { mergePages = false } = options;
  const pdf = isPDFDocumentProxy(data) ? data : await getDocumentProxy(data);
  const texts = await Promise.all(
    Array.from({ length: pdf.numPages }, (_, i) => getPageText(pdf, i + 1))
  );
  return {
    totalPages: pdf.numPages,
    text: mergePages ? texts.join("\n").replace(/\s+/g, " ") : texts
  };
}
async function getPageText(document, pageNumber) {
  const page = await document.getPage(pageNumber);
  const content = await page.getTextContent();
  return content.items.filter((item) => item.str != null).map((item) => item.str + (item.hasEOL ? "\n" : "")).join("");
}
const extractText = async (...args) => {
  await resolvePDFJSImport();
  return await extractText$1(...args);
};

export { extractText, getDocumentProxy, getResolvedPDFJS, resolvePDFJSImport };
//# sourceMappingURL=index.mjs.map
