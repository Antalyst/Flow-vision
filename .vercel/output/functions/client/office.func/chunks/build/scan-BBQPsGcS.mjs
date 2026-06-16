import { _ as __nuxt_component_3 } from './nuxt-link-UB6UxD5C.mjs';
import __nuxt_component_0 from './index-BRIQYxw1.mjs';
import { defineComponent, ref, computed, mergeProps, unref, withCtx, createVNode, createTextVNode, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderComponent, ssrRenderClass, ssrInterpolate, ssrRenderStyle, ssrRenderAttr } from 'vue/server-renderer';
import { _ as _export_sfc, a as useAuthStore, b as useTheme } from './server.mjs';
import '../_/index2.mjs';
import '../_/nitro.mjs';
import 'node:crypto';
import 'groq-sdk';
import 'tslib';
import 'iceberg-js';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'mysql2/promise';
import '@iconify/utils';
import 'consola';
import 'node:fs';
import 'node:path';
import '@iconify/vue';
import '@iconify/utils/lib/css/icon';
import '../routes/renderer.mjs';
import 'vue-bundle-renderer/runtime';
import 'unhead/server';
import 'devalue';
import 'unhead/utils';
import 'pinia';
import 'vue-router';
import 'cookie';

const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "QrScanner",
  __ssrInlineRender: true,
  props: {
    scannerId: {},
    fps: {},
    qrboxSize: {}
  },
  emits: ["scan", "error"],
  setup(__props, { expose: __expose, emit: __emit }) {
    const props = __props;
    const id = props.scannerId ?? `qr-scanner-${Math.random().toString(36).slice(2, 7)}`;
    const scannerId = id;
    const isScanning = ref(false);
    const permissionDenied = ref(false);
    const result = ref(null);
    const torchOn = ref(false);
    const stopScanner = async () => {
      return;
    };
    const rescan = () => {
      result.value = null;
    };
    __expose({ rescan, stopScanner });
    return (_ctx, _push, _parent, _attrs) => {
      const _component_Icon = __nuxt_component_0;
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "relative w-full" }, _attrs))} data-v-fede652c><div class="relative overflow-hidden rounded-2xl bg-black" style="${ssrRenderStyle({ aspectRatio: "1 / 1", maxWidth: "360px", margin: "0 auto" })}" data-v-fede652c><div${ssrRenderAttr("id", unref(scannerId))} class="absolute inset-0 w-full h-full" data-v-fede652c></div>`);
      if (isScanning.value && !result.value) {
        _push(`<div class="pointer-events-none absolute inset-0 flex items-center justify-center" data-v-fede652c><div class="absolute inset-0 bg-black/30" data-v-fede652c></div><div class="relative z-10 h-52 w-52" data-v-fede652c><span class="absolute top-0 left-0 h-10 w-10 border-t-4 border-l-4 rounded-tl-xl border-amber-400" data-v-fede652c></span><span class="absolute top-0 right-0 h-10 w-10 border-t-4 border-r-4 rounded-tr-xl border-amber-400" data-v-fede652c></span><span class="absolute bottom-0 left-0 h-10 w-10 border-b-4 border-l-4 rounded-bl-xl border-amber-400" data-v-fede652c></span><span class="absolute bottom-0 right-0 h-10 w-10 border-b-4 border-r-4 rounded-br-xl border-amber-400" data-v-fede652c></span><div class="absolute inset-x-2 h-0.5 bg-amber-400/80 shadow-[0_0_8px_rgba(245,158,11,0.8)] scan-laser" data-v-fede652c></div></div><p class="absolute bottom-4 left-0 right-0 text-center text-xs font-semibold text-white/80" data-v-fede652c> Align QR code within the frame </p></div>`);
      } else {
        _push(`<!---->`);
      }
      if (permissionDenied.value) {
        _push(`<div class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/90 px-6 text-center" data-v-fede652c>`);
        _push(ssrRenderComponent(_component_Icon, {
          name: "ph:camera-slash-fill",
          class: "h-10 w-10 text-amber-500/70"
        }, null, _parent));
        _push(`<p class="text-sm font-semibold text-white" data-v-fede652c>Camera access denied</p><p class="text-xs text-gray-400" data-v-fede652c>Enable camera permissions in your browser settings, then reload the page.</p></div>`);
      } else {
        _push(`<!---->`);
      }
      if (!isScanning.value && !permissionDenied.value && !result.value) {
        _push(`<div class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80" data-v-fede652c>`);
        _push(ssrRenderComponent(_component_Icon, {
          name: "ph:spinner-gap",
          class: "h-8 w-8 animate-spin text-amber-400"
        }, null, _parent));
        _push(`<p class="text-xs font-semibold text-white/80" data-v-fede652c>Starting camera…</p></div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div><div class="mt-4 flex items-center justify-center gap-3" data-v-fede652c>`);
      if (isScanning.value && !result.value) {
        _push(`<button type="button" class="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10" data-v-fede652c>`);
        _push(ssrRenderComponent(_component_Icon, {
          name: torchOn.value ? "ph:flashlight-fill" : "ph:flashlight",
          class: "h-4 w-4 text-amber-400"
        }, null, _parent));
        _push(` ${ssrInterpolate(torchOn.value ? "Torch On" : "Torch Off")}</button>`);
      } else {
        _push(`<!---->`);
      }
      if (result.value) {
        _push(`<button type="button" class="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-amber-600 active:scale-[0.98]" data-v-fede652c>`);
        _push(ssrRenderComponent(_component_Icon, {
          name: "ph:arrows-clockwise-bold",
          class: "h-4 w-4"
        }, null, _parent));
        _push(` Scan Again </button>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div></div>`);
    };
  }
});
const _sfc_setup$1 = _sfc_main$1.setup;
_sfc_main$1.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/messenger/QrScanner.vue");
  return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
const QrScanner = /* @__PURE__ */ Object.assign(_export_sfc(_sfc_main$1, [["__scopeId", "data-v-fede652c"]]), { __name: "MessengerQrScanner" });
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "scan",
  __ssrInlineRender: true,
  setup(__props) {
    useAuthStore();
    const { isDark } = useTheme();
    const mode = ref("pickup");
    const scanState = ref("idle");
    const rawScan = ref(null);
    const resultData = ref(null);
    const errorMessage = ref("");
    const scannerKey = ref(0);
    const resultCardClass = computed(() => {
      switch (scanState.value) {
        case "security-error":
          return "border-red-500/40 bg-red-950/80 shadow-lg shadow-red-500/10";
        case "route-error":
          return "border-amber-500/30 bg-amber-950/80 shadow-lg shadow-amber-500/10";
        case "error":
          return "border-red-400/20 bg-gray-900";
        case "success":
          return "border-emerald-500/30 bg-gray-900 shadow-lg shadow-emerald-500/10";
        case "unknown":
          return "border-white/10 bg-gray-900";
        default:
          return "border-amber-500/20 bg-gray-900";
      }
    });
    const parseQrPayload = (raw) => {
      const trimmed = raw.trim();
      const officeMatch = trimmed.match(/^flowvision:\/\/office\/(\d+)$/i);
      if (officeMatch) return { type: "office", id: Number(officeMatch[1]) };
      if (trimmed.startsWith("QR-") || /^[A-Z0-9]{6,}$/.test(trimmed)) {
        return { type: "document", qr: trimmed };
      }
      return { type: "unknown" };
    };
    const handleScan = async (raw) => {
      rawScan.value = raw;
      scanState.value = "processing";
      resultData.value = null;
      errorMessage.value = "";
      const payload = parseQrPayload(raw);
      if (payload.type === "unknown") {
        scanState.value = "unknown";
        return;
      }
      if (payload.type === "document" && mode.value === "dropoff") {
        errorMessage.value = "You scanned a document QR in Drop-off mode. Switch to Pickup mode to pick up a document.";
        scanState.value = "error";
        return;
      }
      if (payload.type === "office" && mode.value === "pickup") {
        errorMessage.value = "You scanned an office QR in Pickup mode. Switch to Drop-off mode to check in at an office.";
        scanState.value = "error";
        return;
      }
      try {
        if (payload.type === "document") {
          const res = await $fetch("/api/tracking/pickup", {
            method: "POST",
            body: { qr_code_data: payload.qr }
          });
          resultData.value = res.data;
          scanState.value = "success";
        } else if (payload.type === "office") {
          const res = await $fetch("/api/tracking/dropoff", {
            method: "POST",
            body: { office_id: payload.id }
          });
          resultData.value = res;
          scanState.value = "success";
        }
      } catch (err) {
        const msg = err?.data?.message ?? err?.message ?? "An unexpected error occurred.";
        const code = err?.data?.data?.code ?? "";
        if (code === "SECURITY_ORG_MISMATCH" || msg.includes("SECURITY_ORG_MISMATCH")) {
          scanState.value = "security-error";
          errorMessage.value = msg;
        } else if (code === "ROUTE_MISMATCH" || msg.includes("ROUTE_MISMATCH")) {
          scanState.value = "route-error";
          errorMessage.value = msg.replace("ROUTE_MISMATCH: ", "");
        } else {
          scanState.value = "error";
          errorMessage.value = msg;
        }
      }
    };
    const handleCameraError = (msg) => {
      errorMessage.value = msg;
      if (scanState.value === "idle") ;
    };
    return (_ctx, _push, _parent, _attrs) => {
      const _component_NuxtLink = __nuxt_component_3;
      const _component_Icon = __nuxt_component_0;
      _push(`<div${ssrRenderAttrs(mergeProps({
        class: ["min-h-screen flex flex-col", unref(isDark) ? "bg-rich-black" : "bg-gray-950"]
      }, _attrs))} data-v-5d45e40a><header class="flex items-center justify-between px-4 pt-4 pb-3" data-v-5d45e40a>`);
      _push(ssrRenderComponent(_component_NuxtLink, {
        to: "/messenger/dashboard",
        class: "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
      }, {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(ssrRenderComponent(_component_Icon, {
              name: "ph:arrow-left-bold",
              class: "h-4 w-4"
            }, null, _parent2, _scopeId));
            _push2(` Back `);
          } else {
            return [
              createVNode(_component_Icon, {
                name: "ph:arrow-left-bold",
                class: "h-4 w-4"
              }),
              createTextVNode(" Back ")
            ];
          }
        }),
        _: 1
      }, _parent));
      _push(`<h1 class="text-sm font-bold text-white" data-v-5d45e40a>Document Handshake</h1><div class="flex rounded-xl border border-white/10 bg-white/5 p-1" data-v-5d45e40a><button type="button" class="${ssrRenderClass([mode.value === "pickup" ? "bg-amber-500 text-white shadow" : "text-white/50 hover:text-white/80", "rounded-lg px-3 py-1 text-[11px] font-bold transition-all"])}" data-v-5d45e40a> Pickup </button><button type="button" class="${ssrRenderClass([mode.value === "dropoff" ? "bg-amber-500 text-white shadow" : "text-white/50 hover:text-white/80", "rounded-lg px-3 py-1 text-[11px] font-bold transition-all"])}" data-v-5d45e40a> Drop-off </button></div></header><div class="px-4 pb-3 text-center" data-v-5d45e40a><p class="text-xs text-white/50" data-v-5d45e40a>`);
      if (mode.value === "pickup") {
        _push(`<span data-v-5d45e40a>Scan the QR code <strong class="text-amber-400" data-v-5d45e40a>printed on the document</strong></span>`);
      } else {
        _push(`<span data-v-5d45e40a>Scan the QR code <strong class="text-amber-400" data-v-5d45e40a>posted on the office wall</strong></span>`);
      }
      _push(`</p></div><div class="flex-1 flex flex-col items-center justify-start px-4 pt-2 pb-4" data-v-5d45e40a>`);
      _push(ssrRenderComponent(QrScanner, {
        key: scannerKey.value,
        "scanner-id": `fv-scanner-${scannerKey.value}`,
        fps: 12,
        "qrbox-size": 220,
        onScan: handleScan,
        onError: handleCameraError
      }, null, _parent));
      if (scanState.value !== "idle") {
        _push(`<div class="${ssrRenderClass([resultCardClass.value, "mt-5 w-full max-w-[360px] overflow-hidden rounded-2xl border"])}" data-v-5d45e40a>`);
        if (scanState.value === "processing") {
          _push(`<div class="flex items-center gap-3 p-5" data-v-5d45e40a>`);
          _push(ssrRenderComponent(_component_Icon, {
            name: "ph:spinner-gap",
            class: "h-6 w-6 animate-spin text-amber-400 flex-shrink-0"
          }, null, _parent));
          _push(`<div data-v-5d45e40a><p class="text-sm font-bold text-white" data-v-5d45e40a>Processing scan…</p><p class="text-xs text-white/60 mt-0.5" data-v-5d45e40a>Contacting server</p></div></div>`);
        } else if (scanState.value === "success" && mode.value === "pickup") {
          _push(`<div class="p-5" data-v-5d45e40a><div class="flex items-start gap-3" data-v-5d45e40a><span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500/20" data-v-5d45e40a>`);
          _push(ssrRenderComponent(_component_Icon, {
            name: "ph:check-circle-fill",
            class: "h-6 w-6 text-emerald-400"
          }, null, _parent));
          _push(`</span><div class="min-w-0 flex-1" data-v-5d45e40a><p class="text-xs font-bold uppercase tracking-widest text-emerald-400" data-v-5d45e40a>Pickup Confirmed</p><p class="mt-1 text-sm font-bold text-white truncate" data-v-5d45e40a>${ssrInterpolate(resultData.value?.document?.title || "Document")}</p>`);
          if (resultData.value?.destination?.office_name) {
            _push(`<p class="mt-1 text-xs text-white/60" data-v-5d45e40a>`);
            _push(ssrRenderComponent(_component_Icon, {
              name: "ph:map-pin-fill",
              class: "inline h-3 w-3 text-amber-400 mr-1"
            }, null, _parent));
            _push(` Heading to <strong class="text-white/80" data-v-5d45e40a>${ssrInterpolate(resultData.value.destination.office_name)}</strong><span class="ml-1 text-amber-400" data-v-5d45e40a>(Step ${ssrInterpolate(resultData.value.destination.step)})</span></p>`);
          } else {
            _push(`<!---->`);
          }
          _push(`<div class="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-400" data-v-5d45e40a>`);
          _push(ssrRenderComponent(_component_Icon, {
            name: "ph:motorcycle-fill",
            class: "h-3 w-3"
          }, null, _parent));
          _push(` IN TRANSIT </div></div></div></div>`);
        } else if (scanState.value === "success" && mode.value === "dropoff") {
          _push(`<div class="p-5" data-v-5d45e40a><div class="flex items-start gap-3" data-v-5d45e40a><span class="${ssrRenderClass([resultData.value?.is_final_stop ? "bg-emerald-500/20" : "bg-amber-500/20", "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"])}" data-v-5d45e40a>`);
          _push(ssrRenderComponent(_component_Icon, {
            name: resultData.value?.is_final_stop ? "ph:check-circle-fill" : "ph:buildings-fill",
            class: ["h-6 w-6", resultData.value?.is_final_stop ? "text-emerald-400" : "text-amber-400"]
          }, null, _parent));
          _push(`</span><div class="min-w-0 flex-1" data-v-5d45e40a><p class="${ssrRenderClass([resultData.value?.is_final_stop ? "text-emerald-400" : "text-amber-400", "text-xs font-bold uppercase tracking-widest"])}" data-v-5d45e40a>${ssrInterpolate(resultData.value?.is_final_stop ? "🎉 Delivery Complete" : "Arrived at Office")}</p><p class="mt-1 text-sm font-bold text-white truncate" data-v-5d45e40a>${ssrInterpolate(resultData.value?.data?.office?.name)}</p><p class="mt-1 text-xs text-white/60" data-v-5d45e40a>`);
          if (resultData.value?.is_final_stop) {
            _push(`<span data-v-5d45e40a>All stages completed. Document delivered.</span>`);
          } else {
            _push(`<span data-v-5d45e40a> Step ${ssrInterpolate(resultData.value?.data?.step)} / ${ssrInterpolate(resultData.value?.data?.total_steps)} complete. Ready for next leg. </span>`);
          }
          _push(`</p><div class="${ssrRenderClass([resultData.value?.is_final_stop ? "bg-emerald-500/10 text-emerald-400" : "bg-rich-orange/10 text-rich-orange", "mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"])}" data-v-5d45e40a>`);
          _push(ssrRenderComponent(_component_Icon, {
            name: resultData.value?.is_final_stop ? "ph:check-circle-fill" : "ph:buildings-fill",
            class: "h-3 w-3"
          }, null, _parent));
          _push(` ${ssrInterpolate(resultData.value?.is_final_stop ? "COMPLETED" : "ARRIVED")}</div></div></div></div>`);
        } else if (scanState.value === "security-error") {
          _push(`<div class="p-5" data-v-5d45e40a><div class="flex items-start gap-3" data-v-5d45e40a><span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-red-500/20" data-v-5d45e40a>`);
          _push(ssrRenderComponent(_component_Icon, {
            name: "ph:shield-warning-fill",
            class: "h-6 w-6 text-red-400"
          }, null, _parent));
          _push(`</span><div class="min-w-0 flex-1" data-v-5d45e40a><p class="text-xs font-bold uppercase tracking-widest text-red-400" data-v-5d45e40a>🚫 Security Violation</p><p class="mt-1 text-sm font-bold text-white" data-v-5d45e40a>Cross-Org Scan Blocked</p><p class="mt-1 text-xs leading-relaxed text-white/60" data-v-5d45e40a> This asset belongs to a <strong class="text-red-400" data-v-5d45e40a>different organisation</strong>. Scanning external checkpoints is strictly prohibited. </p></div></div><div class="mt-3 rounded-xl bg-red-500/5 border border-red-500/20 px-4 py-3 text-[11px] font-mono text-red-400 break-all" data-v-5d45e40a>${ssrInterpolate(errorMessage.value)}</div></div>`);
        } else if (scanState.value === "route-error") {
          _push(`<div class="p-5" data-v-5d45e40a><div class="flex items-start gap-3" data-v-5d45e40a><span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500/20" data-v-5d45e40a>`);
          _push(ssrRenderComponent(_component_Icon, {
            name: "ph:warning-fill",
            class: "h-6 w-6 text-amber-400"
          }, null, _parent));
          _push(`</span><div class="min-w-0 flex-1" data-v-5d45e40a><p class="text-xs font-bold uppercase tracking-widest text-amber-400" data-v-5d45e40a>Wrong Checkpoint</p><p class="mt-1 text-sm font-bold text-white" data-v-5d45e40a>Route Mismatch</p><p class="mt-1 text-xs leading-relaxed text-white/60" data-v-5d45e40a>${ssrInterpolate(errorMessage.value)}</p></div></div></div>`);
        } else if (scanState.value === "error") {
          _push(`<div class="p-5" data-v-5d45e40a><div class="flex items-start gap-3" data-v-5d45e40a><span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-red-500/10" data-v-5d45e40a>`);
          _push(ssrRenderComponent(_component_Icon, {
            name: "ph:x-circle-fill",
            class: "h-6 w-6 text-red-400"
          }, null, _parent));
          _push(`</span><div class="min-w-0" data-v-5d45e40a><p class="text-xs font-bold uppercase tracking-widest text-red-400" data-v-5d45e40a>Scan Failed</p><p class="mt-1 text-xs leading-relaxed text-white/60" data-v-5d45e40a>${ssrInterpolate(errorMessage.value)}</p></div></div></div>`);
        } else if (scanState.value === "unknown") {
          _push(`<div class="p-5" data-v-5d45e40a><div class="flex items-start gap-3" data-v-5d45e40a><span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gray-500/10" data-v-5d45e40a>`);
          _push(ssrRenderComponent(_component_Icon, {
            name: "ph:question-fill",
            class: "h-6 w-6 text-gray-400"
          }, null, _parent));
          _push(`</span><div class="min-w-0" data-v-5d45e40a><p class="text-xs font-bold uppercase tracking-widest text-gray-400" data-v-5d45e40a>Unrecognised QR</p><p class="mt-1 text-xs text-white/60" data-v-5d45e40a>This QR code is not a FlowVision document or office checkpoint.</p><p class="mt-1 break-all font-mono text-[10px] text-gray-500" data-v-5d45e40a>${ssrInterpolate(rawScan.value)}</p></div></div></div>`);
        } else {
          _push(`<!---->`);
        }
        if (scanState.value !== "processing") {
          _push(`<div class="border-t border-white/5 px-5 py-3" data-v-5d45e40a><button type="button" class="w-full flex items-center justify-center gap-2 rounded-xl bg-white/5 py-2.5 text-xs font-bold text-white transition hover:bg-white/10 active:scale-[0.98]" data-v-5d45e40a>`);
          _push(ssrRenderComponent(_component_Icon, {
            name: "ph:scan",
            class: "h-4 w-4 text-amber-400"
          }, null, _parent));
          _push(` Scan Next </button></div>`);
        } else {
          _push(`<!---->`);
        }
        _push(`</div>`);
      } else {
        _push(`<!---->`);
      }
      if (scanState.value === "idle") {
        _push(`<div class="mt-4 flex items-center gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-2.5 text-xs text-amber-300/80" data-v-5d45e40a>`);
        _push(ssrRenderComponent(_component_Icon, {
          name: "ph:qr-code",
          class: "h-4 w-4 text-amber-400 flex-shrink-0"
        }, null, _parent));
        _push(`<span data-v-5d45e40a>`);
        if (mode.value === "pickup") {
          _push(`<strong data-v-5d45e40a>Point camera at document QR</strong>`);
        } else {
          _push(`<strong data-v-5d45e40a>Point camera at office wall QR</strong>`);
        }
        _push(`</span></div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div></div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/messenger/scan.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const scan = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-5d45e40a"]]);

export { scan as default };
//# sourceMappingURL=scan-BBQPsGcS.mjs.map
