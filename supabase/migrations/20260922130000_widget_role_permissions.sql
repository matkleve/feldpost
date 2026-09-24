-- Widget role keys on the existing org_permissions catalog.
-- has_permission remains the check. No second grant table.
-- Existing admin roles receive every new key. Other roles stay without them until the roles screen saves a grant.
-- New organizations already grant admin every org_permissions row inside seed_org_default_roles.
-- @see docs/specs/system/widget-grants.md

insert into public.org_permissions (key, description, category) values
  ('widget.map.open', 'Open the Map widget', 'Widgets'),
  ('widget.map.view', 'View Map records', 'Widgets'),
  ('widget.map.create', 'Create Map records', 'Widgets'),
  ('widget.map.edit', 'Edit Map records', 'Widgets'),
  ('widget.map.delete', 'Delete Map records', 'Widgets'),
  ('widget.projects.open', 'Open the Projects widget', 'Widgets'),
  ('widget.projects.view', 'View Projects records', 'Widgets'),
  ('widget.projects.create', 'Create Projects records', 'Widgets'),
  ('widget.projects.edit', 'Edit Projects records', 'Widgets'),
  ('widget.projects.delete', 'Delete Projects records', 'Widgets'),
  ('widget.media.open', 'Open the Media widget', 'Widgets'),
  ('widget.media.view', 'View Media records', 'Widgets'),
  ('widget.media.create', 'Create Media records', 'Widgets'),
  ('widget.media.edit', 'Edit Media records', 'Widgets'),
  ('widget.media.delete', 'Delete Media records', 'Widgets'),
  ('widget.workers.open', 'Open the Workers widget', 'Widgets'),
  ('widget.workers.view', 'View Workers records', 'Widgets'),
  ('widget.workers.create', 'Create Workers records', 'Widgets'),
  ('widget.workers.edit', 'Edit Workers records', 'Widgets'),
  ('widget.workers.delete', 'Delete Workers records', 'Widgets'),
  ('widget.organisation.open', 'Open the Organisation widget', 'Widgets'),
  ('widget.organisation.view', 'View Organisation records', 'Widgets'),
  ('widget.organisation.create', 'Create Organisation records', 'Widgets'),
  ('widget.organisation.edit', 'Edit Organisation records', 'Widgets'),
  ('widget.organisation.delete', 'Delete Organisation records', 'Widgets'),
  ('widget.vehicles.open', 'Open the Vehicles widget', 'Widgets'),
  ('widget.vehicles.view', 'View Vehicles records', 'Widgets'),
  ('widget.vehicles.create', 'Create Vehicles records', 'Widgets'),
  ('widget.vehicles.edit', 'Edit Vehicles records', 'Widgets'),
  ('widget.vehicles.delete', 'Delete Vehicles records', 'Widgets'),
  ('widget.boats.open', 'Open the Boats widget', 'Widgets'),
  ('widget.boats.view', 'View Boats records', 'Widgets'),
  ('widget.boats.create', 'Create Boats records', 'Widgets'),
  ('widget.boats.edit', 'Edit Boats records', 'Widgets'),
  ('widget.boats.delete', 'Delete Boats records', 'Widgets'),
  ('widget.material.open', 'Open the Material widget', 'Widgets'),
  ('widget.material.view', 'View Material records', 'Widgets'),
  ('widget.material.create', 'Create Material records', 'Widgets'),
  ('widget.material.edit', 'Edit Material records', 'Widgets'),
  ('widget.material.delete', 'Delete Material records', 'Widgets'),
  ('widget.storage-locations.open', 'Open the Storage locations widget', 'Widgets'),
  ('widget.storage-locations.view', 'View Storage locations records', 'Widgets'),
  ('widget.storage-locations.create', 'Create Storage locations records', 'Widgets'),
  ('widget.storage-locations.edit', 'Edit Storage locations records', 'Widgets'),
  ('widget.storage-locations.delete', 'Delete Storage locations records', 'Widgets'),
  ('widget.buildings.open', 'Open the Buildings widget', 'Widgets'),
  ('widget.buildings.view', 'View Buildings records', 'Widgets'),
  ('widget.buildings.create', 'Create Buildings records', 'Widgets'),
  ('widget.buildings.edit', 'Edit Buildings records', 'Widgets'),
  ('widget.buildings.delete', 'Delete Buildings records', 'Widgets')
on conflict (key) do nothing;

insert into public.org_role_permissions (role_id, permission_id)
select r.id, p.id
from public.org_roles r
join public.org_permissions p on p.key like 'widget.%'
where r.name = 'admin'
on conflict do nothing;
