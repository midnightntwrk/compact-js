---
'@midnight-ntwrk/compact-js': major
'@midnight-ntwrk/compact-js-node': major
'@midnight-ntwrk/compact-js-command': major
---

Move ledger 9 to compact-runtime 0.21 (compactc 0.36). The ledger 9 era now pairs with runtime
line `0.21`, still over onchain-runtime-v4, so `Ledger.era.runtime` and `CompactRuntime.line` on
the unsuffixed and `/v9` entries read `'0.21'`. Contracts compiled by compactc 0.35 or earlier
expect runtime 0.20 and fail its version check on import; recompile them with compactc 0.36.
Contract types can no longer declare `pure` circuits, and contracts that make cross-contract calls
must be recompiled so the call's proof binds the callee circuit. compactc 0.36 emits only ZKIR v3
verifier keys, so ledger 9's contract operation version moves from `'v3'` to `'v4'`: maintenance
updates built by `ContractExecutable` now insert and remove keys at `'v4'`. The ledger 8 entry
(`/v8`, runtime 0.16) is unchanged.
