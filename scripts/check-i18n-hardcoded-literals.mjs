import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

const repoRoot = process.cwd();
const strict = process.argv.includes("--strict");

const includeDirs = [
  join(repoRoot, "apps", "web", "src", "app", "features", "auth"),
  join(repoRoot, "apps", "web", "src", "app", "features", "settings-overlay"),
  join(repoRoot, "apps", "web", "src", "app", "features", "map", "search-bar"),
  join(repoRoot, "apps", "web", "src", "app", "features", "map", "map-shell"),
  join(repoRoot, "apps", "web", "src", "app", "features", "projects"),
];

const findings = [];

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
      walk(absolutePath, outFiles);
      continue;
    }

    const extension = extname(entry.name);
    if (extension === ".html") {
      outFiles.push(absolutePath);
    }
  }
}

function isIgnorableText(value) {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith("{{") || trimmed.endsWith("}}")) return true;
  if (/^[a-z0-9_]+$/.test(trimmed)) return true; // material-icons identifiers, etc.
  if (!/[A-Za-z]/.test(trimmed)) return true;
  if (/^[@#:/\\[\]{}()=+*.,!?-]+$/.test(trimmed)) return true;
  return false;
}

function addFinding(filePath, kind, value, index, source) {
  const line = source.slice(0, index).split(/\r?\n/).length;
  findings.push({
    filePath: relative(repoRoot, filePath).replace(/\\/g, "/"),
    kind,
    value: value.trim().replace(/\s+/g, " ").slice(0, 120),
    line,
  });
}

function inspectTemplate(filePath) {
  const source = readFileSync(filePath, "utf8");

  const textNodeRegex = />\s*([^<{][^<]*)\s*</g;
  for (const match of source.matchAll(textNodeRegex)) {
    const raw = match[1] ?? "";
    if (isIgnorableText(raw)) continue;

    // Exclude Angular control flow markers and common icon text blocks.
    if (raw.includes("@if") || raw.includes("@for") || raw.includes("@switch"))
      continue;
    addFinding(filePath, "text-node", raw, match.index ?? 0, source);
  }

  const attrRegex =
    /\b(title|placeholder|aria-label)\s*=\s*"([^"{][^"]*[A-Za-z][^"]*)"/g;
  for (const match of source.matchAll(attrRegex)) {
    const raw = match[2] ?? "";
    if (isIgnorableText(raw)) continue;
    addFinding(filePath, `attr:${match[1]}`, raw, match.index ?? 0, source);
  }
}

const files = [];
for (const dirPath of includeDirs) {
  if (!statExists(dirPath)) continue;
  walk(dirPath, files);
}

for (const filePath of files) {
  inspectTemplate(filePath);
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

function statExists(path) {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}
