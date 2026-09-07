---
'@midnight-ntwrk/compact-js': major
---

Remove the CommonJS build. The package is now published as ESM only: the `build-cjs`
step and its `tsconfig.cjs.json` are gone, and the `main` entry point (`./dist/cjs/index.js`)
has been dropped. Consumers using `require('@midnight-ntwrk/compact-js')` must switch to
an ESM `import`.
