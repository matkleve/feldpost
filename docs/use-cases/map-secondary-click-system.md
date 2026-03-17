# Map Secondary-Click System — Use Cases

> **Element spec:** [element-specs/map-secondary-click-system.md](../element-specs/map-secondary-click-system.md)

---

## SCS-1: Empty Map Short Right-Click

```mermaid
sequenceDiagram
  actor User
  participant Shell as MapShell

  User->>Shell: Short right-click empty map
  Shell->>Shell: Open Map Context Menu
```

Expected:

- Map menu opens.

---

## SCS-2: Empty Map Right-Drag

```mermaid
sequenceDiagram
  actor User
  participant Shell as MapShell

  User->>Shell: Right-click and drag
  Shell->>Shell: Start Radius Selection draw
```

Expected:

- Radius draw starts, no map menu flash.

---

## SCS-3: Marker Right-Click

```mermaid
sequenceDiagram
  actor User
  participant Shell as MapShell

  User->>Shell: Right-click marker
  Shell->>Shell: Open Marker Context Menu
```

Expected:

- Marker menu opens, map menu suppressed.

---

## SCS-4: Right-Click Inside Active Radius

```mermaid
sequenceDiagram
  actor User
  participant Shell as MapShell

  User->>Shell: Right-click inside active radius
  Shell->>Shell: Open Radius Context Menu
```

Expected:

- Radius menu opens (project-first actions).

---

## SCS-5: Right-Click Outside Active Radius

```mermaid
sequenceDiagram
  actor User
  participant Shell as MapShell

  User->>Shell: Short right-click outside active radius
  Shell->>Shell: Close radius immediately
```

Expected:

- Radius closes.
- No map menu on same click.

---

## SCS-6: Map Menu Option Set

```mermaid
flowchart TD
  A[Map Context Menu] --> B[Media Marker hier erstellen]
  A --> C[Hierhin zoomen Hausnaehe]
  A --> D[Hierhin zoomen Strassennaehe]
  A --> E[Adresse kopieren]
  A --> F[GPS kopieren]
  A --> G[In Google Maps oeffnen]
```

Expected:

- All selected options are present.

---

## SCS-7: Marker Menu Option Set

```mermaid
flowchart TD
  A[Marker Context Menu] --> B[Details oeffnen single]
  A --> B2[Auswahl oeffnen cluster]
  A --> C[Hierhin zoomen Hausnaehe]
  A --> D[Hierhin zoomen Strassennaehe]
  A --> E[Projekt hinzufuegen]
  A --> F[Adresse kopieren]
  A --> G[GPS kopieren]
  A --> H[In Google Maps oeffnen]
  A --> I[Foto loeschen single only]
```

Expected:

- Single/cluster gating is correct.

---

## SCS-8: Radius Menu Option Set

```mermaid
flowchart TD
  A[Radius Context Menu] --> B[Neues Projekt aus Radius]
  A --> C[Zu Projekt zuweisen]
```

Expected:

- Radius menu keeps both project actions.

---

## Checklist

- [ ] Precedence path is implemented exactly.
- [ ] Map, marker, and radius menus are all documented in one system spec.
- [ ] Radius context menu is explicitly present and not removed.
