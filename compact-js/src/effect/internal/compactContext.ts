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

import { Effect, type Types } from 'effect';

import type * as CompactContext from '../CompactContext.js';
import type { CompiledContract } from '../CompiledContract.js';
import { type Contract } from '../Contract.js';

/**
 * The key under which a {@link CompiledContract}'s internal context is stored.
 *
 * This key deliberately comes from the global symbol registry (`Symbol.for`), following the
 * convention used by every other type identifier in this package (e.g. `CompiledContract`'s own
 * `TypeId`). A module-local `Symbol()` is unique to each loaded copy of the package, so when two
 * copies of Compact.js end up in one process — for example an application that selects one version
 * while `midnight-js` pins another — a contract created by one copy carries its context under a key
 * the other copy can never see. The consuming copy then finds no context at all and fails far from
 * the cause. Sharing the key through the registry lets identical copies consume each other's
 * contracts, while the context itself is still only reachable through this internal key.
 *
 * @internal
 */
export const TypeId = Symbol.for('compact-js/effect/internal/CompactContext');
/** @internal */
export type TypeId = typeof TypeId;

/** @internal */
export interface Context<C extends Contract.Any>
  extends CompactContext.Witnesses<C>, CompactContext.CompiledAssetsPath {
    readonly ctor: Types.Ctor<C>;
  }

/** @internal */
export const getContractContext: <C extends Contract<PS>, PS>(
  compiledContract: CompiledContract<C, PS>
) => Types.Simplify<Required<Context<C>>> = <C extends Contract<PS>, PS>(compiledContract: CompiledContract<C, PS>) =>
  compiledContract[TypeId] as Required<Context<C>>;

/** @internal */
export const createContract: <C extends Contract<PS>, PS>(
  compiledContract: CompiledContract<C, PS>
) => Effect.Effect<C> = <C extends Contract<PS>, PS>(compiledContract: CompiledContract<C, PS>) =>
  Effect.sync(() => {
    const context = getContractContext(compiledContract);

    // The context itself can be absent — e.g. the contract was created by a genuinely
    // incompatible copy of Compact.js — so test for it before dereferencing `ctor`;
    // otherwise the caller gets a raw `TypeError` instead of the intended error below.
    if (!context?.ctor) throw new Error('Invalid CompactContext (missing constructor)');
    return new context.ctor(context.witnesses);
  });
