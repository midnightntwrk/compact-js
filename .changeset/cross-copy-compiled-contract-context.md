---
'@midnight-ntwrk/compact-js': patch
---

Fix `CompiledContract`s becoming unusable when two copies of Compact.js are loaded in one
process (for example, an application selects one version while `midnight-js` pins another).
The internal contract context was stored under a module-local `Symbol()`, unique to each
loaded copy, so a consuming copy found no context and threw
`TypeError: Cannot read properties of undefined (reading 'ctor')`. The context key now comes
from the global symbol registry — the convention already used by every other type identifier
in this package — so identical copies can consume each other's contracts. A contract with no
context at all (a genuinely incompatible producer) now fails with the intended
`Invalid CompactContext (missing constructor)` error instead of the raw `TypeError`.
