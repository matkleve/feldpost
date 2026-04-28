import { Injectable } from '@angular/core';
import type * as L from 'leaflet';

@Injectable({ providedIn: 'root' })
export class MarkerInteractionService {
  bindClick(marker: L.Marker, onClick: (event: L.LeafletMouseEvent) => void): void {
    marker.off('click');
    marker.on('click', onClick);
  }

  bindContextMenu(
    marker: L.Marker,
    handlers: {
      shouldBypass: () => boolean;
      onSecondaryReset: () => void;
      onOpen: (event: MouseEvent) => void;
    },
  ): void {
    marker.off('contextmenu');
    marker.off('mousedown');

    marker.on('mousedown', (event: L.LeafletMouseEvent) => {
      if (event.originalEvent.button !== 2) return;
      event.originalEvent.preventDefault();
      event.originalEvent.stopPropagation();
      handlers.onSecondaryReset();
    });

    marker.on('contextmenu', (event: L.LeafletMouseEvent) => {
      if (handlers.shouldBypass()) {
        return;
      }

      event.originalEvent.preventDefault();
      event.originalEvent.stopPropagation();
      handlers.onSecondaryReset();
      handlers.onOpen(event.originalEvent);
    });
  }

  bindHover(marker: L.Marker, handlers: { onEnter: () => void; onLeave: () => void }): void {
    marker.off('mouseover');
    marker.off('mouseout');
    marker.on('mouseover', handlers.onEnter);
    marker.on('mouseout', handlers.onLeave);
  }

  attachLongPress(
    element: HTMLElement,
    longPressMs: number,
    onLongPress: (event: PointerEvent) => void,
  ): void {
    let longPressTimer: ReturnType<typeof setTimeout> | null = null;

    element.addEventListener(
      'pointerdown',
      (event: PointerEvent) => {
        if (event.pointerType && event.pointerType !== 'touch') {
          return;
        }
        longPressTimer = setTimeout(() => {
          onLongPress(event);
        }, longPressMs);
      },
      { passive: true },
    );

    const cancelLongPress = () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    };

    element.addEventListener('pointerup', cancelLongPress, { passive: true });
    element.addEventListener('pointercancel', cancelLongPress, { passive: true });
    element.addEventListener('pointermove', cancelLongPress, { passive: true });
    element.addEventListener('click', cancelLongPress);
  }

  triggerFadeIn(element: HTMLElement, durationMs: number): void {
    element.classList.remove('map-photo-marker-wrapper--fade-in');
    element.classList.add('map-photo-marker-wrapper--fade-prep');

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (!element.isConnected) return;
        element.classList.add('map-photo-marker-wrapper--fade-in');
        element.classList.remove('map-photo-marker-wrapper--fade-prep');
      });
    });

    window.setTimeout(() => {
      if (element.isConnected) {
        element.classList.remove('map-photo-marker-wrapper--fade-in');
      }
    }, durationMs);
  }
}
