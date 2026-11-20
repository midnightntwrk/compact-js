# Compact.js (Node.js Platform)

> [!IMPORTANT]
> **Renamed at 4.0.0.** This package was `@midnight-ntwrk/compact-js-node` and is now
> `@midnightntwrk/compact-js-node` — note the missing hyphen — published to npmjs rather
> than GitHub Packages. Update the dependency and every import. The old name stops at
> `3.0.2`, and it must not be mixed with the new `@midnightntwrk/compact-js`: the two
> scopes are different packages, so the service types would not match.

## Introduction

Provides implementations of Compact.js service types that are specific to the Node.js runtime.

## Services Provided

- `ZKFileConfiguration`. An implementation of `ZKConfiguration` that reads ZK assets from the file system.
