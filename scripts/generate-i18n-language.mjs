import { execSync } from "node:child_process";

const langArg = process.argv.find((arg) => arg.startsWith("--lang="));
if (!langArg) {
  console.error("Missing --lang=<code>, e.g. --lang=it");
  process.exit(1);
}

const targetLanguage = langArg.slice("--lang=".length).trim().toLowerCase();
const force = process.argv.includes("--force");
const strictSame = process.argv.includes("--strict-same");
const maxSameArg = process.argv.find((arg) => arg.startsWith("--max-same="));

function run(command) {
  console.log(`\n> ${command}`);
  execSync(command, { stdio: "inherit" });
}

run("node scripts/export-i18n-workbench.mjs");
run(
  `node scripts/translate-i18n-google.mjs --lang=${targetLanguage}${force ? " --force" : ""}`,
);
run("node scripts/import-i18n-csv-to-sql.mjs");
run(
  `node scripts/validate-i18n-language.mjs --lang=${targetLanguage}${strictSame ? " --strict-same" : ""}${maxSameArg ? ` ${maxSameArg}` : ""}`,
);

console.log(`\nDone. Language pipeline generated for: ${targetLanguage}`);
