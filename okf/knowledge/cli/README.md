# CLI Knowledge

The Product Phase 7 CLI exposes recovery inspect/apply/report, Run pause/status/resume/state, Lease list/show, Checkpoint list/show, and Lease-aware Queue ownership flags. Human/JSON output recursively redacts token fields; built smoke tests prove the flow.

The production CLI supports Project, Profile, Scope, Queue, Recovery, Run, Lease, Checkpoint, Browser, and Render commands in human or JSON form. Pagination is bounded; validation/business errors use stable exits. Explicit Project/Job selection, redaction, and contract 1.5.0 preserve the Application Service boundary. Render accepts no URL override and remains controlled single-Job execution, not discovery or a crawler.
