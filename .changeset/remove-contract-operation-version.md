---
'@midnightntwrk/compact-js': minor
---

`ContractExecutable.removeContractOperation` now removes the circuit's verifier key at **every**
operation version the era can hold one at, instead of only the era's fixed insert version.

The ledger keys a circuit's verifier keys by version, and ledger 9 holds both `v3`
(`verifier-key[v6]`, ZKIR v2) and `v4` (`verifier-key[v7]`, what compactc 0.36 emits). A
`VerifierKeyRemove` carries no key, so nothing downstream checks the version it is given: a removal
aimed at the era's constant cleared whichever slot that named, empty or not, was accepted, and left
any key at the other version in place. Two ways to reach that:

- A contract compiled before 0.36 holds its only key at `v3`, so the removal cleared an empty `v4`
  slot and the caller paid proving and fees for a transaction that did nothing.
- A contract deployed before 0.36 and since upgraded through `addOrReplaceContractOperation` holds
  a key at *both*, and `ContractOperation.verifierKey` exposes only the latest — so the `v3` key
  could not be read back at all, and a circuit its operator believed decommissioned stayed callable
  with a `v3` proof.

Sweeping every version is what makes the second case fixable: there is no ledger API to enumerate
which versions a contract actually holds. Removing a version the contract does not hold is
accepted, which is what made the original defect silent in the first place. Insert is unchanged —
the ledger rejects a key whose tag disagrees with the version it is wrapped at, so it already
failed loudly.

Removing from a contract state that has no operation for the circuit — a state file for the wrong
contract — now fails with a `ContractConfigurationError` instead of producing a well-formed no-op
update.

`Ledger.contractOperationVersions()` is new on every era entry and is what the sweep reads. Ledger 8
reports one version, since it predates the second proof system.
