# Security Knowledge

Phase 7 security evidence covers hashed Lease verification, token-free logs and ordinary inspection/UI/list/report display, current generation/expiry/scope ownership, recovery confirmation/idempotency/bounds, Checkpoint secret/size/depth rejection, portable root-bounded non-symlink paths, process-kill durability, and renderer isolation. The owner claim result/mutations carry the credential, and Phase 6 compatibility/idempotency rows retain it for durable replay; the Project database is therefore sensitive.

Phase 6 inherits Scope controls and adds bounded Queue commands/results/errors/pagination, URL/error/result redaction, Project/Run/Profile/revision ownership, claim-token fencing, parameterized SQL, safe event metadata, and adversarial cross-owner/injection/oversize tests. It retains an explicit no-network and no-recovery boundary.

Current production controls protect the Electron privilege boundary and redact logs. They do not yet constitute the complete threat model for crawling, hostile archive rendering, authentication, proxy credentials, or release signing.
