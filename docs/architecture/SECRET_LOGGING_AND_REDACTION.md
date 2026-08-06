# Secret Logging and Redaction

Observability applies one recursive sanitizer to structured metadata, arrays, nested objects, cyclic values, `Error` objects, binary values, URLs, and headers. Sensitive key names are replaced with a fixed marker. Authorization, proxy authorization, cookie, set-cookie, and API-key headers are redacted. URL user-info, fragments, and sensitive query values are removed before a URL is emitted.

Errors are projected to safe name/code/message/category data; causes and nested structures are sanitized without serializing the original error object. Binary values are represented by bounded type/size metadata, never bytes. Cycles are represented by a fixed cycle marker. Audit events use fixed event types, project/secret identifiers, kind, purpose, backend, result, and safe error categories only.

Secret values, passphrases, cookies, tokens, headers, full sensitive URLs, keychain blobs, raw errors, and export passphrases are prohibited from logs, trace records, command results, CLI output, diagnostics, and filenames. Leakage tests use synthetic canaries across nested objects, errors, URLs, headers, and audit metadata.
