import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { I18nService } from '../../../core/i18n/i18n.service';
import { SupabaseService } from '../../../core/supabase/supabase.service';

interface ReceivedProject {
  project_id: string;
  name: string;
  mode: string;
}

interface SentProject {
  project_id: string;
  name: string;
  recipient_count: number;
}

@Component({
  selector: 'app-project-receive',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section>
      <h1>{{ t('project.receive.title', 'Project link') }}</h1>
      <label>
        {{ t('project.receive.token', 'Share token') }}
        <input [(ngModel)]="token" name="token" />
      </label>
      <button type="button" (click)="receive('copy')">{{ t('project.receive.copy', 'Add to my projects') }}</button>
      <button type="button" (click)="receive('shared')">{{ t('project.receive.shared', 'Keep as shared') }}</button>
      @if (result()) {
        <p>{{ result() }}</p>
      }

      <h2>{{ t('project.receive.mine', 'I am sharing') }}</h2>
      <label>
        {{ t('project.receive.projectId', 'Project id') }}
        <input [(ngModel)]="ownedProjectId" name="ownedProjectId" />
      </label>
      <button type="button" (click)="createLink()">{{ t('project.receive.create', 'Create link') }}</button>
      @if (createdToken()) {
        <p>{{ createdToken() }}</p>
      }
      <ul>
        @for (project of sent(); track project.project_id) {
          <li>{{ project.name }} ({{ project.recipient_count }})</li>
        }
      </ul>

      <h2>{{ t('project.receive.sharedWithMe', 'Shared with me') }}</h2>
      <ul>
        @for (project of received(); track project.project_id) {
          <li>{{ project.name }}</li>
        }
      </ul>
    </section>
  `,
})
export class ProjectReceiveComponent {
  private readonly supabase = inject(SupabaseService);
  private readonly i18n = inject(I18nService);
  private readonly route = inject(ActivatedRoute);
  readonly t = this.i18n.t.bind(this.i18n);
  token = '';
  ownedProjectId = '';
  readonly result = signal<string | null>(null);
  readonly createdToken = signal<string | null>(null);
  readonly received = signal<ReceivedProject[]>([]);
  readonly sent = signal<SentProject[]>([]);

  constructor() {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    void this.refresh();
  }

  async refresh(): Promise<void> {
    const [receivedResult, sentResult] = await Promise.all([
      this.supabase.client.rpc('list_received_projects'),
      this.supabase.client.rpc('list_sent_project_shares'),
    ]);
    this.received.set((receivedResult.data ?? []) as ReceivedProject[]);
    this.sent.set((sentResult.data ?? []) as SentProject[]);
  }

  async receive(mode: 'copy' | 'shared'): Promise<void> {
    const { data, error } = await this.supabase.client.rpc('receive_project_link', {
      p_token: this.token.trim(),
      p_mode: mode,
    });
    this.result.set(error ? error.message : String(data));
    if (!error) {
      await this.refresh();
    }
  }

  async createLink(): Promise<void> {
    const { data, error } = await this.supabase.client.rpc('create_project_share_link', {
      p_project_id: this.ownedProjectId.trim(),
    });
    this.createdToken.set(error ? error.message : String(data));
    if (!error) {
      await this.refresh();
    }
  }
}
