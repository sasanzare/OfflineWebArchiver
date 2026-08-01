# Render Results Knowledge

**Status:** VERIFIED through SQLite schema 6.

Migration `006_add_browser_rendering_engine` adds Render Result/Event/Failure ledgers. Artifact-first atomic writes and a fenced SQLite transaction commit portable HTML/optional PNG SHA-256 descriptors, Queue terminal state, attempt, transition, Lease release, and event. Fault and replay tests are direct evidence.
