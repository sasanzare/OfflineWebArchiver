# OS-protected Secret Storage

Electron main constructs the OS-protected adapter with a narrow `safeStorage` port. Renderer, preload, CLI, and generic IPC code do not call the platform API or receive its blobs. The adapter checks provider availability and rejects insecure `basic_text`, unavailable, and unknown providers with a capability/status result or safe error.

When the provider is secure, the provider-protected root key is used only inside the privileged adapter; record encryption and Project isolation remain the Secret Store's responsibility. The backend does not expose key material through metadata, logs, diagnostics, or ordinary export.

Platform qualification is explicit. Windows can use the available Electron provider in the packaged main process. macOS Keychain behavior and Linux provider availability require native evidence before being claimed. A Linux `basic_text` provider is not an acceptable persistence backend; the capability model directs the user to the Portable Vault instead.

OS-backend migration is an explicit future operation. It must authenticate both source and destination, preserve or deliberately remap references, validate Project scope, and atomically replace only after all records are verified. Phase 11 does not implement automatic migration through an untrusted renderer or CLI passphrase argument.
