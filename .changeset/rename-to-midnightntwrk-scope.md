---
'@midnightntwrk/compact-js': major
'@midnightntwrk/compact-js-command': major
'@midnightntwrk/compact-js-node': major
---

The published packages move from the `@midnight-ntwrk` scope to `@midnightntwrk`, and from GitHub Packages to npmjs.

Update the dependency names and every import:

```diff
-import { ContractExecutable } from '@midnight-ntwrk/compact-js/effect';
+import { ContractExecutable } from '@midnightntwrk/compact-js/effect';
```

This includes the import at the top of a `contract.config.ts`. Mixing the two scopes in one project loads two copies of the library with no warning.

Installing these three packages no longer needs a GitHub Packages token. Upstream `@midnight-ntwrk` dependencies — `compact-runtime`, `platform-js`, `midnight-js-*` — keep their scope and still resolve from GitHub Packages.

`@midnight-ntwrk/compact-js`, `-node` and `-command` stop receiving updates at 3.0.2. There is no alias mirror under the old scope.
