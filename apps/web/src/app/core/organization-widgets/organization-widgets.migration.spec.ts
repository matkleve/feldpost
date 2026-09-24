import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';

/**
 * Contract for organization_widgets. Fails until the migration file exists.
 * Cross-org deny is scripts/validate-organization-widgets-rls.sql on a live database.
 * @see docs/specs/service/organization-widgets/organization-widgets.md
 */
const MIGRATION = path.join(
  __dirname,
  '../../../../../../supabase/migrations/20260922120000_organization_widgets.sql',
);

describe('organization_widgets migration', () => {
  it('stores organization_id and widget_id, scoped by user_org_id()', () => {
    const sql = fs.readFileSync(MIGRATION, 'utf8');
    expect(sql).toMatch(/create table public\.organization_widgets/i);
    expect(sql).toMatch(/primary key \(organization_id, widget_id\)/i);
    expect(sql).not.toMatch(/user_id/i);
    expect(sql).toMatch(/enable row level security/i);
    expect(sql).toMatch(/organization_id = \(select public\.user_org_id\(\)\)/);
    expect(sql).toMatch(/for select/i);
    expect(sql).toMatch(/for insert/i);
    expect(sql).toMatch(/for delete/i);
    const allowList = sql.match(/organization_widgets_widget_id_check[\s\S]*?\)/)?.[0] ?? '';
    for (const id of ['workers', 'organisation', 'vehicles', 'boats', 'material', 'storage-locations', 'buildings']) {
      expect(allowList).toContain(`'${id}'`);
    }
    expect(allowList).not.toContain("'map'");
    expect(allowList).not.toContain("'projects'");
    expect(allowList).not.toContain("'media'");
  });
});
