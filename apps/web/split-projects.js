const fs = require('fs');
const path = require('path');

const tsFilePath = 'src/app/features/projects/projects-page.component.ts';
const htmlFilePath = 'src/app/features/projects/projects-page.component.html';
const scssFilePath = 'src/app/features/projects/projects-page.component.scss';

const content = fs.readFileSync(tsFilePath, 'utf-8');

// Using exact string matching to be 100% loss-less
const templateStartMarker = '  template: `';
const stylesStartMarker = '  styles: [\n    `';
const stylesEndMarker = '    `,\n  ],\n  providers:';

const idxTemplateStart = content.indexOf(templateStartMarker);
const idxStylesStart = content.indexOf(stylesStartMarker);
const idxStylesEnd = content.indexOf(stylesEndMarker);

if (idxTemplateStart > -1 && idxStylesStart > -1 && idxStylesEnd > -1) {
  // 1. Extract Template
  let templateStr = content.substring(
    idxTemplateStart + templateStartMarker.length,
    idxStylesStart,
  );
  // Since there's a `,\n` at the end of the template literal, we remove it
  templateStr = templateStr.replace(/`,\r?\n$/, '').trim() + '\n';

  // 2. Extract SCSS
  let scssStr =
    content.substring(idxStylesStart + stylesStartMarker.length, idxStylesEnd).trim() + '\n';

  // 3. Build new component TS file
  const newTsContent =
    content.substring(0, idxTemplateStart) +
    "  templateUrl: './projects-page.component.html',\n" +
    "  styleUrl: './projects-page.component.scss',\n" +
    '  providers:' +
    content.substring(idxStylesEnd + stylesEndMarker.length); // Pick up right at the 'providers:'

  // 4. Write files
  fs.writeFileSync(htmlFilePath, templateStr, 'utf-8');
  fs.writeFileSync(scssFilePath, scssStr, 'utf-8');
  fs.writeFileSync(tsFilePath, newTsContent, 'utf-8');

  console.log(`✅ Extracted template to ${htmlFilePath} (${templateStr.split('\n').length} lines)`);
  console.log(`✅ Extracted SCSS to ${scssFilePath} (${scssStr.split('\n').length} lines)`);
  console.log(`✅ Updated ${tsFilePath} inline definitions to file URLs.`);
} else {
  console.error('❌ Could not find exact markers. Check delimiters.');
  console.log({
    hasTemplate: idxTemplateStart > -1,
    hasStyles: idxStylesStart > -1,
    hasEnd: idxStylesEnd > -1,
  });
}
