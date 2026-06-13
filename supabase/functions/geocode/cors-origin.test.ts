import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { isOriginAllowed, resolveAllowedOrigin } from "./cors-origin.ts";

const LOCAL = [
  "http://localhost:4200",
  "http://127.0.0.1:4200",
  "https://feldpost.pages.dev",
  "https://*.feldpost.pages.dev",
];

Deno.test("resolveAllowedOrigin accepts exact localhost origins", () => {
  assertEquals(
    resolveAllowedOrigin("http://localhost:4200", LOCAL),
    "http://localhost:4200",
  );
});

Deno.test("resolveAllowedOrigin accepts Cloudflare preview subdomains", () => {
  assertEquals(
    resolveAllowedOrigin("https://da33d296.feldpost.pages.dev", LOCAL),
    "https://da33d296.feldpost.pages.dev",
  );
});

Deno.test("resolveAllowedOrigin rejects unknown origins", () => {
  assertEquals(resolveAllowedOrigin("https://evil.example", LOCAL), null);
});

Deno.test("resolveAllowedOrigin fails closed when allow-list is empty", () => {
  assertEquals(resolveAllowedOrigin("http://localhost:4200", []), null);
});

Deno.test("isOriginAllowed does not treat wildcard as substring match", () => {
  assertEquals(
    isOriginAllowed("https://feldpost.pages.dev.evil.example", LOCAL),
    false,
  );
});
