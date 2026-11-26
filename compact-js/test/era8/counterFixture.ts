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
 * The era 8 counter fixture: its type, and the dynamic import that loads it.
 *
 * `yarn compact-v8` generates this contract with compactc 0.31.1 and the `managed-v8` tree is
 * gitignored, so a clean checkout has no artifact and no `.d.ts` — hence a run-time `import()` and a
 * hand-written type. Do not make it static: `test-typecheck` must pass before `yarn compact-v8` runs.
 *
 * The type mirrors the generated `managed-v8/counter/contract/index.d.ts` with `__compactRuntime`
 * swapped for the 0.16 binding. Two things in it are load-bearing: it is a `type` rather than an
 * `interface`, because only type aliases get the implicit index signature `Contract<PS>`'s
 * `Record<string, …>` members need; and its returns are synchronous, which is the whole difference
 * between compactc 0.31.1's output and 0.34's (`Contract.Awaitable` covers both). Stating it as
 * `new (witnesses) => never` is what made 16 assertions constrain nothing (#67).
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { type Contract } from '@midnightntwrk/compact-js/v8/effect';
import { describe } from 'vitest';

import type * as V0_16 from '../../src/effect/internal/runtime/v0_16.js';

/** The generated assets `yarn compact-v8-counter` writes. */
export const ERA8_COUNTER = resolve(import.meta.dirname, '../contract/managed-v8/counter');

// `describe.skip` when the fixture is absent — safe only because `Fixtures.test.ts` does not skip,
// so a CI leg that cannot run compactc fails there rather than reporting nothing.
export const describeWithFixture = existsSync(resolve(ERA8_COUNTER, 'contract/index.js'))
  ? describe
  : describe.skip;

/** The private state `counter.compact`'s witness reads and writes. */
export type CounterPrivateState = { readonly count: number };

/** The counter's public ledger, as `managed-v8/counter/contract` declares it. */
type CounterLedger = { readonly round: bigint };

export type CounterWitnesses = {
  private_increment(
    context: Contract.WitnessContext<CounterLedger, CounterPrivateState>
  ): [CounterPrivateState, []];
};

// Naming these is what restores `ProvableCircuitId`'s brand and `CircuitParameters`.
type CounterCircuits = {
  increment(context: V0_16.CircuitContext<CounterPrivateState>): V0_16.CircuitResults<CounterPrivateState, []>;
  decrement(
    context: V0_16.CircuitContext<CounterPrivateState>,
    amount: bigint
  ): V0_16.CircuitResults<CounterPrivateState, []>;
  reset(context: V0_16.CircuitContext<CounterPrivateState>): V0_16.CircuitResults<CounterPrivateState, []>;
};

/**
 * The era 8 counter, typed as the artifact really is. Satisfies `Contract<CounterPrivateState>` —
 * the era-free spine wants only `result` and `currentPrivateState` — while the 0.16 members beyond
 * that (`proofData`, `currentContractState`) are what the suites driving the runtime directly read.
 */
export type Era8CounterContract = {
  witnesses: CounterWitnesses;
  circuits: CounterCircuits;
  impureCircuits: CounterCircuits;
  provableCircuits: CounterCircuits;
  initialState(
    context: V0_16.ConstructorContext<CounterPrivateState>
  ): V0_16.ConstructorResult<CounterPrivateState>;
};

/**
 * Loads the generated fixture. The constructor names its witness parameter rather than taking
 * `Types.Ctor`'s `...args: any[]`, so a direct `new Contract({...})` is checked too; it still
 * satisfies `Types.Ctor`, which is all `CompiledContract.make` asks for.
 */
export const loadEra8Counter = async (): Promise<{
  Contract: new (witnesses: CounterWitnesses) => Era8CounterContract;
}> =>
  (await import(resolve(ERA8_COUNTER, 'contract/index.js'))) as {
    Contract: new (witnesses: CounterWitnesses) => Era8CounterContract;
  };
