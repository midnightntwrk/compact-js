# compact-js Test Execution Report — local re-run

## Run Details

| Field | Value |
| --- | --- |
| Component Under Test | compact-js (`@midnight-ntwrk/compact-js`, `-node`, `-command`) |
| Version | 3.0.0 |
| Source | tag `compact-js-v3.0.0` (commit `5b35fccae3d775d4f0b597d0dc8d83750d200d0c`) |
| Runtime | Docker `node:24.18.0-bookworm` (matches `.nvmrc`), Yarn 4.10.3 |
| Commands | `yarn install`, `yarn build`, `yarn lint`, `yarn test --concurrency 1` (same as CI), then the era 8 vitest configs again with a junit reporter |
| Date | 6 November 2026, 18:05–18:07 GMT |
| QA Contact | Giuseppe Salvatore (giuseppe.salvatore@shielded.io) |

> This is a re-run of the released source, not the CI run that built the published packages.
> The build run's own output is in [`../ci-build-run/`](../ci-build-run/).

## Summary (vitest, from junit)

| Package | Ledger era | Test files | Passed | Failed | Skipped | Total |
| --- | :---: | ---: | ---: | ---: | ---: | ---: |
| `compact-js` | 9 | 24 | 236 | 0 | 0 | 236 |
| `compact-js` | 8 | 6 | 42 | 0 | 0 | 42 |
| `compact-js-node` | 9 | 3 | 20 | 0 | 0 | 20 |
| `compact-js-command` | 9 | 16 | 127 | 0 | 0 | 127 |
| `compact-js-command` | 8 | 1 | 3 | 0 | 0 | 3 |
| **Total** | | **50** | **428** | **0** | **0** | **428** |

The `compact-js` type tests (tstyche: 8 files, 91 tests, 187 assertions, all passed) have no junit
output; their result is in [`rerun.log`](rerun.log).

> Legend: ✓ passed · ✗ failed · ↓ skipped.

## `compact-js` — ledger era 9

Source: [`junit/compact-js-era9.xml`](junit/compact-js-era9.xml)

### `test/effect/CompactRuntime.test.ts`

| Status | Name | Duration |
| :---: | --- | ---: |
| ✓ | compact-runtime seam > names the runtime line it binds | 2 ms |
| ✓ | compact-runtime seam > names the runtime line of the installed compact-runtime package | 0 ms |
| ✓ | compact-runtime seam > binds the seam to the compact-runtime package | 0 ms |
| ✓ | CompactRuntime.tryRuntime > yields the runtime call's result when it succeeds | 2 ms |
| ✓ | CompactRuntime.tryRuntime > converts a runtime rejection into a typed failure rather than a defect | 1 ms |
| ✓ | CompactRuntime.tryRuntime > shares its boundary handling with the ledger seam's tryConvert | 0 ms |
| ✓ | execution clock > stamps the block clock with the given time rather than the wall clock | 11 ms |
| ✓ | execution clock > falls back to the wall clock when no time is given | 1 ms |
| ✓ | era pairing > pairs the bound ledger era with the bound runtime line | 0 ms |

### `test/effect/ContractEventStore.subscribe.test.ts`

| Status | Name | Duration |
| :---: | --- | ---: |
| ✓ | ContractEventStore.subscribe > delivers live events appended after subscription | 58 ms |
| ✓ | ContractEventStore.subscribe > replays history then tails live from fromId with no gap or duplicate | 18 ms |
| ✓ | ContractEventStore.subscribe > applies the filter to both replayed and live events | 26 ms |
| ✓ | ContractEventStore.subscribe > delivers to multiple independent subscribers | 16 ms |
| ✓ | ContractEventStore.subscribe > resumes from a last-seen id after a disconnect (fromId = lastSeenId + 1) | 13 ms |
| ✓ | ContractEventStore.subscribe > fromId is inclusive — passing the last-seen id redelivers it (resume off-by-one guard) | 22 ms |
| ✓ | ContractEventStore.subscribe > delivers live events in ascending id order under concurrent appends | 23 ms |
| ✓ | ContractEventStore.subscribe > sliding live buffer: a stalled subscriber never wedges appends, drops the oldest un-consumed live events, and can recover them from history | 23 ms |
| ✓ | ContractEventStore.subscribe > cleans up on scope close without wedging the store | 13 ms |

### `test/effect/ContractEventStore.test.ts`

| Status | Name | Duration |
| :---: | --- | ---: |
| ✓ | ContractEventStore.append > assigns monotonically increasing ids starting at 1 | 45 ms |
| ✓ | ContractEventStore.append > continues the id sequence across appends | 16 ms |
| ✓ | ContractEventStore.query > returns an empty array from an empty store | 1 ms |
| ✓ | ContractEventStore.query > returns all events, in ascending id order, with no filter | 10 ms |
| ✓ | ContractEventStore.query > filters by contract address | 2 ms |
| ✓ | ContractEventStore.query > filters by event type | 5 ms |
| ✓ | ContractEventStore.query > filters by fromId (resume cursor) | 1 ms |
| ✓ | ContractEventStore.query > field-prefix filters > matches when any indexed field starts with the prefix | 1 ms |
| ✓ | ContractEventStore.query > field-prefix filters > does not match when no indexed field starts with the prefix | 2 ms |
| ✓ | ContractEventStore.query > field-prefix filters > honors a leading 0x and is case-insensitive | 1 ms |
| ✓ | ContractEventStore.query > field-prefix filters > matches an odd-length prefix against the high nibble of the first byte | 1 ms |
| ✓ | ContractEventStore.query > field-prefix filters > matches an odd-length prefix after a whole-byte prefix | 1 ms |
| ✓ | ContractEventStore.query > field-prefix filters > scopes the prefix to a named field | 2 ms |
| ✓ | ContractEventStore.query > field-prefix filters > fails fast with MalformedHexPrefixError on a non-hex prefix rather than matching nothing | 2 ms |
| ✓ | ContractEventStore.query > field-prefix filters > fails a non-hex prefix even after stripping a leading 0x | 1 ms |
| ✓ | ContractEventStore.query > field-prefix filters > fails the subscribe stream on a non-hex prefix | 6 ms |
| ✓ | ContractEventStore.query > field-prefix filters > excludes misc, lifecycle, and degraded events from field filters | 1 ms |
| ✓ | ContractEventStore.query > combines criteria with logical AND | 1 ms |

### `test/effect/ContractEventValidator.test.ts`

| Status | Name | Duration |
| :---: | --- | ---: |
| ✓ | validateEvents > accepts an empty event array | 69 ms |
| ✓ | validateEvents > accepts well-formed events carrying bigint and Uint8Array payloads | 20 ms |
| ✓ | validateEvents > fails when the value is not an array | 17 ms |
| ✓ | validateEvents > fails on an unrecognized event type | 16 ms |
| ✓ | validateEvents > fails when an event is missing its version | 16 ms |
| ✓ | validateEvents > reports every malformed event when validating a batch | 17 ms |

### `test/effect/ContractEvents.integration.test.ts`

| Status | Name | Duration |
| :---: | --- | ---: |
| ✓ | contract events integration > decodes raw events, accumulates them, and observes them via query and subscribe | 67 ms |

### `test/effect/ContractExecutable.boundary.test.ts`

| Status | Name | Duration |
| :---: | --- | ---: |
| ✓ | ContractExecutable runtime boundary > fails in the error channel, not as a defect, when the runtime rejects the resulting zswap local state | 119 ms |
| ✓ | ContractExecutable runtime boundary > fails in the error channel, not as a defect, when the ledger rejects reading a call's final state | 44 ms |
| ✓ | ContractExecutable runtime boundary > reports a rejected contract constructor as an initialization failure, not a coin public key one | 31 ms |

### `test/effect/ContractExecutable.clock.test.ts`

| Status | Name | Duration |
| :---: | --- | ---: |
| ✓ | ContractExecutable execution clock > stamps the call's block clock from the effect's own Clock | 121 ms |
| ✓ | ContractExecutable execution clock > reads the clock afresh for each call rather than once per executable | 69 ms |
| ✓ | ContractExecutable execution clock > falls back to the wall clock when nothing overrides it | 24 ms |

### `test/effect/ContractExecutable.gas.test.ts`

| Status | Name | Duration |
| :---: | --- | ---: |
| ✓ | ContractExecutable gas > reports what each contract in the call tree spent | 116 ms |
| ✓ | ContractExecutable gas > executes unchanged under a limit no single query reaches | 47 ms |
| ✓ | ContractExecutable gas > fails with a runtime error when the limit leaves no budget | 36 ms |

### `test/effect/ContractExecutable.maintenanceBoundary.test.ts`

| Status | Name | Duration |
| :---: | --- | ---: |
| ✓ | ContractExecutable maintenance boundary > fails in the error channel when the ledger rejects the verifier key of an add-or-replace update | 88 ms |
| ✓ | ContractExecutable maintenance boundary > fails in the error channel when the ledger rejects the maintenance update construction | 32 ms |
| ✓ | ContractExecutable maintenance boundary > fails in the error channel when the ledger rejects the maintenance update signature | 46 ms |
| ✓ | ContractExecutable maintenance boundary > fails in the error channel when the ledger rejects reading the data to sign | 30 ms |
| ✓ | ContractExecutable maintenance boundary > fails in the error channel when the runtime rejects reading an operation during initialization | 24 ms |
| ✓ | ContractExecutable maintenance boundary > fails in the error channel when the runtime rejects setting the maintenance authority | 34 ms |
| ✓ | ContractExecutable maintenance boundary > samples a maintenance authority signing key tagged with the era scheme when none is configured | 25 ms |
| ✓ | ContractExecutable maintenance boundary > fails in the error channel when no signing key is configured and the runtime rejects sampling one | 25 ms |

### `test/effect/ContractExecutable.partitionInputs.test.ts`

| Status | Name | Duration |
| :---: | --- | ---: |
| ✓ | ContractCallPublic partition inputs > reports the block context from before the call, not after it | 73 ms |
| ✓ | ContractCallPublic partition inputs > reports the state the call ran against, separately from the state it left behind | 27 ms |
| ✓ | ContractCallPublic partition inputs > reports the effects from before the call, not after it | 20 ms |
| ✓ | ContractCallPublic partition inputs > reports the commitment indices from after the call, not before it | 26 ms |
| ✓ | ContractCallPublic partition inputs > fails in the error channel, not as a defect, when reading the partition inputs is rejected | 17 ms |
| ✓ | ContractCallPublic partition inputs > names the post-execution context when that is the one that could not be read | 15 ms |

### `test/effect/ContractExecutable.test.ts`

| Status | Name | Duration |
| :---: | --- | ---: |
| ✓ | ContractExecutable > initialize > fails rather than dies when the configured witnesses are wrong | 37 ms |
| ✓ | ContractExecutable > initialize > should initialize a new instance | 39 ms |
| ✓ | ContractExecutable > initialize > samples a signing key tagged with the era default when none is configured | 34 ms |
| ✓ | ContractExecutable > initialize > should return the given signing key | 20 ms |
| ✓ | ContractExecutable > initialize > should derive an ECDSA maintenance authority from an ECDSA signing key | 21 ms |
| ✓ | ContractExecutable > initialize > should fail with an invalid CoinPublicKey | 17 ms |
| ✓ | ContractExecutable > circuits > should return identifiers of provable circuits | 27 ms |
| ✓ | ContractExecutable > circuits > should brand a circuit identifier without altering it | 12 ms |
| ✓ | ContractExecutable > circuits > should return updated contract state | 46 ms |
| ✓ | ContractExecutable > contract maintenance operations > replaceContractMaintenanceAuthority should return new signing key | 32 ms |
| ✓ | ContractExecutable > contract maintenance operations > removeContractOperation should work | 21 ms |
| ✓ | ContractExecutable > contract maintenance operations > addOrReplaceContractOperation should work | 22 ms |
| ✓ | ContractExecutable > contract maintenance operations > should sign a maintenance update with an ECDSA key that verifies against the installed authority | 33 ms |
| ✓ | ContractExecutable > contract maintenance operations > should fail loudly when the signing key uses an unsupported signature scheme | 19 ms |

### `test/effect/ContractExecutableRuntime.test.ts`

| Status | Name | Duration |
| :---: | --- | ---: |
| ✓ | ContractExecutableRuntime > should use given context | 70 ms |

### `test/effect/ContractKeyLocation.test.ts`

| Status | Name | Duration |
| :---: | --- | ---: |
| ✓ | hashVerifierKey > hashes "" to the expected SHA-256 digest | 3 ms |
| ✓ | hashVerifierKey > hashes "abc" to the expected SHA-256 digest | 0 ms |
| ✓ | hashVerifierKey > hashes "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq" to the expected SHA-256 digest | 0 ms |
| ✓ | hashVerifierKey > hashes "The quick brown fox jumps over the lazy dog" to the expected SHA-256 digest | 0 ms |
| ✓ | hashVerifierKey > hashes inputs spanning many blocks | 0 ms |
| ✓ | encodeContractKeyLocation / parseContractKeyLocation > round-trips a canonical location | 1 ms |
| ✓ | encodeContractKeyLocation / parseContractKeyLocation > encodes to the documented grammar | 0 ms |
| ✓ | encodeContractKeyLocation / parseContractKeyLocation > does not parse a protocol builtin | 0 ms |
| ✓ | encodeContractKeyLocation / parseContractKeyLocation > does not parse a bare circuit name | 0 ms |
| ✓ | encodeContractKeyLocation / parseContractKeyLocation > does not parse the wasm default | 0 ms |
| ✓ | encodeContractKeyLocation / parseContractKeyLocation > does not parse a non-hex address | 0 ms |
| ✓ | encodeContractKeyLocation / parseContractKeyLocation > does not parse a missing vk parameter | 0 ms |
| ✓ | encodeContractKeyLocation / parseContractKeyLocation > does not parse a short vk hash | 0 ms |
| ✓ | encodeContractKeyLocation / parseContractKeyLocation > does not parse an uppercase vk hash | 0 ms |
| ✓ | encodeContractKeyLocation / parseContractKeyLocation > does not parse a circuit containing a slash | 0 ms |
| ✓ | encodeContractKeyLocation / parseContractKeyLocation > throws when encoding a non-hex address | 1 ms |
| ✓ | encodeContractKeyLocation / parseContractKeyLocation > throws when encoding a circuit containing "/" | 0 ms |
| ✓ | encodeContractKeyLocation / parseContractKeyLocation > throws when encoding a circuit containing "?" | 0 ms |
| ✓ | encodeContractKeyLocation / parseContractKeyLocation > throws when encoding an empty circuit | 0 ms |
| ✓ | encodeContractKeyLocation / parseContractKeyLocation > throws when encoding a malformed vk hash | 0 ms |

### `test/effect/ContractLog.test.ts`

| Status | Name | Duration |
| :---: | --- | ---: |
| ✓ | ContractLog.decode > preserves the envelope (version + emitting address) on every event | 3 ms |
| ✓ | ContractLog.decode > decodes shielded-spend (nullifier) | 1 ms |
| ✓ | ContractLog.decode > decodes shielded-receive (commitment + optional contract address + ciphertext) | 4 ms |
| ✓ | ContractLog.decode > decodes shielded-mint (commitment + domainSep + amount) | 1 ms |
| ✓ | ContractLog.decode > decodes shielded-burn (nullifier + amount) | 0 ms |
| ✓ | ContractLog.decode > decodes unshielded-spend (sender Either=left → coin-public-key) | 1 ms |
| ✓ | ContractLog.decode > decodes unshielded-receive (recipient Either=right → contract-address) | 3 ms |
| ✓ | ContractLog.decode > decodes unshielded-mint (domainSep + tokenType + amount) | 1 ms |
| ✓ | ContractLog.decode > decodes unshielded-burn (sender + tokenType + amount) | 0 ms |
| ✓ | ContractLog.decode > decodes paused/unpaused as empty-payload lifecycle events | 0 ms |
| ✓ | ContractLog.decode > decodes misc (name + payload) | 2 ms |
| ✓ | ContractLog.decode > handles Maybe=none for optional amount | 0 ms |
| ✓ | ContractLog.decode > graceful degradation (never throws) > degrades a dropped ({ tag: null }) payload | 0 ms |
| ✓ | ContractLog.decode > graceful degradation (never throws) > right-pads a short (trailing-zero-stripped) payload rather than degrading | 1 ms |
| ✓ | ContractLog.decode > graceful degradation (never throws) > degrades the reserved fallback version 0 | 0 ms |
| ✓ | ContractLog.decode > graceful degradation (never throws) > degrades an out-of-range Either discriminant rather than decoding a wrong kind | 0 ms |
| ✓ | ContractLog.decode > graceful degradation (never throws) > degrades a malformed envelope address without throwing | 0 ms |
| ✓ | ContractLog.decode > graceful degradation (never throws) > does not abort a batch when one event has a malformed address | 0 ms |
| ✓ | ContractLog.decode > graceful degradation (never throws) > right-pads short buffers for every event type — never throws, never degrades | 2 ms |
| ✓ | ContractLog.decode — live-emit wire format (SDK#278) > reads shielded-mint amount as little-endian | 0 ms |
| ✓ | ContractLog.decode — live-emit wire format (SDK#278) > reads shielded-burn amount as little-endian | 0 ms |
| ✓ | ContractLog.decode — live-emit wire format (SDK#278) > reads unshielded-mint amount as little-endian | 0 ms |
| ✓ | ContractLog.decode — live-emit wire format (SDK#278) > decodes shielded-receive in commitment · ciphertext · contract-address order | 3 ms |
| ✓ | ContractLog.decode — live-emit wire format (SDK#278) > decodes unshielded-spend sender as a 65-byte Either (discriminant 1 = coin-public-key) | 1 ms |
| ✓ | ContractLog.decode — live-emit wire format (SDK#278) > decodes unshielded-receive recipient as a 65-byte Either (discriminant 0 = contract-address) | 1 ms |
| ✓ | ContractLog.decode — live-emit wire format (SDK#278) > decodes unshielded-burn sender as a 65-byte Either with a little-endian amount | 1 ms |
| ✓ | ContractLog.decodeAll > is index-aligned with the input and preserves order | 1 ms |
| ✓ | ContractLog.decodeAll > preserves degraded events in place rather than dropping them | 0 ms |
| ✓ | ContractLog.indexedFields > derives per-type indexed fields | 0 ms |
| ✓ | ContractLog.indexedFields > indexes the sender/token bytes for unshielded events | 0 ms |
| ✓ | ContractLog.indexedFields > indexes nothing for misc, lifecycle, or degraded events | 0 ms |

### `test/effect/CrossContractCall.test.ts`

| Status | Name | Duration |
| :---: | --- | ---: |
| ✓ | cross-contract calls > stateProvider is called to resolve callee state | 168 ms |
| ✓ | cross-contract calls > incrementInner captures every sub-call plus the root, in trace order | 68 ms |
| ✓ | cross-contract calls > every call exposes its own Zswap local state, keyed to its own contract | 57 ms |
| ✓ | cross-contract calls > getInner reads callee state and returns the root result plus one sub-call | 56 ms |
| ✓ | cross-contract calls > totals gas for the callee as well as the root | 41 ms |
| ✓ | cross-contract calls > uses the exact expected contract address for each returned call | 39 ms |
| ✓ | cross-contract calls > calls the same callee through different circuits with one address but distinct commitments | 46 ms |
| ✓ | cross-contract calls > includes the private input, output, and private transcript outputs for each call | 36 ms |
| ✓ | cross-contract calls > contains the callee's post-execution contract state | 36 ms |
| ✓ | cross-contract calls > takes the result, privateState, and zswapLocalState from the root, not the callee | 33 ms |
| ✓ | cross-contract calls > partitions each call into guaranteed and fallible programs that match the original batch | 38 ms |
| ✓ | cross-contract calls > reports each call's own block context, effects, and commitment indices | 35 ms |
| ✓ | cross-contract calls > exposes the inputs each call's transcript was partitioned from | 34 ms |
| ✓ | cross-contract calls > returns a ContractRuntimeError when the state provider cannot find a callee state | 28 ms |
| ✓ | cross-contract calls > fails with a defined error when a cross-contract call is attempted without a stateProvider | 22 ms |
| ✓ | cross-contract calls > passes the exact parentBlockHash through to the state provider | 35 ms |
| ✓ | cross-contract calls > orders nested cross-contract calls from the deepest completed call back to the root | 45 ms |
| ✓ | cross-contract calls > rejects a self-call where a circuit calls another circuit on its own address (re-entrancy is not supported) | 40 ms |
| ✓ | cross-contract calls > returns a ContractRuntimeError when transcript partitioning returns the wrong number of items | 27 ms |
| ✓ | cross-contract calls > returns a ContractRuntimeError when pre-transcript construction throws | 28 ms |
| ✓ | cross-contract calls > throws the explicit error when the runtime returns no zswap local state | 23 ms |

### `test/effect/DualEraResolution.test.ts`

| Status | Name | Duration |
| :---: | --- | ---: |
| ✓ | two ledger eras in one process > resolves a different compact-runtime line per scope | 80 ms |
| ✓ | two ledger eras in one process > loads both eras' compiled contracts without a version mismatch | 60 ms |
| ✓ | two ledger eras in one process > executes a circuit on each era, in the same process | 110 ms |
| ✓ | two ledger eras in one process > keeps the host process on its own era | 10 ms |

### `test/effect/EraIsolation.test.ts`

| Status | Name | Duration |
| :---: | --- | ---: |
| ✓ | era isolation of built entries > keeps the ledger 8 era out of the ledger 9 entry | 3 ms |
| ✓ | era isolation of built entries > keeps the ledger 9 era out of the ledger 8 entry | 1 ms |
| ✓ | era isolation of built entries > has each era entry reach its own era packages | 2 ms |
| ✓ | era isolation of built entries > keeps the unsuffixed entry on a single era | 1 ms |

### `test/effect/EraLaziness.test.ts`

| Status | Name | Duration |
| :---: | --- | ---: |
| ✓ | era laziness at run time > loads exactly one ledger WASM when only the ledger 9 entry is imported | 445 ms |
| ✓ | era laziness at run time > loads exactly one ledger WASM when only the ledger 8 entry is imported | 380 ms |
| ✓ | era laziness at run time > loads exactly one ledger WASM for the unsuffixed entry | 330 ms |
| ✓ | era laziness at run time > loads both ledger WASMs, distinctly, when both entries are imported | 268 ms |

### `test/effect/Ledger.test.ts`

| Status | Name | Duration |
| :---: | --- | ---: |
| ✓ | Ledger.operationForCircuit > resolves the operation when the state has one for the circuit | 75 ms |
| ✓ | Ledger.operationForCircuit > fails with a ContractRuntimeError naming the circuit and address when the operation is absent | 3 ms |
| ✓ | Ledger.operationForCircuit > fails in the error channel, not as a defect, when the ledger rejects the state | 0 ms |
| ✓ | Ledger.fromRuntimeQueryContext > carries state, address, block and effects | 25 ms |
| ✓ | Ledger.fromRuntimeQueryContext > carries comIndices via the block assignment, despite the readonly declaration | 15 ms |
| ✓ | Ledger conversion error channel > fails with a ContractRuntimeError rather than throwing on undeserializable bytes | 1 ms |

### `test/effect/LedgerDualInstantiation.test.ts`

| Status | Name | Duration |
| :---: | --- | ---: |
| ✓ | a ledger handle from a second instantiation > is rejected by Intent.addDeploy | 14 ms |
| ✓ | a ledger handle from a second instantiation > is rejected by new ChargedState | 1 ms |
| ✓ | a ledger handle from a second instantiation > is rejected by new ContractDeploy | 0 ms |
| ✓ | a ledger handle from a second instantiation > is rejected by partitionTranscripts | 3 ms |
| ✓ | a ledger handle from a second instantiation > is silently discarded by Transaction.fromParts, which does not throw | 5 ms |
| ✓ | a ledger handle from a second instantiation > is silently discarded by Transaction.fromPartsRandomized, which does not throw | 1 ms |
| ✓ | a ledger handle from a second instantiation > is silently discarded by Intent.guaranteedUnshieldedOffer, which does not throw | 3 ms |
| ✓ | a ledger handle from a second instantiation > is silently discarded by Intent.fallibleUnshieldedOffer, which does not throw | 1 ms |
| ✓ | a ledger handle from a second instantiation > is silently discarded by Intent.dustActions, which does not throw | 3 ms |
| ✓ | a ledger handle from a second instantiation > is not the only thing those setters swallow — a wrong class is accepted just as quietly | 11 ms |

### `test/effect/LedgerEra.test.ts`

| Status | Name | Duration |
| :---: | --- | ---: |
| ✓ | Ledger era seam > describes the ledger 9 era | 2 ms |
| ✓ | Ledger era seam > binds the seam to the ledger 9 package | 0 ms |
| ✓ | Ledger era seam > constructs era-versioned values without leaking the version literal | 1 ms |
| ✓ | era-pinned entries > `/v9` mirrors `/v9/effect`, not the unsuffixed root | 1 ms |
| ✓ | era-pinned entries > `/v9/effect` exposes the same API as `/effect` | 0 ms |
| ✓ | era-pinned entries > the unsuffixed root follows the bound era, which is what it is for | 0 ms |
| ✓ | era-pinned entries > `/v9/effect` binds ledger 9 itself rather than following the build's bound era | 0 ms |
| ✓ | era-pinned entries > `/v9/effect` resolves the ledger 9 package | 0 ms |
| ✓ | era-pinned entries > offers the boundary wrapper on both seams of every era entry | 0 ms |
| ✓ | the ledger 8 entry > pins ledger 8 and its paired 0.16 runtime | 0 ms |
| ✓ | the ledger 8 entry > exposes every era-free module, so era-agnostic code compiles against either entry | 1 ms |
| ✓ | the ledger 8 entry > omits contract events, which ledger 8 cannot emit | 0 ms |
| ✓ | the ledger 8 entry > executes contracts, through its own era pair rather than the bound one | 0 ms |
| ✓ | the ledger 8 entry > gives each era entry its own executable, pinned rather than following the build | 0 ms |
| ✓ | transaction composition on the Ledger facade > composes and round-trips an unproven transaction from `/v9/effect` alone | 20 ms |
| ✓ | transaction composition on the Ledger facade > composes and round-trips an unproven transaction from `/v8/effect` alone | 13 ms |
| ✓ | transaction composition on the Ledger facade > drops an intent built on the other era *silently*, which is why both must come from one facade | 2 ms |
| ✓ | transaction composition on the Ledger facade > binds /v9/effect to its own era's composition classes | 0 ms |
| ✓ | transaction composition on the Ledger facade > binds /v8/effect to its own era's composition classes | 0 ms |
| ✓ | transaction composition on the Ledger facade > takes the cost model from each era's ledger, not from its paired runtime | 0 ms |
| ✓ | era capability split > keeps contract events out of the era-neutral surface | 0 ms |
| ✓ | era capability split > exposes contract events on the ledger 9 entry | 0 ms |
| ✓ | era capability split > composes the ledger 9 entry from the era-neutral surface plus the event surface | 0 ms |

### `test/effect/PnpEraResolution.test.ts`

| Status | Name | Duration |
| :---: | --- | ---: |
| ✓ | two ledger eras under the yarn PnP linker > resolves both runtime lines as distinct instances | 427 ms |
| ✓ | two ledger eras under the yarn PnP linker > rejects the node_modules linker's nested-directory recipe | 335 ms |

### `test/effect/Unshielded.test.ts`

| Status | Name | Duration |
| :---: | --- | ---: |
| ✓ | Unshielded Tokens > minting > should return unshielded spends for a given contract address | 119 ms |
| ✓ | Unshielded Tokens > minting > should return unshielded spends for a given user address | 38 ms |
| ✓ | Unshielded Tokens > minting > should return unshielded spends for the deployed contract when minting | 46 ms |
| ✓ | Unshielded Tokens > sending > should return unshielded outputs and spends | 36 ms |
| ✓ | Unshielded Tokens > receiving > should return unshielded inputs | 23 ms |

### `test/effect/ZKManifest.test.ts`

| Status | Name | Duration |
| :---: | --- | ---: |
| ✓ | ZKManifest.parse > parses metadata and flattens directory entries into "<dir>/<file>" keys | 54 ms |
| ✓ | ZKManifest.parse > leaves optional version metadata undefined when absent | 16 ms |
| ✓ | ZKManifest.parse > treats an empty directory as contributing no files | 14 ms |
| ✓ | ZKManifest.parse > fails when manifest-version is missing | 13 ms |
| ✓ | ZKManifest.parse > fails on an unsupported manifest-version | 9 ms |
| ✓ | ZKManifest.parse > fails on malformed JSON | 15 ms |
| ✓ | ZKManifest.parse > rejects a file node with a non-hex hash | 15 ms |
| ✓ | ZKManifest.parse > rejects a file node with a negative size | 13 ms |
| ✓ | ZKManifest.parse > rejects a non-reserved top-level key whose value is a bare string | 9 ms |
| ✓ | ZKManifest.parse > reports a present-but-malformed manifest-version distinctly from a missing one | 10 ms |
| ✓ | ZKManifest.parse > rejects an object-valued optional metadata key instead of silently dropping it | 15 ms |
| ✓ | ZKManifest.parse > safely drops a top-level `__proto__` key without polluting the prototype | 12 ms |
| ✓ | ZKManifest.parse > safely drops a `__proto__` key nested inside a directory | 8 ms |
| ✓ | ZKManifest.parse > rejects a directory name that is not a safe path segment | 9 ms |
| ✓ | ZKManifest.parse > rejects a file name that is not a safe path segment | 6 ms |
| ✓ | ZKManifest.parse > rejects a bare-string file leaf that is not the directory marker | 6 ms |
| ✓ | ZKManifest.parse > rejects a file leaf carrying an unknown property | 11 ms |
| ✓ | ZKManifest.parse > fails with a typed error (not a defect) on pathologically deep nesting | 52 ms |
| ✓ | ZKManifest.parse > rejects a manifest with a duplicated file entry (same path, differing hash) | 11 ms |
| ✓ | ZKManifest.parse > rejects a manifest with a duplicated top-level metadata key | 11 ms |
| ✓ | ZKManifest.parse > detects a duplicate key spelled with a JSON string escape | 8 ms |
| ✓ | ZKManifest.parse > accepts the same file name under two different directories | 6 ms |
| ✓ | ZKManifest.parse > does not mistake key-like structure inside a string value for a duplicate key | 9 ms |
| ✓ | ZKManifest.parse > does not treat repeated strings inside a JSON array as duplicate keys | 9 ms |
| ✓ | ZKManifest.parse > rejects a directory nested more than one level deep | 9 ms |

## `compact-js` — ledger era 8

Source: [`junit/compact-js-era8.xml`](junit/compact-js-era8.xml)

### `test/era8/CrossEraRepartition.test.ts`

| Status | Name | Duration |
| :---: | --- | ---: |
| ✓ | a ledger 8 call composed under ledger 9 > re-partitions under the target era from the inputs the call reported | 72 ms |
| ✓ | a ledger 8 call composed under ledger 9 > requires the state to be encoded across, not handed across | 14 ms |
| ✓ | a ledger 8 call composed under ledger 9 > carries a block and effects ledger 9 accepts unchanged | 13 ms |

### `test/era8/Fixtures.test.ts`

| Status | Name | Duration |
| :---: | --- | ---: |
| ✓ | era 8 fixtures > has a compiled counter contract | 1 ms |
| ✓ | era 8 fixtures > has a compiled unshielded contract | 0 ms |
| ✓ | era 8 fixtures > has the ZK assets for counter | 0 ms |
| ✓ | era 8 fixtures > has the ZK assets for unshielded | 0 ms |

### `test/era8/LedgerEightAdapter.test.ts`

| Status | Name | Duration |
| :---: | --- | ---: |
| ✓ | ledger 8 execution adapter > builds a context the generated ledger 8 contract accepts | 30 ms |
| ✓ | ledger 8 execution adapter > synthesises a single-entry call trace carrying the circuit id and address | 3 ms |
| ✓ | ledger 8 execution adapter > carries the proof data from results onto the trace entry | 3 ms |
| ✓ | ledger 8 execution adapter > captures the initial query context from before execution, not after | 3 ms |
| ✓ | ledger 8 execution adapter > reports no contract events, because the era cannot emit them | 2 ms |
| ✓ | ledger 8 execution adapter > surfaces the root private and zswap state | 2 ms |
| ✓ | ledger 8 execution adapter > stamps the block clock with the given time rather than the wall clock | 0 ms |
| ✓ | ledger 8 execution adapter > falls back to the wall clock when no time is given | 0 ms |
| ✓ | ledger 8 execution adapter > refuses a cross-contract state provider rather than ignoring it | 0 ms |
| ✓ | ledger 8 execution adapter > refuses a cross-contract module provider for the same reason | 0 ms |

### `test/era8/LedgerEightExecutable.test.ts`

| Status | Name | Duration |
| :---: | --- | ---: |
| ✓ | a ledger 8 contract through the `/v8/effect` executable > is the ledger 8 era, not the era the build binds | 1 ms |
| ✓ | a ledger 8 contract through the `/v8/effect` executable > initializes a deployable contract state | 34 ms |
| ✓ | a ledger 8 contract through the `/v8/effect` executable > converts its deploy result through the ledger 8 conversions | 14 ms |
| ✓ | a ledger 8 contract through the `/v8/effect` executable > runs a circuit and reports the root call | 26 ms |
| ✓ | a ledger 8 contract through the `/v8/effect` executable > exposes the inputs its transcript was partitioned from | 12 ms |
| ✓ | a ledger 8 contract through the `/v8/effect` executable > re-partitions to the same transcript from the exposed inputs alone | 13 ms |
| ✓ | a ledger 8 contract through the `/v8/effect` executable > emits no events on an era that cannot emit them | 10 ms |
| ✓ | a ledger 8 contract through the `/v8/effect` executable > reports no gas costs on an era whose runtime cannot total them | 9 ms |
| ✓ | a ledger 8 contract through the `/v8/effect` executable > honours a query gas limit on the older line too | 7 ms |

### `test/era8/LedgerEightExecution.test.ts`

| Status | Name | Duration |
| :---: | --- | ---: |
| ✓ | ledger 8 era execution > binds the compact-runtime 0.16 line | 1 ms |
| ✓ | ledger 8 era execution > loads an artifact compiled for runtime 0.16 without a version mismatch | 11 ms |
| ✓ | ledger 8 era execution > constructs initial contract state on the ledger 8 runtime | 11 ms |
| ✓ | ledger 8 era execution > runs a circuit and records a public transcript | 10 ms |
| ✓ | ledger 8 era execution > returns proof data on the results, not a call-proof trace on the context | 3 ms |

### `test/era8/LedgerEightFacade.test.ts`

| Status | Name | Duration |
| :---: | --- | ---: |
| ✓ | ledger 8 facade > instantiates the conversions for a second era pair | 1 ms |
| ✓ | ledger 8 facade > pairs ledger 8 with the compact-runtime line it declares | 0 ms |
| ✓ | ledger 8 facade > round-trips a ledger 8 contract state through the era-8 conversions | 8 ms |
| ✓ | ledger 8 facade > converts a ledger 8 contract state to its paired runtime state | 6 ms |
| ✓ | ledger 8 facade > produces a bare hex signing key on ledger 8, not a tagged one | 1 ms |
| ✓ | ledger 8 facade > rejects an ECDSA key on ledger 8, which cannot represent one | 0 ms |
| ✓ | ledger 8 facade > is what the `/v8/effect` entry resolves | 67 ms |
| ✓ | ledger 8 facade > exposes no contract-event surface on the `/v8/effect` entry | 1 ms |
| ✓ | ledger 8 facade > offers the boundary wrapper on both halves of the `/v8/effect` entry | 0 ms |
| ✓ | ledger 8 facade > turns a rejected era 8 runtime call into a typed failure, not a defect | 1 ms |
| ✓ | ledger 8 facade > reports the era 8 CMA allowlist in its failure message | 0 ms |

## `compact-js-node` — ledger era 9

Source: [`junit/compact-js-node-era9.xml`](junit/compact-js-node-era9.xml)

### `test/effect/FileSystemContractModuleProvider.test.ts`

| Status | Name | Duration |
| :---: | --- | ---: |
| ✓ | FileSystemContractModuleProvider > resolves an address with no module on disk to undefined | 1 ms |
| ✓ | FileSystemContractModuleProvider > loads a module that has every export resolution reads | 3 ms |
| ✓ | FileSystemContractModuleProvider > rejects a module that lacks an export, naming the file | 4 ms |
| ✓ | FileSystemContractModuleProvider > rejects an export bound to undefined, as the runtime does | 2 ms |
| ✓ | FileSystemContractModuleProvider > rejects an export bound to null, as the runtime does | 1 ms |
| ✓ | FileSystemContractModuleProvider > rejects a Contract that is not a class | 1 ms |
| ✓ | FileSystemContractModuleProvider > finds the module through a caller-supplied layout | 1 ms |
| ✓ | FileSystemContractModuleProvider > resolves an address with nothing on disk to undefined when the layout shares a folder | 0 ms |
| ✓ | FileSystemContractModuleProvider > resolves a string that is not an address to undefined, even where it would reach a module | 0 ms |
| ✓ | FileSystemContractModuleProvider > fails the load, naming the link, when the address links to nothing | 0 ms |
| ✓ | FileSystemContractModuleProvider > fails the load, naming the file, when the address has a directory but no module | 0 ms |

### `test/effect/FileSystemContractStateProvider.test.ts`

| Status | Name | Duration |
| :---: | --- | ---: |
| ✓ | FileSystemContractStateProvider > reads and deserializes a contract state file at <base>/<address> | 16 ms |
| ✓ | FileSystemContractStateProvider > decodes through a caller-supplied era rather than the build's bound one | 2 ms |
| ✓ | FileSystemContractStateProvider > returns undefined when the contract state file is missing | 0 ms |
| ✓ | FileSystemContractStateProvider > propagates a non-ENOENT file system error (path is a directory) | 1 ms |
| ✓ | FileSystemContractStateProvider > uses fileNameForAddress to resolve the contract state file path | 1 ms |
| ✓ | FileSystemContractStateProvider > returns the same state regardless of the block hash | 1 ms |
| ✓ | FileSystemContractStateProvider > rejects with a ContractRuntimeError when the state file exists but contains invalid bytes | 1 ms |

### `test/effect/RuntimeIdentity.test.ts`

| Status | Name | Duration |
| :---: | --- | ---: |
| ✓ | compact-runtime identity > resolves the same compact-runtime module as the CompactRuntime facade | 1 ms |
| ✓ | compact-runtime identity > resolves a compact-runtime on the line the facade is bound to | 0 ms |

## `compact-js-command` — ledger era 9

Source: [`junit/compact-js-command-era9.xml`](junit/compact-js-command-era9.xml)

### `test/effect/Circuit.test.ts`

| Status | Name | Duration |
| :---: | --- | ---: |
| ✓ | Circuit Command > should report error for unknown circuit in manifest | 3590 ms |
| ✓ | Circuit Command > should report success with valid setup | 74 ms |
| ✓ | Circuit Command > reports a runtime rejection of the --input-zswap file instead of dying silently | 41 ms |
| ✓ | Circuit Command > reports a malformed --input-ps file instead of dying silently | 28 ms |
| ✓ | Circuit Command > reports an --input-ps file holding JSON null instead of silently resetting the private state | 24 ms |
| ✓ | Circuit Command > reports a malformed --input-zswap file instead of dying silently | 35 ms |
| ✓ | Circuit Command > reports a runtime rejection when encoding the resulting zswap local state, after the intent is written | 31 ms |
| ✓ | Circuit Command > produces a valid single-call intent for a non-cross-contract circuit | 33 ms |
| ✓ | Circuit Command > should report success with valid ledger parameters | 31 ms |

### `test/effect/CircuitCrossContract.test.ts`

| Status | Name | Duration |
| :---: | --- | ---: |
| ✓ | Circuit Command (cross-contract calls) > --contract-states-dir produces one call per trace entry (root + each callee) | 3636 ms |
| ✓ | Circuit Command (cross-contract calls) > each call's operation is resolvable from its source state (root from --input, callee from dir) | 82 ms |
| ✓ | Circuit Command (cross-contract calls) > --output-oc writes only the root (middle) updated state | 57 ms |
| ✓ | Circuit Command (cross-contract calls) > --output-contract-states-dir writes each callee state by address, creating the dir | 61 ms |
| ✓ | Circuit Command (cross-contract calls) > state-threading round-trip advances v by both increments | 89 ms |
| ✓ | Circuit Command (cross-contract calls) > --output-result / --output-ps / --output-zswap hold the root's values, not a callee's | 44 ms |
| ✓ | Circuit Command (cross-contract calls) > --output-zswap-calls writes every call's zswap state, callees first and the root last | 46 ms |
| ✓ | Circuit Command (cross-contract calls) > a callee state lacking the called operation fails with a reported error | 27 ms |
| ✓ | Circuit Command (cross-contract calls) > a cross-contract circuit with neither directory fails with a reported error | 20 ms |
| ✓ | Circuit Command (cross-contract calls) > one directory without the other is rejected by name, before the circuit runs | 15 ms |
| ✓ | Circuit Command (cross-contract calls) > the modules directory without the states directory is rejected the same way | 18 ms |
| ✓ | Circuit Command (cross-contract calls) > a callee module the provider rejects is reported with its path | 25 ms |
| ✓ | Circuit Command (cross-contract calls) > a callee missing from --contract-states-dir fails with a reported error | 22 ms |
| ✓ | Circuit Command (cross-contract calls) > a read-only cross-contract circuit (getInner) returns the callee value | 67 ms |

### `test/effect/CircuitCrossContractCoins.test.ts`

| Status | Name | Duration |
| :---: | --- | ---: |
| ✓ | Circuit Command (a callee that mints a shielded coin) > --output-zswap-calls holds the callee's coin, which --output-zswap does not | 3669 ms |

### `test/effect/CompiledContractReflection.test.ts`

| Status | Name | Duration |
| :---: | --- | ---: |
| ✓ | CompiledContractReflection > argument parsing > should fail to parse with an invalid argument (bigint: abc) | 45 ms |
| ✓ | CompiledContractReflection > argument parsing > should fail to parse with an invalid argument (bigint: ) | 9 ms |
| ✓ | CompiledContractReflection > argument parsing > should fail to parse with an invalid argument (bigint:    ) | 7 ms |
| ✓ | CompiledContractReflection > argument parsing > should fail to parse with an invalid argument (boolean: maybe) | 5 ms |
| ✓ | CompiledContractReflection > argument parsing > should fail to parse with an invalid argument (boolean: trueX) | 5 ms |
| ✓ | CompiledContractReflection > argument parsing > should fail to parse with an invalid argument (boolean: xfalse) | 6 ms |
| ✓ | CompiledContractReflection > argument parsing > should fail to parse with an invalid argument (number: abc) | 5 ms |
| ✓ | CompiledContractReflection > argument parsing > should fail to parse with an invalid argument (number: ) | 5 ms |
| ✓ | CompiledContractReflection > argument parsing > should fail to parse with an invalid argument (number: Infinity) | 6 ms |
| ✓ | CompiledContractReflection > argument parsing > should fail to parse with an invalid argument (number: -Infinity) | 5 ms |
| ✓ | CompiledContractReflection > argument parsing > should fail to parse with an invalid argument (number: 1e999) | 5 ms |
| ✓ | CompiledContractReflection > argument parsing > should parse with a valid argument (number) | 7 ms |
| ✓ | CompiledContractReflection > argument parsing > should parse with a valid argument (bigint) | 6 ms |
| ✓ | CompiledContractReflection > argument parsing > should parse with a valid argument (boolean) | 6 ms |
| ✓ | CompiledContractReflection > argument parsing > should parse with a valid argument (boolean) | 5 ms |
| ✓ | CompiledContractReflection > argument parsing > should parse with a valid argument (string) | 5 ms |
| ✓ | CompiledContractReflection > argument parsing > should parse with a valid argument (Uint8Array) | 5 ms |
| ✓ | CompiledContractReflection > argument parsing > should parse multiple arguments | 6 ms |
| ✓ | CompiledContractReflection > argument parsing > should fail when parsing an invalid tuple element | 5 ms |
| ✓ | CompiledContractReflection > argument parsing > should parse multiple valid tuple type elements | 5 ms |
| ✓ | CompiledContractReflection > argument parsing > should parse nested tuple type elements | 6 ms |
| ✓ | CompiledContractReflection > argument parsing > should parse object literal type elements | 6 ms |
| ✓ | CompiledContractReflection > argument parsing > should parse object literal type elements containing tuple types | 10 ms |
| ✓ | CompiledContractReflection > argument parsing > should parse nested object literal type elements | 5 ms |
| ✓ | CompiledContractReflection > argument parsing > should parse object with bytes property as Bech32m-encoded string | 6 ms |
| ✓ | CompiledContractReflection > argument parsing > should successfully parse object with bytes property as hex string | 7 ms |
| ✓ | CompiledContractReflection > argument parsing > should parse object with nested bytes property as Bech32m string | 7 ms |
| ✓ | CompiledContractReflection > argument parsing > should parse a named struct type alias (ShieldedCoinInfo) | 9 ms |
| ✓ | CompiledContractReflection > argument parsing > should preserve a quoted bigint in a named struct alias | 7 ms |
| ✓ | CompiledContractReflection > argument parsing > should reject an unsafe unquoted bigint in a named struct alias | 7 ms |
| ✓ | CompiledContractReflection > argument parsing > should parse multiple named struct alias arguments | 7 ms |
| ✓ | CompiledContractReflection > argument parsing > should resolve a named alias that references another named alias | 6 ms |
| ✓ | CompiledContractReflection > argument parsing > should fail with a descriptive error for an unknown type reference | 6 ms |
| ✓ | CompiledContractReflection > argument parsing > should parse a generic alias by binding its type argument (Maybe<bigint>) | 5 ms |
| ✓ | CompiledContractReflection > argument parsing > should report a coherent cause chain for an invalid value inside a generic instantiation | 6 ms |
| ✓ | CompiledContractReflection > argument parsing > should parse a generic alias whose type argument needs decoding (Maybe<Uint8Array>) | 7 ms |
| ✓ | CompiledContractReflection > argument parsing > should parse an array of a generic alias (Maybe<string>[]) | 8 ms |
| ✓ | CompiledContractReflection > argument parsing > should parse a nested generic alias without type-parameter collision (Maybe<Maybe<bigint>>) | 9 ms |
| ✓ | CompiledContractReflection > argument parsing > should parse a multi-parameter generic alias (Either<bigint, string>) | 8 ms |
| ✓ | CompiledContractReflection > argument parsing > should resolve a type parameter passed through to another generic alias | 7 ms |
| ✓ | CompiledContractReflection > argument parsing > should resolve a type parameter used as an array element type | 6 ms |
| ✓ | CompiledContractReflection > argument parsing > should resolve a type parameter used as a tuple element type | 16 ms |
| ✓ | CompiledContractReflection > argument parsing > should let a type parameter shadow a same-named alias | 7 ms |
| ✓ | CompiledContractReflection > argument parsing > should fail when a generic struct member is missing rather than decoding it as NaN | 6 ms |
| ✓ | CompiledContractReflection > argument parsing > should apply a type-parameter default when the argument is omitted | 6 ms |
| ✓ | CompiledContractReflection > argument parsing > should prefer an explicit type argument over the default | 6 ms |
| ✓ | CompiledContractReflection > argument parsing > should resolve a default that references an earlier type parameter | 6 ms |
| ✓ | CompiledContractReflection > argument parsing > should fail when more type arguments are given than the alias declares | 6 ms |
| ✓ | CompiledContractReflection > argument parsing > should fail when a generic alias is used without its type argument | 5 ms |
| ✓ | CompiledContractReflection > argument parsing > should resolve 25 levels of a recursive alias, which consume input | 14 ms |
| ✓ | CompiledContractReflection > argument parsing > should resolve 100 levels of a recursive alias, which consume input | 107 ms |
| ✓ | CompiledContractReflection > argument parsing > should fail with a depth limit rather than overflowing the stack for a self-referential alias | 6 ms |
| ✓ | CompiledContractReflection > argument parsing > should fail with a depth limit rather than overflowing the stack for a mutually recursive alias pair | 7 ms |
| ✓ | CompiledContractReflection > argument parsing > should fail with a depth limit rather than overflowing the stack for a self-referential generic alias | 6 ms |
| ✓ | CompiledContractReflection > argument parsing > should still resolve a recursive alias that consumes input at each step | 4 ms |

### `test/effect/ConfigCompiler.test.ts`

| Status | Name | Duration |
| :---: | --- | ---: |
| ✓ | ConfigCompiler > layer > with valid and well formed configuration file > should compile and return module | 3593 ms |

### `test/effect/ConfigCompilerToolchain.test.ts`

| Status | Name | Duration |
| :---: | --- | ---: |
| ✓ | the TypeScript toolchain behind ConfigCompiler > is declared as a dependency, bounded below the TypeScript 7 line | 2 ms |
| ✓ | the TypeScript toolchain behind ConfigCompiler > transpiles TypeScript through ts-node | 1736 ms |

### `test/effect/ConfigFixtureResolution.test.ts`

| Status | Name | Duration |
| :---: | --- | ---: |
| ✓ | contract configuration fixtures > should be discovered | 2 ms |
| ✓ | contract configuration fixtures > cccMiddle/contract.config.ts > should import the compiled contract with a specifier Node can resolve | 1 ms |
| ✓ | contract configuration fixtures > cccMintCaller/contract.config.ts > should import the compiled contract with a specifier Node can resolve | 0 ms |
| ✓ | contract configuration fixtures > counter/brokenWitness.config.ts > should import the compiled contract with a specifier Node can resolve | 0 ms |
| ✓ | contract configuration fixtures > counter/contract.config.ts > should import the compiled contract with a specifier Node can resolve | 0 ms |
| ✓ | contract configuration fixtures > counter-v8/contract.config.ts > should import the compiled contract with a specifier Node can resolve | 0 ms |

### `test/effect/Deploy.test.ts`

| Status | Name | Duration |
| :---: | --- | ---: |
| ✓ | Deploy Command > should report success with valid setup | 3602 ms |
| ✓ | Deploy Command > reports a runtime rejection when encoding the initial zswap local state, after the intent is written | 44 ms |

### `test/effect/EraSelection.test.ts`

| Status | Name | Duration |
| :---: | --- | ---: |
| ✓ | era selection > the era registry > holds one command set per selectable era, each pinned to its own era pair | 2 ms |
| ✓ | era selection > the era registry > applies the handler factories once per era | 0 ms |
| ✓ | era selection > the era registry > defaults to the era this build binds | 0 ms |
| ✓ | era selection > the era registry > refuses an era it has no command set for | 1 ms |
| ✓ | era selection > the shared intent operations > builds its intent from the era it was given | 28 ms |
| ✓ | era selection > the shared intent operations > routes every ledger call through the era's own boundary wrapper | 14 ms |
| ✓ | era selection > the shared intent operations > turns a rejection from the era into a typed failure, not a defect | 11 ms |
| ✓ | era selection > era capabilities > rejects --contract-states-dir on an era with no cross-contract calls | 9 ms |
| ✓ | era selection > era capabilities > rejects --output-contract-states-dir on the same era | 10 ms |
| ✓ | era selection > era capabilities > rejects --output-events on an era that cannot emit them | 10 ms |
| ✓ | era selection > era capabilities > lets both options past on an era that has the capabilities | 21 ms |

### `test/effect/ErrorReporting.test.ts`

| Status | Name | Duration |
| :---: | --- | ---: |
| ✓ | reportContractExecutionError > reports an error whose cause is a bare string rather than dying | 38 ms |
| ✓ | reportContractExecutionError > reports an error whose cause chain reaches a value with no message | 22 ms |
| ✓ | reportContractExecutionError > reports an error whose cause has a null prototype rather than dying | 24 ms |
| ✓ | reportContractExecutionError > reports a self-referential cause chain rather than overflowing the stack | 14 ms |
| ✓ | reportContractExecutionError > reports what loading a cross-contract callee rejected with | 14 ms |
| ✓ | a command that fails in a way it does not handle > reports a misspelled witness instead of exiting silently | 3468 ms |
| ✓ | a command that fails in a way it does not handle > reports a defect that escapes the failure channel | 11 ms |

### `test/effect/LedgerEraOption.test.ts`

| Status | Name | Duration |
| :---: | --- | ---: |
| ✓ | --ledger-era option > runs the era this build binds when the option is omitted | 3656 ms |
| ✓ | --ledger-era option > accepts the era this build binds | 37 ms |
| ✓ | --ledger-era option > accepts a registered era other than the bound one | 21 ms |
| ✓ | --ledger-era option > rejects an era this build has no command set for | 20 ms |
| ✓ | --ledger-era option > `circuit` reports a configuration built for another era | 14 ms |
| ✓ | --ledger-era option > `deploy` reports a configuration built for another era | 11 ms |
| ✓ | --ledger-era option > `maintain contract` reports a configuration built for another era | 20 ms |
| ✓ | --ledger-era option > `maintain circuit` reports a configuration built for another era | 15 ms |

### `test/effect/MaintainCircuit.test.ts`

| Status | Name | Duration |
| :---: | --- | ---: |
| ✓ | Maintain Circuit Command > should report success with valid setup | 3596 ms |

### `test/effect/MaintainContract.test.ts`

| Status | Name | Duration |
| :---: | --- | ---: |
| ✓ | Maintain Contract Command > should report success with valid setup | 3586 ms |

### `test/effect/RuntimeIdentity.test.ts`

| Status | Name | Duration |
| :---: | --- | ---: |
| ✓ | compact-runtime identity > resolves the same compact-runtime module as the CompactRuntime facade | 1 ms |
| ✓ | compact-runtime identity > resolves a compact-runtime on the line the facade is bound to | 0 ms |

### `test/effect/encodedZswapLocalStateSchema.test.ts`

| Status | Name | Duration |
| :---: | --- | ---: |
| ✓ | EncodedZswapLocalStateSchema > round-trips a state carrying inputs and outputs through JSON | 34 ms |
| ✓ | EncodedZswapLocalStateSchema > encodes bigints and byte arrays to JSON-representable forms | 19 ms |

### `test/effect/json.test.ts`

| Status | Name | Duration |
| :---: | --- | ---: |
| ✓ | stringifyCircuitOutput > encodes bigint as a decimal string | 2 ms |
| ✓ | stringifyCircuitOutput > encodes Uint8Array as a number array rather than an indexed object | 0 ms |
| ✓ | stringifyCircuitOutput > serializes a non-empty log-event array carrying bigint and Uint8Array payloads | 1 ms |
| ✓ | stringifyCircuitOutput > applies indentation when a space argument is given | 0 ms |
| ✓ | stringifyCircuitOutput > leaves ordinary JSON values untouched via the replacer | 0 ms |

## `compact-js-command` — ledger era 8

Source: [`junit/compact-js-command-era8.xml`](junit/compact-js-command-era8.xml)

### `test/era8/LedgerEightCommands.test.ts`

| Status | Name | Duration |
| :---: | --- | ---: |
| ✓ | the CLI targeting ledger 8 > deploys a ledger 8 contract and writes ledger 8 artifacts | 769 ms |
| ✓ | the CLI targeting ledger 8 > writes a contract state ledger 8 can read and ledger 9 cannot | 19 ms |
| ✓ | the CLI targeting ledger 8 > refuses the options ledger 8 cannot honour, by name | 8 ms |

