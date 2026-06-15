import { ref, provide, computed, inject } from 'vue';

const DASHBOARD_ENTRANCE_KEY = /* @__PURE__ */ Symbol("dashboardEntrance");
function provideDashboardEntrance() {
  const isEntranceVisible = ref(false);
  provide(DASHBOARD_ENTRANCE_KEY, isEntranceVisible);
  const entranceVisibleClass = computed(
    () => isEntranceVisible.value ? "fv-enter-visible" : ""
  );
  return { isEntranceVisible, entranceVisibleClass };
}
function useDashboardEntrance() {
  const isEntranceVisible = inject(DASHBOARD_ENTRANCE_KEY, ref(false));
  const entranceVisibleClass = computed(
    () => isEntranceVisible.value ? "fv-enter-visible" : ""
  );
  const entranceClasses = (...layers) => computed(
    () => layers.map((layer) => `fv-enter-${layer}`).concat(isEntranceVisible.value ? "fv-enter-visible" : "").join(" ")
  );
  const cardEnterDelay = (index = 0, stepMs = 75) => ({
    transitionDelay: `${300 + index * stepMs}ms`
  });
  return {
    isEntranceVisible,
    entranceVisibleClass,
    entranceClasses,
    cardEnterDelay
  };
}

export { provideDashboardEntrance as p, useDashboardEntrance as u };
//# sourceMappingURL=useDashboardEntrance-W2ntCYX9.mjs.map
