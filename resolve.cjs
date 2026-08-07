const fs = require('fs');
const path = require('path');

function resolveOurs(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const conflictRegex = /<<<<<<< HEAD\n([\s\S]*?)=======\n([\s\S]*?)>>>>>>> [0-9a-f]+/g;
  content = content.replace(conflictRegex, '$1');
  fs.writeFileSync(filePath, content);
}

function resolveBoth(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const conflictRegex = /<<<<<<< HEAD\n([\s\S]*?)=======\n([\s\S]*?)>>>>>>> [0-9a-f]+/g;
  content = content.replace(conflictRegex, '$1\n$2');
  fs.writeFileSync(filePath, content);
}

resolveOurs(path.join(__dirname, 'app/layouts/client.vue'));
resolveOurs(path.join(__dirname, 'app/pages/client/messages.vue'));
resolveOurs(path.join(__dirname, 'app/pages/employee/messages.vue'));
resolveBoth(path.join(__dirname, 'app/stores/chat.ts'));

console.log("Conflicts resolved.");
