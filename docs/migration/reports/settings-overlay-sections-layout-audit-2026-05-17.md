# Audit: Einstellungs-Menüs vs. Layout-Leitlinien (Settings Overlay)

**Datum:** 2026-05-17  
**Bezug:** [`settings-overlay.md`](../../../docs/specs/ui/settings-overlay/settings-overlay.md) (Abschnitt *What It Looks Like*, *Detail typography*, *Code reality*) sowie Implementierung in  
[`settings-overlay.component.html`](../../../apps/web/src/app/features/settings-overlay/settings-overlay.component.html) / [`.scss`](../../../apps/web/src/app/features/settings-overlay/settings-overlay.component.scss).

## Geprüfte Leitlinien (Kurz)

| # | Leitlinie | Erwartung im Detailbereich |
|---|-----------|----------------------------|
| L1 | **Karten-Shell** | Eine Inhaltskarte mit `settings-overlay__detail-card` (Rahmen, `rounded-lg`, `bg-card`, Innenabstand); vertikaler Stack mit tokenisiertem `gap` aus Overlay-SCSS. |
| L2 | **Titel** | Sektionsname als `h3` (nur globale Heading-Metrik; im Overlay keine `font-size`/`font-weight`/`line-height` auf `h3` in fremden Komponenten überschreiben). |
| L3 | **Einleitungstext** | Direkt auf `h3` folgendes erstes `p` = sekundärer Fließtext (laut Spec: sm, normalgewichtig, reading line-height, muted) — umgesetzt als `.settings-overlay__detail-card > p`. |
| L4 | **Zeilenmuster** | Schalter: `settings-overlay__toggle-row` + `toggle-label` (`strong` / `small`). Formular-/Steuerzeilen: `settings-overlay__field-row` bzw. `settings-overlay__field-row--stacked`; Segmentierte Steuerungen in `field-value` + `settings-overlay__segmented`. |
| L5 | **Row-Titel-Typo** | Gleiche Lesart für Toggle-Zeilen-Titel und `hlmLabel` in Field-Rows (laut Spec: Row-Title, sm, medium, foreground). |
| L6 | **Schmale Detailspalte** | Eltern `.settings-overlay__detail` ist Inline-Size-Container; unter Schwellenwert stapeln sich nicht-`stacked` Field-Rows (kein horizontales Überlaufen langer Locales). |

*Hinweis:* Inline-`@case`-Sektionen nutzen `settings-overlay__detail-card`. Eingebettete Komponenten (**Konto**, **Einladungen**) erfüllen denselben Vertrag über [settings-detail-embedded-layout.md](../../../docs/specs/ui/settings-overlay/settings-detail-embedded-layout.md).

---

## Pro Menüpunkt (Rail-ID)

### 1. `general` — Allgemein

| Kriterium | Status |
|-----------|--------|
| L1–L6 | **Konform** |

**Befund:** Eine `settings-overlay__detail-card` mit `h3`, Einleitung-`p`, zwei `field-row`-Blöcken (Sprache, Dichte) mit `hlmLabel` und Pill-Toggle. Entspricht dem referenzierten Muster (gruppierte Einstellungen, Titel → Hilfetext → Zeilen).

---

### 2. `appearance` — Erscheinungsbild

| Kriterium | Status |
|-----------|--------|
| L1–L6 | **Konform** |

**Befund:** Eine Detailkarte; `h3` + `p`; eine `field-row` mit Theme-Segment (`settings-overlay__segmented--theme`). Keine Abweichung von der Leitlinien-Struktur.

---

### 3. `notifications` — Mitteilungen

| Kriterium | Status |
|-----------|--------|
| L1–L6 | **Konform** |

**Befund:** Karte mit `h3`, `p`, zwei `toggle-row`-Schaltern mit `strong`/`small`. Keine `field-row` — für reine Boolean-Zeilen ist das leitlinienkonform (List-Detail / iOS-ähnliche Schalterzeilen).

---

### 4. `map` — Karten­einstellungen

| Kriterium | Status |
|-----------|--------|
| L1–L6 | **Konform** |

**Befund:** Karte mit `h3`, `p`; zwei `toggle-row`; danach eine `field-row` für „Marker motion“ (Label + Segment). Mischung Schalter + Segment in einer Karte ist zulässig; Row-Titel folgen dem gemeinsamen Row-Title-Style (Label = `hlmLabel` in Field-Row, Toggles = `strong`).

**Optional (Nit):** Visuelle Untergruppierung (z. B. dezenter Abstand oder Gruppe nur für die beiden Toggles) ist nicht vorgeschrieben; Einheitlichkeit ist gegeben.

---

### 5. `search` — Such­feintuning

| Kriterium | Status |
|-----------|--------|
| L1–L6 | **Konform** |

**Befund:** Karte mit `h3`, `p`; `field-row` für Bias-Select; `field-row--stacked` für Radius-Slider und km-Anzeige. Entspricht L4 (gestapelte Zeile für Range + Lesetext).

**Hinweis:** Die Zeile `<strong>{{ … }} km</strong>` ist ein **Wert-Readout**, kein Row-Titel — fällt nicht unter L5; Typo kommt überwiegend von globalen `strong`-Regeln; funktional unkritisch für Layout-Leitlinien.

---

### 6. `data` — Daten & Datenschutz

| Kriterium | Status |
|-----------|--------|
| L1–L6 | **Konform** |

**Befund:** Karte mit `h3`, `p`; gestapelte Range-Zeile (Retention); `toggle-row` für Telemetrie. Struktur passt zu L1–L6.

---

### 7. `account` — Konto

| Kriterium | Status |
|-----------|--------|
| L1–L6 | **Konform (eingebettet)** |

**Befund:** [`app-account`](../../../apps/web/src/app/shared/account/account.component.html) nutzt weiterhin mehrere `account-card`-Blöcke (Identität mit **`h1`**, Untersektionen mit **`h2`**) — abweichend von der „eine `detail-card` pro Sektion“-Struktur, aber **overlay-konform** über `embeddedInSettings` + Host-Klasse `account--embedded`: keine doppelte `content-clamp`-Breite, `gap`/`padding` wie andere Detailkarten, Intro-/Label-Typo an [settings-detail-embedded-layout.md](../../../docs/specs/ui/settings-overlay/settings-detail-embedded-layout.md) ausgerichtet. Auf der **Standalone-Account-Route** (`app-account-feature`) bleibt `embeddedInSettings` aus und das bisherige Seitenlayout (inkl. Clamp) gilt.

---

### 8. `invite-management` — Einladungen

| Kriterium | Status |
|-----------|--------|
| L1–L6 | **Konform** |

**Befund:** [`ss-invite-management-section`](../../../apps/web/src/app/features/settings-overlay/sections/invite-management-section.component.html): eine Karten-Root mit gleichem Tailwind-Chrome wie `settings-overlay__detail-card` (`rounded-lg border border-border bg-card p-6`, `gap-2`), `h3` + Intro-`p` wie Leitlinie L3, Stack-`gap` und Rollen-Label wie L5; QR-/Share-Blöcke bleiben feature-spezifisch (L4 sinngemäß).

---

## Zusammenfassung

| Menü (ID) | Leitlinien (L1–L6) |
|-----------|-------------------|
| general | Konform |
| appearance | Konform |
| notifications | Konform |
| map | Konform |
| search | Konform |
| data | Konform |
| account | Konform (eingebettet; siehe `settings-detail-embedded-layout.md`) |
| invite-management | Konform |

**Fazit:** Alle Rail-Sektionen — inklusive **Konto** und **Einladungen** — folgen dem in [`settings-detail-embedded-layout.md`](../../../docs/specs/ui/settings-overlay/settings-detail-embedded-layout.md) festgehaltenen Einbettungsvertrag bzw. dem Inline-`detail-card`-Muster.

---

## Offene Punkte (nicht Teil L1–L6, aber erwähnenswert)

- **ARIA:** `role="list"` mit `<button>`-Kindern; Schalter in `toggle-row` mit `aria-hidden` am `hlmSwitch` — siehe früheres Design-QA; betrifft A11y, nicht die hier definierte Layout-Typografie-Leitlinie.
- **Spec-Drift:** Ältere Hierarchie-Diagramme in `settings-overlay.md` (CDK, alte Spaltennamen) können schrittweise bereinigt werden; der normative Kurztext oben im Spec ist maßgeblich für dieses Audit.
