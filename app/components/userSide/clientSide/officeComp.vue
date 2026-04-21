<template>
  <div class="  p-6 w-full relative h-full">
    <h2 class="text-xl font-bold text-gray-800 mb-6">Create New Office</h2>
    {{ authStore.OrgDetails }}
    <form @submit.prevent="handleSubmit" class="space-y-5 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white p-8 rounded-lg shadow-lg">
      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-1">Office Name</label>
        <input 
          v-model="officeName"
          type="text" 
          placeholder="e.g. Marketing Dept"
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
        />
      </div>

      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-1">Assigned User</label>
        <div class="relative">
          <select 
            v-model="selectedUserId"
            class="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg appearance-none focus:ring-2 focus:ring-blue-500 outline-none transition disabled:bg-gray-50"
            :disabled="!employees"
          >
            <option :value="0" disabled>Select an employee</option>
            <option 
              v-for="emp in employees" 
              :key="emp.user_id" 
              :value="emp.user_id"
            >
              {{ emp.full_name }}
            </option>
          </select>
          <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        <p v-if="!employees" class="text-xs text-gray-500 mt-1 italic">Loading team members...</p>
      </div>

      <button 
        type="submit"
        class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors shadow-lg shadow-blue-200"
      >
        Save Office
      </button>
    </form>
  </div>
</template>

<script setup>
const authStore = useAuthStore()
const officeStore = useOfficeStore()

const officeName = ref('')
const selectedUserId = ref(0)
const employees = ref(null)

onMounted(async () => {
  try {
    const response = await officeStore.fetchUserByOrg()
    employees.value = response.data 
  } catch (err) {
    console.error("Failed to load users:", err)
  }
})

const handleSubmit = async () => {
  if (!officeName.value || selectedUserId.value === 0) {
    alert("Please fill in all fields")
    return
  }

  const payload = {
    name: officeName.value,
    user_id: selectedUserId.value,
    org_id: authStore.currentOrg?.org_id
  }

  const res = await officeStore.createOffice(payload)
  if (res) {
    alert("Office created successfully!")
  }
}
</script>