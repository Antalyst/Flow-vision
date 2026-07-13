const fs = require('fs');

const path = 'c:/Users/Andrew/Documents/FlowVision/app/pages/messenger/scan.vue';
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
content = content.replace(/bg-amber-500\/[0-9]+/g, 'bg-transparent');
content = content.replace(/border-amber-500\/[0-9]+/g, 'border-amber-500');
content = content.replace(/bg-emerald-500\/[0-9]+/g, 'bg-transparent');
content = content.replace(/border-emerald-500\/[0-9]+/g, 'border-emerald-500');
content = content.replace(/bg-red-500\/[0-9]+/g, 'bg-transparent');
content = content.replace(/border-red-500\/[0-9]+/g, 'border-red-500');
content = content.replace(/bg-gray-500\/[0-9]+/g, 'bg-transparent');
content = content.replace(/border-gray-500\/[0-9]+/g, 'border-gray-500');
content = content.replace(/bg-black\/40/g, 'bg-black');
content = content.replace(/bg-gray-900/g, 'bg-black');

fs.writeFileSync(path, content);
console.log('Done rewriting scan.vue');
