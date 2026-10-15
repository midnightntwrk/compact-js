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

import { describe, expect, it } from '@effect/vitest';
import { CompiledContract, ContractExecutable, type Contract } from '@midnight-ntwrk/compact-js/effect';
import type { Types } from 'effect';

/**
 * The key under which a contract's internal context is stored. Because the key comes from the
 * global symbol registry, a second loaded copy of this package — for example, an application
 * that selects one Compact.js version while `midnight-js` pins another — stores and looks up
 * the context under this very key, even though it is a different module instance.
 */
const SharedContextKey = Symbol.for('compact-js/effect/internal/CompactContext');

/** A minimal stand-in for a compiled contract class, as in the report of #28. */
class CounterShape {
  provableCircuits = { increment() {} };
}

const counterCtor = CounterShape as unknown as Types.Ctor<Contract.Any>;

type AnyCompiledContract = CompiledContract.CompiledContract<Contract.Any, Contract.PrivateState<Contract.Any>>;

/** Creates a compiled contract with this copy of the package. */
const makeOwnContract = (): AnyCompiledContract =>
  CompiledContract.make('counter', counterCtor).pipe(CompiledContract.withVacantWitnesses);

/**
 * Simulates the same contract produced by another loaded copy of this package: the context is
 * present and unchanged, but it is reachable only under the shared registry key — any key local
 * to the producing copy's module state is not visible to this copy.
 */
const asForeignContract = (own: AnyCompiledContract): AnyCompiledContract => {
  const context = (own as unknown as Record<symbol, unknown>)[SharedContextKey];
  return { tag: own.tag, [SharedContextKey]: context } as unknown as AnyCompiledContract;
};

describe('CompiledContract cross-copy consumption (#28)', () => {
  it('consumes a contract created by the same copy', () => {
    expect(ContractExecutable.make(makeOwnContract()).getProvableCircuitIds()).toEqual(['increment']);
  });

  it('consumes a contract whose context is stored under the shared registry key', () => {
    const foreign = asForeignContract(makeOwnContract());
    expect(ContractExecutable.make(foreign).getProvableCircuitIds()).toEqual(['increment']);
  });

  it('keeps the context when a foreign contract is passed through this copy’s combinators', () => {
    const foreign = asForeignContract(makeOwnContract());
    const reworked = CompiledContract.withVacantWitnesses(foreign);
    expect(ContractExecutable.make(reworked).getProvableCircuitIds()).toEqual(['increment']);
  });

  it('fails with the intended error, not a raw TypeError, when no context is present', () => {
    const contextless = { tag: 'counter' } as unknown as AnyCompiledContract;
    let caught: unknown;
    try {
      ContractExecutable.make(contextless).getProvableCircuitIds();
    } catch (error) {
      caught = error;
    }
    expect(String(caught)).toContain('Invalid CompactContext (missing constructor)');
    expect(String(caught)).not.toContain("reading 'ctor'");
  });
});
