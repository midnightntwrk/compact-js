# @midnightntwrk/compact-js-node

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

- Updated dependencies [[`ffb1e95`](https://github.com/midnightntwrk/compact-js/commit/ffb1e95bc06faedc3d94cb5b75bf498f6ee828c5), [`af3b418`](https://github.com/midnightntwrk/compact-js/commit/af3b418cda823c628f8b6d24ad8de37a5cdc7a40)]:
  - @midnightntwrk/compact-js@4.0.0
