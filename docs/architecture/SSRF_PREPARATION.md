# SSRF Preparation

Phase 5 performs syntax-only preflight and no network access. It classifies IPv4/IPv6 literals as public, loopback, private, link-local, multicast, reserved, or unspecified. Non-public literals are denied unless their class is explicitly present in the profile. Hostnames are `unknown-hostname`, not automatically network-authorized.

Future dispatch must resolve every hostname, classify every returned address, reject mixed/rebinding results according to policy, repeat the check after redirects, pin the approved address where possible, and prevent proxy/browser bypass. Profile domain permission is never proof of a safe resolved address.

Credential-bearing URLs, control characters, NUL, backslashes, invalid percent escapes, unsafe schemes, oversized URLs, sensitive query values, and HTTPS downgrades fail closed or are redacted as documented.
