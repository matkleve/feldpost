const fs = require('fs');
const path = require('path');

const componentPath = path.join(
  'src',
  'app',
  'features',
  'projects',
  'projects-view-toggle.component.ts',
);
const htmlPath = path.join(
  'src',
  'app',
  'features',
  'projects',
  'projects-view-toggle.component.html',
);
const scssPath = path.join(
  'src',
  'app',
  'features',
  'projects',
  'projects-view-toggle.component.scss',
);

const source = fs.readFileSync(componentPath, 'utf8');

const templateStylesPattern =
  /template:\s*`([\s\S]*?)`,\r?\n\s*styles:\s*\[\s*`([\s\S]*?)`,\s*\],/m;
const match = source.match(templateStylesPattern);

if (!match) {
  throw new Error(
    'Could not find expected template/styles markers in projects-view-toggle.component.ts',
  );
}

let templateContent = match[1];
if (!templateContent.endsWith('\n')) {
  templateContent += '\n';
}

let scssContent = match[2];
if (!scssContent.endsWith('\n')) {
  scssContent += '\n';
}

const replacement =
  "  templateUrl: './projects-view-toggle.component.html',\n  styleUrl: './projects-view-toggle.component.scss',\n";

const updatedSource = source.replace(templateStylesPattern, replacement.trimEnd());

fs.writeFileSync(htmlPath, templateContent, 'utf8');
fs.writeFileSync(scssPath, scssContent, 'utf8');
fs.writeFileSync(componentPath, updatedSource, 'utf8');

console.log('Split complete: projects-view-toggle component template/style extracted 1:1.');
