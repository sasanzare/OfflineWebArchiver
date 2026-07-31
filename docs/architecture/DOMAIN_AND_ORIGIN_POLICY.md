# Domain and Origin Policy

Domain rules use canonical ASCII/Punycode lowercase hostnames. `exact` matches one host; `subdomains` matches the exact host and labels ending in `.<host>`. Plain string suffix matching is forbidden. Rules optionally constrain HTTP/HTTPS schemes and explicit/effective ports. Deny rules run before allows, and at least one allow rule must match.

Origin relation distinguishes same origin, same host, same registrable domain, and external. Registrable-domain comparison uses exact dependency `tldts` `7.4.9` (MIT) with its bundled Public Suffix List and private-domain support; it does not authorize a host. The package performs no runtime update or request, so offline behavior uses the pinned bundled snapshot. PSL updates are reviewed dependency changes and must rerun domain/security/golden evidence; a classification-affecting update requires an engine-version decision. Staleness can affect descriptive relation and redirect classification, but can never expand an explicit allow rule. IP literals are not treated as registrable domains.

Hostname syntax/profile membership and network safety remain separate. DNS is not used in Phase 5, so hostname decisions set `networkPreflightRequired`; Phase 6+ dispatch must resolve and reclassify every address.
