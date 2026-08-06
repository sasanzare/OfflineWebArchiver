# Credential References

## Canonical form

The only accepted serialized reference is:

```text
secret://v1/project/<RFC-4122-project-uuid>/<RFC-4122-secret-uuid>
```

Parsing is strict: scheme, version, path segments, UUID shape, and lowercase canonical serialization are validated. Unknown reference versions fail closed. The reference identifies a record; it never contains a password, token, cookie, proxy credential, session value, passphrase, or key.

## Isolation rules

The current project context must match the project segment of the reference. The store also verifies that metadata scope and access context belong to the same project. A reference from another Project is rejected, not looked up globally and not rebound to a local record with the same secret identifier.

Secret identifiers are generated independently from secret bytes. They are not hashes, previews, or stable fingerprints of the value. Deleted references are invalid for resolution and are not retained as reversible payloads.

## Kinds, scopes, and purposes

The bounded kinds are `proxy_credential`, `authentication_credential`, `session_storage`, `api_credential`, `portable_export_key`, and `generic_project_secret`. Scope is one of `application`, `project`, `profile`, `session`, or `login_flow` and carries an explicit project and scope identifier.

Every resolution declares a purpose such as `proxy_connection`, `future_manual_login`, `future_session_restore`, `secure_export`, `secret_rotation`, `migration`, or `test_fixture`. The policy rejects incompatible kind/purpose combinations before decryption.

## Safe metadata

Metadata responses contain the reference, kind, scope, lifecycle state, version, timestamps, backend, export policy, envelope/key-slot versions, and a separately supplied non-sensitive label. They never contain a masked value derived from the secret, a content hash intended for display, or a secret-dependent length/entropy estimate.
