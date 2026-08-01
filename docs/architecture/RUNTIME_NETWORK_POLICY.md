# Runtime Network Authorization

**Status:** Enforced for Phase 8 navigation and requests

The queued normalized URL is re-evaluated through the stored Product Phase 5 Profile before dispatch. Runtime authorization accepts only `GET` and `HEAD`, performs DNS resolution, classifies every returned address, and requires all addresses to be public. Literal private, loopback, link-local, reserved, credential-bearing, and unsupported-scheme inputs fail closed. The final URL is scope-revalidated.

CDP Fetch interception authorizes each request before continuation, including redirect targets. Redirects cannot inherit the prior target's authorization. Production mode never allows loopback; deterministic test mode allows only the exact ephemeral fixture origins supplied by the test harness and requires resolved loopback addresses. This exception cannot be selected through Desktop or CLI payloads.

The runtime does not accept request headers, cookies, request bodies, proxy configuration, or caller-provided executable/launch arguments. Safe URLs remove credentials, fragments, and query values; console/error/request evidence is redacted and globally bounded to 100 entries by default.

DNS rebinding remains a residual risk because authorization and Chromium connection establishment are separate operations. Phase 8 validates all resolver answers before continuation but does not pin a connection to a specific resolved address.
