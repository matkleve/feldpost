---
id: STUDY-017
type: proposal
status: proposed
supersedes: none
corrected-by: none
---

# Role grants for widgets and their data

**Written:** 2026-09-22. **On:** `cursor/grid-shell-preview-c5a8`. **How:** read `org_permissions` in `supabase/migrations/20260615180000_org_roles_colleagues_chat.sql`, [authorization-model.md](../specs/system/authorization-model.md), [roles-service.md](../specs/service/roles/roles-service.md), and the organization roles section. The owner described the grant the same day; the sentence stopped at "and".

This study is not permission to implement. It does not name a migration. [STUDY-016](016-widgets-page-flow.md) still owns the directory flow.

## What already exists

- `org_roles` is one row per role per organization. Custom roles can be created. A role with `is_system` cannot be deleted `[A]` (`docs/specs/service/roles/roles-service.md`).
- `org_permissions` is a global catalog. The inserted keys are project, media, member, organization, map, invite, and chat actions. None of them name a widget `[A]` (migration `20260615180000_org_roles_colleagues_chat.sql`, the `insert into public.org_permissions` block).
- `org_role_permissions` assigns those keys to a role. The Admin role is seeded with every key. `org.roles.manage` is the key for editing roles `[A]` (same migration).
- The roles section at `/organization/roles` lists the catalog and saves the checked set through `RoleService.updateRolePermissions` `[A]` (`organization-roles-section.component.ts`).
- Authorization is RLS plus `has_permission(key)`. A second client-side grant engine is forbidden `[A]` (`docs/specs/system/authorization-model.md`).

So a custom role can already receive `org.roles.manage` `[C]`: the catalog contains the key, and the roles section saves an arbitrary subset of that catalog. That is the transferable admin grant that exists today. It does not cover widgets or their records `[A]`.

## What the owner added

The grant for widgets is the organization role, and that role is customized along two axes `[D]`:

1. **Allowed widgets.** Which installed widgets this role may open.
2. **Allowed data.** Which records inside those widgets this role may use.

A widget the role may not open is absent from that person's rail, the same way an uninstalled widget is absent for everyone `[D]`. Installing a widget on the directory makes it available to the organization. The role decides who may use it `[D]`.

"Transferable admin" is read as: a person who holds `org.roles.manage`, or the Admin role, can give another role the same kind of grant, including `org.roles.manage` itself `[D]`. It is not a new ownership-transfer action. If the owner meant a separate "hand the organization to another user" action, this reading is wrong.

## GPS and media suite

A suite widget is a set of records. Each record has one place, a point or an area, and any number of media items. The map draws the place. The widget page lists the records. Media stays on `media_items`. The widget does not get its own photo store `[D]`.

Mitarbeiter and Organisation stay the widgets named in STUDY-015. This suite does not fold them into that record shape `[D]`.

| Widget | English | German the owner used | Place on the map |
| --- | --- | --- | --- |
| Vehicles | Vehicles | — | where the vehicle is |
| Boats | Boats | — | where the boat is |
| Material | Material | — | where a stock of material sits |
| Storage locations | Storage locations | Lagerorte | a yard, warehouse, container, or room |
| Buildings | Buildings | Gebäude | the building, as a point or a footprint |

The owner asked for one further widget in the same shape. The proposal is **Equipment**: machines that are not vehicles or boats, such as an excavator, a crane, or a generator `[D]`. Map, projects, and media stay fixed rail entries. This study does not say they can be removed `[D]`.

## What this study does not decide

| Id | Question | Why it blocks |
| --- | --- | --- |
| R1 | New keys in `org_permissions`, or a separate grant table? | The recommendation is new keys, because the authorization model forbids a second engine `[D]`. The key shape is not chosen. |
| R2 | Is allowed data the whole organization, or a narrower set? | The owner said "data" and did not name the cut. |
| R3 | Are the five English names, and Equipment, the catalog? | They are a proposal. W2 in STUDY-016 stays open until the owner accepts a list. |
| R4 | What followed the word "and"? | The message ended there. It is not in this study. |

## Update 2026-09-22

The owner later leaned that map, projects, and media can leave the rail, and asked for that to be studied `[D]`. The sentence above that calls them fixed stays. The placement study is [STUDY-018](018-rail-placement.md).

## What would settle this

One owner sentence: the organization installs a widget, and a role then allows that widget and its data. A second sentence: the English names above, with Equipment in or out. Until both exist, no migration and no route.
