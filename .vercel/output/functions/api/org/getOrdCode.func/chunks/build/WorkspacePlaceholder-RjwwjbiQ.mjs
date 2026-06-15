import { defineComponent, mergeProps, unref, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrInterpolate, ssrRenderClass } from 'vue/server-renderer';
import { b as useTheme } from './server.mjs';

const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "WorkspacePlaceholder",
  __ssrInlineRender: true,
  props: {
    title: { default: "Workspace" }
  },
  setup(__props) {
    const { isDark } = useTheme();
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<section${ssrRenderAttrs(mergeProps({
        class: ["rounded-lg border p-6 shadow-card", unref(isDark) ? "border-card-border bg-card-dark text-white" : "border-gray-200 bg-white text-rich-black"]
      }, _attrs))}><div class="mb-3 h-1 w-12 rounded-full bg-rich-orange"></div><h1 class="text-2xl font-bold tracking-tight">${ssrInterpolate(__props.title)}</h1><p class="${ssrRenderClass([unref(isDark) ? "text-gray-400" : "text-gray-500", "mt-2 max-w-2xl text-sm"])}"> This workspace is ready for its module content. </p></section>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/client/WorkspacePlaceholder.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const WorkspacePlaceholder = Object.assign(_sfc_main, { __name: "ClientWorkspacePlaceholder" });

export { WorkspacePlaceholder as W };
//# sourceMappingURL=WorkspacePlaceholder-RjwwjbiQ.mjs.map
