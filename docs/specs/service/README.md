# Service Specs

Folder index for service-module contracts.

Folder-specific rules:

- Each service module folder mirrors one code module under apps/web/src/app/core.
- Service specs own facade boundaries, adapter responsibilities, and service-level acceptance criteria.
- Service specs may link to ui/system consumers but must not own route composition or component visual contracts.

Global governance references:

- ../README.md
- ../GOVERNANCE-MATRIX.md
