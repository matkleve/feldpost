import { test } from "node:test";
import assert from "node:assert/strict";
import { inspectTemplateSource } from "./check-i18n-hardcoded-literals.mjs";

const kinds = (findings) => findings.map((f) => f.kind);
const values = (findings) => findings.map((f) => f.value);

test("flags a plain text-node label", () => {
  const findings = inspectTemplateSource("<button>Sign in</button>", "x.html");
  assert.ok(values(findings).includes("Sign in"));
});

test("ignores icon ligatures inside mat-icon", () => {
  const findings = inspectTemplateSource("<mat-icon>search</mat-icon>", "x.html");
  assert.equal(findings.length, 0);
});

test("ignores icon ligatures inside a material-icons span", () => {
  const findings = inspectTemplateSource(
    '<span class="material-icons">settings</span>',
    "x.html",
  );
  assert.equal(findings.length, 0);
});

test("flags a single lowercase word that is NOT an icon (regression)", () => {
  // Previously every /^[a-z0-9_]+$/ token was ignored, hiding real copy.
  const findings = inspectTemplateSource("<button>save</button>", "x.html");
  assert.ok(values(findings).includes("save"));
});

test("flags static alt text (regression: alt was not scanned)", () => {
  const findings = inspectTemplateSource(
    '<img src="a.png" alt="Company logo" />',
    "x.html",
  );
  assert.ok(kinds(findings).includes("attr:alt"));
});

test("flags matTooltip copy (regression: matTooltip was not scanned)", () => {
  const findings = inspectTemplateSource(
    '<button matTooltip="Delete this item">x</button>',
    "x.html",
  );
  assert.ok(kinds(findings).includes("attr:matTooltip"));
});

test("flags bound-attribute string literals", () => {
  const findings = inspectTemplateSource(
    `<button [title]="'Remove member'">x</button>`,
    "x.html",
  );
  assert.ok(kinds(findings).includes("bound-attr:title"));
});

test("does not flag interpolation or translate-piped bindings", () => {
  const findings = inspectTemplateSource(
    `<span>{{ 'auth.signIn' | translate }}</span><button [title]="label()">x</button>`,
    "x.html",
  );
  assert.equal(findings.length, 0);
});
