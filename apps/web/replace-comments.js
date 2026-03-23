const fs = require('fs');
const path = require('path');

const matchers = [
  {
    regex: /\/\/ Verantwortlichkeiten:/g,
    replacement: '// Responsibilities:'
  },
  {
    regex: /\/\/\s*Size-Modifier(.*?):/g,
    replacement: '//   Size Modifiers$1:'
  },
  {
    regex: /\/\/\s*Emphasis-Modifier(.*?):/g,
    replacement: '//   Emphasis Modifiers$1:'
  },
  {
    regex: /\/\/\s*Layout-Modifier(.*?):/g,
    replacement: '//   Layout Modifiers$1:'
  },
  {
    regex: /\/\/\s*Size: definiert Höhe und Abstände – wird von Layout-Modifiern nicht überschrieben\s*/g,
    replacement: '// Size: defines height and spacing — never overridden by Layout Modifiers\n'
  },
  {
    regex: /\/\/\s*Size: definiert Höhe und Abstände – wird von Layout-Modifiern nicht überschrieben/g,
    replacement: '// Size: defines height and spacing — never overridden by Layout Modifiers'
  },
  {
    regex: /\/\/\s*Emphasis: Farbe und States – keine Größen-Properties\s*/g,
    replacement: '// Emphasis: color and interaction states — no size properties allowed\n'
  },
  {
    regex: /\/\/\s*Emphasis: Farbe und States – keine Größen-Properties/g,
    replacement: '// Emphasis: color and interaction states — no size properties allowed'
  },
  {
    regex: /\/\/\s*Layout: nur Anordnung – KEINE Größen-Properties\s*/g,
    replacement: '// Layout: arrangement only — NO size or font properties\n'
  },
  {
    regex: /\/\/\s*Layout: nur Anordnung – KEINE Größen-Properties/g,
    replacement: '// Layout: arrangement only — NO size or font properties'
  },
  {
    regex: /NIEMALS/g,
    replacement: 'NEVER'
  },
  {
    regex: /\/\/ \(Derzeit keine spezifischen Layout-Modifier\)/g,
    replacement: '// (Currently no specific layout modifiers)'
  },
  {
    regex: /\/\/ Fokus auf Alignment/g,
    replacement: '// Focus on alignment'
  },
  {
    regex: /\/\/ Header-Block Vorlage für alle Primitive-Dateien:/g,
    replacement: ''
  },
  {
    regex: /falls vorhanden/g,
    replacement: 'if applicable'
  }
];

function processDir(dir) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.scss')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      for (const t of matchers) {
        content = content.replace(t.regex, t.replacement);
      }
      
      fs.writeFileSync(fullPath, content);
      console.log('Updated:', fullPath);
    }
  }
}

processDir('src/styles/primitives');
processDir('src/styles/patterns');
