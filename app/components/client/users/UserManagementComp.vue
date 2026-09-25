<template>
  <section class="w-full space-y-6 pb-24 lg:pb-8 animate-fade-in" :class="isDark ? 'text-white' : 'text-onyx-black'">

    <!-- ── Page header ────────────────────────────────────────────────── -->
    <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <div class="mb-3 h-1 w-14 rounded-full bg-candy-orange" />
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Team Members</h1>
        <p class="mt-1 text-sm" :class="mutedClass">
          {{ auth.currentOrg?.name || '—' }}
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition"
          :class="isDark ? 'border-onyx-border text-gray-200 hover:bg-onyx-card' : 'border-gray-200 text-gray-700 hover:bg-gray-50'"
          @click="openImportModal"
        >
          <Icon name="ph:upload-simple-light" class="h-4 w-4" />
          Import CSV
        </button>
       
        <button
          type="button"
          class="inline-flex min-h-11 items-center gap-2 rounded-xl bg-candy-orange px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-candy-hover active:scale-[0.98]"
          @click="openProvisionDrawer('employee')"
        >
          <Icon name="ph:plus-bold" class="h-4 w-4" />
          Add Employee
        </button>
      </div>
    </div>

    <!-- ── Stat cards ──────────────────────────────────────────────────── -->
    <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <div
        v-for="stat in stats"
        :key="stat.label"
        class="rounded-2xl border p-4 transition-all duration-300"
        :class="surfaceClass"
      >
        <div class="flex items-center gap-3">
          <span class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full" :class="stat.iconBg">
            <Icon :name="stat.icon" class="h-4 w-4" :class="stat.iconColor" />
          </span>
          <div>
            <p class="text-xl font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">{{ stat.value }}</p>
            <p class="text-sm font-medium" :class="mutedClass">{{ stat.label }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Filter tabs + search ────────────────────────────────────────── -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex rounded-xl border p-1" :class="isDark ? 'border-onyx-border bg-onyx-black/40' : 'border-gray-200 bg-gray-50'">
        <button
          v-for="tab in TABS"
          :key="tab.value"
          type="button"
          class="rounded-lg px-4 py-1.5 text-sm font-semibold transition-all duration-200"
          :class="activeTab === tab.value
            ? (isDark ? 'bg-white/10 text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm')
            : (isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700')"
          @click="activeTab = tab.value"
        >
          {{ tab.label }}
          <span
            v-if="tabCount(tab.value) > 0"
            class="ml-1.5 rounded-full px-1.5 py-0.5 text-sm font-bold"
            :class="isDark ? 'bg-white/10 text-gray-300' : 'bg-gray-200 text-gray-600'"
          >
            {{ tabCount(tab.value) }}
          </span>
        </button>
      </div>

      <div
        class="flex items-center gap-2 rounded-xl border px-3.5 py-2.5 transition-all"
        :class="isDark ? 'border-onyx-border bg-onyx-black/40 focus-within:border-candy-orange' : 'border-gray-200 bg-white focus-within:border-candy-orange'"
      >
        <Icon name="ph:magnifying-glass" class="h-4 w-4 flex-shrink-0" :class="mutedClass" />
        <input
          v-model="searchQuery"
          type="search"
          placeholder="Search members…"
          class="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-gray-400 sm:w-52"
        />
      </div>
    </div>

    <!-- ── Member table ────────────────────────────────────────────────── -->
    <article class="overflow-hidden rounded-2xl border transition-all duration-300" :class="surfaceClass">
      <div class="overflow-x-auto">
        <table class="min-w-full text-left text-sm">
          <thead :class="isDark ? 'bg-onyx-black/50 text-gray-400' : 'bg-gray-50 text-gray-500'">
            <tr>
              <th class="whitespace-nowrap px-6 py-3.5 text-xs font-semibold uppercase tracking-wide">Member</th>
              <th class="whitespace-nowrap px-6 py-3.5 text-xs font-semibold uppercase tracking-wide">Role</th>
              <th class="whitespace-nowrap px-6 py-3.5 text-xs font-semibold uppercase tracking-wide">Office</th>
              <th class="whitespace-nowrap px-6 py-3.5 text-xs font-semibold uppercase tracking-wide">Status</th>
              <th class="whitespace-nowrap px-6 py-3.5 text-xs font-semibold uppercase tracking-wide">Joined</th>
              <th class="whitespace-nowrap px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wide">Actions</th>
            </tr>
          </thead>

          <tbody>
            <template v-if="loading">
              <tr v-for="n in 5" :key="n" class="border-t" :class="borderClass">
                <td class="px-6 py-4" colspan="6">
                  <div class="flex items-center gap-3">
                    <div class="h-9 w-9 animate-pulse rounded-full" :class="isDark ? 'bg-white/5' : 'bg-gray-200'" />
                    <div class="flex-1 space-y-2">
                      <div class="h-3 w-36 animate-pulse rounded-md" :class="isDark ? 'bg-white/5' : 'bg-gray-200'" />
                      <div class="h-2.5 w-48 animate-pulse rounded-md" :class="isDark ? 'bg-white/5' : 'bg-gray-100'" />
                    </div>
                  </div>
                </td>
              </tr>
            </template>

            <template v-else>
              <tr
                v-for="member in filteredMembers"
                :key="`${member.role}-${member.user_id}`"
                class="border-t transition-colors duration-150"
                :class="[borderClass, isDark ? 'hover:bg-white/[0.025]' : 'hover:bg-gray-50/80']"
              >
                <td class="px-6 py-4">
                  <div class="flex items-center gap-3">
                    <div
                      class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold"
                      :class="member.role === 'messenger'
                        ? 'bg-candy-orange/10 text-candy-orange'
                        : (isDark ? 'bg-white/10 text-gray-300' : 'bg-gray-200 text-gray-600')"
                    >
                      {{ initials(member.full_name) }}
                    </div>
                    <div class="min-w-0">
                      <p class="truncate font-semibold" :class="isDark ? 'text-gray-100' : 'text-gray-900'">
                        {{ member.full_name }}
                      </p>
                      <p class="truncate text-xs" :class="mutedClass">{{ member.email }}</p>
                    </div>
                  </div>
                </td>

                <td class="whitespace-nowrap px-6 py-4">
                  <span
                    class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-bold uppercase tracking-wider"
                    :class="member.role === 'messenger'
                      ? 'bg-candy-orange/10 text-candy-orange'
                      : (isDark ? 'bg-white/10 text-gray-300' : 'bg-gray-200 text-gray-600')"
                  >
                    <Icon
                      :name="member.role === 'messenger' ? 'ph:motorcycle-fill' : 'ph:briefcase-fill'"
                      class="h-3 w-3"
                    />
                    {{ member.role }}
                  </span>
                </td>

                <td class="whitespace-nowrap px-6 py-4">
                  <span v-if="member.office_name" class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold"
                    :class="isDark ? 'border-candy-orange/30 bg-candy-orange/10 text-candy-orange' : 'border-orange-200 bg-orange-50 text-candy-orange'">
                    <Icon name="ph:desktop-light" class="h-3 w-3" />
                    {{ member.office_name }}
                    <span class="opacity-60 font-mono">{{ member.office_code }}</span>
                  </span>
                  <span v-else :class="mutedClass">—</span>
                </td>

                <td class="whitespace-nowrap px-6 py-4">
                  <button
                    type="button"
                    :title="member.status === 1 ? 'Click to deactivate' : 'Click to activate'"
                    class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold transition-all hover:opacity-80"
                    :class="member.status === 1
                      ? 'bg-success/10 text-success'
                      : 'bg-gray-400/10 text-gray-500 dark:text-gray-400'"
                    @click="handleToggleStatus(member)"
                  >
                    <span
                      class="h-1.5 w-1.5 rounded-full"
                      :class="member.status === 1 ? 'bg-success' : 'bg-gray-400'"
                    />
                    {{ member.status === 1 ? 'Active' : 'Inactive' }}
                  </button>
                </td>

                <td class="whitespace-nowrap px-6 py-4 text-sm" :class="mutedClass">
                  {{ formatDate(member.created_at) }}
                </td>

                <td class="whitespace-nowrap px-6 py-4">
                  <div class="flex justify-end gap-1">
                    <button
                      type="button"
                      class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-candy-orange transition hover:bg-candy-orange/10"
                      title="Edit member"
                      @click="openEditDrawer(member)"
                    >
                      <Icon name="ph:pencil-simple" class="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-danger transition hover:bg-danger/10"
                      title="Remove member"
                      @click="handleRemove(member)"
                    >
                      <Icon name="ph:trash" class="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>

              <tr v-if="!filteredMembers.length">
                <td colspan="6" class="px-6 py-16 text-center" :class="mutedClass">
                  <div class="flex flex-col items-center gap-3">
                    <Icon name="ph:users-three" class="h-10 w-10 text-gray-300" />
                    <p class="font-semibold text-base" :class="isDark ? 'text-gray-300' : 'text-gray-600'">
                      No members found
                    </p>
                    <p class="text-sm">
                      {{ searchQuery ? 'Try a different search term.' : 'Add an employee or messenger to get started.' }}
                    </p>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <div
        v-if="!loading && filteredMembers.length"
        class="flex items-center justify-between border-t px-6 py-3"
        :class="[borderClass, isDark ? 'bg-onyx-black/20' : 'bg-gray-50/70']"
      >
        <p class="text-xs" :class="mutedClass">
          Showing {{ filteredMembers.length }} of {{ members.length }} members
        </p>
      </div>
    </article>

    <!-- ── Org scope info card ─────────────────────────────────────────── -->
    <article class="rounded-2xl border p-5 transition-all duration-300" :class="surfaceClass">
      <div class="flex items-start gap-3">
        <span class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-candy-orange/10">
          <Icon name="ph:shield-check-fill" class="h-5 w-5 text-candy-orange" />
        </span>
        <div class="space-y-1 min-w-0">
          <p class="font-semibold text-sm" :class="isDark ? 'text-gray-100' : 'text-gray-900'">Your Organization Only</p>
          <p class="text-xs leading-relaxed" :class="mutedClass">
            Employees and messengers you add here only work within <strong>{{ auth.currentOrg?.name ?? 'your organization' }}</strong>.
            They can't see or access documents, offices, or activity that belong to another organization.
          </p>
        </div>
      </div>
    </article>

    <!-- ── Add/Edit Drawer ────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="drawer-fade">
        <div
          v-if="drawerOpen"
          class="fixed inset-0 z-[80] bg-black/55 backdrop-blur-sm"
          @click="closeDrawer"
        />
      </Transition>

      <Transition name="drawer-slide">
        <form
          v-if="drawerOpen"
          class="fixed bottom-0 right-0 top-0 z-[90] flex w-full max-w-lg flex-col border-l shadow-2xl"
          :class="isDark ? 'bg-[#1A1A1A] border-onyx-border' : 'bg-white border-gray-200'"
          @submit.prevent="handleSaveDrawer"
        >
          <header
            class="flex items-start justify-between gap-4 border-b px-6 py-5"
            :class="borderClass"
          >
            <div>
              <p class="text-sm font-bold uppercase tracking-widest text-candy-orange">
                {{ drawerMode === 'edit' ? 'Edit' : 'Add' }}
              </p>
              <h2 class="mt-1 text-xl font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">
                {{ drawerMode === 'edit' ? 'Edit Member Account' : (drawerRole === 'employee' ? 'New Employee Account' : 'New Messenger Account') }}
              </h2>
              <p class="mt-0.5 text-xs" :class="mutedClass">
                {{ auth.currentOrg?.name }}
              </p>
            </div>
            <button
              type="button"
              class="inline-flex h-9 w-9 items-center justify-center rounded-lg transition hover:bg-gray-100 dark:hover:bg-white/5"
              @click="closeDrawer"
            >
              <Icon name="ph:x-bold" class="h-4 w-4" />
            </button>
          </header>

          <div class="flex-1 overflow-y-auto px-6 py-6 space-y-5">
            <!-- Role badge (readonly) -->
            <div
              class="flex items-center gap-3 rounded-xl border px-4 py-3"
              :class="isDark ? 'border-candy-orange/20 bg-candy-orange/5' : 'border-candy-orange/20 bg-candy-orange/5'"
            >
              <Icon :name="drawerRole === 'messenger' ? 'ph:motorcycle-fill' : 'ph:briefcase-fill'" class="h-5 w-5 text-candy-orange" />
              <div>
                <p class="text-sm font-bold text-candy-orange">Role: {{ drawerRole === 'messenger' ? 'Messenger' : 'Employee' }}</p>
                <p class="text-sm" :class="mutedClass">Role cannot be changed after the account is created.</p>
              </div>
            </div>

            <!-- Full Name -->
            <label class="block">
              <span class="text-sm font-semibold" :class="isDark ? 'text-gray-200' : 'text-gray-800'">
                Full Name <span class="text-danger">*</span>
              </span>
              <input
                v-model.trim="form.full_name"
                type="text"
                placeholder="e.g. Juan Dela Cruz"
                class="mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-candy-orange"
                :class="inputClass"
                required
              />
            </label>

            <!-- Date of Birth (employee only) -->
            <label v-if="drawerRole === 'employee'" class="block">
              <span class="text-sm font-semibold" :class="isDark ? 'text-gray-200' : 'text-gray-800'">
                Date of Birth <span class="text-danger">*</span>
              </span>
              <input
                v-model="form.birth_date"
                type="date"
                :max="todayIso"
                class="mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-candy-orange"
                :class="inputClass"
                required
              />
            </label>

            <!-- Email -->
            <label class="block">
              <span class="text-sm font-semibold" :class="isDark ? 'text-gray-200' : 'text-gray-800'">
                Email Address <span class="text-danger">*</span>
              </span>
              <input
                v-model.trim="form.email"
                type="email"
                placeholder="name@yourorg.com"
                class="mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-candy-orange"
                :class="inputClass"
                required
              />
            </label>

            <!-- Password -->
            <label class="block">
              <span class="text-sm font-semibold" :class="isDark ? 'text-gray-200' : 'text-gray-800'">
                {{ drawerMode === 'edit' ? 'New Password' : 'Initial Password' }}
                <span v-if="drawerMode === 'provision'" class="text-danger">*</span>
              </span>
              <div class="relative mt-2">
                <input
                  v-model="form.password"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="Min 8 characters"
                  class="w-full rounded-xl border px-4 py-3 pr-11 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-candy-orange"
                  :class="inputClass"
                  minlength="8"
                  :required="drawerMode === 'provision'"
                />
                <button
                  type="button"
                  class="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 transition hover:text-candy-orange"
                  :class="mutedClass"
                  @click="showPassword = !showPassword"
                >
                  <Icon :name="showPassword ? 'ph:eye-slash' : 'ph:eye'" class="h-4 w-4" />
                </button>
              </div>
            </label>

            <!-- Confirm Password -->
            <label v-if="form.password" class="block">
              <span class="text-sm font-semibold" :class="isDark ? 'text-gray-200' : 'text-gray-800'">
                Confirm Password <span class="text-danger">*</span>
              </span>
              <input
                v-model="confirmPassword"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Re-enter the password"
                class="mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-candy-orange"
                :class="[inputClass, confirmPassword && confirmPassword !== form.password ? '!border-danger' : '']"
              />
              <p v-if="confirmPassword && confirmPassword !== form.password" class="mt-1.5 text-sm text-danger">
                Passwords do not match.
              </p>
            </label>
            <p v-else-if="drawerMode === 'edit'" class="-mt-3 text-sm" :class="mutedClass">
              Leave password blank to keep the current password.
            </p>

            <!-- Office (employee only) -->
            <div v-if="drawerRole === 'employee'" class="space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-sm font-semibold" :class="isDark ? 'text-gray-200' : 'text-gray-800'">
                  Office <span class="text-danger">*</span>
                </span>
                <div class="flex rounded-lg border p-0.5" :class="isDark ? 'border-onyx-border' : 'border-gray-200'">
                  <button
                    type="button"
                    class="rounded-md px-2.5 py-1 text-sm font-semibold transition"
                    :class="officeMode === 'existing' ? 'bg-candy-orange text-white' : mutedClass"
                    @click="officeMode = 'existing'"
                  >
                    Existing
                  </button>
                  <button
                    type="button"
                    class="rounded-md px-2.5 py-1 text-sm font-semibold transition"
                    :class="officeMode === 'new' ? 'bg-candy-orange text-white' : mutedClass"
                    @click="officeMode = 'new'"
                  >
                    New Office
                  </button>
                </div>
              </div>

              <select
                v-if="officeMode === 'existing'"
                v-model="form.office_id"
                class="w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-candy-orange"
                :class="inputClass"
                :required="officeMode === 'existing'"
              >
                <option value="" disabled>{{ offices.length ? 'Select an office…' : 'No offices yet — create one below' }}</option>
                <option v-for="office in offices" :key="office.id" :value="office.id">
                  {{ office.name }} ({{ office.code }})
                </option>
              </select>

              <div v-else>
                <input
                  v-model.trim="form.office_name"
                  type="text"
                  placeholder="e.g. Cebu Branch Office"
                  class="w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-candy-orange"
                  :class="inputClass"
                  :required="officeMode === 'new'"
                />
                <p class="mt-1.5 text-sm" :class="mutedClass">
                  This office will be created under {{ auth.currentOrg?.name || 'your organization' }} — its office code is generated automatically.
                </p>
              </div>
            </div>

            <!-- Org scope lock -->
            <div
              class="rounded-xl border p-4 text-sm"
              :class="isDark ? 'border-onyx-border bg-onyx-black/40' : 'border-gray-200 bg-gray-50'"
            >
              <div class="flex items-center gap-2 font-semibold" :class="isDark ? 'text-gray-200' : 'text-gray-800'">
                <Icon name="ph:lock-fill" class="h-4 w-4 text-candy-orange" />
                Belongs to Your Organization
              </div>
              <dl class="mt-3 grid grid-cols-2 gap-2 text-xs">
                <dt :class="mutedClass">Organization</dt>
                <dd class="font-semibold text-right" :class="isDark ? 'text-gray-200' : 'text-gray-800'">
                  {{ auth.currentOrg?.name ?? '—' }}
                </dd>
                <dt :class="mutedClass">Org Code</dt>
                <dd class="font-mono font-semibold text-right" :class="isDark ? 'text-gray-200' : 'text-gray-800'">
                  {{ auth.currentOrg?.code ?? '—' }}
                </dd>
              </dl>
            </div>

            <div
              v-if="provisionError"
              class="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger"
            >
              <Icon name="ph:warning-circle-fill" class="mt-0.5 h-4 w-4 flex-shrink-0" />
              {{ provisionError }}
            </div>
          </div>

          <footer class="flex items-center justify-end gap-3 border-t px-6 py-4" :class="borderClass">
            <button
              type="button"
              class="rounded-xl border px-4 py-2.5 text-sm font-semibold transition hover:bg-gray-50 dark:hover:bg-white/5"
              :class="isDark ? 'border-onyx-border text-gray-300' : 'border-gray-200 text-gray-700'"
              @click="closeDrawer"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="!canSubmitDrawer"
              class="inline-flex items-center gap-2 rounded-xl bg-candy-orange px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-candy-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon v-if="saving" name="ph:spinner-gap" class="h-4 w-4 animate-spin" />
              <Icon v-else :name="drawerMode === 'edit' ? 'ph:floppy-disk' : 'ph:user-plus-fill'" class="h-4 w-4" />
              {{ saving ? 'Saving…' : (drawerMode === 'edit' ? 'Save Changes' : 'Create Account') }}
            </button>
          </footer>
        </form>
      </Transition>
    </Teleport>

    <!-- ── CSV Import Modal ──────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="importModalOpen" class="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto">
          <div
            class="w-full max-w-lg rounded-2xl border my-8"
            :class="isDark ? 'bg-onyx-card border-onyx-border' : 'bg-white border-gray-200'"
          >
            <div class="flex items-center justify-between px-6 pt-6 pb-4 border-b" :class="borderClass">
              <div class="flex items-center gap-3">
                <span class="flex h-9 w-9 items-center justify-center rounded-full border border-candy-orange/20 bg-candy-orange/10">
                  <Icon name="ph:upload-simple-light" class="h-4.5 w-4.5 text-candy-orange" />
                </span>
                <h2 class="text-base font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">Import Employees (CSV)</h2>
              </div>
              <button type="button" class="rounded-lg p-1.5 transition hover:bg-gray-100 dark:hover:bg-white/10" @click="closeImportModal">
                <Icon name="ph:x-light" class="h-4 w-4" :class="mutedClass" />
              </button>
            </div>

            <div class="space-y-4 px-6 py-5">
              <div class="rounded-xl border p-4" :class="isDark ? 'border-onyx-border bg-onyx-black/40' : 'border-gray-200 bg-gray-50'">
                <p class="text-sm font-semibold" :class="isDark ? 'text-gray-200' : 'text-gray-800'">1. Download the template</p>
                <p class="mt-1 text-xs leading-relaxed" :class="mutedClass">
                  Fill in <code class="font-mono">full_name, email, password, birth_date, office_name</code> for each employee.
                  Reuse the same office name for staff sharing an office — we'll match it automatically instead of creating duplicates.
                </p>
                <button
                  type="button"
                  class="mt-3 inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition"
                  :class="isDark ? 'border-onyx-border text-gray-200 hover:bg-onyx-card' : 'border-gray-200 text-gray-700 hover:bg-white'"
                  @click="downloadTemplate"
                >
                  <Icon name="ph:download-simple-light" class="h-4 w-4" />
                  Download CSV Template
                </button>
              </div>

              <div>
                <p class="text-sm font-semibold mb-2" :class="isDark ? 'text-gray-200' : 'text-gray-800'">2. Upload your filled-in CSV</p>
                <input
                  ref="importFileInput"
                  type="file"
                  accept=".csv"
                  class="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-candy-orange/10 file:px-3.5 file:py-2 file:text-xs file:font-semibold file:text-candy-orange hover:file:bg-candy-orange/20"
                  :class="mutedClass"
                  @change="handleImportFileChange"
                />
              </div>

              <div v-if="importError" class="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-xs font-medium text-danger">
                {{ importError }}
              </div>

              <div v-if="importSummary" class="space-y-2">
                <div class="rounded-xl border p-3 text-sm font-semibold"
                  :class="importSummary.created > 0 ? 'border-success/20 bg-success/10 text-success' : 'border-warning/20 bg-warning/10 text-warning'">
                  {{ importSummary.created }} of {{ importSummary.total }} employee(s) imported successfully.
                </div>
                <div class="max-h-56 overflow-y-auto rounded-xl border" :class="borderClass">
                  <div
                    v-for="r in importResults"
                    :key="r.row"
                    class="flex items-start gap-2 border-b px-3.5 py-2 text-xs last:border-b-0"
                    :class="borderClass"
                  >
                    <Icon
                      :name="r.status === 'created' ? 'ph:check-circle-fill' : 'ph:warning-circle-fill'"
                      class="mt-0.5 h-3.5 w-3.5 flex-shrink-0"
                      :class="r.status === 'created' ? 'text-success' : 'text-warning'"
                    />
                    <div class="min-w-0">
                      <p class="font-semibold" :class="isDark ? 'text-gray-200' : 'text-gray-800'">Row {{ r.row }} · {{ r.email }}</p>
                      <p :class="mutedClass">{{ r.message }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="flex justify-end gap-3 px-6 pb-6">
              <button
                type="button"
                class="rounded-xl px-4 py-2.5 text-sm font-semibold transition border border-transparent"
                :class="isDark ? 'text-gray-300 hover:bg-white/5' : 'text-gray-700 hover:bg-gray-100'"
                @click="closeImportModal"
              >
                Close
              </button>
              <button
                type="button"
                :disabled="!importFile || importing"
                class="inline-flex items-center gap-2 rounded-xl bg-candy-orange px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-candy-hover disabled:opacity-50"
                @click="submitImport"
              >
                <Icon v-if="importing" name="ph:spinner-gap-light" class="h-4 w-4 animate-spin" />
                {{ importing ? 'Importing…' : 'Import' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Toast ───────────────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="toast-fade">
        <div
          v-if="toast.visible"
          class="fixed bottom-6 right-6 z-[100] flex items-center gap-3 rounded-xl border px-5 py-4 shadow-2xl text-sm font-semibold"
          :class="toast.type === 'success'
            ? (isDark ? 'bg-emerald-900/90 border-success/30 text-success' : 'bg-emerald-50 border-success/30 text-success')
            : (isDark ? 'bg-red-900/90 border-danger/30 text-danger' : 'bg-red-50 border-danger/30 text-danger')"
        >
          <Icon
            :name="toast.type === 'success' ? 'ph:check-circle-fill' : 'ph:x-circle-fill'"
            class="h-5 w-5"
          />
          {{ toast.message }}
        </div>
      </Transition>
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useAuthStore } from '~/stores/auth'

const auth = useAuthStore()
const { isDark } = useTheme()

// ── Types ──────────────────────────────────────────────────────────────
interface OrgMember {
  user_id: string | number
  full_name: string
  email: string
  role: 'employee' | 'messenger'
  org_id?: string | number
  status: number
  created_at: string
  office_id?: string | null
  office_name?: string | null
  office_code?: string | null
}

interface OfficeOption {
  id: string
  name: string
  code: string
}

interface ImportRowResult {
  row: number
  email: string
  status: 'created' | 'skipped'
  message: string
}

// ── State ──────────────────────────────────────────────────────────────
const employees    = ref<OrgMember[]>([])
const messengers    = ref<OrgMember[]>([])
const offices       = ref<OfficeOption[]>([])
const loading       = ref(false)
const saving        = ref(false)
const drawerOpen    = ref(false)
const drawerMode    = ref<'provision' | 'edit'>('provision')
const drawerRole    = ref<'employee' | 'messenger'>('employee')
const editingUserId = ref<string | number | null>(null)
const showPassword  = ref(false)
const activeTab     = ref<'all' | 'employee' | 'messenger'>('all')
const searchQuery   = ref('')
const provisionError = ref('')
const officeMode    = ref<'existing' | 'new'>('existing')
const confirmPassword = ref('')

const form = reactive({
  full_name: '', email: '', password: '', birth_date: '',
  office_id: '' as string, office_name: '',
})

const toast = reactive({ visible: false, message: '', type: 'success' as 'success' | 'error' })

const todayIso = new Date().toISOString().slice(0, 10)

// ── Import modal state ────────────────────────────────────────────────
const importModalOpen = ref(false)
const importFileInput = ref<HTMLInputElement | null>(null)
const importFile       = ref<File | null>(null)
const importing        = ref(false)
const importError      = ref('')
const importResults    = ref<ImportRowResult[]>([])
const importSummary    = ref<{ created: number; total: number } | null>(null)

// ── Constants ──────────────────────────────────────────────────────────
const TABS = [
  { value: 'all',       label: 'All Members' },
  { value: 'employee',  label: 'Employees'   },
] as const

// ── Computed ───────────────────────────────────────────────────────────
const members = computed<OrgMember[]>(() => [...employees.value, ...messengers.value])

const filteredMembers = computed(() => {
  let list = members.value
  if (activeTab.value !== 'all') list = list.filter((m) => m.role === activeTab.value)
  const q = searchQuery.value.trim().toLowerCase()
  if (q) list = list.filter((m) =>
    m.full_name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
  )
  return list
})

const tabCount = (tab: string) => {
  if (tab === 'all') return members.value.length
  return members.value.filter((m) => m.role === tab).length
}

const stats = computed(() => [
  {
    label: 'Total Members',
    value: members.value.length,
    icon: 'ph:users-three-fill',
    iconBg: 'bg-candy-orange/10',
    iconColor: 'text-candy-orange',
  },
  {
    label: 'Employees',
    value: employees.value.length,
    icon: 'ph:briefcase-fill',
    iconBg: isDark.value ? 'bg-white/10' : 'bg-gray-200',
    iconColor: isDark.value ? 'text-gray-300' : 'text-gray-600',
  },
  {
    label: 'Messengers',
    value: messengers.value.length,
    icon: 'ph:motorcycle-fill',
    iconBg: 'bg-candy-orange/10',
    iconColor: 'text-candy-orange',
  },
  {
    label: 'Inactive',
    value: members.value.filter((m) => m.status !== 1).length,
    icon: 'ph:prohibit-fill',
    iconBg: 'bg-danger/10',
    iconColor: 'text-danger',
  },
])

const canSubmitDrawer = computed(() => {
  if (saving.value) return false
  if (!form.full_name || !form.email) return false
  if (drawerMode.value === 'provision' && form.password.length < 8) return false
  if (form.password && form.password.length < 8) return false
  if (form.password && confirmPassword.value !== form.password) return false
  if (drawerRole.value === 'employee') {
    if (!form.birth_date) return false
    if (officeMode.value === 'existing' && !form.office_id) return false
    if (officeMode.value === 'new' && !form.office_name.trim()) return false
  }
  return true
})

// ── Theme helpers ──────────────────────────────────────────────────────
const surfaceClass = computed(() =>
  isDark.value
    ? 'border-onyx-border bg-[#1A1A1A] shadow-onyx-card'
    : 'border-gray-200 bg-white'
)
const borderClass  = computed(() => isDark.value ? 'border-onyx-border' : 'border-gray-200')
const mutedClass   = computed(() => isDark.value ? 'text-gray-400' : 'text-gray-500')
const inputClass   = computed(() =>
  isDark.value
    ? 'border-onyx-border bg-onyx-black text-white placeholder:text-gray-500'
    : 'border-gray-200 bg-white text-gray-900 placeholder:text-gray-400'
)

// ── Helpers ────────────────────────────────────────────────────────────
const initials = (name: string) =>
  name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()

const formatDate = (value: string) =>
  value
    ? new Intl.DateTimeFormat('en', { month: 'short', day: '2-digit', year: 'numeric' }).format(new Date(value))
    : '—'

const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  toast.message = message
  toast.type = type
  toast.visible = true
  setTimeout(() => { toast.visible = false }, 4000)
}

// ── Data fetching ──────────────────────────────────────────────────────
const fetchEmployees = async () => {
  try {
    const res = await $fetch<{ success: boolean; data: OrgMember[] }>('/api/client/employees')
    employees.value = res.data ?? []
  } catch (err: any) {
    console.error('[UserManagement] fetch employees error:', err)
  }
}

const fetchMessengers = async () => {
  const orgId = auth.user?.org_id
  if (!orgId) return
  try {
    const res = await $fetch<{ success: boolean; data: OrgMember[] }>('/api/users/org-members', {
      params: { orgId, role: 'messenger' },
    })
    messengers.value = res.data ?? []
  } catch (err: any) {
    console.error('[UserManagement] fetch messengers error:', err)
  }
}

const fetchOffices = async () => {
  const orgId = auth.user?.org_id
  if (!orgId) return
  try {
    const res = await $fetch<{ success: boolean; data: OfficeOption[] }>('/api/office', { params: { orgId } })
    offices.value = res.data ?? []
  } catch (err: any) {
    console.error('[UserManagement] fetch offices error:', err)
  }
}

const fetchMembers = async () => {
  loading.value = true
  try {
    await Promise.all([fetchEmployees(), fetchMessengers()])
  } catch (err: any) {
    showToast(err?.data?.message || 'Failed to load members', 'error')
  } finally {
    loading.value = false
  }
}

// ── Drawer handlers ────────────────────────────────────────────────────
function resetForm() {
  form.full_name = ''
  form.email = ''
  form.password = ''
  form.birth_date = ''
  form.office_id = ''
  form.office_name = ''
  confirmPassword.value = ''
  officeMode.value = 'existing'
}

const openProvisionDrawer = async (role: 'employee' | 'messenger') => {
  drawerMode.value = 'provision'
  drawerRole.value = role
  editingUserId.value = null
  resetForm()
  provisionError.value = ''
  showPassword.value   = false
  if (role === 'employee') await fetchOffices()
  drawerOpen.value     = true
}

const openEditDrawer = async (member: OrgMember) => {
  drawerMode.value = 'edit'
  drawerRole.value = member.role
  editingUserId.value = member.user_id
  resetForm()
  form.full_name = member.full_name
  form.email     = member.email
  if (member.role === 'employee') {
    await fetchOffices()
    form.office_id = member.office_id ? String(member.office_id) : ''
    officeMode.value = 'existing'
  }
  provisionError.value = ''
  showPassword.value   = false
  drawerOpen.value     = true
}

const closeDrawer = () => { drawerOpen.value = false }

// ── CRUD ───────────────────────────────────────────────────────────────
const handleSaveDrawer = async () => {
  if (!canSubmitDrawer.value) return
  provisionError.value = ''
  saving.value = true

  try {
    if (drawerRole.value === 'employee') {
      const payload = {
        full_name: form.full_name,
        email: form.email,
        password: form.password,
        birth_date: form.birth_date,
        office_id: officeMode.value === 'existing' ? form.office_id : '',
        office_name: officeMode.value === 'new' ? form.office_name : '',
      }

      if (drawerMode.value === 'provision') {
        const res = await $fetch<{ success: boolean; data: OrgMember; message: string }>('/api/client/employees', {
          method: 'POST', body: payload,
        })
        showToast(res.message)
        await fetchEmployees()
      } else {
        const res = await $fetch<{ success: boolean; data: OrgMember; message: string }>(`/api/client/employees/${editingUserId.value}`, {
          method: 'PUT', body: payload,
        })
        showToast(`Employee "${res.data.full_name}" updated successfully`)
        await fetchEmployees()
      }
    } else if (drawerMode.value === 'provision') {
      const res = await $fetch<{ success: boolean; data: OrgMember; message: string }>('/api/users/provision', {
        method: 'POST',
        body: { full_name: form.full_name, email: form.email, password: form.password, role: 'messenger' },
      })
      showToast(`Messenger "${res.data.full_name}" provisioned successfully`)
      await fetchMessengers()
    } else {
      const res = await $fetch<{ success: boolean; data: OrgMember; message: string }>('/api/users/update', {
        method: 'PUT',
        body: { user_id: editingUserId.value, full_name: form.full_name, email: form.email, password: form.password },
      })
      showToast(`Member "${res.data.full_name}" updated successfully`)
      await fetchMessengers()
    }
    closeDrawer()
  } catch (err: any) {
    provisionError.value = err?.data?.message || 'Operation failed. Please try again.'
  } finally {
    saving.value = false
  }
}

const handleToggleStatus = async (member: OrgMember) => {
  const newStatus = member.status === 1 ? 0 : 1
  try {
    await $fetch('/api/users/toggle-status', {
      method: 'POST',
      body: { userId: member.user_id, status: newStatus },
    })
    member.status = newStatus
    showToast(`${member.full_name} is now ${newStatus === 1 ? 'active' : 'inactive'}`)
  } catch (err: any) {
    showToast(err?.data?.message || 'Failed to update status', 'error')
  }
}

const handleRemove = async (member: OrgMember) => {
  if (!confirm(`Remove "${member.full_name}"? This action is permanent and cannot be undone.`)) return
  try {
    await $fetch('/api/users/remove', {
      method: 'DELETE',
      params: { userId: member.user_id },
    })
    if (member.role === 'employee') {
      employees.value = employees.value.filter((m) => m.user_id !== member.user_id)
    } else {
      messengers.value = messengers.value.filter((m) => m.user_id !== member.user_id)
    }
    showToast(`${member.full_name}'s account has been removed`)
  } catch (err: any) {
    showToast(err?.data?.message || 'Failed to remove member', 'error')
  }
}

// ── CSV Import ─────────────────────────────────────────────────────────
const CSV_TEMPLATE = [
  'full_name,email,password,birth_date,office_name',
  'Juan Dela Cruz,juan.delacruz@example.com,TempPass123,1990-05-14,Manila Branch',
].join('\n')

function downloadTemplate() {
  const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'flowvision-employee-import-template.csv'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function openImportModal() {
  importFile.value = null
  importError.value = ''
  importResults.value = []
  importSummary.value = null
  importModalOpen.value = true
}

function closeImportModal() {
  importModalOpen.value = false
}

function handleImportFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  importFile.value = target.files?.[0] ?? null
  importError.value = ''
  importResults.value = []
  importSummary.value = null
}

async function submitImport() {
  if (!importFile.value || importing.value) return
  importing.value = true
  importError.value = ''
  try {
    const formData = new FormData()
    formData.append('file', importFile.value)
    const res = await $fetch<{ success: boolean; created: number; total: number; results: ImportRowResult[] }>(
      '/api/client/employees/import',
      { method: 'POST', body: formData },
    )
    importSummary.value = { created: res.created, total: res.total }
    importResults.value = res.results
    if (importFileInput.value) importFileInput.value.value = ''
    importFile.value = null
    if (res.created > 0) {
      showToast(`${res.created} employee(s) imported successfully`)
      await fetchEmployees()
    }
  } catch (err: any) {
    importError.value = err?.data?.message || 'Failed to import CSV'
  } finally {
    importing.value = false
  }
}

onMounted(async () => {
  if (auth.isLoggedIn && !auth.currentOrg) await auth.fetchMyOrg()
  await fetchMembers()
})
</script>

<style scoped>
.drawer-fade-enter-active, .drawer-fade-leave-active { transition: opacity 0.2s ease; }
.drawer-fade-enter-from, .drawer-fade-leave-to { opacity: 0; }

.drawer-slide-enter-active, .drawer-slide-leave-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.drawer-slide-enter-from, .drawer-slide-leave-to { transform: translateX(100%); }

.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.2s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }

.toast-fade-enter-active, .toast-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.toast-fade-enter-from, .toast-fade-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.95);
}
</style>
