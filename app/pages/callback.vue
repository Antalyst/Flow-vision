<script setup>
definePageMeta({
  middleware: [
    function (to, from) {
      const auth = useAuthStore()
      if (!auth.isLoggedIn) {
        return navigateTo('/')
      }
    }
  ]
})
</script>