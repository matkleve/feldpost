import { Component, computed, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  filterOrganizationSections,
  ORG_PAGE_PERMISSION_KEYS,
} from '../logic/organization-page.helpers';
import { I18nService } from '../../../core/i18n/i18n.service';
import { OrganizationService } from '../../../core/organization/organization.service';
import { RoleService } from '../../../core/roles/roles.service';
import { ToastService } from '../../../core/toast/toast.service';
import type { OrganizationProfile } from '../../../core/organization/organization.types';
import type { OrgPermission, OrgRole } from '../../../core/roles/roles.types';
import { PageGridComponent } from '../../../shared/page-grid';
import { OrganizationSidebarComponent } from '../sidebar/organization-sidebar.component';
import { OrganizationProfileSectionComponent } from '../sections/profile/organization-profile-section.component';
import { OrganizationRolesSectionComponent } from '../sections/roles/organization-roles-section.component';
import { OrganizationBrandingSectionComponent } from '../sections/branding/organization-branding-section.component';
import { OrganizationBillingSectionComponent } from '../sections/billing/organization-billing-section.component';
import { OrganizationIntegrationsSectionComponent } from '../sections/integrations/organization-integrations-section.component';
import { OrganizationExportSectionComponent } from '../sections/export/organization-export-section.component';
import { OrganizationAuditSectionComponent } from '../sections/audit/organization-audit-section.component';
import {
  ORGANIZATION_SECTIONS,
  resolveOrganizationSectionConfig,
  resolveOrganizationSectionFromUrl,
  type OrganizationSectionId,
} from './organization-page.config';

@Component({
  selector: 'app-organization-page',
  standalone: true,
  imports: [
    PageGridComponent,
    OrganizationSidebarComponent,
    OrganizationProfileSectionComponent,
    OrganizationRolesSectionComponent,
    OrganizationBrandingSectionComponent,
    OrganizationBillingSectionComponent,
    OrganizationIntegrationsSectionComponent,
    OrganizationExportSectionComponent,
    OrganizationAuditSectionComponent,
  ],
  templateUrl: './organization-page.component.html',
  styleUrl: './organization-page.component.scss',
  host: {
    class: 'flex min-h-0 min-w-0 flex-1 flex-col',
  },
})
export class OrganizationPageComponent {
  private readonly router = inject(Router);
  private readonly i18nService = inject(I18nService);
  private readonly organizationService = inject(OrganizationService);
  private readonly roleService = inject(RoleService);
  private readonly toastService = inject(ToastService);

  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      startWith(null),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );

  readonly activeSection = computed<OrganizationSectionId>(() =>
    resolveOrganizationSectionFromUrl(this.currentUrl()),
  );

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly profile = signal<OrganizationProfile | null>(null);
  readonly roles = signal<OrgRole[]>([]);
  readonly permissions = signal<OrgPermission[]>([]);
  readonly selectedRoleId = signal<string | null>(null);
  readonly grantedPermissionKeys = signal<ReadonlySet<string>>(new Set());

  readonly visibleSections = computed(() =>
    filterOrganizationSections(ORGANIZATION_SECTIONS, this.grantedPermissionKeys()),
  );

  readonly activeSectionConfig = computed(() =>
    resolveOrganizationSectionConfig(this.activeSection()),
  );

  readonly canEditActiveSection = computed(() => {
    const editKey = this.activeSectionConfig().editPermissionKey;
    if (!editKey) return true;
    return this.grantedPermissionKeys().has(editKey);
  });

  readonly canViewBillingInvoices = computed(() =>
    this.grantedPermissionKeys().has('org.billing.view'),
  );

  readonly selectedRole = computed(() => {
    const roleId = this.selectedRoleId();
    if (!roleId) return null;
    return this.roles().find((role) => role.id === roleId) ?? null;
  });

  readonly rightRailOpen = computed(
    () => this.activeSection() === 'roles' && !!this.selectedRoleId(),
  );

  constructor() {
    void this.refresh();
    effect(() => {
      const visible = this.visibleSections();
      const active = this.activeSection();
      if (this.loading() || visible.length === 0) return;
      if (!visible.some((section) => section.id === active)) {
        void this.router.navigate(['/organization', visible[0].id], { replaceUrl: true });
      }
    });
    if (this.router.url === '/organization' || this.router.url.startsWith('/organization?')) {
      void this.router.navigate(['/organization', 'profile'], { replaceUrl: true });
    }
  }

  async refresh(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);

    const permissionResults = await Promise.all(
      ORG_PAGE_PERMISSION_KEYS.map(async (key) => ({
        key,
        granted: await this.roleService.hasPermission(key),
      })),
    );
    const granted = new Set(
      permissionResults.filter((entry) => entry.granted).map((entry) => entry.key),
    );
    this.grantedPermissionKeys.set(granted);

    const [profileResult, rolesResult, permissionsResult] = await Promise.all([
      this.organizationService.loadProfile(),
      this.roleService.loadRoles(),
      this.roleService.loadPermissions(),
    ]);

    if (profileResult.error || rolesResult.error || permissionsResult.error) {
      this.loadError.set(
        profileResult.error?.message ??
          rolesResult.error?.message ??
          permissionsResult.error?.message ??
          'Could not load organization.',
      );
      this.loading.set(false);
      return;
    }

    this.profile.set(profileResult.data);
    this.roles.set(rolesResult.data);
    this.permissions.set(permissionsResult.data);
    this.loading.set(false);
  }

  onSectionSelected(sectionId: OrganizationSectionId): void {
    void this.router.navigate(['/organization', sectionId]);
  }

  onRoleSelected(roleId: string): void {
    this.selectedRoleId.set(roleId);
  }

  onRolePanelClosed(): void {
    this.selectedRoleId.set(null);
  }

  async onProfileSaved(patch: Partial<OrganizationProfile>): Promise<void> {
    const result = await this.organizationService.updateProfile({
      name: patch.name,
      logoUrl: patch.logoUrl,
      addressLine1: patch.addressLine1,
      addressLine2: patch.addressLine2,
      city: patch.city,
      postalCode: patch.postalCode,
      country: patch.country,
      phone: patch.phone,
      email: patch.email,
      website: patch.website,
      description: patch.description,
      industry: patch.industry,
    });
    if (result.error) {
      this.toastService.show({
        message: result.error.message,
        type: 'error',
      });
      return;
    }
    if (result.data) {
      this.profile.set(result.data);
      this.toastService.show({
        message: this.t('organization.profile.saved', 'Organization profile saved.'),
        type: 'success',
      });
    }
  }

  async onRolesChanged(): Promise<void> {
    const result = await this.roleService.loadRoles();
    if (!result.error) {
      this.roles.set(result.data);
    }
  }
}
