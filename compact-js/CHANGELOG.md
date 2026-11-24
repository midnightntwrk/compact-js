# @midnightntwrk/compact-js

## 4.0.0

### Major Changes

- [#45](https://github.com/midnightntwrk/compact-js/pull/45) [`ffb1e95`](https://github.com/midnightntwrk/compact-js/commit/ffb1e95bc06faedc3d94cb5b75bf498f6ee828c5) Thanks [@VanessaPC](https://github.com/VanessaPC)! - The published packages move from the `@midnight-ntwrk` scope to `@midnightntwrk`, and from GitHub Packages to npmjs.

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

- [#71](https://github.com/midnightntwrk/compact-js/pull/71) [`af3b418`](https://github.com/midnightntwrk/compact-js/commit/af3b418cda823c628f8b6d24ad8de37a5cdc7a40) Thanks [@VanessaPC](https://github.com/VanessaPC)! - Let the CLI state a signing key's signature scheme, and stop interpolating the key into an error.

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
