import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { I18nService } from '../../../core/i18n/i18n.service';
import { SupabaseService } from '../../../core/supabase/supabase.service';

@Component({
  selector: 'app-project-receive',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section>
      <h1>{{ t('project.receive.title', 'Project link') }}</h1>
      <label>
        {{ t('project.receive.id', 'Project id') }}
        <input [(ngModel)]="projectId" name="projectId" />
      </label>
      <button type="button" (click)="receive('copy')">{{ t('project.receive.copy', 'Add to my projects') }}</button>
      <button type="button" (click)="receive('shared')">{{ t('project.receive.shared', 'Keep as shared') }}</button>
      @if (result()) {
        <p>{{ result() }}</p>
      }
    </section>
  `,
})
export class ProjectReceiveComponent {
  private readonly supabase = inject(SupabaseService);
  private readonly i18n = inject(I18nService);
  private readonly route = inject(ActivatedRoute);
  readonly t = this.i18n.t.bind(this.i18n);
  projectId = '';
  readonly result = signal<string | null>(null);

  constructor() {
    this.projectId = this.route.snapshot.queryParamMap.get('project') ?? '';
  }

  async receive(mode: 'copy' | 'shared'): Promise<void> {
    const { data, error } = await this.supabase.client.rpc('receive_project', {
      p_project_id: this.projectId.trim(),
      p_mode: mode,
    });
    this.result.set(error ? error.message : String(data));
  }
}
