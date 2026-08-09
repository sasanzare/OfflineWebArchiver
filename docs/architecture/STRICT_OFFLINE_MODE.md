# Strict Offline Mode

Strict Offline Mode is version 1 and has three observable outcomes:

- `fulfill`: a deterministic replay match was found;
- `allow-local`: an explicitly approved local/loopback runtime origin was used;
- `abort`: an unknown external dependency was blocked with
  `STRICT_OFFLINE_UNKNOWN_DEPENDENCY`.

Non-strict live network access is an explicit future policy outcome and must be
recorded for coverage and leakage metrics. Unknown dependencies must never be
silently treated as successful offline renders. The current code provides the
pure decision contract only; no replay engine is claimed.

