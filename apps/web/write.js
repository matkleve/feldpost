const fs = require('fs');
const css = \:host {
  display: contents;
}

.upload-panel__file-item {
  display: flex;
  align-items: center;
  padding: var(--spacing-2) var(--spacing-3);
  margin: 0;
  border-bottom: 1px solid color-mix(in srgb, var(--color-border) 60%, transparent);
  background: transparent;
  transition: background 150ms ease-out, border-radius 150ms ease-out;
}

.upload-panel__file-item:last-child {
  border-bottom: none;
}

.upload-panel__file-item:hover {
  background: color-mix(in srgb, var(--color-primary) 3%, transparent);
  border-radius: var(--radius-md);
}

.upload-panel__file-main {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  flex: 1;
  min-width: 0; 
}

.upload-panel__file-main--interactive {
  cursor: pointer;
}

.upload-panel__file-main--interactive:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
  border-radius: var(--radius-md);
}

.upload-panel__thumbnail {
  width: 2.75rem;
  height: 2.75rem;
  flex-shrink: 0;
  object-fit: cover;
  border-radius: var(--radius-sm);
  display: block;
  background: color-mix(in srgb, var(--color-bg-base) 90%, var(--color-border));
  position: relative;
  overflow: hidden;
}

.upload-panel__thumbnail--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-disabled);
  border: 1px solid color-mix(in srgb, var(--color-border) 72%, transparent);
}

.upload-panel__thumbnail--placeholder .material-icons {
  font-size: var(--font-size-lg);
}

.upload-panel__thumbnail--skeleton {
  background: color-mix(in srgb, var(--color-bg-base) 80%, var(--color-border));
  animation: map-photo-marker-placeholder-pulse 1400ms ease-in-out infinite;
}

.upload-panel__thumbnail--uploading {
  animation: map-photo-marker-placeholder-pulse 1400ms ease-in-out infinite;
}

@keyframes map-photo-marker-placeholder-pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

.upload-panel__thumbnail-fallback {
  font-size: var(--font-size-2xs);
  line-height: var(--line-height-solid);
  font-weight: var(--font-weight-bold);
  letter-spacing: 0.03em;
  color: var(--color-text-secondary);
}

.upload-panel__file-meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.upload-panel__file-name {
  margin: 0;
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.upload-panel__status-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  min-width: 0;
}

.upload-panel__file-status {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  line-height: var(--line-height-tight);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.upload-panel__file-status--awaiting_placement,
.upload-panel__file-status--error {
  color: var(--color-warning);
}

.upload-panel__file-status--complete {
  color: var(--color-success);
}

.upload-panel__success-indicator {
  font-size: 1rem;
  vertical-align: middle;
}

.upload-panel__placement-action {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 var(--spacing-1);
  min-height: unset;
  height: 1.5rem;
  border-radius: var(--radius-sm);
  color: color-mix(in srgb, var(--color-warning) 80%, var(--color-text-primary)); 
  font-size: var(--font-size-xs);
  font-weight: 500;
  background: transparent;
  flex-shrink: 0;
  border: none;
  cursor: pointer;
}

.upload-panel__placement-action:hover {
  background: color-mix(in srgb, var(--color-warning) 10%, transparent);
}

.upload-panel__placement-action .material-icons {
  font-size: 16px;
}

.upload-panel__placement-label {
  line-height: 1;
}

@media (max-width: 480px) {
  .upload-panel__placement-label {
    display: none;
  }
}

.upload-panel__row-action {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  background: none;
  border: none;
  border-radius: var(--radius-full);
  cursor: pointer;
  color: var(--color-text-secondary);
  opacity: 0.4;
  transition: opacity 150ms ease-out, background 150ms ease-out;
  flex-shrink: 0;
}

.upload-panel__row-action:hover:not(:disabled) {
  opacity: 1;
  background: color-mix(in srgb, var(--color-border) 70%, transparent);
  color: var(--color-text-primary);
}

.upload-panel__row-action:focus-visible {
  outline: 2px solid var(--color-primary);
}

.upload-panel__row-action .material-icons {
  font-size: 20px;
}
\;
fs.writeFileSync('src/app/features/upload/upload-panel-item.component.scss', css, 'utf8');
