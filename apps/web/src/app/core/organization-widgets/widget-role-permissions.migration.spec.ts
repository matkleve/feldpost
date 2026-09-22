import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import {
  WIDGET_CATALOG_IDS,
  WIDGET_PERMISSION_ACTIONS,
  widgetPermissionKey,
} from '../widgets/widgets.helpers';

/**
 * Contract for widget role keys. Fails until the migration file exists.
 * @see docs/specs/system/widget-grants.md
 */
const MIGRATION = path.join(
  __dirname,
  '../../../../../../supabase/migrations/20260922130000_widget_role_permissions.sql',
);

describe('widget role permission migration', () => {
  it('inserts widget.<id>.open|view|create|edit|delete and no audience table', () => {
    const sql = fs.readFileSync(MIGRATION, 'utf8');
    for (const id of WIDGET_CATALOG_IDS) {
      for (const action of WIDGET_PERMISSION_ACTIONS) {
        expect(sql).toContain(`'${widgetPermissionKey(id, action)}'`);
      }
    }
    expect(sql).toMatch(/org_role_permissions/i);
    expect(sql).toMatch(/r\.name = 'admin'/);
    expect(sql).not.toMatch(/create table/i);
  });
});
