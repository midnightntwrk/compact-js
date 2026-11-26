# @midnightntwrk/compact-js

## 5.0.0

### Minor Changes

- [#80](https://github.com/midnightntwrk/compact-js/pull/80) [`ce74075`](https://github.com/midnightntwrk/compact-js/commit/ce74075139afc4544a76b2cc022f3bb3e943f897) Thanks [@VanessaPC](https://github.com/VanessaPC)! - `ContractExecutable.removeContractOperation` now removes the circuit's verifier key at **every**
  operation version the era can hold one at, instead of only the era's fixed insert version.

  The ledger keys a circuit's verifier keys by version, and ledger 9 holds both `v3`
  (`verifier-key[v6]`, ZKIR v2) and `v4` (`verifier-key[v7]`, what compactc 0.36 emits). A
  `VerifierKeyRemove` carries no key, so nothing downstream checks the version it is given: a removal
  aimed at the era's constant cleared whichever slot that named, empty or not, was accepted, and left
  any key at the other version in place. Two ways to reach that:

  - A contract compiled before 0.36 holds its only key at `v3`, so the removal cleared an empty `v4`
    slot and the caller paid proving and fees for a transaction that did nothing.
  - A contract deployed before 0.36 and since upgraded through `addOrReplaceContractOperation` holds
    a key at _both_, and `ContractOperation.verifierKey` exposes only the latest — so the `v3` key
    could not be read back at all, and a circuit its operator believed decommissioned stayed callable
    with a `v3` proof.

  Sweeping every version is what makes the second case fixable: there is no ledger API to enumerate
  which versions a contract actually holds. Removing a version the contract does not hold is
  accepted, which is what made the original defect silent in the first place. Insert is unchanged —
  the ledger rejects a key whose tag disagrees with the version it is wrapped at, so it already
  failed loudly.

  Removing from a contract state that has no operation for the circuit — a state file for the wrong
  contract — now fails with a `ContractConfigurationError` instead of producing a well-formed no-op
  update.

  `Ledger.contractOperationVersions()` is new on every era entry and is what the sweep reads. Ledger 8
  reports one version, since it predates the second proof system.

## 4.0.0

### Major Changes

- [#76](https://github.com/midnightntwrk/compact-js/pull/76) [`74c41c4`](https://github.com/midnightntwrk/compact-js/commit/74c41c46525ecd122832e5aa36a49c21ff4d50c1) Thanks [@VanessaPC](https://github.com/VanessaPC)! - `CompactRuntime.sampleSigningKey` is removed from `/v9/effect` and the unsuffixed `/effect` entry.

  It was compact-runtime 0.21's raw function, re-exported by the ledger 9 runtime binding and by
  nothing else: `/v8/effect` never carried it, so it was the single member by which the two eras'
  facades differed. Era-neutral code that called it compiled against ledger 9 and failed to compile
  against ledger 8. Publishing it on both would have been worse — 0.16's `sampleSigningKey()` takes
  no argument, so the scheme would have been dropped in silence.

  Use `CompactRuntime.makeSampleSigningKey(kind)` instead. It is present on both eras, takes the
  scheme on both, and returns the key in the line's own native representation — tagged
  (`{ tag, value }`) on ledger 9, bare hex on ledger 8. Read the hex era-neutrally with
  `CompactRuntime.signingKeyHex(key)`:

  ```diff
  -const key = CompactRuntime.sampleSigningKey('schnorr');
  +const key = CompactRuntime.makeSampleSigningKey('schnorr');
  +const hex = CompactRuntime.signingKeyHex(key);
  ```

  Ledger 8 has no scheme concept and permits `schnorr` only, so consult the era's allowlist before
  choosing `kind` — `makeSampleSigningKey` ignores the argument on that line.

- [#78](https://github.com/midnightntwrk/compact-js/pull/78) [`6e2c2db`](https://github.com/midnightntwrk/compact-js/commit/6e2c2db6842bc7726e37c590ee439058e6d7a308) Thanks [@VanessaPC](https://github.com/VanessaPC)! - The published packages move from the `@midnight-ntwrk` scope to `@midnightntwrk`, and from GitHub Packages to npmjs.

  Update the dependency names and every import:

  ```diff
  -import { ContractExecutable } from '@midnight-ntwrk/compact-js/effect';
  +import { ContractExecutable } from '@midnightntwrk/compact-js/effect';
  ```

  This includes the import at the top of a `contract.config.ts`. Mixing the two scopes in one project loads two copies of the library with no warning.

  Installing no longer needs a GitHub Packages token, for these three packages or for anything they depend on. Upstream dependencies that are still published under `@midnight-ntwrk` — `compact-runtime`, `platform-js`, `midnight-js-*` — keep that scope but now resolve from npmjs, so a clean clone installs anonymously.

  `compact-js-command` follows the same rename in one of its own dependencies, `@midnight-ntwrk/wallet-sdk-address-format@3.1.0` to `@midnightntwrk/wallet-sdk-address-format@3.1.2`. Nothing from it is re-exported, so this is visible only to a project that pins or dedupes that package itself.

  `@midnight-ntwrk/compact-js`, `-node` and `-command` stop receiving updates at 3.0.2. There is no alias mirror under the old scope.

### Patch Changes

- [#78](https://github.com/midnightntwrk/compact-js/pull/78) [`6e2c2db`](https://github.com/midnightntwrk/compact-js/commit/6e2c2db6842bc7726e37c590ee439058e6d7a308) Thanks [@VanessaPC](https://github.com/VanessaPC)! - Let the CLI state a signing key's signature scheme, and stop interpolating the key into an error.

  `compact-js-command` gains `--signing-kind schnorr|ecdsa`, which feeds `keys.signingKind` and so
  takes precedence over `KEYS_SIGNING_KIND` and the contract configuration; omitting it leaves both
  in force. `maintain contract` gains `--new-signing-kind` for the new authority key, which
  previously always took platform-js's default and so installed a Schnorr authority for a caller
  rotating to ECDSA. The new key's scheme now defaults to the selected era's own, and `--signing` is
  documented as the secret key it is rather than "a public BIP-340 signing key". Choosing `ecdsa`
  under `--ledger-era 8` is refused by name, as it already was through the library.

  Neither option validates the key against the scheme: both schemes use 32-byte scalars and ledger 9
  derives a valid verifying key from the same bytes under either, so naming the scheme stops the CLI
  choosing silently — it cannot detect a caller who names it wrongly.

  In `compact-js`, the error raised when a signature verifying key cannot be derived named the whole
  signing key. It rendered as `[object Object]` only because platform-js tags keys; before that it
  printed the secret key verbatim. It now names the scheme and the key's byte length.
