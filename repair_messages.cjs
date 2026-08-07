const fs = require('fs');
const path = require('path');

const employeePath = path.join(__dirname, 'app/pages/employee/messages.vue');
const clientPath = path.join(__dirname, 'app/pages/client/messages.vue');

let emp = fs.readFileSync(employeePath, 'utf-8');

const missingCode = `
const activeConversation = computed(() => {
  if (chat.activeConversationId) {
    return mergedList.value.find(c => c.id === chat.activeConversationId)
  }
  if (localDraftTarget.value) {
    return mergedList.value.find(c => c.targetOfficeId === localDraftTarget.value)
  }
  return null
})

const loadingInbox = computed(() => chat.loadingConversations || officeStore.loading)
const loadingMessages = computed(() => chat.loadingMessages)
const messages = computed(() => chat.messages)

onMounted(async () => {
  await officeStore.fetchOffices()
  await chat.fetchConversations()
  chat.subscribeToMessages()
})

onUnmounted(() => {`;

emp = emp.replace('onUnmounted(() => {', missingCode);

fs.writeFileSync(employeePath, emp);

const clientStr = emp.replace("layout: 'employee'", "layout: 'client'");
fs.writeFileSync(clientPath, clientStr);

console.log("Repaired employee and synced to client.");
