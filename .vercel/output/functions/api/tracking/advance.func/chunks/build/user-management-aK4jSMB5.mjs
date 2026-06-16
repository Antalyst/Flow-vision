import { defineComponent, ref, reactive, computed, mergeProps, unref, useSSRContext } from 'vue';
import { ssrRenderComponent, ssrRenderAttrs, ssrRenderClass, ssrInterpolate, ssrRenderList, ssrRenderAttr, ssrRenderTeleport, ssrRenderDynamicModel, ssrIncludeBooleanAttr } from 'vue/server-renderer';
import __nuxt_component_0 from './index-BYCkTpU3.mjs';
import { _ as _export_sfc, a as useAuthStore, u as useTheme } from './server.mjs';
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
import '@supabase/ssr';
import '@vue/shared';

const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "UserManagementComp",
  __ssrInlineRender: true,
  setup(__props) {
    const auth = useAuthStore();
    const { isDark } = useTheme();
    const members = ref([]);
    const loading = ref(false);
    const saving = ref(false);
    const drawerOpen = ref(false);
    const showPassword = ref(false);
    const activeTab = ref("all");
    const searchQuery = ref("");
    const provisionError = ref("");
    const form = reactive({ full_name: "", email: "", password: "" });
    const toast = reactive({ visible: false, message: "", type: "success" });
    const TABS = [
      { value: "all", label: "All Members" },
      { value: "employee", label: "Employees" },
      { value: "messenger", label: "Messengers" }
    ];
    const filteredMembers = computed(() => {
      let list = members.value;
      if (activeTab.value !== "all") list = list.filter((m) => m.role === activeTab.value);
      const q = searchQuery.value.trim().toLowerCase();
      if (q) list = list.filter(
        (m) => m.full_name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
      );
      return list;
    });
    const tabCount = (tab) => {
      if (tab === "all") return members.value.length;
      return members.value.filter((m) => m.role === tab).length;
    };
    const stats = computed(() => [
      {
        label: "Total Members",
        value: members.value.length,
        icon: "ph:users-three-fill",
        iconBg: "bg-rich-orange/10",
        iconColor: "text-rich-orange"
      },
      {
        label: "Employees",
        value: members.value.filter((m) => m.role === "employee").length,
        icon: "ph:briefcase-fill",
        iconBg: "bg-sky-500/10",
        iconColor: "text-sky-500"
      },
      {
        label: "Messengers",
        value: members.value.filter((m) => m.role === "messenger").length,
        icon: "ph:motorcycle-fill",
        iconBg: "bg-amber-500/10",
        iconColor: "text-amber-500"
      },
      {
        label: "Inactive",
        value: members.value.filter((m) => m.status !== 1).length,
        icon: "ph:prohibit-fill",
        iconBg: "bg-red-500/10",
        iconColor: "text-red-500"
      }
    ]);
    const surfaceClass = computed(
      () => isDark.value ? "border-card-border bg-[#1A1A1A] shadow-card-dark" : "border-gray-200 bg-white"
    );
    const borderClass = computed(() => isDark.value ? "border-card-border" : "border-gray-200");
    const mutedClass = computed(() => isDark.value ? "text-gray-400" : "text-gray-500");
    const inputClass = computed(
      () => isDark.value ? "border-card-border bg-rich-black text-white placeholder:text-gray-500" : "border-gray-200 bg-white text-gray-900 placeholder:text-gray-400"
    );
    const initials = (name) => name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
    const formatDate = (value) => value ? new Intl.DateTimeFormat("en", { month: "short", day: "2-digit", year: "numeric" }).format(new Date(value)) : "—";
    return (_ctx, _push, _parent, _attrs) => {
      const _component_Icon = __nuxt_component_0;
      _push(`<section${ssrRenderAttrs(mergeProps({
        class: ["w-full space-y-6 pb-24 lg:pb-8 animate-fade-in", unref(isDark) ? "text-white" : "text-rich-black"]
      }, _attrs))} data-v-9b510cf7><div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between" data-v-9b510cf7><div data-v-9b510cf7><div class="mb-3 h-1 w-14 rounded-full bg-rich-orange" data-v-9b510cf7></div><h1 class="text-2xl font-bold tracking-tight sm:text-3xl" data-v-9b510cf7>User Management</h1><p class="${ssrRenderClass([mutedClass.value, "mt-1 text-sm animate-pulse"])}" data-v-9b510cf7>${ssrInterpolate(unref(auth).currentOrg?.name || "—")} · org_id ${ssrInterpolate(unref(auth).user?.org_id)}</p></div><button type="button" class="inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow shadow-amber-500/20 transition-all duration-200 hover:scale-[1.02] hover:bg-amber-600 active:scale-[0.98]" data-v-9b510cf7>`);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:motorcycle-fill",
        class: "h-4 w-4"
      }, null, _parent));
      _push(` Provision Messenger </button></div><div class="grid grid-cols-2 gap-4 sm:grid-cols-4" data-v-9b510cf7><!--[-->`);
      ssrRenderList(stats.value, (stat) => {
        _push(`<div class="${ssrRenderClass([surfaceClass.value, "rounded-xl border p-4 transition-all duration-300"])}" data-v-9b510cf7><div class="flex items-center gap-3" data-v-9b510cf7><span class="${ssrRenderClass([stat.iconBg, "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"])}" data-v-9b510cf7>`);
        _push(ssrRenderComponent(_component_Icon, {
          name: stat.icon,
          class: ["h-4 w-4", stat.iconColor]
        }, null, _parent));
        _push(`</span><div data-v-9b510cf7><p class="${ssrRenderClass([unref(isDark) ? "text-white" : "text-gray-900", "text-xl font-bold"])}" data-v-9b510cf7>${ssrInterpolate(stat.value)}</p><p class="${ssrRenderClass([mutedClass.value, "text-[11px] font-medium"])}" data-v-9b510cf7>${ssrInterpolate(stat.label)}</p></div></div></div>`);
      });
      _push(`<!--]--></div><div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" data-v-9b510cf7><div class="${ssrRenderClass([unref(isDark) ? "border-card-border bg-rich-black/40" : "border-gray-200 bg-gray-50", "flex rounded-xl border p-1"])}" data-v-9b510cf7><!--[-->`);
      ssrRenderList(TABS, (tab) => {
        _push(`<button type="button" class="${ssrRenderClass([activeTab.value === tab.value ? unref(isDark) ? "bg-white/10 text-white shadow-sm" : "bg-white text-gray-900 shadow-sm" : unref(isDark) ? "text-gray-500 hover:text-gray-300" : "text-gray-500 hover:text-gray-700", "rounded-lg px-4 py-1.5 text-sm font-semibold transition-all duration-200"])}" data-v-9b510cf7>${ssrInterpolate(tab.label)} `);
        if (tabCount(tab.value) > 0) {
          _push(`<span class="${ssrRenderClass([tab.value === "messenger" ? "bg-amber-500/20 text-amber-600 dark:text-amber-400" : tab.value === "employee" ? "bg-sky-500/20 text-sky-600 dark:text-sky-400" : unref(isDark) ? "bg-white/10 text-gray-300" : "bg-gray-200 text-gray-600", "ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold"])}" data-v-9b510cf7>${ssrInterpolate(tabCount(tab.value))}</span>`);
        } else {
          _push(`<!---->`);
        }
        _push(`</button>`);
      });
      _push(`<!--]--></div><div class="${ssrRenderClass([unref(isDark) ? "border-card-border bg-rich-black/40 focus-within:border-rich-orange" : "border-gray-200 bg-white focus-within:border-rich-orange", "flex items-center gap-2 rounded-xl border px-3.5 py-2.5 transition-all"])}" data-v-9b510cf7>`);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:magnifying-glass",
        class: ["h-4 w-4 flex-shrink-0", mutedClass.value]
      }, null, _parent));
      _push(`<input${ssrRenderAttr("value", searchQuery.value)} type="search" placeholder="Search members…" class="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-gray-400 sm:w-52" data-v-9b510cf7></div></div><article class="${ssrRenderClass([surfaceClass.value, "overflow-hidden rounded-xl border transition-all duration-300"])}" data-v-9b510cf7><div class="overflow-x-auto" data-v-9b510cf7><table class="min-w-full text-left text-sm" data-v-9b510cf7><thead class="${ssrRenderClass(unref(isDark) ? "bg-rich-black/50 text-gray-400" : "bg-gray-50 text-gray-500")}" data-v-9b510cf7><tr data-v-9b510cf7><th class="whitespace-nowrap px-6 py-3.5 text-xs font-semibold uppercase tracking-wide" data-v-9b510cf7>Member</th><th class="whitespace-nowrap px-6 py-3.5 text-xs font-semibold uppercase tracking-wide" data-v-9b510cf7>Role</th><th class="whitespace-nowrap px-6 py-3.5 text-xs font-semibold uppercase tracking-wide" data-v-9b510cf7>Status</th><th class="whitespace-nowrap px-6 py-3.5 text-xs font-semibold uppercase tracking-wide" data-v-9b510cf7>Joined</th><th class="whitespace-nowrap px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wide" data-v-9b510cf7>Actions</th></tr></thead><tbody data-v-9b510cf7>`);
      if (loading.value) {
        _push(`<!--[-->`);
        ssrRenderList(5, (n) => {
          _push(`<tr class="${ssrRenderClass([borderClass.value, "border-t"])}" data-v-9b510cf7><td class="px-6 py-4" colspan="5" data-v-9b510cf7><div class="flex items-center gap-3" data-v-9b510cf7><div class="${ssrRenderClass([unref(isDark) ? "bg-white/5" : "bg-gray-200", "h-9 w-9 animate-pulse rounded-xl"])}" data-v-9b510cf7></div><div class="flex-1 space-y-2" data-v-9b510cf7><div class="${ssrRenderClass([unref(isDark) ? "bg-white/5" : "bg-gray-200", "h-3 w-36 animate-pulse rounded"])}" data-v-9b510cf7></div><div class="${ssrRenderClass([unref(isDark) ? "bg-white/5" : "bg-gray-100", "h-2.5 w-48 animate-pulse rounded"])}" data-v-9b510cf7></div></div></div></td></tr>`);
        });
        _push(`<!--]-->`);
      } else {
        _push(`<!--[--><!--[-->`);
        ssrRenderList(filteredMembers.value, (member) => {
          _push(`<tr class="${ssrRenderClass([[borderClass.value, unref(isDark) ? "hover:bg-white/[0.025]" : "hover:bg-gray-50/80"], "border-t transition-colors duration-150"])}" data-v-9b510cf7><td class="px-6 py-4" data-v-9b510cf7><div class="flex items-center gap-3" data-v-9b510cf7><div class="${ssrRenderClass([member.role === "messenger" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-sky-500/10 text-sky-600 dark:text-sky-400", "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold"])}" data-v-9b510cf7>${ssrInterpolate(initials(member.full_name))}</div><div class="min-w-0" data-v-9b510cf7><p class="${ssrRenderClass([unref(isDark) ? "text-gray-100" : "text-gray-900", "truncate font-semibold"])}" data-v-9b510cf7>${ssrInterpolate(member.full_name)}</p><p class="${ssrRenderClass([mutedClass.value, "truncate text-xs"])}" data-v-9b510cf7>${ssrInterpolate(member.email)}</p></div></div></td><td class="whitespace-nowrap px-6 py-4" data-v-9b510cf7><span class="${ssrRenderClass([member.role === "messenger" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-sky-500/10 text-sky-600 dark:text-sky-400", "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider"])}" data-v-9b510cf7>`);
          _push(ssrRenderComponent(_component_Icon, {
            name: member.role === "messenger" ? "ph:motorcycle-fill" : "ph:briefcase-fill",
            class: "h-3 w-3"
          }, null, _parent));
          _push(` ${ssrInterpolate(member.role)}</span></td><td class="whitespace-nowrap px-6 py-4" data-v-9b510cf7><button type="button"${ssrRenderAttr("title", member.status === 1 ? "Click to deactivate" : "Click to activate")} class="${ssrRenderClass([member.status === 1 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-gray-400/10 text-gray-500 dark:text-gray-400", "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all hover:opacity-80"])}" data-v-9b510cf7><span class="${ssrRenderClass([member.status === 1 ? "bg-emerald-500" : "bg-gray-400", "h-1.5 w-1.5 rounded-full"])}" data-v-9b510cf7></span> ${ssrInterpolate(member.status === 1 ? "Active" : "Inactive")}</button></td><td class="${ssrRenderClass([mutedClass.value, "whitespace-nowrap px-6 py-4 text-sm"])}" data-v-9b510cf7>${ssrInterpolate(formatDate(member.created_at))}</td><td class="whitespace-nowrap px-6 py-4" data-v-9b510cf7><div class="flex justify-end gap-1" data-v-9b510cf7><button type="button" class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-500/10" title="Remove member" data-v-9b510cf7>`);
          _push(ssrRenderComponent(_component_Icon, {
            name: "ph:trash",
            class: "h-4 w-4"
          }, null, _parent));
          _push(`</button></div></td></tr>`);
        });
        _push(`<!--]-->`);
        if (!filteredMembers.value.length) {
          _push(`<tr data-v-9b510cf7><td colspan="5" class="${ssrRenderClass([mutedClass.value, "px-6 py-16 text-center"])}" data-v-9b510cf7><div class="flex flex-col items-center gap-3" data-v-9b510cf7>`);
          _push(ssrRenderComponent(_component_Icon, {
            name: "ph:users-three",
            class: "h-10 w-10 text-gray-300"
          }, null, _parent));
          _push(`<p class="${ssrRenderClass([unref(isDark) ? "text-gray-300" : "text-gray-600", "font-semibold text-base"])}" data-v-9b510cf7> No members found </p><p class="text-sm" data-v-9b510cf7>${ssrInterpolate(searchQuery.value ? "Try a different search term." : "Provision a messenger to get started.")}</p></div></td></tr>`);
        } else {
          _push(`<!---->`);
        }
        _push(`<!--]-->`);
      }
      _push(`</tbody></table></div>`);
      if (!loading.value && filteredMembers.value.length) {
        _push(`<div class="${ssrRenderClass([[borderClass.value, unref(isDark) ? "bg-rich-black/20" : "bg-gray-50/70"], "flex items-center justify-between border-t px-6 py-3"])}" data-v-9b510cf7><p class="${ssrRenderClass([mutedClass.value, "text-xs"])}" data-v-9b510cf7> Showing ${ssrInterpolate(filteredMembers.value.length)} of ${ssrInterpolate(members.value.length)} members </p><p class="${ssrRenderClass([mutedClass.value, "text-xs font-mono"])}" data-v-9b510cf7> Scoped to org_id ${ssrInterpolate(unref(auth).user?.org_id)}</p></div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</article><article class="${ssrRenderClass([surfaceClass.value, "rounded-xl border p-5 transition-all duration-300"])}" data-v-9b510cf7><div class="flex items-start gap-3" data-v-9b510cf7><span class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-rich-orange/10" data-v-9b510cf7>`);
      _push(ssrRenderComponent(_component_Icon, {
        name: "ph:shield-check-fill",
        class: "h-5 w-5 text-rich-orange"
      }, null, _parent));
      _push(`</span><div class="space-y-1 min-w-0" data-v-9b510cf7><p class="${ssrRenderClass([unref(isDark) ? "text-gray-100" : "text-gray-900", "font-semibold text-sm"])}" data-v-9b510cf7>Cross-Tenant Isolation Enforced</p><p class="${ssrRenderClass([mutedClass.value, "text-xs leading-relaxed"])}" data-v-9b510cf7> All messenger accounts provisioned here are strictly bound to <strong data-v-9b510cf7>org_id ${ssrInterpolate(unref(auth).user?.org_id)}</strong> (${ssrInterpolate(unref(auth).currentOrg?.name ?? "—")}). The server validates the administrator session on every write operation — the org_id is never read from the request body. Messengers can only access documents, offices, and logs that belong to this organization. </p></div></div></article>`);
      ssrRenderTeleport(_push, (_push2) => {
        if (drawerOpen.value) {
          _push2(`<div class="fixed inset-0 z-[80] bg-black/55 backdrop-blur-sm" data-v-9b510cf7></div>`);
        } else {
          _push2(`<!---->`);
        }
        if (drawerOpen.value) {
          _push2(`<form class="${ssrRenderClass([unref(isDark) ? "bg-[#1A1A1A] border-card-border" : "bg-white border-gray-200", "fixed bottom-0 right-0 top-0 z-[90] flex w-full max-w-lg flex-col border-l shadow-2xl"])}" data-v-9b510cf7><header class="${ssrRenderClass([borderClass.value, "flex items-start justify-between gap-4 border-b px-6 py-5"])}" data-v-9b510cf7><div data-v-9b510cf7><p class="text-[10px] font-bold uppercase tracking-widest text-amber-500" data-v-9b510cf7>Provision</p><h2 class="${ssrRenderClass([unref(isDark) ? "text-white" : "text-gray-900", "mt-1 text-xl font-bold"])}" data-v-9b510cf7> New Messenger Account </h2><p class="${ssrRenderClass([mutedClass.value, "mt-0.5 text-xs"])}" data-v-9b510cf7> Bound to ${ssrInterpolate(unref(auth).currentOrg?.name)} · org_id ${ssrInterpolate(unref(auth).user?.org_id)}</p></div><button type="button" class="inline-flex h-9 w-9 items-center justify-center rounded-lg transition hover:bg-gray-100 dark:hover:bg-white/5" data-v-9b510cf7>`);
          _push2(ssrRenderComponent(_component_Icon, {
            name: "ph:x-bold",
            class: "h-4 w-4"
          }, null, _parent));
          _push2(`</button></header><div class="flex-1 overflow-y-auto px-6 py-6 space-y-5" data-v-9b510cf7><div class="${ssrRenderClass([unref(isDark) ? "border-amber-500/20 bg-amber-500/5" : "border-amber-200 bg-amber-50", "flex items-center gap-3 rounded-xl border px-4 py-3"])}" data-v-9b510cf7>`);
          _push2(ssrRenderComponent(_component_Icon, {
            name: "ph:motorcycle-fill",
            class: "h-5 w-5 text-amber-500"
          }, null, _parent));
          _push2(`<div data-v-9b510cf7><p class="text-sm font-bold text-amber-600 dark:text-amber-400" data-v-9b510cf7>Role: Messenger</p><p class="${ssrRenderClass([mutedClass.value, "text-[11px]"])}" data-v-9b510cf7>Fixed — only messenger roles can be provisioned here.</p></div></div><label class="block" data-v-9b510cf7><span class="${ssrRenderClass([unref(isDark) ? "text-gray-200" : "text-gray-800", "text-sm font-semibold"])}" data-v-9b510cf7> Full Name <span class="text-red-500" data-v-9b510cf7>*</span></span><input${ssrRenderAttr("value", form.full_name)} type="text" placeholder="e.g. Juan Dela Cruz" class="${ssrRenderClass([inputClass.value, "mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-amber-500"])}" required data-v-9b510cf7></label><label class="block" data-v-9b510cf7><span class="${ssrRenderClass([unref(isDark) ? "text-gray-200" : "text-gray-800", "text-sm font-semibold"])}" data-v-9b510cf7> Email Address <span class="text-red-500" data-v-9b510cf7>*</span></span><input${ssrRenderAttr("value", form.email)} type="email" placeholder="messenger@yourorg.com" class="${ssrRenderClass([inputClass.value, "mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-amber-500"])}" required data-v-9b510cf7></label><label class="block" data-v-9b510cf7><span class="${ssrRenderClass([unref(isDark) ? "text-gray-200" : "text-gray-800", "text-sm font-semibold"])}" data-v-9b510cf7> Initial Password <span class="text-red-500" data-v-9b510cf7>*</span></span><div class="relative mt-2" data-v-9b510cf7><input${ssrRenderDynamicModel(showPassword.value ? "text" : "password", form.password, null)}${ssrRenderAttr("type", showPassword.value ? "text" : "password")} placeholder="Min 8 characters" class="${ssrRenderClass([inputClass.value, "w-full rounded-xl border px-4 py-3 pr-11 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-amber-500"])}" minlength="8" required data-v-9b510cf7><button type="button" class="${ssrRenderClass([mutedClass.value, "absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 transition hover:text-amber-500"])}" data-v-9b510cf7>`);
          _push2(ssrRenderComponent(_component_Icon, {
            name: showPassword.value ? "ph:eye-slash" : "ph:eye",
            class: "h-4 w-4"
          }, null, _parent));
          _push2(`</button></div><p class="${ssrRenderClass([mutedClass.value, "mt-1.5 text-[11px]"])}" data-v-9b510cf7> Share this with the messenger securely. They can change it after first login. </p></label><div class="${ssrRenderClass([unref(isDark) ? "border-card-border bg-rich-black/40" : "border-gray-200 bg-gray-50", "rounded-xl border p-4 text-sm"])}" data-v-9b510cf7><div class="${ssrRenderClass([unref(isDark) ? "text-gray-200" : "text-gray-800", "flex items-center gap-2 font-semibold"])}" data-v-9b510cf7>`);
          _push2(ssrRenderComponent(_component_Icon, {
            name: "ph:lock-fill",
            class: "h-4 w-4 text-rich-orange"
          }, null, _parent));
          _push2(` Organization Scope Lock </div><p class="${ssrRenderClass([mutedClass.value, "mt-2 text-xs leading-5"])}" data-v-9b510cf7> This account will be <strong data-v-9b510cf7>irreversibly bound</strong> to <strong data-v-9b510cf7>${ssrInterpolate(unref(auth).currentOrg?.name ?? `org_id ${unref(auth).user?.org_id}`)}</strong>. The org_id is set server-side from your administrator session — it cannot be overridden from the client or the request body. </p><dl class="mt-3 grid grid-cols-2 gap-2 text-xs" data-v-9b510cf7><dt class="${ssrRenderClass(mutedClass.value)}" data-v-9b510cf7>Organization</dt><dd class="${ssrRenderClass([unref(isDark) ? "text-gray-200" : "text-gray-800", "font-semibold text-right"])}" data-v-9b510cf7>${ssrInterpolate(unref(auth).currentOrg?.name ?? "—")}</dd><dt class="${ssrRenderClass(mutedClass.value)}" data-v-9b510cf7>Org Code</dt><dd class="${ssrRenderClass([unref(isDark) ? "text-gray-200" : "text-gray-800", "font-mono font-semibold text-right"])}" data-v-9b510cf7>${ssrInterpolate(unref(auth).currentOrg?.code ?? "—")}</dd><dt class="${ssrRenderClass(mutedClass.value)}" data-v-9b510cf7>Org ID</dt><dd class="font-mono font-semibold text-right text-rich-orange" data-v-9b510cf7>${ssrInterpolate(unref(auth).user?.org_id)}</dd></dl></div>`);
          if (provisionError.value) {
            _push2(`<div class="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-500" data-v-9b510cf7>`);
            _push2(ssrRenderComponent(_component_Icon, {
              name: "ph:warning-circle-fill",
              class: "mt-0.5 h-4 w-4 flex-shrink-0"
            }, null, _parent));
            _push2(` ${ssrInterpolate(provisionError.value)}</div>`);
          } else {
            _push2(`<!---->`);
          }
          _push2(`</div><footer class="${ssrRenderClass([borderClass.value, "flex items-center justify-end gap-3 border-t px-6 py-4"])}" data-v-9b510cf7><button type="button" class="${ssrRenderClass([unref(isDark) ? "border-card-border text-gray-300" : "border-gray-200 text-gray-700", "rounded-xl border px-4 py-2.5 text-sm font-semibold transition hover:bg-gray-50 dark:hover:bg-white/5"])}" data-v-9b510cf7> Cancel </button><button type="submit"${ssrIncludeBooleanAttr(saving.value || !form.full_name || !form.email || form.password.length < 8) ? " disabled" : ""} class="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50" data-v-9b510cf7>`);
          if (saving.value) {
            _push2(ssrRenderComponent(_component_Icon, {
              name: "ph:spinner-gap",
              class: "h-4 w-4 animate-spin"
            }, null, _parent));
          } else {
            _push2(ssrRenderComponent(_component_Icon, {
              name: "ph:motorcycle-fill",
              class: "h-4 w-4"
            }, null, _parent));
          }
          _push2(` ${ssrInterpolate(saving.value ? "Provisioning…" : "Provision Account")}</button></footer></form>`);
        } else {
          _push2(`<!---->`);
        }
      }, "body", false, _parent);
      ssrRenderTeleport(_push, (_push2) => {
        if (toast.visible) {
          _push2(`<div class="${ssrRenderClass([toast.type === "success" ? unref(isDark) ? "bg-emerald-900/90 border-emerald-500/30 text-emerald-300" : "bg-emerald-50 border-emerald-200 text-emerald-700" : unref(isDark) ? "bg-red-900/90 border-red-500/30 text-red-300" : "bg-red-50 border-red-200 text-red-700", "fixed bottom-6 right-6 z-[100] flex items-center gap-3 rounded-2xl border px-5 py-4 shadow-2xl text-sm font-semibold"])}" data-v-9b510cf7>`);
          _push2(ssrRenderComponent(_component_Icon, {
            name: toast.type === "success" ? "ph:check-circle-fill" : "ph:x-circle-fill",
            class: "h-5 w-5"
          }, null, _parent));
          _push2(` ${ssrInterpolate(toast.message)}</div>`);
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
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/client/users/UserManagementComp.vue");
  return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
const UserManagementComp = /* @__PURE__ */ Object.assign(_export_sfc(_sfc_main$1, [["__scopeId", "data-v-9b510cf7"]]), { __name: "ClientUsersUserManagementComp" });
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "user-management",
  __ssrInlineRender: true,
  setup(__props) {
    return (_ctx, _push, _parent, _attrs) => {
      _push(ssrRenderComponent(UserManagementComp, _attrs, null, _parent));
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/client/user-management.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=user-management-aK4jSMB5.mjs.map
