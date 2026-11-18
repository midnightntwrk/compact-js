# Compact.js

## Introduction

Compact.js provides a Typescript-based execution environment for smart contracts
compiled with the [Compact](https://docs.midnight.network/develop/reference/compact/) language.
When a Compact smart contract is compiled with `compactc`, part of the output includes:

1. A JavaScript file.
2. A TypeScript [declaration file](https://www.typescriptlang.org/docs/handbook/2/type-declarations.html).

The JavaScript file contains:

- The execution logic for each circuit in the source contract,
- Logic for constructing the contract’s initial state,
- Utilities for converting on-chain contract state into a JavaScript representation.

Compact.js uses this file at run time to execute the circuits. The circuit execution results are
then used by higher level tools and frameworks (such as Midnight.js) in order to create and submit
transactions to the Midnight blockchain. At compile time, the types and utilities of Compact.js use
the TypeScript declaration file and the definitions it contains, to map types that make working with
the contract and its circuits more convenient, and TypeScript idiomatic.

> [!NOTE]  
> The term _runtime_ is often used to describe the JavaScript executable for a contract. This is
> distinct from the package `@midnight-ntwrk/compact-runtime`, which provides the utilities that each of
> these JavaScript executables use.

## Release Process

Releases are driven by [Changesets](https://github.com/changesets/changesets). Nothing is
hand-versioned and no tag is pushed by hand.

1. **Every PR that ships a change carries a changeset** — run `yarn changeset`, pick the
   semver bump, and write the summary a consumer will read. That summary becomes the
   release note. CI fails a PR without one.
2. **CD opens a "Version Packages" PR** on each push to `main`, applying the pending
   changesets to the manifests and CHANGELOGs.
3. **Merging that PR cuts the release** — CD publishes to npmjs, tags, and creates the
   GitHub Releases, behind a reviewer gate.

The three packages are a `fixed` group and always publish at the same version.

Full detail, including release candidates and how publishing is authenticated, is in
[`docs/releasing.md`](docs/releasing.md).
