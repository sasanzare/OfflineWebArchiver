# Architecture

<!-- MAINTAINED NAVIGATION. Update when direct Concept children change. -->

This directory contains the architecture components and cross-layer contract boundary.

- [Application Service](application-service.md) - Orchestration boundary for local commands and rendering.
- [Proxy Manager](proxy-manager.md) - Protocol-aware proxy metadata, health, Secret Store, and Session affinity boundary.
- [Worker Pool Scheduling](worker-pool-scheduling.md) - Bounded worker reservation, shared Origin cooldown, proxy assignment, and backpressure.
- [Browser Runtime](browser-runtime.md) - Owned Chromium runtime and lifecycle constraints.
- [Authentication Sessions](authentication-sessions.md) - Manual Login Contexts, protected Storage State, and Session isolation.
- [OTP Flow and Element Picker](otp-flow-element-picker.md) - Versioned Login Flow descriptors, visible OTP state machine, and temporary native picker.
- [Browser-Native Human-Paced Interaction](browser-interaction.md) - Approved browser input, pacing, and trace boundary.
- [Contracts](contracts.md) - Versioned command, result, event, and error boundary.
- [Command-Line Interface](cli.md) - Bounded command interface to the Application Service.
- [Desktop Interface](desktop-interface.md) - Sandboxed Electron interface and constrained bridge.
- [Platform Adapter](platform.md) - Normalized runtime facts and allowlisted configuration.
- [Trust Zones and IPC](trust-zones-and-ipc.md) - Privilege zones, renderer/archive boundaries, and command authorization.
- [Network Replay](network-replay.md) - Versioned replay key and request-decision contract.
- [Service Worker Policy](service-worker-policy.md) - Safe-default Service Worker behavior.
- [Canonical Path Safety](../data/canonical-path-safety.md) - Shared portable path and collision rules.

Indexes disclose direct children only.
