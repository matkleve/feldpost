import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../../core/i18n/i18n.service';
import { MemberService } from '../../../core/members/members.service';
import type { OrgMember } from '../../../core/members/members.types';
import type { OrgRole } from '../../../core/roles/roles.types';
import { canAssignRole } from '../../../core/roles/roles.helpers';
import { HLM_BUTTON_IMPORTS } from '../../../shared/ui/button';
import { HLM_SELECT_IMPORTS } from '../../../shared/ui/select';

@Component({
  selector: 'app-member-detail-panel',
  standalone: true,
  imports: [DatePipe, FormsModule, ...HLM_BUTTON_IMPORTS, ...HLM_SELECT_IMPORTS],
  templateUrl: './member-detail-panel.component.html',
  styleUrl: './member-detail-panel.component.scss',
})
export class MemberDetailPanelComponent {
  private readonly i18nService = inject(I18nService);
  private readonly memberService = inject(MemberService);

  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly member = input.required<OrgMember>();
  readonly roles = input<OrgRole[]>([]);
  readonly ownRoleLevel = input(0);

  readonly closed = output<void>();
  readonly messageRequested = output<string>();
  readonly memberUpdated = output<void>();

  readonly assignableRoles = computed(() =>
    this.roles().filter((role) => canAssignRole(this.ownRoleLevel(), role.level)),
  );

  readonly canManage = computed(
    () => !this.memberService.isSelf(this.member().id) && this.ownRoleLevel() > this.member().roleLevel,
  );

  async onRoleChange(roleId: string): Promise<void> {
    await this.memberService.assignRole(this.member().id, roleId);
    this.memberUpdated.emit();
  }

  async onSuspendToggle(): Promise<void> {
    const member = this.member();
    if (member.suspendedAt) {
      await this.memberService.unsuspendMember(member.id);
    } else {
      await this.memberService.suspendMember(member.id);
    }
    this.memberUpdated.emit();
  }

  async onRemove(): Promise<void> {
    if (!confirm(this.t('colleagues.member.remove_confirm', 'Remove this colleague from the organization?'))) {
      return;
    }
    await this.memberService.removeMember(this.member().id);
    this.memberUpdated.emit();
    this.closed.emit();
  }

  onMessage(): void {
    this.messageRequested.emit(this.member().id);
  }
}
