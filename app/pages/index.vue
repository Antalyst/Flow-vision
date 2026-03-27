<template>
  <div class="w-full min-h-screen">
        <button type="button" @click="fetchOrg()">submit</button>

  </div>
</template>
<script setup>
  const employeeAuth = useEmployeeAuthStore();
  const code = ref('Rqe5ebnopiQnHZdM');
  const data = ref(null);

  const fetchOrg = async () => {
    try {
      const res = await employeeAuth.fetchOrgCode({ code: code.value });
      data.value = res;
      if (data.value && data.value.org_id) {
        console.log("Success! Result:", data.value);
      } else {
        console.log("No organization found with that code.");
      }
    } catch (e) {
      console.error("Error in component:", e);
    }
  }
</script>