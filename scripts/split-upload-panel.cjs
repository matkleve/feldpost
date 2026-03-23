const fs = require('fs');
const path = require('path');

const featureDir = path.join('src', 'app', 'features', 'upload', 'upload-panel');
const htmlPath = path.join(featureDir, 'upload-panel.component.html');

function between(text, start, end) {
  const s = text.indexOf(start);
  if (s === -1) throw new Error(\Start marker not found: \\);
  const e = text.indexOf(end, s);
  if (e === -1) throw new Error(\End marker not found: \\);
  return text.slice(s + start.length, e);
}

const html = fs.readFileSync(htmlPath, 'utf8');
const startLi = '        <li\\n          class="upload-panel__file-item';
const endLi = '        </li>\\n';
const itemBlock = between(html, startLi, endLi);

console.log("Successfully extracted block:");