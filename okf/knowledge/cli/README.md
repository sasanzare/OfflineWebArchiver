# CLI Knowledge

The Product Phase 7 CLI exposes recovery inspect/apply/report, Run pause/status/resume/state, Lease list/show, Checkpoint list/show, and Lease-aware Queue ownership flags. Human/JSON output recursively redacts token fields; built smoke tests prove the flow.

The production CLI supports Project, Profile, Scope, Queue, Recovery, Run, Lease, and Checkpoint commands in human or JSON form. Pagination is bounded; duplicate/rejected/recovery results are structured; validation and business errors use stable exits. Explicit Project selection, token redaction, and contract 1.4.0 preserve the Application Service boundary. Claims/completions remain controlled simulations, not a crawler.
