const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');
content = content.replace(/\n\s*allUsers=\{allUsers\}/g, '');
fs.writeFileSync('src/App.tsx', content);
