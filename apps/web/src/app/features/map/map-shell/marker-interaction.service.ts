import { Injectable } from '@angular/core';
import * as L from 'leaflet';

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
}
