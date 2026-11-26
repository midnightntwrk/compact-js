# @midnightntwrk/compact-js-node

## 5.0.0

### Patch Changes

- Updated dependencies [[`ce74075`](https://github.com/midnightntwrk/compact-js/commit/ce74075139afc4544a76b2cc022f3bb3e943f897)]:
  - @midnightntwrk/compact-js@5.0.0

## 4.0.0

### Major Changes

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

- Updated dependencies [[`74c41c4`](https://github.com/midnightntwrk/compact-js/commit/74c41c46525ecd122832e5aa36a49c21ff4d50c1), [`6e2c2db`](https://github.com/midnightntwrk/compact-js/commit/6e2c2db6842bc7726e37c590ee439058e6d7a308), [`6e2c2db`](https://github.com/midnightntwrk/compact-js/commit/6e2c2db6842bc7726e37c590ee439058e6d7a308)]:
  - @midnightntwrk/compact-js@4.0.0
