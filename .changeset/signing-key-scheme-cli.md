---
'@midnightntwrk/compact-js': patch
'@midnightntwrk/compact-js-command': minor
---

Let the CLI state a signing key's signature scheme, and stop interpolating the key into an error.

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
