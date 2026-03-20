#!/usr/bin/env node

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const root = process.cwd();
const targetDirs = [
  "apps/web/src/app/features/map",
  "apps/web/src/app/features/settings-overlay",
  "apps/web/src/app/features/upload",
];

const allowedBreakpoints = new Set([
  "max-width: 47.9375rem",
  "min-width: 48rem",
  "max-width: 63.9375rem",
  "min-width: 64rem",
  "max-width: 48rem",
]);

const exceptions = new Set([
  "apps/web/src/app/features/map/gps-button/gps-button.component.scss|max-width: 600px",
  "apps/web/src/app/features/map/workspace-pane/thumbnail-card.component.scss|max-width: 520px",
]);

const mediaRegex =
  /@media\s*\((max-width|min-width)\s*:\s*([0-9.]+rem|[0-9]+px)\)/g;
const issues = [];
const hits = [];

function collectScssFiles(dirPath) {
  const abs = resolve(root, dirPath);
  const stack = [abs];
  const files = [];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }

    for (const entry of readdirSync(current)) {
      const nextPath = join(current, entry);
      const stats = statSync(nextPath);
      if (stats.isDirectory()) {
        stack.push(nextPath);
      } else if (stats.isFile() && nextPath.endsWith(".scss")) {
        files.push(nextPath);
      }
    }
  }

  return files;
}

function analyzeFile(filePath) {
  const content = readFileSync(filePath, "utf-8");
  const relPath = relative(root, filePath).replace(/\\/g, "/");
  const lines = content.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    mediaRegex.lastIndex = 0;
    let match = mediaRegex.exec(line);

    while (match) {
      const expression = `${match[1]}: ${match[2]}`;
      const key = `${relPath}|${expression}`;

      hits.push({ relPath, line: index + 1, expression });

      if (!allowedBreakpoints.has(expression) && !exceptions.has(key)) {
        issues.push({ relPath, line: index + 1, expression });
      }

      match = mediaRegex.exec(line);
    }
  }
}

for (const dir of targetDirs) {
  const files = collectScssFiles(dir);
  for (const file of files) {
    analyzeFile(file);
  }
}

if (issues.length > 0) {
  console.error(
    "Panel breakpoint audit failed. Found unregistered breakpoints:\n",
  );
  for (const issue of issues) {
    console.error(`- ${issue.relPath}:${issue.line} -> ${issue.expression}`);
  }
  console.error("\nAllowed breakpoints:");
  for (const value of [...allowedBreakpoints].sort()) {
    console.error(`- ${value}`);
  }
  console.error("\nRegistered exceptions:");
  for (const value of [...exceptions].sort()) {
    console.error(`- ${value}`);
  }
  process.exit(1);
}

console.log(
  `Panel breakpoint audit passed. Checked ${hits.length} media queries.`,
);
