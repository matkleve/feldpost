import '@angular/compiler';

import { readdir, readFile } from 'node:fs/promises';
import { basename, isAbsolute, join, normalize } from 'node:path';

import { ɵresolveComponentResources as resolveComponentResources } from '@angular/core';
import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';

declare const beforeEach: (fn: () => Promise<void> | void) => void;

const webRoot = process.cwd();
const defaultResourceRoots = [webRoot, join(webRoot, 'src'), join(webRoot, 'src', 'app')];
const indexedResourcesRoot = join(webRoot, 'src', 'app');

let resourceIndexPromise: Promise<Map<string, string[]>> | null = null;

async function buildResourceIndex(rootDir: string): Promise<Map<string, string[]>> {
  const index = new Map<string, string[]>();
  const queue = [rootDir];

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current) {
      continue;
    }

    const entries = await readdir(current, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(current, entry.name);

      if (entry.isDirectory()) {
        queue.push(fullPath);
        continue;
      }

      const key = entry.name;
      const existing = index.get(key) ?? [];
      existing.push(normalize(fullPath));
      index.set(key, existing);
    }
  }

  return index;
}

async function getResourceIndex(): Promise<Map<string, string[]>> {
  if (!resourceIndexPromise) {
    resourceIndexPromise = buildResourceIndex(indexedResourcesRoot);
  }

  return resourceIndexPromise;
}

async function readAngularResource(url: string): Promise<string> {
  // Angular may pass relative paths from decorators; resolve against common workspace roots.
  const normalizedUrl = url.replace(/^[.][/\\]/, '');
  const candidates = new Set<string>();

  if (isAbsolute(url)) {
    candidates.add(normalize(url));
  }

  for (const root of defaultResourceRoots) {
    candidates.add(normalize(join(root, url)));
    candidates.add(normalize(join(root, normalizedUrl)));
  }

  for (const candidate of candidates) {
    try {
      return await readFile(candidate, 'utf8');
    } catch {
      // Try next candidate.
    }
  }

  const byNameMatches = (await getResourceIndex()).get(basename(normalizedUrl)) ?? [];

  if (byNameMatches.length === 1) {
    return readFile(byNameMatches[0], 'utf8');
  }

  throw new Error(`Failed to resolve Angular test resource: ${url}`);
}

beforeEach(async () => {
  await resolveComponentResources(readAngularResource);
});

const testBed = getTestBed();

if (!(testBed as { platform?: unknown }).platform) {
  testBed.initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting(), {
    teardown: { destroyAfterEach: true },
  });
}
