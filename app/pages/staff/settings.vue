<template>
  <section ref="pageRoot" class="w-full max-w-3xl mx-auto space-y-6 pb-24 lg:pb-8">

    <!-- ── Page Header ───────────────────────────────────────────────── -->
    <div ref="headerEl">
      <div class="mb-2 flex items-center gap-2 text-xs font-medium" :class="mutedText">
        <Icon name="ph:identification-badge-light" class="h-3.5 w-3.5 text-candy-orange" />
        <span>Staff Portal</span>
        <Icon name="ph:caret-right-light" class="h-3 w-3 opacity-50" />
        <span :class="isDark ? 'text-white' : 'text-gray-800'">Settings</span>
      </div>
      <h1 class="text-3xl font-bold tracking-tight leading-tight" :class="isDark ? 'text-white' : 'text-gray-900'">Account Settings</h1>
      <p class="mt-1.5 text-sm" :class="mutedText">Manage your profile, password, and session.</p>
    </div>

    <!-- ── Profile Card ──────────────────────────────────────────────── -->
    <form
      ref="profileEl"
      class="rounded-2xl border p-6"
      :class="isDark ? 'bg-onyx-card border-onyx-border' : 'bg-white border-gray-200'"
      @submit.prevent="saveProfile"
    >
      <div class="flex items-center gap-3 mb-5">
        <span class="flex h-9 w-9 items-center justify-center rounded-full border border-candy-orange/20 bg-candy-orange/10">
          <Icon name="ph:user-circle-light" class="h-4.5 w-4.5 text-candy-orange" />
        </span>
        <div>
          <h2 class="text-sm font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">Profile</h2>
          <p class="text-sm" :class="mutedText">Your name and email address</p>
        </div>
      </div>

      <div class="space-y-4">
        <div>
          <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide" :class="mutedText">Full Name</label>
          <input
            v-model="profileForm.full_name"
            type="text"
            required
            class="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors focus:border-candy-orange"
            :class="isDark ? 'border-onyx-border bg-onyx-black text-white' : 'border-gray-300 bg-white text-gray-900'"
          />
        </div>
        <div>
          <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide" :class="mutedText">Email Address</label>
          <input
            v-model="profileForm.email"
            type="email"
            required
            class="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors focus:border-candy-orange"
            :class="isDark ? 'border-onyx-border bg-onyx-black text-white' : 'border-gray-300 bg-white text-gray-900'"
          />
        </div>
      </div>

      <div v-if="profileError" class="mt-4 rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-xs font-medium text-danger">
        {{ profileError }}
      </div>

      <div class="mt-5 flex justify-end">
        <button
          type="submit"
          :disabled="savingProfile"
          class="inline-flex items-center gap-2 rounded-xl bg-candy-orange px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-candy-hover disabled:opacity-50"
        >
          <Icon v-if="savingProfile" name="ph:spinner-gap-light" class="h-4 w-4 animate-spin" />
          {{ savingProfile ? 'Saving…' : 'Save Changes' }}
        </button>
      </div>
    </form>

    <!-- ── Password Card ─────────────────────────────────────────────── -->
    <form
      ref="passwordEl"
      class="rounded-2xl border p-6"
      :class="isDark ? 'bg-onyx-card border-onyx-border' : 'bg-white border-gray-200'"
      @submit.prevent="savePassword"
    >
      <div class="flex items-center gap-3 mb-5">
        <span class="flex h-9 w-9 items-center justify-center rounded-full border border-candy-orange/20 bg-candy-orange/10">
          <Icon name="ph:lock-key-light" class="h-4.5 w-4.5 text-candy-orange" />
        </span>
        <div>
          <h2 class="text-sm font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">Password</h2>
          <p class="text-sm" :class="mutedText">Change your login password</p>
        </div>
      </div>

      <div class="space-y-4">
        <div>
          <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide" :class="mutedText">Current Password</label>
          <input
            v-model="passwordForm.current_password"
            type="password"
            required
            placeholder="••••••••"
            class="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors focus:border-candy-orange"
            :class="isDark ? 'border-onyx-border bg-onyx-black text-white placeholder:text-gray-600' : 'border-gray-300 bg-white text-gray-900'"
          />
        </div>
        <div>
          <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide" :class="mutedText">New Password</label>
          <input
            v-model="passwordForm.new_password"
            type="password"
            required
            minlength="8"
            placeholder="At least 8 characters"
            class="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors focus:border-candy-orange"
            :class="isDark ? 'border-onyx-border bg-onyx-black text-white placeholder:text-gray-600' : 'border-gray-300 bg-white text-gray-900'"
          />
        </div>
      </div>

      <div v-if="passwordError" class="mt-4 rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-xs font-medium text-danger">
        {{ passwordError }}
      </div>

      <div class="mt-5 flex justify-end">
        <button
          type="submit"
          :disabled="savingPassword"
          class="inline-flex items-center gap-2 rounded-xl bg-candy-orange px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-candy-hover disabled:opacity-50"
        >
          <Icon v-if="savingPassword" name="ph:spinner-gap-light" class="h-4 w-4 animate-spin" />
          {{ savingPassword ? 'Updating…' : 'Update Password' }}
        </button>
      </div>
    </form>

    <!-- ── Session Card ──────────────────────────────────────────────── -->
    <div
      ref="sessionEl"
      class="rounded-2xl border p-6"
      :class="isDark ? 'bg-onyx-card border-onyx-border' : 'bg-white border-gray-200'"
    >
      <div class="flex items-center gap-3 mb-5">
        <span class="flex h-9 w-9 items-center justify-center rounded-full border border-danger/20 bg-danger/10">
          <Icon name="ph:sign-out-light" class="h-4.5 w-4.5 text-danger" />
        </span>
        <div>
          <h2 class="text-sm font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">Session</h2>
          <p class="text-sm" :class="mutedText">Sign out of your staff session on this device</p>
        </div>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-5 py-2.5 text-sm font-semibold text-danger transition-colors hover:bg-danger/20"
        @click="handleLogout"
      >
        <Icon name="ph:sign-out-light" class="h-4 w-4" />
        Log Out
      </button>
    </div>
  </section>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useTheme } from '~/composables/useTheme'
import { useStaffToast } from '~/composables/useStaffToast'
import { useAuthStore } from '~/stores/auth'
import { gsap } from 'gsap'

definePageMeta({ layout: 'staff' })
useSeoMeta({ title: 'FlowVision | Staff Settings', description: 'Manage your staff profile, password, and session.' })

const { isDark } = useTheme()
const { show: showToast } = useStaffToast()
const auth = useAuthStore()
const mutedText = computed(() => isDark.value ? 'text-gray-400' : 'text-gray-500')

const profileForm = reactive({ full_name: '', email: '' })
const passwordForm = reactive({ current_password: '', new_password: '' })

const savingProfile = ref(false)
const savingPassword = ref(false)
const profileError = ref('')
const passwordError = ref('')

async function saveProfile() {
  if (savingProfile.value) return
  savingProfile.value = true
  profileError.value = ''
  try {
    await $fetch('/api/staff/profile', { method: 'PUT', body: profileForm })
    if (auth.user) {
      auth.user.full_name = profileForm.full_name
      auth.user.email = profileForm.email
    }
    showToast('Profile updated successfully', 'success')
  } catch (err) {
    profileError.value = err.data?.message || 'Failed to update profile'
    showToast(profileError.value, 'error')
  } finally {
    savingProfile.value = false
  }
}

async function savePassword() {
  if (savingPassword.value) return
  savingPassword.value = true
  passwordError.value = ''
  try {
    await $fetch('/api/staff/profile', { method: 'PUT', body: passwordForm })
    passwordForm.current_password = ''
    passwordForm.new_password = ''
    showToast('Password updated successfully', 'success')
  } catch (err) {
    passwordError.value = err.data?.message || 'Failed to update password'
    showToast(passwordError.value, 'error')
  } finally {
    savingPassword.value = false
  }
}

function handleLogout() {
  auth.logout()
}

// GSAP refs
const pageRoot = ref(null)
const headerEl = ref(null)
const profileEl = ref(null)
const passwordEl = ref(null)
const sessionEl = ref(null)

const runEntranceAnimation = () => {
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
  if (headerEl.value) tl.fromTo(headerEl.value, { opacity: 0, y: -16 }, { opacity: 1, y: 0, duration: 0.45 }, 0)
  ;[profileEl, passwordEl, sessionEl].forEach((el, i) => {
    if (el.value) tl.fromTo(el.value, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.5 }, 0.14 + i * 0.08)
  })
}

onMounted(() => {
  runEntranceAnimation()
  profileForm.full_name = auth.user?.full_name || ''
  profileForm.email = auth.user?.email || ''
})
</script>
