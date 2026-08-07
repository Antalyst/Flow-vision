const fs = require('fs');
let content = fs.readFileSync('app/layouts/default.vue', 'utf-8');

// Fix first conflict
content = content.replace(/<<<<<<< HEAD\r?\n\s*<\/button>\r?\n\r?\n=======\r?\n\s*<\/NuxtLink>\r?\n\s*\r?\n>>>>>>> 8573f678e67d6a3347dba549b6b3e298ed81c1d3/g, '            </NuxtLink>');

// Fix second conflict
content = content.replace(/<<<<<<< HEAD[\s\S]*?=======\r?\n/, '');
content = content.replace(/>>>>>>> 8573f678e67d6a3347dba549b6b3e298ed81c1d3\r?\n/g, '');

fs.writeFileSync('app/layouts/default.vue', content);
console.log('Fixed default.vue');
