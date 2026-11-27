---
---

Build-time enforcement of era surface parity: `internal/era/conformance.ts` now fails the build
when `/v8/effect` and `/v9/effect` stop sharing a member of their `Ledger`, `CompactRuntime` or
`ContractExecutable` facades, with contract events the one named exception. A type-only
counterpart (`EraSurfaceParity.test.ts`) covers the half `keyof` cannot see. Nothing a consumer
installs changes.
