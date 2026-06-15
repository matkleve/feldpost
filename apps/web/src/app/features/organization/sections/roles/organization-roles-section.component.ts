import { KeyValuePipe } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { RoleService } from '../../../../core/roles/roles.service';
import { groupPermissionsByCategory } from '../../../../core/roles/roles.helpers';
import type { OrgPermission, OrgRole } from '../../../../core/roles/roles.types';
import { HLM_BUTTON_IMPORTS } from '../../../../shared/ui/button';
import { HLM_FORM_FIELD_IMPORTS } from '../../../../shared/ui/form-field';
import { HLM_INPUT_IMPORTS } from '../../../../shared/ui/input';
import { HLM_LABEL_IMPORTS } from '../../../../shared/ui/label';

@Component({
  selector: 'app-organization-roles-section',
  standalone: true,
  imports: [KeyValuePipe, FormsModule, ...HLM_BUTTON_IMPORTS, ...HLM_FORM_FIELD_IMPORTS, ...HLM_INPUT_IMPORTS, ...HLM_LABEL_IMPORTS],
  templateUrl: './organization-roles-section.component.html',
  styleUrl: './organization-roles-section.component.scss',
})
export class OrganizationRolesSectionComponent {
  private readonly i18nService = inject(I18nService);
  private readonly roleService = inject(RoleService);

  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly roles = input<OrgRole[]>([]);
  readonly permissions = input<OrgPermission[]>([]);
  readonly selectedRoleId = input<string | null>(null);

  readonly roleSelected = output<string>();
  readonly rolesChanged = output<void>();

  readonly newRoleName = signal('');
  readonly newRoleDisplayName = signal('');
  readonly newRoleLevel = signal(30);
  readonly assignedPermissionIds = signal<Set<string>>(new Set());
  readonly saving = signal(false);

  readonly groupedPermissions = computed(() =>
    groupPermissionsByCategory(this.permissions()),
  );

  readonly activeRole = computed(() => {
    const roleId = this.selectedRoleId();
    if (!roleId) return null;
    return this.roles().find((role) => role.id === roleId) ?? null;
  });

  constructor() {
    effect(() => {
      const roleId = this.selectedRoleId();
      if (!roleId) {
        this.assignedPermissionIds.set(new Set());
        return;
      }
      void this.loadRolePermissions(roleId);
    });
  }

  private async loadRolePermissions(roleId: string): Promise<void> {
    const result = await this.roleService.loadRolePermissionIds(roleId);
    if (!result.error) {
      this.assignedPermissionIds.set(new Set(result.data));
    }
  }

  onRoleClick(roleId: string): void {
    this.roleSelected.emit(roleId);
  }

  isPermissionChecked(permissionId: string): boolean {
    return this.assignedPermissionIds().has(permissionId);
  }

  onPermissionToggle(permissionId: string, checked: boolean): void {
    this.assignedPermissionIds.update((set) => {
      const next = new Set(set);
      if (checked) next.add(permissionId);
      else next.delete(permissionId);
      return next;
    });
  }

  async onSavePermissions(): Promise<void> {
    const role = this.activeRole();
    if (!role) return;
    this.saving.set(true);
    await this.roleService.updateRolePermissions(role.id, [...this.assignedPermissionIds()]);
    this.saving.set(false);
    this.rolesChanged.emit();
  }

  async onCreateRole(): Promise<void> {
    const name = this.newRoleName().trim().toLowerCase().replace(/\s+/g, '_');
    const displayName = this.newRoleDisplayName().trim();
    if (!name || !displayName) return;

    this.saving.set(true);
    const result = await this.roleService.createRole({
      name,
      displayName,
      level: this.newRoleLevel(),
    });
    this.saving.set(false);

    if (result.data) {
      this.newRoleName.set('');
      this.newRoleDisplayName.set('');
      this.rolesChanged.emit();
      this.roleSelected.emit(result.data.id);
    }
  }

  async onDeleteRole(role: OrgRole): Promise<void> {
    if (role.isSystem) return;
    this.saving.set(true);
    await this.roleService.deleteRole(role.id);
    this.saving.set(false);
    this.rolesChanged.emit();
  }
}
