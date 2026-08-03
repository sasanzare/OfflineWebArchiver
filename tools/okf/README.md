# OfflineWebArchiver OKF Validator

Run `npm run okf:validate` for all error-producing layers. Use `okf:validate:official`, `okf:validate:extensions`, `okf:validate:quality`, or `okf:validate:json` for focused output.

The validator separates official OKF v0.2 conformance, repository metadata policy, OfflineWebArchiver extension integrity, knowledge-quality warnings, and formatting warnings. Errors produce exit code 1; warnings do not fail validation. It performs no network access and does not rewrite files.
