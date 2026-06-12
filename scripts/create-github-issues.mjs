#!/usr/bin/env node

/**
 * Batch GitHub issue creator.
 *
 * Usage:
 *   node scripts/create-github-issues.mjs path/to/issues.json
 *
 * Each issue object in the JSON array:
 *   { title: string, body: string, labels?: string[], milestone?: number }
 *
 * Auth: GITHUB_TOKEN env var, or falls back to `gh auth token`.
 */

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ── CLI arg ──────────────────────────────────────────────────────────────────

const [, , issuesFilePath] = process.argv;
if (!issuesFilePath) {
  console.error('Usage: node scripts/create-github-issues.mjs path/to/issues.json');
  process.exit(1);
}

// ── Load issues ──────────────────────────────────────────────────────────────

let issues;
try {
  const raw = readFileSync(resolve(issuesFilePath), 'utf8');
  issues = JSON.parse(raw);
  if (!Array.isArray(issues)) throw new Error('Root must be a JSON array.');
} catch (err) {
  console.error(`Failed to read issues file: ${err.message}`);
  process.exit(1);
}

// ── Detect repo ──────────────────────────────────────────────────────────────

function detectRepo() {
  try {
    const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
    // Handles both SSH (git@github.com:owner/repo.git) and HTTPS forms
    const match = remoteUrl.match(/github\.com[:/]([^/]+\/[^/.]+?)(?:\.git)?$/);
    if (!match) throw new Error(`Cannot parse owner/repo from: ${remoteUrl}`);
    return match[1]; // "owner/repo"
  } catch (err) {
    console.error(`Cannot detect GitHub repo: ${err.message}`);
    process.exit(1);
  }
}

const ownerRepo = detectRepo();

// ── Auth token ───────────────────────────────────────────────────────────────

function resolveToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try {
    const token = execSync('gh auth token', { encoding: 'utf8' }).trim();
    if (token) return token;
  } catch {
    // gh not available or not authed
  }
  console.error('No auth token: set GITHUB_TOKEN or run `gh auth login`.');
  process.exit(1);
}

const token = resolveToken();

// ── Create issues ────────────────────────────────────────────────────────────

const API_BASE = `https://api.github.com/repos/${ownerRepo}/issues`;
const DELAY_MS = 300;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createIssue(issue, index) {
  const { title, body, labels, milestone } = issue;
  if (!title) {
    console.error(`[${index + 1}] Skipped: missing required field "title".`);
    return false;
  }

  const payload = { title, body: body ?? '' };
  if (Array.isArray(labels) && labels.length) payload.labels = labels;
  if (milestone != null) payload.milestone = milestone;

  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      'User-Agent': 'feldpost-create-github-issues',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '(no body)');
    console.error(`[${index + 1}] FAILED "${title}" — ${response.status} ${response.statusText}: ${text}`);
    return false;
  }

  const data = await response.json();
  console.log(`[${index + 1}] Created: ${data.html_url}`);
  return true;
}

async function run() {
  console.log(`Creating ${issues.length} issue(s) in ${ownerRepo}…\n`);
  let failed = 0;

  for (let i = 0; i < issues.length; i++) {
    const ok = await createIssue(issues[i], i);
    if (!ok) failed++;
    if (i < issues.length - 1) await sleep(DELAY_MS);
  }

  console.log(`\nDone. ${issues.length - failed} succeeded, ${failed} failed.`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
