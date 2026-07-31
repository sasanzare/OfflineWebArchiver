# Error Model

Errors contain stable `code`, category, internal-safe message, user message, retryability, optional bounded details, and optional cause ID. Categories are validation, configuration, contract, application, domain, platform, security, and internal.

Transport authorization fails with `SECURITY_UNAUTHORIZED_TRANSPORT`; malformed/unsupported envelopes use contract codes; unexpected implementation failures become `INTERNAL_UNEXPECTED_ERROR`. Raw exceptions, stack traces, arbitrary environment, and credentials never cross the public response boundary. CLI maps categories to stable exit codes 0, 2, 3, 5, and 70.
