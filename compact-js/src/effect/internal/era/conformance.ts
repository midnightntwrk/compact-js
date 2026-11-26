/*
 * This file is part of midnight-sdk.
 * Copyright (C) 2025 Midnight Foundation
 * SPDX-License-Identifier: Apache-2.0
 * Licensed under the Apache License, Version 2.0 (the "License");
 * You may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Compile-time surface parity across the era entries (#65).
 *
 * @remarks
 * The facade contract is that every era entry presents the same members, so a name added to one
 * era's binding and not the other's must fail the build. Nothing enforced that:
 * `internal/{ledger,runtime}/conformance.ts` holds each binding to its contract *individually* —
 * a contract that a one-era name violates on neither side — and the entry-level key comparisons in
 * `LedgerEra.test.ts` agree however the namespaces differ. `sampleSigningKey` shipped on
 * `/v9/effect`'s `CompactRuntime` and not `/v8/effect`'s through that gap (#64).
 *
 * Checked on the **entries** rather than the bindings, which subsumes them: each facade
 * `export *`s its binding, and an entry exposes the facade. `keyof` of a union is the intersection
 * of its members' keys, so one union per surface states the whole check and a new era joins by
 * being added to those unions.
 *
 * This covers the **value** half of each surface — `keyof` sees exported values only, which is
 * also what a consumer's `import` yields, and what #64 was. Type-only re-exports are unreachable
 * from here (`keyof typeof Namespace` omits them) and are pinned by
 * `test/effect/EraSurfaceParity.test.ts`, which enumerates them through the compiler API.
 *
 * `import type` only: this module is erased entirely, so neither era entry is instantiated and no
 * WASM is reached by checking them.
 *
 * @internal
 */
import type * as V8Entry from '../../../v8/effect.js';
import type * as V9Entry from '../../../v9/effect.js';

// `never` is the only inhabitant of `never`, so a divergence instantiates this with the names that
// diverged and fails the build quoting them.
type AssertShared<_Names extends never> = void;

// Distributes over the union, where a bare `keyof` would intersect: the two together are "present
// on some era" minus "present on every era".
type AnyName<Entries> = Entries extends unknown ? keyof Entries : never;
type Divergent<Entries, Gated = never> = Exclude<AnyName<Entries>, keyof Entries | Gated>;

/**
 * The one capability an era entry may withhold: ledger 8 cannot emit contract events at all —
 * onchain-runtime-v3 has no `LogEvent`, accumulates none, and its `log` payload carries no
 * emitting-contract address — so these are *absent* from that entry rather than present and
 * failing at run time, which is what #388 asks for.
 *
 * Every other era difference so far is a type, and therefore invisible to the checks below.
 */
type EraGatedEntryName = 'ContractEventStore' | 'ContractEventValidationError' | 'ContractLog' | 'validateEvents';

// --- the era entries, and each facade they expose. A new era joins these four unions ------------
type Entries = typeof V8Entry | typeof V9Entry;
type Ledgers = typeof V8Entry.Ledger | typeof V9Entry.Ledger;
type Runtimes = typeof V8Entry.CompactRuntime | typeof V9Entry.CompactRuntime;
type Executables = typeof V8Entry.ContractExecutable | typeof V9Entry.ContractExecutable;

type _EntriesAgree = AssertShared<Divergent<Entries, EraGatedEntryName>>;
type _LedgersAgree = AssertShared<Divergent<Ledgers>>;
type _RuntimesAgree = AssertShared<Divergent<Runtimes>>;
type _ExecutablesAgree = AssertShared<Divergent<Executables>>;
