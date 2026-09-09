#!/usr/bin/env node
/**
 * PreToolUse guard: refuse agent edits to files that must stay hand-owned.
 *
 * Replaces an earlier `.claude/settings.json` entry that used a
 * `{ matcher, action, message }` shape. That shape is not the hook schema — a
 * hook entry needs a nested `hooks` array of `{ type: "command", command }` —
 * and `matcher` matches *tool names*, not file paths. So the rule was silently
 * inactive and the config it claimed to protect was never protected. A guard
 * everyone believes in is worse than no guard.
 *
 * Contract: read the tool call on stdin, exit 2 to block (stderr goes back to
 * the agent), exit 0 to allow. Anything unparseable allows — a guard that
 * blocks on its own bug would stop all work.
 */

const PROTECTED = [
  {
    pattern: /(^|\/)eslint\.config\.[cm]?js$/,
    message: "ESLint-Config ist schreibgeschützt — keine AI-Edits erlaubt. Frag den Owner.",
  },
];

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => (raw += chunk));
process.stdin.on("end", () => {
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  const target = input?.tool_input?.file_path ?? input?.tool_input?.path ?? "";
  if (!target) process.exit(0);

  for (const rule of PROTECTED) {
    if (rule.pattern.test(target)) {
      console.error(`${rule.message}\n  blocked path: ${target}`);
      process.exit(2);
    }
  }

  process.exit(0);
});
