# upload service module

Facade: ./upload.service.ts
Shared types: ./upload.types.ts
Helpers: ./upload.helpers.ts
Adapters: ./adapters/

This module was added for symmetry-standard alignment while keeping existing root service imports compatible.

Canonical service spec: [media-upload-service](../../../../../../docs/specs/service/media-upload-service/README.md).
The code module remains `core/upload` for existing import stability; treat `media-upload-service`
as the normative contract name.
