---
'@midnight-ntwrk/compact-js': patch
'@midnight-ntwrk/compact-js-node': patch
'@midnight-ntwrk/compact-js-command': patch
---

Ledger 9 now builds against `@midnightntwrk/ledger-v9` `1.0.0-rc.7`, so transcripts are
partitioned with the cost model of midnight-node `2.1.100-rc.4`, and calls that overwrite existing
ledger state no longer fail its gas-budget check.
