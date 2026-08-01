# Test Fixture Strategy

## Product Phase 8 rendering fixtures

All Browser/Render network evidence uses an ephemeral `127.0.0.1` server constructed by tests. Exact origin is injected through a test-only composition seam and cannot be supplied by Desktop/CLI. Fixtures cover static final DOM, delayed JavaScript, History API SPA state, one-shot bounded lazy scroll, continuous mutation, EventSource, blank DOM, navigation timeout, safe/private redirects, blocked non-GET, dialog/popup/download/permission defaults, Page crash, Browser crash, and sanitized console/Page/request failures. No external or private target is contacted and no fixture is treated as target-site acceptance evidence.

## Product Phase 7 fixtures

Fixtures include an injected fake UTC Clock, SQLite Projects at legacy/current schemas, independent worker connections, forked crash children with deterministic fault points, and a loopback-only HTTP server supporting both 206 Range and no-Range behavior. No external site or production browser/downloader is exercised.

**Document status:** Proposed baseline  
**Owner:** QA Lead  
**Last updated:** 2026-07-31

Fixtures provide deterministic, local, authorized evidence for the
[Acceptance Matrix](../product/ACCEPTANCE_MATRIX.md). They are not a substitute
for the authorized [Target-Site Acceptance Plan](TARGET_SITE_ACCEPTANCE_PLAN.md),
but no feature may rely only on a private target for repeatable proof.

## Fixture principles

- Fixture services bind to loopback by default, use reserved/example domains, a
  fixed seed and controllable clock, and expose an assertion API or request log.
- Repository fixtures contain only synthetic public data. They must not contain
  real credentials, phone numbers, OTPs, cookies, tokens, proxy passwords,
  private-site URLs/content, or personal/confidential data.
- Authentication, identity-provider, OTP, API, target, and proxy behavior is
  implemented by deterministic local test services or mocks with realistic
  protocol boundaries. Secret canaries are generated per test, kept outside
  version control, and destroyed after scanning.
- Every fixture has a versioned manifest defining expected pages, assets, routes,
  requests, identities, failure schedule, and cleanup. Tests fail if unexpected
  external network access occurs.
- Framework fixtures pin their toolchain in the phase that implements them.
  Generated build output is reproducible and committed only if the later
  repository policy explicitly requires it.
- “Full” automation means a deterministic test with machine assertions.
  “Hybrid” means automation plus a documented manual interaction or visual review.

## Fixture catalog

| ID | Fixture category | Purpose | Required behavior | Data sensitivity | May be committed? | Expected test phase | Automation level | Required evidence | Cleanup requirements |
|---|---|---|---|---|---|---|---|---|---|
| FX-001 | Static HTML website | Baseline HTML/link/asset behavior | Fixed pages cover base URLs, encodings, link attributes, status codes, and nested paths | Synthetic, low | Yes, source and goldens | P2, P7, P8 | Full | Request ledger, DOM/link assertions, hashes | Stop server; remove generated archive/temp |
| FX-002 | JavaScript-rendered page | Prove final DOM differs from response HTML | Script inserts deterministic content/routes after controlled signals | Synthetic, low | Yes | P2, P7 | Full | Initial/final DOM diff, trace, screenshot | Close browser; clear profile/temp |
| FX-003 | React SPA | Validate framework-neutral SPA capture | Routes and asynchronous views render known content | Synthetic, low | Yes, source; build by policy | P7, P8 | Full | Route ledger, DOM assertions, screenshots | Stop server; delete build/cache unless retained |
| FX-004 | Vue SPA | Validate Vue rendering and routing | Same semantic corpus as SPA baseline | Synthetic, low | Yes, source | P7, P8 | Full | Framework-version manifest and route results | Stop server; delete build/cache |
| FX-005 | Angular SPA | Validate Angular rendering and routing | Same semantic corpus plus chunk loading | Synthetic, low | Yes, source | P7, P8 | Full | DOM/chunk/route assertions | Stop server; delete build/cache |
| FX-006 | Next.js application | Exercise SSR/hydration/client navigation | Fixed server/client routes and data payloads behave deterministically | Synthetic, low | Yes, source | P7, P8, P16 | Full | Response-vs-final DOM, route/API ledger | Stop server; delete build/cache |
| FX-007 | Client-side routing | Test navigation without document reload | Hash/path routes expose distinct stable views | Synthetic, low | Yes | P8, P10 | Full | Navigation events and normalized identities | Close browser; remove archive |
| FX-008 | History API navigation | Capture `pushState`/`replaceState`/popstate | Script emits known stable and transient states | Synthetic, low | Yes | P8 | Full | History trace and expected route set | Close browser; clear profile |
| FX-009 | Lazy-loaded images | Exercise viewport/intersection loading | Known images load at known scroll positions, with one failure | Synthetic, low | Yes | P7–P9 | Full | Item/asset manifest, trace, hashes | Stop server; remove images/temp archive |
| FX-010 | Infinite scroll | Verify finite discovery budgets | Deterministic endless pages plus terminal variant | Synthetic, low | Yes | P8, P18 | Full | Counter/cutoff report and repeat run diff | Stop server; clear generated items |
| FX-011 | Pagination | Test bounded numbered/cursor pagination | Known pages include cycles, next/prev, and cutoff | Synthetic, low | Yes | P5, P8 | Full | Expected identity graph and cutoff evidence | Stop server; remove archive |
| FX-012 | Shared assets and deduplication | Prove content-level dedupe | Several URLs/pages return identical and near-identical assets | Synthetic, low | Yes | P9 | Full | Source map, object count, content hashes | Remove object store/temp |
| FX-013 | Redirect chains | Validate redirect identity/provenance | Fixed relative, absolute, canonical, and cross-scope chains | Synthetic, low | Yes | P5, P8 | Full | Chain ledger and request assertions | Stop server; clear logs |
| FX-014 | Redirect loops | Detect and stop loops | Self-loop and multi-node loop stay within finite budget | Synthetic, low | Yes | P5, P8 | Full | Bounded request count and failure classification | Stop server; clear logs |
| FX-015 | Soft-404 pages | Prevent false archive success | Branded 200 error templates and real content have known labels | Synthetic, low | Yes | P18 | Full | Classification confusion matrix | Stop server; remove model/cache if any |
| FX-016 | API-driven pages | Test rendered data dependencies | Page requires deterministic approved and denied endpoints | Synthetic canaries, moderate | Yes, generators only | P7, P16 | Full | Network/capture ledger and final DOM | Destroy generated canaries; stop service |
| FX-017 | GET API capture and replay | Prove selective sanitized replay | Variants cover query/header policy, hit, miss, and expiry | Synthetic canaries, moderate | Yes, no generated values | P16, P20 | Full | Capture/replay diff and leakage scan | Destroy canaries/captures/temp |
| FX-018 | Manual login | Exercise visible direct user login | Local identity service creates a bounded session after direct entry | Generated synthetic credential, high in test | Harness yes; credential no | P12, P20 | Hybrid | Redacted recording, storage/event scan | Revoke session; destroy profile/credential |
| FX-019 | Username and password login | Verify application does not capture password | Test page exposes event instrumentation without transmitting to app | Generated synthetic credential, high in test | Harness yes; credential no | P12, P20 | Hybrid | Input-boundary assertions and canary scan | Revoke/destroy credential and profile |
| FX-020 | Third-party login simulation | Test cross-origin identity flow safely | Two loopback origins emulate redirects, consent, and callback | Generated synthetic session, high in test | Harness yes; session no | P12, P20 | Hybrid | Redirect/request trace and protected-store test | Revoke session; clear both services/profiles |
| FX-021 | Single-field OTP | Validate guided single input | Fixed-clock service accepts one generated value with bounded attempts | Generated OTP, high in test | Harness yes; OTP no | P13, P20 | Hybrid | Redacted UI trace and lifecycle assertions | Expire/destroy OTP and browser state |
| FX-022 | Multi-field OTP | Validate focus/paste/accessibility | Six fields support deterministic input and expiry | Generated OTP, high in test | Harness yes; OTP no | P13, P19, P20 | Hybrid | Keyboard/focus trace and lifecycle scan | Destroy OTP/UI/profile state |
| FX-023 | Expired OTP | Verify safe expiry | Controllable clock expires value before/during submission | Generated OTP, high in test | Harness yes; OTP no | P13, P20 | Full after input step | Clock trace, error state, leakage scan | Destroy OTP/temp/profile |
| FX-024 | Incorrect OTP | Verify bounded failure | Service rejects generated wrong values and limits attempts | Generated OTP, high in test | Harness yes; OTP no | P13, P20 | Full after input step | Attempt counters and sanitized errors | Destroy values/session/profile |
| FX-025 | Expired session | Pause affected work and re-authenticate | Controllable cookie/token expires at known request | Generated session, high in test | Harness yes; session no | P12, P17 | Full | Job/session timeline and request log | Revoke session; destroy protected store/profile |
| FX-026 | Session renewal | Validate explicit renewal policy | Local identity service rotates session on user participation | Generated session, high in test | Harness yes; session no | P12, P24 | Hybrid | Old/new session state without values, job resume evidence | Revoke all sessions; destroy profile/store |
| FX-027 | HTTP proxy | Validate authorized HTTP routing | Local proxy records destination and supports controlled failures | Synthetic traffic, moderate | Yes | P14 | Full | Proxy/origin request correlation | Stop proxy; clear logs/credentials |
| FX-028 | HTTPS proxy | Validate TLS proxy behavior | Local TLS proxy supports valid/untrusted/expired test cert cases | Generated test keys, high in test | Harness/cert metadata yes; private keys no | P14, P20 | Full | TLS handshake and no-fallback trace | Destroy generated keys/trust store; stop proxy |
| FX-029 | SOCKS5 proxy | Validate SOCKS5 and DNS mode | Local server records connect target and resolver path | Synthetic traffic, moderate | Yes | P14, P20 | Full | Proxy/packet trace and DNS assertion | Stop proxy; clear packet/log output |
| FX-030 | Authenticated proxy | Protect proxy credentials | Local proxy requires per-run generated credential | Generated credential, high in test | Harness yes; credential no | P14, P20 | Full | Auth outcomes and artifact leakage scan | Destroy credentials/logs/store; stop proxy |
| FX-031 | Slow proxy | Measure health and timeouts | Proxy injects deterministic latency/jitter | Synthetic, low | Yes | P14, P15 | Full | Latency/state timeline | Stop proxy; clear logs |
| FX-032 | Failed proxy | Validate fail-closed routing | Proxy refuses, resets, resolves badly, or dies on schedule | Synthetic, low | Yes | P14, P17 | Full | Failure classification and no-direct-fallback trace | Stop processes; clear logs |
| FX-033 | Proxy cooldown | Validate state recovery | Fixed clock drives fail/cooldown/probe/healthy transitions | Synthetic, low | Yes | P14, P15 | Full | State-machine trace | Reset clock; stop proxy |
| FX-034 | `429` and `Retry-After` | Enforce shared origin cooldown | Origin returns delta/date/malformed/no header across proxies | Synthetic, low | Yes | P15, P20 | Full | All-path request timeline and clock assertions | Reset clock; stop origins/proxies |
| FX-035 | `503` and exponential backoff | Validate bounded reliability retry | Origin returns scheduled `503` successes/failures | Synthetic, low | Yes | P15, P17 | Full | Attempt/backoff timeline and terminal state | Reset clock; stop service |
| FX-036 | Browser crash | Recover claimed browser work | Browser process exits at scripted render/download points | Synthetic, low | Yes | P17 | Full | Process/state timeline and invariant report | Reap processes; remove crash/temp artifacts |
| FX-037 | Application crash | Prove durable transitions | Application is forcibly terminated at injected boundaries | Synthetic, low | Yes | P17 | Full | Before/after DB state and duplicate/loss assertions | Reap process; remove test Project |
| FX-038 | Network interruption | Resume safely after loss | Transport drops DNS/connect/body at deterministic offsets | Synthetic, low | Yes | P17 | Full | Attempt history, partial state, recovery trace | Restore network shim; remove partials |
| FX-039 | Partial file with HTTP Range | Continue verified prefix | Server advertises/runs valid and invalid Range responses | Synthetic bytes, low | Yes | P9, P17 | Full | Range headers, offsets, final hash | Remove partial/final files; stop server |
| FX-040 | Partial file without HTTP Range | Restart without corruption | Server ignores/rejects Range | Synthetic bytes, low | Yes | P9, P17 | Full | Full-redownload trace, final hash, temp states | Remove files; stop server |
| FX-041 | Cross-platform path rules | Detect invalid/colliding names | Corpus covers reserved names, case, Unicode, long paths, separators | Synthetic, low | Yes | P4, P10, P25 | Full | Mapping golden on each OS and collision report | Remove generated Project paths |
| FX-042 | Offline server routing | Validate local route map | Static/SPA/query/hash/404 routes have known outcomes | Synthetic, low | Yes | P10, P11 | Full | Route matrix and socket/network trace | Stop server; remove archive |
| FX-043 | Missing assets | Quantify resource failure | HTML/CSS references known absent/denied/corrupt resources | Synthetic, low | Yes | P9, P18 | Full | Asset/resource failure report vs golden | Stop server; remove archive |
| FX-044 | Broken internal links | Validate link reporting | Known good, broken, redirect, alias, and unsupported links | Synthetic, low | Yes | P18 | Full | Precision/recall confusion matrix | Stop server; remove report/archive |
| FX-045 | Sensitive header filtering | Remove auth/cookie/proxy/header canaries | API/redirect responses echo generated canaries | Generated canaries, high in test | Harness yes; values no | P16, P20 | Full | Byte/text scan of every artifact | Destroy canaries, captures, logs, profiles |
| FX-046 | Secret redaction | Exercise all output channels | Generated canaries mimic OTP/password/session/proxy/API secrets | Generated canaries, high in test | Generator yes; values no | P20 | Full | Logs/reports/export/diagnostic/crash/screenshot scan | Securely discard test outputs and values |
| FX-047 | Malicious archived content | Treat archive as untrusted | Pages attempt traversal, script/network escape, forms, storage and service abuse | Synthetic adversarial, moderate | Yes | P11, P20 | Full | Browser/security trace and containment assertions | Stop server/browser; clear profiles/temp |
| FX-048 | Unexpected external redirect | Recheck authorization after redirect | Approved URL redirects to unapproved loopback alias/external example host | Synthetic, low | Yes | P5, P20 | Full | Pre-dispatch denial and redirect provenance | Stop service; clear logs |

## Test suites and evidence retention

1. **Fast contract suite:** URL, mapping, manifests, reports, migrations, and pure
   policy; runs per change.
2. **Local integration suite:** target, identity, proxy, network, API, SQLite,
   browser, and Local Runtime Server fixtures; runs in CI and before phase gate.
3. **Fault/adversarial suite:** forced crash, corruption, leakage, malicious
   content, authorization, and rate-limit tests; required for relevant phase gates.
4. **Packaging matrix:** clean images/hardware for Windows, Linux, and macOS;
   retained with environment manifest.
5. **Target-site acceptance:** separately authorized and redacted; raw private
   material follows the approved retention policy and is never committed.

Evidence records fixture/version, build/version, OS/architecture, browser version,
configuration hash, random seed, clock baseline, command, exit status, assertions,
and artifact hashes. Security evidence is sanitized before retention. Failed-test
artifacts follow the same cleanup and secret-scanning rules as successful runs.
