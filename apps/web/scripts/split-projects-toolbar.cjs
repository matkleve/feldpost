const fs = require('fs');
const path = require('path');

const componentPath = path.join(
  'src',
  'app',
  'features',
  'projects',
  'projects-toolbar.component.ts',
);
const htmlPath = path.join('src', 'app', 'features', 'projects', 'projects-toolbar.component.html');
const scssPath = path.join('src', 'app', 'features', 'projects', 'projects-toolbar.component.scss');

const source = fs.readFileSync(componentPath, 'utf8');

const templateStartMarker = '  template: `';
const stylesStartMarker = '  styles: [\n    `';
const stylesEndMarker = '    `,\n  ],';

const templateStart = source.indexOf(templateStartMarker);
const stylesStart = source.indexOf(stylesStartMarker);
const stylesEnd = source.indexOf(stylesEndMarker);

if (
  templateStart === -1 ||
  stylesStart === -1 ||
  stylesEnd === -1 ||
  stylesStart <= templateStart
) {
  throw new Error(
    'Could not find expected template/styles markers in projects-toolbar.component.ts',
  );
}

let templateContent = source.substring(templateStart + templateStartMarker.length, stylesStart);
templateContent = templateContent.replace(/`,\r?\n$/, '');
if (!templateContent.endsWith('\n')) {
  templateContent += '\n';
}

let scssContent = source.substring(stylesStart + stylesStartMarker.length, stylesEnd);
if (!scssContent.endsWith('\n')) {
  scssContent += '\n';
}

const replacement =
  "  templateUrl: './projects-toolbar.component.html',\n  styleUrl: './projects-toolbar.component.scss',\n";

const updatedSource =
  source.substring(0, templateStart) +
  replacement +
  source.substring(stylesEnd + stylesEndMarker.length);

fs.writeFileSync(htmlPath, templateContent, 'utf8');
fs.writeFileSync(scssPath, scssContent, 'utf8');
fs.writeFileSync(componentPath, updatedSource, 'utf8');

console.log('Split complete: projects-toolbar component template/style extracted 1:1.');
