import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = process.cwd();

const includeDirs = [
  join(repoRoot, "apps", "web", "src", "app"),
];

// Elements/classes that render icon ligatures as text (e.g. material-icons),
// where a bare lowercase token like "search" is an icon name, not UI copy.
const ICON_TAGS = new Set(["mat-icon"]);
const ICON_CLASS_RE = /\b(material-icons|material-symbols[\w-]*|mat-icon|app-icon|icon-font)\b/;

function isIconContext(openingTag) {
  if (!openingTag) return false;
  const tagNameMatch = openingTag.match(/^<\s*([a-zA-Z][\w-]*)/);
  const tagName = tagNameMatch ? tagNameMatch[1].toLowerCase() : "";
  if (ICON_TAGS.has(tagName)) return true;
  const classMatch = openingTag.match(/class\s*=\s*"([^"]*)"/);
  if (classMatch && ICON_CLASS_RE.test(classMatch[1])) return true;
  return false;
}

/** The opening tag immediately enclosing the text node at `index`. */
function enclosingOpeningTag(source, index) {
  const before = source.lastIndexOf("<", index);
  if (before < 0) return "";
  const close = source.indexOf(">", before);
  // The text node match starts at the opening tag's own `>`, so close === index
  // is exactly the enclosing tag; only bail when the `>` is past the text node.
  if (close < 0 || close > index) return "";
  return source.slice(before, close + 1);
}

function isIgnorableText(value, { inIcon } = {}) {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith("{{") || trimmed.endsWith("}}")) return true;
  // A single lowercase/underscore token is an icon ligature inside an icon
  // element; a single character anywhere is structural noise ("x" close glyphs).
  // Otherwise it is real UI copy (e.g. a "save" button) and must flag.
  if (/^[a-z0-9_]+$/.test(trimmed)) return inIcon === true || trimmed.length === 1;
  if (!/[A-Za-z]/.test(trimmed)) return true;
  if (/^[@#:/\\[\]{}()=+*.,!?-]+$/.test(trimmed)) return true;
  return false;
}

/**
 * Inspect a single template's source and return hardcoded-literal findings.
 * Pure: no IO. `filePath` is only echoed back on findings.
 */
export function inspectTemplateSource(source, filePath = "") {
  const findings = [];

  const addFinding = (kind, value, index) => {
    const line = source.slice(0, index).split(/\r?\n/).length;
    findings.push({
      filePath: filePath.replace(/\\/g, "/"),
      kind,
      value: value.trim().replace(/\s+/g, " ").slice(0, 120),
      line,
    });
  };

  const textNodeRegex = />\s*([^<{][^<]*)\s*</g;
  for (const match of source.matchAll(textNodeRegex)) {
    const raw = match[1] ?? "";
    const index = match.index ?? 0;
    const inIcon = isIconContext(enclosingOpeningTag(source, index));
    if (isIgnorableText(raw, { inIcon })) continue;
    if (raw.includes("@if") || raw.includes("@for") || raw.includes("@switch")) {
      continue;
    }
    addFinding("text-node", raw, index);
  }

  // Static (non-bound) attributes carrying user-visible copy.
  const attrRegex =
    /\b(title|placeholder|aria-label|alt|matTooltip)\s*=\s*"([^"{][^"]*[A-Za-z][^"]*)"/g;
  for (const match of source.matchAll(attrRegex)) {
    const raw = match[2] ?? "";
    if (isIgnorableText(raw)) continue;
    addFinding(`attr:${match[1]}`, raw, match.index ?? 0);
  }

  // Bound attributes assigned a quoted string literal, e.g. [title]="'Save'".
  const boundLiteralRegex =
    /\[(title|placeholder|aria-label|alt|matTooltip)\]\s*=\s*"'([^']*[A-Za-z][^']*)'"/g;
  for (const match of source.matchAll(boundLiteralRegex)) {
    const raw = match[2] ?? "";
    if (isIgnorableText(raw)) continue;
    addFinding(`bound-attr:${match[1]}`, raw, match.index ?? 0);
  }

  return findings;
}

function walk(dirPath, outFiles) {
  let entries = [];
  try {
    entries = readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const absolutePath = join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "archive") continue;
      walk(absolutePath, outFiles);
      continue;
    }
    if (extname(entry.name) === ".html") {
      outFiles.push(absolutePath);
    }
  }
}

function statExists(path) {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function main() {
  const strict = process.argv.includes("--strict");
  const findings = [];

  const files = [];
  for (const dirPath of includeDirs) {
    if (!statExists(dirPath)) continue;
    walk(dirPath, files);
  }

  for (const filePath of files) {
    const source = readFileSync(filePath, "utf8");
    findings.push(...inspectTemplateSource(source, relative(repoRoot, filePath)));
  }

  if (findings.length === 0) {
    console.log("i18n hardcoded literal guard: no findings in scoped templates.");
    process.exit(0);
  }

  console.log(
    `i18n hardcoded literal guard: ${findings.length} finding(s) across ${new Set(findings.map((f) => f.filePath)).size} file(s).`,
  );
  for (const finding of findings.slice(0, 200)) {
    console.log(
      `- ${finding.filePath}:${finding.line} [${finding.kind}] ${JSON.stringify(finding.value)}`,
    );
  }

  if (strict) {
    process.exit(1);
  }

  console.log("Non-strict mode: exiting with code 0. Use --strict to fail CI.");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
