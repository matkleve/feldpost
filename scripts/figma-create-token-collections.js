/**
 * Figma Plugin Script — Token Collections + Overview Canvas
 *
 * Run this in a Figma plugin console (or via the use_figma MCP tool when
 * the write-capable Figma plugin is connected).
 *
 * Creates:
 *   • Feldpost / Shape      — 7 FLOAT variables (corner-radius)
 *   • Feldpost / Spacing    — 11 FLOAT variables (gap/padding)
 *   • Feldpost / Typescale  — 60 FLOAT variables (size, lh, weight, tracking)
 *   • Feldpost / State      — 5 FLOAT variables (opacity multipliers)
 *   • Feldpost / Motion     — 16 STRING/FLOAT variables (durations + easings)
 *   • "Feldpost — Token Overview" frame on the Design System page
 *
 * Idempotent: removes existing collections of the same name before re-creating.
 */

// ── helpers ───────────────────────────────────────────────────────────────────

async function clearCollection(name) {
  const all = await figma.variables.getLocalVariableCollectionsAsync();
  for (const c of all) {
    if (c.name === name) c.remove();
  }
}

function makeCollection(name) {
  const coll = figma.variables.createVariableCollection(name);
  coll.renameMode(coll.modes[0].modeId, 'Default');
  return coll;
}

function addFloat(coll, name, value, scopes) {
  const v = figma.variables.createVariable(name, coll, 'FLOAT');
  v.scopes = scopes;
  v.setValueForMode(coll.modes[0].modeId, value);
  return v;
}

function addString(coll, name, value, scopes) {
  const v = figma.variables.createVariable(name, coll, 'STRING');
  v.scopes = scopes;
  v.setValueForMode(coll.modes[0].modeId, value);
  return v;
}

// ── Shape ─────────────────────────────────────────────────────────────────────

await clearCollection('Feldpost / Shape');
const shapeColl = makeCollection('Feldpost / Shape');
[
  ['shape/none',         0],
  ['shape/extra-small',  4],
  ['shape/small',        8],
  ['shape/medium',      12],
  ['shape/large',       16],
  ['shape/extra-large', 28],
  ['shape/full',      9999],
].forEach(([n, v]) => addFloat(shapeColl, n, v, ['CORNER_RADIUS']));

// ── Spacing ───────────────────────────────────────────────────────────────────

await clearCollection('Feldpost / Spacing');
const spacingColl = makeCollection('Feldpost / Spacing');
[
  ['spacing/0',   0],
  ['spacing/1',   4],
  ['spacing/2',   8],
  ['spacing/3',  12],
  ['spacing/4',  16],
  ['spacing/5',  20],
  ['spacing/6',  24],
  ['spacing/8',  32],
  ['spacing/10', 40],
  ['spacing/12', 48],
  ['spacing/16', 64],
].forEach(([n, v]) => addFloat(spacingColl, n, v, ['GAP', 'WIDTH_HEIGHT', 'PADDING']));

// ── Typescale ─────────────────────────────────────────────────────────────────
// size + line-height: FLOAT (px), weight: FLOAT (number), tracking: FLOAT (px)

await clearCollection('Feldpost / Typescale');
const typeColl = makeCollection('Feldpost / Typescale');

const typeRoles = [
  // [role,                sizeRem,   lhRem,  weight, trackingRem]
  ['display/large',       3.5625,   4,      400,   -0.015625],
  ['display/medium',      2.8125,   3.25,   400,    0],
  ['display/small',       2.25,     2.75,   400,    0],
  ['headline/large',      2,        2.5,    400,    0],
  ['headline/medium',     1.75,     2.25,   400,    0],
  ['headline/small',      1.5,      2,      400,    0],
  ['title/large',         1.375,    1.75,   400,    0],
  ['title/medium',        1,        1.5,    500,    0.009375],
  ['title/small',         0.875,    1.25,   500,    0.00625],
  ['body/large',          1,        1.5,    400,    0.03125],
  ['body/medium',         0.875,    1.25,   400,    0.015625],
  ['body/small',          0.75,     1,      400,    0.025],
  ['label/large',         0.875,    1.25,   500,    0.00625],
  ['label/medium',        0.75,     1,      500,    0.03125],
  ['label/small',         0.6875,   0.75,   500,    0.03125],
];

// Figma stores sizes in px (1rem = 16px)
for (const [role, sizeRem, lhRem, weight, trackingRem] of typeRoles) {
  addFloat(typeColl, `typescale/${role}/size`,        sizeRem * 16,    ['FONT_SIZE']);
  addFloat(typeColl, `typescale/${role}/line-height`, lhRem * 16,      ['LINE_HEIGHT']);
  addFloat(typeColl, `typescale/${role}/weight`,      weight,          ['FONT_WEIGHT']);
  addFloat(typeColl, `typescale/${role}/tracking`,    trackingRem * 16,['LETTER_SPACING']);
}

// ── State ─────────────────────────────────────────────────────────────────────

await clearCollection('Feldpost / State');
const stateColl = makeCollection('Feldpost / State');
[
  ['state/hover',    0.08],
  ['state/focus',    0.12],
  ['state/pressed',  0.12],
  ['state/dragged',  0.16],
  ['state/disabled', 0.38],
].forEach(([n, v]) => addFloat(stateColl, n, v, ['OPACITY']));

// ── Motion ────────────────────────────────────────────────────────────────────
// Durations stored as FLOAT (ms number); easings stored as STRING

await clearCollection('Feldpost / Motion');
const motionColl = makeCollection('Feldpost / Motion');

const durations = [
  ['motion/duration/short1',   50],
  ['motion/duration/short2',  100],
  ['motion/duration/short3',  150],
  ['motion/duration/short4',  200],
  ['motion/duration/medium1', 250],
  ['motion/duration/medium2', 300],
  ['motion/duration/medium3', 350],
  ['motion/duration/medium4', 400],
  ['motion/duration/long1',   450],
  ['motion/duration/long2',   500],
];
durations.forEach(([n, v]) => addFloat(motionColl, n, v, ['ALL_SCOPES']));

const easings = [
  ['motion/easing/standard',               'cubic-bezier(0.2, 0, 0, 1)'],
  ['motion/easing/standard-decelerate',    'cubic-bezier(0, 0, 0, 1)'],
  ['motion/easing/standard-accelerate',    'cubic-bezier(0.3, 0, 1, 1)'],
  ['motion/easing/emphasized',             'cubic-bezier(0.2, 0, 0, 1)'],
  ['motion/easing/emphasized-decelerate',  'cubic-bezier(0.05, 0.7, 0.1, 1)'],
  ['motion/easing/emphasized-accelerate',  'cubic-bezier(0.3, 0, 0.8, 0.15)'],
];
easings.forEach(([n, v]) => addString(motionColl, n, v, ['ALL_SCOPES']));

// ── Token Overview Canvas ─────────────────────────────────────────────────────

// Switch to the Design System page
const dsPage = figma.root.children.find(p => p.name === 'Design System');
if (dsPage) {
  await figma.setCurrentPageAsync(dsPage);

  // Remove old overview frame if it exists
  const existing = dsPage.findChild(n => n.name === 'Feldpost — Token Overview');
  if (existing) existing.remove();

  // Find rightmost node to place new frame beside it
  let maxX = 0;
  for (const n of dsPage.children) {
    maxX = Math.max(maxX, n.x + (n.width || 0));
  }

  // Root frame
  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
  await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });
  await figma.loadFontAsync({ family: 'Inter', style: 'Medium' });

  const root = figma.createAutoLayout('VERTICAL', {
    name: 'Feldpost — Token Overview',
    itemSpacing: 48,
    paddingTop: 48, paddingBottom: 48,
    paddingLeft: 48, paddingRight: 48,
    fills: [{ type: 'SOLID', color: { r: 0.98, g: 0.97, b: 0.96 } }],
    cornerRadius: 16,
  });
  root.primaryAxisSizingMode = 'AUTO';
  root.counterAxisSizingMode = 'AUTO';
  dsPage.appendChild(root);
  root.x = Math.max(maxX + 80, 1680);
  root.y = 0;

  function makeText(text, size, bold, color = { r: 0.13, g: 0.1, b: 0.09 }) {
    const t = figma.createText();
    t.fontName = { family: 'Inter', style: bold ? 'Bold' : 'Regular' };
    t.fontSize = size;
    t.characters = text;
    t.fills = [{ type: 'SOLID', color }];
    return t;
  }

  function makeSection(title, content) {
    const section = figma.createAutoLayout('VERTICAL', {
      name: title,
      itemSpacing: 16,
      paddingTop: 24, paddingBottom: 24,
      paddingLeft: 24, paddingRight: 24,
      fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }],
      cornerRadius: 12,
    });
    section.primaryAxisSizingMode = 'AUTO';
    section.counterAxisSizingMode = 'AUTO';
    const h = makeText(title, 14, true, { r: 0.4, g: 0.28, b: 0.18 });
    section.appendChild(h);
    content(section);
    root.appendChild(section);
    return section;
  }

  function makeChip(label, bg = { r: 0.9, g: 0.87, b: 0.84 }) {
    const chip = figma.createAutoLayout('HORIZONTAL', {
      name: label,
      itemSpacing: 0,
      paddingTop: 6, paddingBottom: 6,
      paddingLeft: 10, paddingRight: 10,
      fills: [{ type: 'SOLID', color: bg }],
      cornerRadius: 6,
    });
    chip.primaryAxisSizingMode = 'AUTO';
    chip.counterAxisSizingMode = 'AUTO';
    const t = makeText(label, 11, false, { r: 0.13, g: 0.1, b: 0.09 });
    chip.appendChild(t);
    return chip;
  }

  // Header
  const headerText = makeText('Feldpost Design System — Token Overview', 24, true);
  const subText = makeText('--fp-* system  •  v2  •  MD3 architecture', 13, false, { r: 0.5, g: 0.38, b: 0.3 });
  root.appendChild(headerText);
  root.appendChild(subText);

  // 1. Color (mini ramp)
  makeSection('Color  /  Fp/Ref/Primary', section => {
    const row = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 6, name: 'ramp' });
    row.primaryAxisSizingMode = 'AUTO';
    row.counterAxisSizingMode = 'AUTO';
    [
      ['0',  { r: 0,     g: 0,     b: 0     }],
      ['20', { r: 0.33,  g: 0.13,  b: 0     }],
      ['40', { r: 0.59,  g: 0.28,  b: 0.07  }],
      ['60', { r: 0.84,  g: 0.47,  b: 0.25  }],
      ['80', { r: 1,     g: 0.71,  b: 0.56  }],
      ['90', { r: 1,     g: 0.86,  b: 0.79  }],
      ['99', { r: 1,     g: 0.98,  b: 1     }],
    ].forEach(([tone, color]) => {
      const chip = figma.createFrame();
      chip.name = `primary/${tone}`;
      chip.resize(40, 40);
      chip.cornerRadius = 6;
      chip.fills = [{ type: 'SOLID', color }];
      const label = makeText(tone, 9, false, tone === '0' || tone === '20' ? { r: 1, g: 1, b: 1 } : { r: 0, g: 0, b: 0 });
      label.x = 4; label.y = 24;
      chip.appendChild(label);
      row.appendChild(chip);
    });
    section.appendChild(row);
    section.appendChild(makeText('+ 14 ref stops  •  see Feldpost — Foundations canvas', 11, false, { r: 0.5, g: 0.38, b: 0.3 }));
  });

  // 2. Shape
  makeSection('Shape  /  Fp/Sys/Shape', section => {
    const row = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 8, name: 'chips', layoutWrap: 'WRAP' });
    row.primaryAxisSizingMode = 'AUTO';
    row.counterAxisSizingMode = 'AUTO';
    row.counterAxisAlignItems = 'CENTER';
    [
      ['none / 0px',        0],
      ['extra-small / 4px', 4],
      ['small / 8px',       8],
      ['medium / 12px',    12],
      ['large / 16px',     16],
      ['extra-large / 28px',28],
      ['full / 9999px',    999],
    ].forEach(([label, r]) => {
      const box = figma.createFrame();
      box.name = label;
      box.resize(80, 32);
      box.cornerRadius = Math.min(r, 16);
      box.fills = [{ type: 'SOLID', color: { r: 0.8, g: 0.69, b: 0.58 } }];
      row.appendChild(box);
      const t = makeText(label, 9, false);
      section.appendChild(row);
    });
    section.appendChild(row);
  });

  // 3. Spacing
  makeSection('Spacing  /  Fp/Sys/Spacing', section => {
    const steps = [[0,0],[1,4],[2,8],[3,12],[4,16],[5,20],[6,24],[8,32],[10,40],[12,48],[16,64]];
    const row = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 4, name: 'steps' });
    row.primaryAxisSizingMode = 'AUTO';
    row.counterAxisSizingMode = 'FIXED';
    row.resize(row.width, 72);
    row.counterAxisAlignItems = 'MAX';
    steps.forEach(([step, px]) => {
      const col = figma.createAutoLayout('VERTICAL', { itemSpacing: 4, name: `sp-${step}` });
      col.primaryAxisSizingMode = 'AUTO';
      col.counterAxisSizingMode = 'AUTO';
      col.counterAxisAlignItems = 'CENTER';
      const bar = figma.createFrame();
      bar.name = `bar-${step}`;
      bar.resize(12, Math.max(4, px * 0.5));
      bar.fills = [{ type: 'SOLID', color: { r: 0.8, g: 0.69, b: 0.58 } }];
      col.appendChild(bar);
      col.appendChild(makeText(`${step}`, 8, false, { r: 0.4, g: 0.3, b: 0.25 }));
      row.appendChild(col);
    });
    section.appendChild(row);
  });

  // 4. Elevation
  makeSection('Elevation  /  Fp/Sys/Elevation', section => {
    const row = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 12, name: 'cards' });
    row.primaryAxisSizingMode = 'AUTO';
    row.counterAxisSizingMode = 'AUTO';
    [0,1,2,3,4,5].forEach(level => {
      const card = figma.createFrame();
      card.name = `elevation-${level}`;
      card.resize(56, 56);
      card.cornerRadius = 8;
      card.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
      if (level > 0) {
        card.effects = [{
          type: 'DROP_SHADOW', radius: level * 3, offset: { x: 0, y: level },
          color: { r: 0, g: 0, b: 0, a: 0.2 }, spread: 0, visible: true, blendMode: 'NORMAL'
        }];
      }
      const t = makeText(`E${level}`, 14, true, { r: 0.4, g: 0.3, b: 0.25 });
      t.x = 18; t.y = 19;
      card.appendChild(t);
      row.appendChild(card);
    });
    section.appendChild(row);
  });

  // 5. Typescale (role names at actual sizes — capped for readability)
  makeSection('Typescale  /  Fp/Sys/Typescale', section => {
    const roles = [
      ['Display Large',   Math.min(57, 24)],
      ['Headline Large',  Math.min(32, 20)],
      ['Title Medium',    Math.min(16, 16)],
      ['Body Large',      Math.min(16, 14)],
      ['Label Small',     Math.min(11, 11)],
    ];
    roles.forEach(([name, size]) => {
      section.appendChild(makeText(name, size, false));
    });
    section.appendChild(makeText('→ 15 roles · see §3.1e tokens.md', 10, false, { r: 0.5, g: 0.38, b: 0.3 }));
  });

  // 6. State
  makeSection('State Layers  /  Fp/Sys/State', section => {
    const row = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 8, name: 'swatches' });
    row.primaryAxisSizingMode = 'AUTO';
    row.counterAxisSizingMode = 'AUTO';
    [
      ['hover',    0.08],
      ['focus',    0.12],
      ['pressed',  0.12],
      ['dragged',  0.16],
      ['disabled', 0.38],
    ].forEach(([label, opacity]) => {
      const swatch = figma.createAutoLayout('VERTICAL', { itemSpacing: 4, name: label });
      swatch.primaryAxisSizingMode = 'AUTO';
      swatch.counterAxisSizingMode = 'AUTO';
      swatch.counterAxisAlignItems = 'CENTER';
      const box = figma.createFrame();
      box.resize(48, 32); box.cornerRadius = 6;
      box.fills = [{ type: 'SOLID', color: { r: 0.8, g: 0.47, b: 0.18 }, opacity }];
      swatch.appendChild(box);
      swatch.appendChild(makeText(`${label}\n${opacity}`, 9, false, { r: 0.4, g: 0.3, b: 0.25 }));
      row.appendChild(swatch);
    });
    section.appendChild(row);
  });

  // 7. Motion
  makeSection('Motion  /  Fp/Sys/Motion', section => {
    const row = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 4, name: 'durations' });
    row.primaryAxisSizingMode = 'AUTO';
    row.counterAxisSizingMode = 'AUTO';
    row.counterAxisAlignItems = 'MAX';
    [[50,'s1'],[100,'s2'],[150,'s3'],[200,'s4'],[250,'m1'],[300,'m2'],[400,'m4'],[450,'l1'],[500,'l2']].forEach(([ms, key]) => {
      const col = figma.createAutoLayout('VERTICAL', { itemSpacing: 4, name: key });
      col.primaryAxisSizingMode = 'AUTO';
      col.counterAxisSizingMode = 'AUTO';
      col.counterAxisAlignItems = 'CENTER';
      const bar = figma.createFrame();
      bar.resize(14, Math.max(4, ms * 0.1));
      bar.fills = [{ type: 'SOLID', color: { r: 0.8, g: 0.69, b: 0.58 } }];
      col.appendChild(bar);
      col.appendChild(makeText(key, 8, false, { r: 0.4, g: 0.3, b: 0.25 }));
      row.appendChild(col);
    });
    section.appendChild(row);
    section.appendChild(makeText('6 easing curves · standard / emphasized variants', 10, false, { r: 0.5, g: 0.38, b: 0.3 }));
  });

  await root.screenshot();
}

return {
  collectionsCreated: ['Feldpost / Shape', 'Feldpost / Spacing', 'Feldpost / Typescale', 'Feldpost / State', 'Feldpost / Motion'],
  canvasFrame: 'Feldpost — Token Overview',
  status: 'complete'
};
