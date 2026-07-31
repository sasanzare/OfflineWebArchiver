# Dependency Rules

Allowed direction is:

```text
desktop / cli -> application-service -> archive-core
      |                  |
      +-> contracts <----+
      +-> platform
      +-> observability
tests -> public entries + test-support
```

Forbidden: Core importing apps/service/Electron/Node/platform; packages importing apps; renderer importing Node/Electron/service/Core; apps deep-importing another package source; production importing tests or `spikes/`; circular workspace dependencies. `npm run test:architecture` enforces import allowlists, manifest direction, cycle absence, public entry points, and desktop security settings.
