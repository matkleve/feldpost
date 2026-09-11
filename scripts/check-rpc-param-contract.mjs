/**
 * RPC parameter contract gate.
 *
 * The failure this exists to prevent (issue #136): the frontend starts sending
 * an RPC parameter the deployed function does not have yet. PostgREST cannot
 * resolve the function for the parameter set it is given, so the call fails --
 * and for location writes it fails *silently at the user level*: the upload
 * completes and the address never arrives.
 *
 * Both halves are individually correct; nothing enforced the order between
 * them. A note in a deploy doc did not survive contact with reality, so this
 * compares the two halves directly: every `.rpc('name', {...})` call site in
 * apps/web against the live function catalog parsed from supabase/migrations.
 *
 * Checks, per call site:
 *   A  the function exists in the migration history (and was not dropped)
 *   B  every parameter passed is one the function accepts   <- the #136 failure
 *   C  every parameter without a DEFAULT is supplied
 *
 * Not a substitute for `supabase migration list` against hosted -- this proves
 * the committed halves agree, not that the migration has been applied. See
 * supabase/AGENTS.md § Deploy order.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const migrationsDir = path.join(repoRoot, "supabase", "migrations");
const webSrcDir = path.join(repoRoot, "apps", "web", "src");

/** Calls to a function that may legitimately not exist: a deliberate
 *  new-name-then-fall-back-to-old-name probe. Keep this list short. */
const OPTIONAL_RPCS = new Set(["cluster_media", "cluster_media_multi"]);

// ---------------------------------------------------------------------------
// 1. Live function catalog from migrations
// ---------------------------------------------------------------------------

function matchParen(text, openIndex) {
  let depth = 1;
  let i = openIndex;
  while (i < text.length && depth > 0) {
    const ch = text[i];
    if (ch === "(") depth += 1;
    else if (ch === ")") depth -= 1;
    i += 1;
  }
  return { inner: text.slice(openIndex, i - 1), end: i };
}

function splitTopLevel(text, separator = ",") {
  const parts = [];
  let depth = 0;
  let current = "";
  for (const ch of text) {
    if (ch === "(" || ch === "[") depth += 1;
    else if (ch === ")" || ch === "]") depth -= 1;
    if (ch === separator && depth === 0) {
      parts.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current);
  return parts.map((p) => p.trim()).filter(Boolean);
}

const TYPE_ALIAS = new Map([
  ["int", "integer"], ["int4", "integer"], ["int8", "bigint"], ["bool", "boolean"],
  ["timestamptz", "timestamp with time zone"], ["float8", "double precision"],
  ["varchar", "character varying"], ["decimal", "numeric"],
]);

/** Types that stand alone, so a param spelled only as a type has no name.
 *  DROP FUNCTION uses that bare form; CREATE FUNCTION uses `name type`. */
const BARE_TYPES = new Set([
  "uuid", "text", "integer", "bigint", "smallint", "boolean", "numeric", "real",
  "jsonb", "json", "date", "bytea", "double precision", "character varying",
  "timestamp with time zone", "timestamp without time zone", "void", "record",
  "trigger", "inet", "citext", "money",
]);

function normalizeType(raw) {
  let t = raw.trim().replace(/\s+/g, " ").toLowerCase().replace(/^"|"$/g, "");
  let suffix = "";
  while (t.endsWith("[]")) {
    suffix += "[]";
    t = t.slice(0, -2).trim();
  }
  return (TYPE_ALIAS.get(t) ?? t) + suffix;
}

function isBareType(raw) {
  const base = normalizeType(raw).replace(/\[\]/g, "");
  return BARE_TYPES.has(base) || base.startsWith("public.");
}

/** `p_street text DEFAULT NULL` -> { name: "p_street", type: "text", hasDefault: true }
 *  `double precision`           -> { name: null,      type: "double precision", ... } */
function parseParam(raw) {
  const cleaned = raw.replace(/^\s*(IN|OUT|INOUT|VARIADIC)\s+/i, "").trim();
  const withoutDefault = cleaned.split(/\bDEFAULT\b/i)[0].split("=")[0].trim();
  const hasDefault = withoutDefault.length !== cleaned.length;
  if (isBareType(withoutDefault)) {
    return { name: null, type: normalizeType(withoutDefault), hasDefault };
  }
  const m = /^"?([A-Za-z_]\w*)"?\s+([\s\S]+)$/.exec(withoutDefault);
  if (!m) return { name: null, type: normalizeType(withoutDefault), hasDefault };
  return { name: m[1].toLowerCase(), type: normalizeType(m[2]), hasDefault };
}

const signatureOf = (params) => params.map((p) => p.type).join(", ");

/**
 * A function is live if its latest CREATE was not followed by a DROP of that
 * same signature. Matching on name alone is wrong: 20260910160000 drops the
 * stale pre-precision *overloads* of resolve_media_location and friends while
 * the current signatures stay -- exactly the ambiguity that migration exists
 * to clear up.
 */
function buildFunctionCatalog() {
  const files = readdirSync(migrationsDir)
    .filter((n) => /^\d+.*\.sql$/i.test(n))
    .sort();

  const lastCreate = new Map(); // "name(types)" -> { name, params, file, order }
  const lastDrop = new Map(); // "name(types)" -> order

  files.forEach((file, order) => {
    const sql = readFileSync(path.join(migrationsDir, file), "utf8");

    const createRe =
      /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?"?(\w+)"?\s*\(/gi;
    let m;
    while ((m = createRe.exec(sql)) !== null) {
      const { inner } = matchParen(sql, m.index + m[0].length);
      const params = splitTopLevel(inner).map(parseParam);
      const name = m[1].toLowerCase();
      lastCreate.set(`${name}(${signatureOf(params)})`, { name, params, file, order });
    }

    const dropRe =
      /DROP\s+FUNCTION\s+(?:IF\s+EXISTS\s+)?(?:public\.)?"?(\w+)"?\s*\(/gi;
    while ((m = dropRe.exec(sql)) !== null) {
      const { inner } = matchParen(sql, m.index + m[0].length);
      const params = splitTopLevel(inner).map(parseParam);
      lastDrop.set(`${m[1].toLowerCase()}(${signatureOf(params)})`, order);
    }
  });

  const catalog = new Map(); // name -> [definitions]
  for (const [key, def] of lastCreate) {
    const dropped = lastDrop.get(key);
    if (dropped !== undefined && dropped > def.order) continue;
    if (!catalog.has(def.name)) catalog.set(def.name, []);
    catalog.get(def.name).push(def);
  }
  return catalog;
}

// ---------------------------------------------------------------------------
// 2. Frontend .rpc() call sites
// ---------------------------------------------------------------------------

function listTsFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...listTsFiles(full));
    else if (/\.ts$/.test(entry) && !/\.spec\.ts$/.test(entry)) out.push(full);
  }
  return out;
}

function matchBrace(text, openIndex) {
  let depth = 1;
  let i = openIndex;
  while (i < text.length && depth > 0) {
    const ch = text[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") depth -= 1;
    i += 1;
  }
  return { inner: text.slice(openIndex, i - 1), end: i };
}

/** Top-level keys of an object literal body; `hasSpread` when it uses `...x`. */
function objectLiteralKeys(inner) {
  const keys = [];
  let hasSpread = false;
  let depth = 0;
  let buffer = "";
  const flush = () => {
    const seg = buffer.trim();
    buffer = "";
    if (!seg) return;
    if (seg.startsWith("...")) {
      hasSpread = true;
      return;
    }
    const k = /^['"]?([A-Za-z_]\w*)['"]?\s*:/.exec(seg);
    if (k) keys.push(k[1].toLowerCase());
    else if (/^[A-Za-z_]\w*$/.test(seg)) keys.push(seg.toLowerCase()); // shorthand
  };
  for (const ch of inner) {
    if (ch === "{" || ch === "(" || ch === "[") depth += 1;
    else if (ch === "}" || ch === ")" || ch === "]") depth -= 1;
    if (ch === "," && depth === 0) flush();
    else buffer += ch;
  }
  flush();
  return { keys, hasSpread };
}

function resolveIdentifierLiteral(source, identifier) {
  const re = new RegExp(`\\b(?:const|let|var)\\s+${identifier}\\s*(?::[^=]+)?=\\s*\\{`);
  const m = re.exec(source);
  if (!m) return null;
  const { inner } = matchBrace(source, m.index + m[0].length);
  return objectLiteralKeys(inner);
}

function collectCallSites(file) {
  const source = readFileSync(file, "utf8");
  const rel = path.relative(repoRoot, file);
  const sites = [];
  const re = /\.rpc\(\s*['"`](\w+)['"`]\s*(,?)/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    const line = source.slice(0, m.index).split("\n").length;
    const site = { rel, line, fn: m[1].toLowerCase() };
    if (!m[2]) {
      site.keys = [];
      site.hasSpread = false;
      sites.push(site);
      continue;
    }
    const after = source.slice(m.index + m[0].length);
    const lead = /^\s*/.exec(after)[0].length;
    const rest = after.slice(lead);
    if (rest.startsWith("{")) {
      const { inner } = matchBrace(source, m.index + m[0].length + lead + 1);
      Object.assign(site, objectLiteralKeys(inner));
    } else {
      const ident = /^([A-Za-z_]\w*)\s*[,)]/.exec(rest);
      const resolved = ident ? resolveIdentifierLiteral(source, ident[1]) : null;
      if (resolved) Object.assign(site, resolved, { via: ident[1] });
      else site.unresolved = true;
    }
    sites.push(site);
  }
  return sites;
}

// ---------------------------------------------------------------------------
// 3. Compare
// ---------------------------------------------------------------------------

const catalog = buildFunctionCatalog();
const sites = listTsFiles(webSrcDir).flatMap(collectCallSites);

const errors = [];
let unresolved = 0;
let partial = 0;

/** PostgREST picks an overload by the parameter set it is handed, so a call
 *  site is sound if *any* live overload accepts exactly what it sends. */
function evaluate(def, site) {
  const accepted = new Set(def.params.map((p) => p.name).filter(Boolean));
  const unknown = site.keys.filter((k) => !accepted.has(k));
  const supplied = new Set(site.keys);
  const missing = site.hasSpread
    ? []
    : def.params.filter((p) => p.name && !p.hasDefault && !supplied.has(p.name));
  return { accepted, unknown, missing, ok: !unknown.length && !missing.length };
}

for (const site of sites) {
  if (site.unresolved) {
    unresolved += 1;
    continue;
  }

  const defs = catalog.get(site.fn);
  if (!defs?.length) {
    if (!OPTIONAL_RPCS.has(site.fn)) {
      errors.push(
        `${site.rel}:${site.line}  calls public.${site.fn}(), which no migration creates (or a later migration drops)`,
      );
    }
    continue;
  }

  const attempts = defs.map((def) => ({ def, ...evaluate(def, site) }));
  if (attempts.some((a) => a.ok)) {
    if (site.hasSpread) partial += 1;
    continue;
  }

  // Report against the closest overload, so the message names one real target.
  const best = attempts.sort(
    (a, b) => a.unknown.length + a.missing.length - (b.unknown.length + b.missing.length),
  )[0];
  const via = site.via ? ` (params via \`${site.via}\`)` : "";
  for (const key of best.unknown) {
    errors.push(
      `${site.rel}:${site.line}${via}  passes '${key}' to public.${site.fn}(), which does not accept it` +
        `\n      accepted: ${[...best.accepted].join(", ") || "(none)"}` +
        `\n      defined in: ${best.def.file}`,
    );
  }
  for (const p of best.missing) {
    errors.push(
      `${site.rel}:${site.line}${via}  omits required parameter '${p.name}' of public.${site.fn}()` +
        `\n      defined in: ${best.def.file}`,
    );
  }
}

const liveCount = [...catalog.values()].reduce((n, defs) => n + defs.length, 0);
const checked = sites.length - unresolved;
if (errors.length) {
  console.error(`\n\u2717 rpc-param-contract: ${errors.length} mismatch(es)\n`);
  for (const e of errors) console.error(`  ${e}`);
  console.error(
    `\n  ${checked}/${sites.length} call sites checked against ${liveCount} live functions.`,
  );
  process.exit(1);
}

console.log(
  `\u2713 rpc-param-contract: ${checked}/${sites.length} call sites agree with ${liveCount} live functions` +
    (unresolved ? ` (${unresolved} pass params indirectly, not statically checkable)` : "") +
    (partial ? ` (${partial} use spread; passed keys verified, required-params not)` : ""),
);
