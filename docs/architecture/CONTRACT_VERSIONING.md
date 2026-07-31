# Contract Versioning

Current transport contract is `1.1.0`, a backwards design-line extension of Phase 3 `1.0.0`. Commands are `system.describe` and Project `create/open/close/validate/export/import/info`. Responses use a strict result discriminator; errors use stable codes/categories; progress/completion events carry operation/stage/optional percent. Unknown fields, invalid paths/IDs/timestamps/discriminators, and unsupported versions fail closed.

Optional compatible additions require a minor version plus old/new consumer tests and synchronized Desktop/CLI docs. Removal, rename, or semantic break requires a major version, compatibility/migration plan, ADR, and parallel handling where processes can roll independently. Patch versions cannot change accepted semantics. Product/application `0.4.0`, Project format `1.0.0`, database schema `2`, ZIP container `1.0.0`, lock `1`, and contract `1.1.0` are independent version axes.
