const fs = require('fs');
let content = fs.readFileSync('src/components/ProfileSettingsModal.tsx', 'utf-8');

// The file has two identical blocks of the status privacy dropdown. Let's just remove the second one.
// We will look for the second occurrence of '<div className="flex flex-col bg-white/[0.02] p-3 rounded-xl border border-white/5 space-y-3">' and remove it and everything up to the next closing '</div>' of that block.
// Actually it's easier to just find the exact text block and replace one.
const snippet = fs.readFileSync('snippet.txt', 'utf-8');
// remove the first one, it's before Allow Status Reshare. Wait, it's actually fine to have it there! Let's just remove the second one.
const lines = content.split('\n');
let startDelete = -1;
let endDelete = -1;
for (let i = 420; i < lines.length; i++) {
  if (lines[i].includes('Status Privacy')) {
    startDelete = i - 2; // the <div flex flex-col>
    break;
  }
}
if (startDelete !== -1) {
  for (let i = startDelete; i < lines.length; i++) {
    if (lines[i].includes('Show Phone Number')) {
      endDelete = i - 2; // the <div items-center>
      break;
    }
  }
}
if (startDelete !== -1 && endDelete !== -1) {
  lines.splice(startDelete, endDelete - startDelete);
  fs.writeFileSync('src/components/ProfileSettingsModal.tsx', lines.join('\n'));
}
