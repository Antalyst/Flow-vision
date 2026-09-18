import { computed, watch } from 'vue'
import type { Chart as ChartJSChart } from 'chart.js'

/** Chart.js scale + legend colors aligned to the 3-color FlowVision palette. */
export function useChartTheme() {
  const { isDark } = useTheme()

  const gridColor = computed(() => (isDark.value ? '#2A2A2A' : '#E4E4E7'))
  const tickColor = computed(() => (isDark.value ? '#A0A0A0' : '#71717A'))
  const legendColor = computed(() => (isDark.value ? '#A0A0A0' : '#71717A'))

  const tooltip = computed(() => ({
    backgroundColor: isDark.value ? '#1A1A1A' : '#FFFFFF',
    titleColor: isDark.value ? '#FFFFFF' : '#121212',
    bodyColor: isDark.value ? '#A0A0A0' : '#71717A',
    borderColor: isDark.value ? '#2A2A2A' : '#E4E4E7',
  }))

  const donutBorderColor = computed(() => (isDark.value ? '#111113' : '#FFFFFF'))

  const candy = {
    primary: '#EE4D2D', // Brand accent
    soft: 'rgba(238, 77, 45, 0.1)',
    medium: 'rgba(238, 77, 45, 0.2)',
    strong: 'rgba(238, 77, 45, 0.8)',
    forecast: 'rgba(238, 77, 45, 0.5)', // Accent, dashed + faded for projected values
  }

  function buildCartesianScales() {
    return {
      x: {
        grid: { color: gridColor.value },
        ticks: { color: tickColor.value, font: { size: 11 } },
      },
      y: {
        grid: { color: gridColor.value },
        ticks: { color: tickColor.value, font: { size: 11 } },
        beginAtZero: true,
      },
    }
  }

  function buildLegendPlugin() {
    return {
      labels: { color: legendColor.value, boxWidth: 12 },
    }
  }

  function buildTooltipPlugin() {
    const t = tooltip.value
    return {
      backgroundColor: t.backgroundColor,
      titleColor: t.titleColor,
      bodyColor: t.bodyColor,
      borderColor: t.borderColor,
      borderWidth: 1,
    }
  }

  /** Apply theme colors to a live Chart.js instance (carousel / donut). */
  function applyThemeToChart(chart: ChartJSChart | null | undefined) {
    if (!chart?.options) return

    const scales = chart.options.scales
    if (scales) {
      for (const key of Object.keys(scales)) {
        const scale = scales[key]
        if (!scale) continue
        scale.grid = { ...scale.grid, color: gridColor.value }
        scale.ticks = { ...scale.ticks, color: tickColor.value }
      }
    }

    if (chart.options.plugins?.legend?.labels) {
      chart.options.plugins.legend.labels.color = legendColor.value
    }

    const tip = chart.options.plugins?.tooltip
    if (tip) {
      const t = tooltip.value
      tip.backgroundColor = t.backgroundColor
      tip.titleColor = t.titleColor
      tip.bodyColor = t.bodyColor
      tip.borderColor = t.borderColor
    }

    chart.update('none')
  }

  function watchChartTheme(getChart: () => ChartJSChart | null | undefined) {
    watch(
      isDark,
      () => {
        applyThemeToChart(getChart())
      },
      { immediate: true },
    )
  }

  const themeKey = computed(() => (isDark.value ? 'dark' : 'light'))

  return {
    isDark,
    themeKey,
    gridColor,
    tickColor,
    legendColor,
    tooltip,
    donutBorderColor,
    candy,
    buildCartesianScales,
    buildLegendPlugin,
    buildTooltipPlugin,
    applyThemeToChart,
    watchChartTheme,
  }
}
