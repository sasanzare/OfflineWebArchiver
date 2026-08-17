# Strict Offline Mode

Strict Offline Mode is version 1 and has three observable outcomes:

- `fulfill`: a deterministic replay match was found;
- `allow-local`: an explicitly approved local/loopback runtime origin was used;
- `abort`: an unknown external dependency was blocked with
  `STRICT_OFFLINE_UNKNOWN_DEPENDENCY`.

Non-strict live network access remains an explicit policy outcome and is
recorded as a bounded runtime event. Unknown dependencies must never be
silently treated as successful offline renders. Phase 19 implements the replay
lookup, body integrity, Context/CDP fulfillment and abort path; a missing or
ambiguous snapshot still fails closed when strict mode is enabled.

