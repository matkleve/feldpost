import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const userProfile = process.env.USERPROFILE ?? "";
const scoopSupabase = path.join(userProfile, "scoop", "shims", "supabase.exe");
const binary = existsSync(scoopSupabase) ? scoopSupabase : "supabase";

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: node scripts/run-supabase-cli.mjs <supabase args...>");
  process.exit(2);
}

const result = spawnSync(binary, args, {
  stdio: "inherit",
  shell: false,
});

if (typeof result.status === "number") {
  process.exit(result.status);
}

process.exit(1);
