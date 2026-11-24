---
'@midnightntwrk/compact-js': major
---

`CompactRuntime.sampleSigningKey` is removed from `/v9/effect` and the unsuffixed `/effect` entry.

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
