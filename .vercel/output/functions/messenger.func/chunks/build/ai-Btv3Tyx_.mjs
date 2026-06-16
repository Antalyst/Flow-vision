import { defineComponent, computed, ref, mergeProps, useSSRContext } from 'vue';
import { ssrRenderComponent } from 'vue/server-renderer';
import { A as AiCanvasWorkspace } from './AiCanvasWorkspace-BBbeb0Yy.mjs';
import { f as useRoute, a as useAuthStore } from './server.mjs';
import './index-CSZJBLRw.mjs';
import '@iconify/vue';
import '@iconify/utils/lib/css/icon';
import '../_/nitro.mjs';
import 'node:crypto';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
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

const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "ai",
  __ssrInlineRender: true,
  setup(__props) {
    const route = useRoute();
    useAuthStore();
    const activeScope = computed(() => {
      const raw = route.query.scope?.toUpperCase();
      return raw === "GLOBAL" ? "GLOBAL" : "LOCAL";
    });
    const officeIds = ref([]);
    return (_ctx, _push, _parent, _attrs) => {
      _push(ssrRenderComponent(AiCanvasWorkspace, mergeProps({
        scope: activeScope.value,
        "office-ids": officeIds.value,
        "back-route": "/employee/dashboard",
        "role-context": "employee"
      }, _attrs), null, _parent));
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/employee/ai.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=ai-Btv3Tyx_.mjs.map
