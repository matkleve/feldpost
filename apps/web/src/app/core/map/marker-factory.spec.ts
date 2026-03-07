import {
    buildPhotoMarkerHtml,
    PHOTO_MARKER_ICON_ANCHOR,
    PHOTO_MARKER_ICON_SIZE,
    PHOTO_MARKER_POPUP_ANCHOR,
} from './marker-factory';

describe('marker-factory', () => {
    it('builds single-marker markup with thumbnail and selected state', () => {
        const html = buildPhotoMarkerHtml({
            count: 1,
            thumbnailUrl: 'https://example.com/thumb.jpg',
            selected: true,
            zoomLevel: 'near',
        });

        expect(html).toContain('map-photo-marker--single');
        expect(html).toContain('map-photo-marker--selected');
        expect(html).toContain('map-photo-marker--zoom-near');
        expect(html).toContain('<img src="https://example.com/thumb.jpg"');
    });

    it('builds cluster markup with shared count geometry class', () => {
        const html = buildPhotoMarkerHtml({ count: 4, zoomLevel: 'far' });

        expect(html).toContain('map-photo-marker--count');
        expect(html).toContain('map-photo-marker--zoom-far');
        expect(html).toContain('map-photo-marker__count-label">4<');
    });

    it('includes optional state affordances when provided', () => {
        const html = buildPhotoMarkerHtml({
            count: 1,
            thumbnailUrl: 'https://example.com/thumb.jpg',
            corrected: true,
            uploading: true,
            bearing: 90,
        });

        expect(html).toContain('map-photo-marker__correction-dot');
        expect(html).toContain('map-photo-marker__pending-ring');
        expect(html).toContain('map-photo-marker__direction-cone');
        expect(html).toContain('map-photo-marker--has-bearing');
    });

    it('exports stable Leaflet icon geometry constants', () => {
        expect(PHOTO_MARKER_ICON_SIZE).toEqual([64, 72]);
        expect(PHOTO_MARKER_ICON_ANCHOR).toEqual([32, 60]);
        expect(PHOTO_MARKER_POPUP_ANCHOR).toEqual([0, -52]);
    });
});