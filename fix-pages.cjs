const fs = require('fs');

const files = [
  'c:/Users/Andrew/Documents/FlowVision/app/pages/messenger/deliveries.vue'
];

for (const path of files) {
  if (!fs.existsSync(path)) {
    console.log(`Skipping ${path} - does not exist.`);
    continue;
  }
  
  let content = fs.readFileSync(path, 'utf8');

  // Roundings
  content = content.replace(/rounded-(?:2xl|xl|lg|md|sm|full)/g, 'rounded-none');

  // Icons
  content = content.replace(/name="ph:([a-zA-Z0-9-]+)-(bold|fill)"/g, 'name="ph:$1-light"');
  content = content.replace(/name="ph:([a-zA-Z0-9-]+)"/g, (match, p1) => {
    if (!p1.endsWith('-light')) return 'name="ph:' + p1 + '-light"';
    return match;
  });

  // Shadows
  content = content.replace(/shadow-(?:2xl|xl|lg|md|sm)/g, '');
  content = content.replace(/shadow-candy-orange\/\d+/g, '');
  content = content.replace(/ shadow /g, ' ');

  // Glows / Alphas
  content = content.replace(/bg-candy-orange\/(?:5|10|15|20|25|30|40|50|60)/g, 'bg-transparent');
  content = content.replace(/border-candy-orange\/(?:15|20|30|40|50|60)/g, 'border-candy-orange');
  content = content.replace(/bg-orange-50\/60/g, 'bg-white');
  content = content.replace(/bg-orange-50/g, 'bg-white');
  content = content.replace(/border-orange-200\/70/g, 'border-gray-200');
  content = content.replace(/border-orange-200/g, 'border-gray-200');
  content = content.replace(/bg-red-500\/10/g, 'bg-transparent');
  content = content.replace(/border-red-500\/30/g, 'border-red-500');
  content = content.replace(/bg-blue-400\/10/g, 'bg-transparent');
  content = content.replace(/border-blue-400\/30/g, 'border-blue-400');
  content = content.replace(/bg-blue-500\/10/g, 'bg-transparent');
  content = content.replace(/border-blue-500\/30/g, 'border-blue-500');
  content = content.replace(/bg-purple-500\/10/g, 'bg-transparent');
  content = content.replace(/border-purple-500\/30/g, 'border-purple-500');
  content = content.replace(/bg-green-500\/10/g, 'bg-transparent');
  content = content.replace(/border-green-500\/30/g, 'border-green-500');
  content = content.replace(/hover:bg-candy-orange\/10/g, 'hover:bg-gray-100 dark:hover:bg-white/10');
  
  fs.writeFileSync(path, content);
  console.log(`Processed ${path}`);
}
console.log('Done rewriting files');
