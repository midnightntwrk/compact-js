# Release note overlay — copy to `<version>.md` beside this file

Everything below is optional. Delete any section you have nothing to say about and the
generated content stands; keep a section and it replaces the generated one. Three sections
merge rather than replace, so you only write the parts you want to change:

- **Metadata**, **Deployment information**, **Links and references** — merge by `- **Label**:`
- **Tested-with versions** — merges by the table's first column

This file itself is never read: the generator only looks for `_base.md` and `<version>.md`.

## High-level summary

One to three sentences on the most important changes. Lead with what a consumer has to do
differently, not with the internal work that caused it.

## Dependencies

Hard, component-local incompatibilities only — a minimum toolchain, a breaking peer. Write `—`
if there are none.

**Downstream impact (cascading effects).** What a consuming SDK or DApp inherits by taking this
release. Write `—` if nothing.

## Tested-with versions

Only the rows the repository cannot derive. The package pins, the compactc version and the
ledger bindings are read from the manifests and `.github/env/global.env` — leave those out.

| Component | Tested-with version |
| --- | --- |
| wallet SDK | X.Y.Z |
| proof server | X.Y.Z |
| node | X.Y.Z |
| indexer | X.Y.Z |
| midnight.js | X.Y.Z |

## New features requiring configuration updates

Setup a consumer has to do before the first run on this release. Write `None.` if there is none.

### Name of the thing

**Required updates**: when these apply.

- The concrete step.

**Impact**: why it is needed and what happens without it.

## Breaking changes

Only when the generated items need more than the changeset gave them — each generated item
carries the changeset prose under **What changed** and leaves **What breaks**, **Required
actions** and **Code example** as TODO markers. Keeping this section means writing out every
breaking change, including the ones that were generated correctly.

### Name of the breaking change

**What changed**: the mechanism.

**What breaks**: the exact scenarios that stop working.

**Required actions**: for every affected consumer.

- The concrete step.

**Code example**:

```ts
// before → after
```

## Known issues

Issues known at release time. Write `None.` if there are none.

### Name of the issue

**Description**: what is affected and under what conditions ([issue #N](https://github.com/midnightntwrk/compact-js/issues/N)).

**Workaround (if any)**: what a consumer can do instead, or that there is nothing.

## Links and references

Only the links that differ from the generated defaults.

- **QA test coverage / test evidence**: <public link, or `—`>
- **Engineering docs**: <public link, or `—`>
- **Migration guides**: <public link, or `—`>
- **Related component releases**: <public links, or `—`>
