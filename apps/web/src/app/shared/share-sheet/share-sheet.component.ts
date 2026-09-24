import { Component, ElementRef, HostListener, computed, inject, signal, type OnInit } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { MemberService } from '../../core/members/members.service';
import type { OrgMember } from '../../core/members/members.types';
import { WorkspaceBulkActionService } from '../workspace-pane/workspace-bulk-action.service';

const FACE_ROW_LIMIT = 6;

/**
 * Desktop handoff. People band, then methods. The phone does not mount this.
 * @see docs/specs/component/workspace/share-sheet.md
 */
@Component({
  selector: 'app-share-sheet',
  standalone: true,
  templateUrl: './share-sheet.component.html',
  styleUrl: './share-sheet.component.scss',
})
export class ShareSheetComponent implements OnInit {
  private readonly members = inject(MemberService);
  private readonly auth = inject(AuthService);
  private readonly bulk = inject(WorkspaceBulkActionService);
  private readonly i18n = inject(I18nService);
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly t = (key: string, fallback = ''): string => this.i18n.t(key, fallback);
  private readonly allMembers = signal<OrgMember[]>([]);
  readonly query = signal('');
  readonly searchOpen = signal(false);
  readonly hasSystemShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  readonly faces = computed(() => this.eligible().slice(0, FACE_ROW_LIMIT));
  readonly searchHits = computed(() => {
    const q = this.query().trim().toLowerCase();
    const people = this.eligible();
    if (!q) return people;
    return people.filter((person) => person.fullName.toLowerCase().includes(q));
  });

  @HostListener('document:keydown.escape')
  closeSearchOnEscape(): void {
    this.searchOpen.set(false);
  }

  @HostListener('document:pointerdown', ['$event'])
  closeSearchOnOutside(event: PointerEvent): void {
    if (!this.searchOpen()) return;
    const target = event.target;
    if (target instanceof Node && this.host.nativeElement.contains(target)) return;
    this.searchOpen.set(false);
  }

  async ngOnInit(): Promise<void> {
    const result = await this.members.loadMembers();
    this.allMembers.set(result.data);
  }

  initials(person: OrgMember): string {
    const parts = person.fullName.trim().split(/\s+/).filter(Boolean);
    return (parts[0]?.[0] ?? '?').toUpperCase() + (parts[1]?.[0] ?? '').toUpperCase();
  }

  async shareWith(person: OrgMember): Promise<void> {
    this.searchOpen.set(false);
    await this.bulk.createShareLinkWithAudience(false, {
      audience: 'named',
      shareGrant: 'view',
      recipientUserIds: [person.id],
    });
  }

  async copyLink(): Promise<void> {
    await this.publicLink(true);
  }

  async email(): Promise<void> {
    const url = await this.publicLink(false);
    if (!url) return;
    window.location.href = `mailto:?body=${encodeURIComponent(url)}`;
  }

  async whatsapp(): Promise<void> {
    const url = await this.publicLink(false);
    if (!url) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(url)}`, '_blank', 'noopener');
  }

  async openSystemShare(): Promise<void> {
    const url = await this.publicLink(false);
    if (!url || !navigator.share) return;
    try {
      await navigator.share({ url });
    } catch {
      // The person closed the system sheet.
    }
  }

  private eligible(): OrgMember[] {
    const self = this.auth.user()?.id;
    return this.allMembers().filter((person) => person.id !== self && !person.suspendedAt);
  }

  private publicLink(copy: boolean): Promise<string | null> {
    return this.bulk.createShareLinkWithAudience(copy, {
      audience: 'public',
      shareGrant: 'view',
      recipientUserIds: [],
    });
  }
}
