# Security Knowledge

Phase 6 inherits Scope controls and adds bounded Queue commands/results/errors/pagination, URL/error/result redaction, Project/Run/Profile/revision ownership, claim-token fencing, parameterized SQL, safe event metadata, and adversarial cross-owner/injection/oversize tests. It retains an explicit no-network and no-recovery boundary.

Current production controls protect the Electron privilege boundary and redact logs. They do not yet constitute the complete threat model for crawling, hostile archive rendering, authentication, proxy credentials, or release signing.
