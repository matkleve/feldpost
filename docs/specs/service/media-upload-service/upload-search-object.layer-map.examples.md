# Layer package — worked examples

> **Normative parent:** [upload-search-object.layer-map.md](./upload-search-object.layer-map.md)  
> **Tests:** `upload-search-object.layer-map.spec.ts` — one `it('EX-NN: …')` per row.

Columns: **Conflict?** **Tray?** **Result street-level** **Admin (unchanged by tray)** **Notes**

---

## EX-01 — Folder street vs filename street (F9)

| | |
| --- | --- |
| **Path** | `Wien/Bezirk/Kirchengasse 11/IMG_Gumpendorfstraße_7.jpg` |
| **Layers** | `wien/bezirk/kirchengasse 11` → `{ street: Kirchengasse, houseNumber: 11 }`; `__filename__` → `{ street: Gumpendorfstraße, houseNumber: 7 }` |
| **Conflict?** | Y |
| **Tray** | Folder: Kirchengasse 11 · Filename: Gumpendorfstraße 7 |
| **User picks** | `wien/bezirk/kirchengasse 11` |
| **Street-level result** | Kirchengasse / 11 / null |
| **Admin** | city=Wien (from path), country=AT |
| **Photon** | After tray only |

---

## EX-02 — Enrich Tür on folder (no tray)

| | |
| --- | --- |
| **Path** | `Wien/Neustiftgasse 11 Tür 12/IMG_Neustiftgasse_11.jpg` |
| **Layers** | Folder → street Neustiftgasse, house 11, **door** 12; Filename → street Neustiftgasse, house 11 |
| **Conflict?** | N |
| **Tray** | — |
| **Street-level result** | Neustiftgasse / 11 / door 12 (enrich; filename has no door) |
| **Admin** | Wien |

---

## EX-03 — Option A: filename chosen, folder door dropped

| | |
| --- | --- |
| **Path** | `Wien/Neustiftgasse 11 Tür 12/IMG_Thaliastraße_7.jpg` |
| **Conflict?** | Y (street differs) |
| **User picks** | `__filename__` |
| **Street-level result** | Thaliastraße / 7 / null door (folder Tür 12 not carried over — Option A) |
| **Admin** | Wien unchanged |

---

## EX-04 — Admin unchanged when filename package wins

| | |
| --- | --- |
| **Path** | `Wien/Kirchengasse 11/IMG_Gumpendorfstraße_7.jpg` |
| **User picks** | `__filename__` |
| **Street-level** | Gumpendorfstraße / 7 |
| **Admin** | city=Wien (from folder path), **not** overwritten by filename parse |

---

## EX-05 — Floridsdorf multi-segment (which packages compete)

| | |
| --- | --- |
| **Path** | `Wien/Floridsdorf/Thaliastraße/IMG_Neustiftgasse_11.jpg` |
| **Layers** | `wien/floridsdorf` may contribute locality only; `wien/floridsdorf/thaliastraße` vs `__filename__` if both have distinct street-level |
| **Conflict?** | Y only between entries with differing street-level |
| **Tray** | Competing entries with different `street` values only |

---

## EX-06 — Single street-level layer (no tray)

| | |
| --- | --- |
| **Path** | `Wien/Neustiftgasse 34/IMG_1274.jpg` |
| **Layers** | One folder prefix with street+house; filename no street tokens |
| **Conflict?** | N |
| **Tray** | — |
| **Flat SO** | Direct merge → geocode |

---

## EX-07 — Identical packages (merge)

| | |
| --- | --- |
| **Path** | `Wien/Kirchengasse 11/IMG_Kirchengasse_11.jpg` |
| **Layers** | Folder and filename both Kirchengasse / 11 |
| **Conflict?** | N |
| **Result** | Single merged street-level |

---

## EX-08 — Weak IMG filename (no package tray)

| | |
| --- | --- |
| **Path** | `Wien/Neustiftgasse 34/IMG_1274.jpg` |
| **Filename layer** | No street-level tokens from `IMG_1274` |
| **Conflict?** | N |
| **Package tray** | None |
| **Note** | Weak EXIF override remains separate ([upload-manager-pipeline.location-routing.supplement.md](./upload-manager-pipeline.location-routing.supplement.md)); not a layer-package conflict |

---

## EX-09 — Slash top (AT)

| | |
| --- | --- |
| **Path** | `Wien/Neustiftgasse 25/14/IMG_x.jpg` |
| **Parse** | house `25`, door `14` |
| **groupingKey** | Excludes door — same as house 25 only |
| **Photon** | One geocode per building |

See [upload-search-object.unit-parsing.at.md](./upload-search-object.unit-parsing.at.md) AT-U01.

---

## EX-10 — `door` on SO persists to DB

| | |
| --- | --- |
| **SO** | `door: "12"`, `staircase: null` |
| **RPC** | `p_door: "12"` |
| **Dedupe** | `address_dedupe_key` includes door segment |

---

## CITY tray (Phase 2 — spec before code)

See [upload-address-resolution.branch-c-city-tray.md](./upload-address-resolution.branch-c-city-tray.md) for `CITY-*` rows (Photon auto-hit vs folder/EXIF locality).
