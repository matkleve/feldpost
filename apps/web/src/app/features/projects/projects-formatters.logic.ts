import type { ProjectColorKey, ProjectListItem } from '../../core/projects/projects.types';
import type { PendingProjectAction } from './projects-page.config';

export function pendingActionTitle(
  action: PendingProjectAction,
  t: (key: string, fallback?: string) => string,
): string {
  if (action === 'delete') {
    return t('projects.page.pending.title.deleteArchived', 'Delete archived project?');
  }

  if (action === 'restore') {
    return t('projects.page.pending.title.restore', 'Restore project?');
  }

  return t('projects.page.pending.title.archive', 'Archive project?');
}

export function pendingActionMessage(
  action: PendingProjectAction,
  name: string,
  t: (key: string, fallback?: string) => string,
): string {
  if (action === 'delete') {
    return t(
      'projects.page.pending.message.delete',
      '"{name}" will be permanently deleted for your organization.',
    ).replace('{name}', name);
  }

  if (action === 'restore') {
    return t('projects.page.pending.message.restore', '"{name}" will move back to Active.').replace(
      '{name}',
      name,
    );
  }

  return t('projects.page.pending.message.archive', '"{name}" will move to Archived.').replace(
    '{name}',
    name,
  );
}

export function pendingActionConfirmLabel(
  action: PendingProjectAction,
  t: (key: string, fallback?: string) => string,
): string {
  if (action === 'delete') {
    return t('projects.page.pending.confirm.delete', 'Delete now');
  }

  if (action === 'restore') {
    return t('projects.page.pending.confirm.restore', 'Restore');
  }

  return t('projects.page.pending.confirm.archive', 'Archive');
}

export function colorTokenFor(key: ProjectColorKey): string {
  const brandHueMatch = key.match(/^brand-hue-(\d{1,3})$/);
  if (brandHueMatch) {
    const hue = Number.parseInt(brandHueMatch[1], 10);
    if (Number.isFinite(hue)) {
      return `hsl(${hue} 58% 52%)`;
    }
  }
  if (key === 'accent') return 'var(--color-accent)';
  if (key === 'success') return 'var(--color-success)';
  if (key === 'warning') return 'var(--color-warning)';
  return 'var(--color-clay)';
}

export function formatRelativeDate(
  value: string | null,
  t: (key: string, fallback?: string) => string,
): string {
  if (!value) {
    return t('projects.page.relative.noActivity', 'No activity');
  }
  const deltaMs = Date.now() - new Date(value).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const days = Math.floor(deltaMs / dayMs);
  if (days <= 0) return t('projects.page.relative.today', 'Today');
  if (days === 1) return t('projects.page.relative.yesterday', 'Yesterday');
  if (days < 30) {
    return t('projects.page.relative.daysAgo', '{count} days ago').replace('{count}', String(days));
  }

  const months = Math.floor(days / 30);
  if (months < 12) {
    return t(
      months === 1
        ? 'projects.page.relative.monthAgo.single'
        : 'projects.page.relative.monthAgo.multi',
      months === 1 ? '1 month ago' : '{count} months ago',
    ).replace('{count}', String(months));
  }

  const years = Math.floor(months / 12);
  return t(
    years === 1 ? 'projects.page.relative.yearAgo.single' : 'projects.page.relative.yearAgo.multi',
    years === 1 ? '1 year ago' : '{count} years ago',
  ).replace('{count}', String(years));
}

export function projectStatusLabel(
  status: ProjectListItem['status'],
  t: (key: string, fallback?: string) => string,
): string {
  return status === 'archived'
    ? t('projects.toolbar.status.archived', 'Archived')
    : t('projects.toolbar.status.active', 'Active');
}

export function projectLabel(
  id: string,
  fallback: string,
  t: (key: string, fallback?: string) => string,
): string {
  const map: Record<string, string> = {
    name: 'projects.toolbar.option.name',
    status: 'projects.toolbar.option.status',
    district: 'projects.toolbar.option.primaryDistrict',
    city: 'projects.toolbar.option.primaryCity',
    'color-key': 'projects.toolbar.option.color',
    'image-count': 'projects.toolbar.option.imageCount',
    'updated-at': 'projects.toolbar.option.updated',
    'last-activity': 'projects.toolbar.option.lastActivity',
  };
  return t(map[id] ?? '', fallback) || fallback;
}
