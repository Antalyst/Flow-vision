const fs = require('fs');
const path = require('path');

const empPath = path.join(__dirname, 'app/pages/employee/messages.vue');
const cliPath = path.join(__dirname, 'app/pages/client/messages.vue');

function fix(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  content = content.replace(
    /return null\n\n\nconst activeConversation/g,
    'return null\n})\n\nconst activeConversation'
  );
  fs.writeFileSync(filePath, content);
}

fix(empPath);
fix(cliPath);
console.log("Fixed missing brace");
