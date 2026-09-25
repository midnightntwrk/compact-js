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

import * as LedgerV8 from '@midnightntwrk/ledger-v8';
import * as LedgerV9 from '@midnightntwrk/ledger-v9';
import { describe, expect, it } from 'vitest';

/**
 * **Where a ledger handle from a second instantiation is rejected, and where it is swallowed.**
 *
 * @remarks
 * This pins *upstream* behaviour, not compact-js's. It exists because the ledger's wasm-bindgen
 * surface is inconsistent: most entry points assert the argument's class and throw on a handle
 * from another instantiation, but a handful take `JsValue`, downcast inside Rust, and discard the
 * error — so a foreign handle is silently treated as absent. Nothing in the type system marks the
 * difference, because the `.d.ts` types both kinds concretely.
 *
 * The condition is **dual instantiation, not era mismatch**. Two physical copies of the *same*
 * ledger version behave identically; the two eras are used here only because both are already
 * installed, which makes a second instantiation free to obtain.
 *
 * compact-js is not exposed: it calls only the guarded builders (`addCall`, `addDeploy`,
 * `addMaintenanceUpdate`), and every handle a consumer passes *into* compact-js reaches a checked
 * parameter. The exposure is on consumers composing transactions from re-exported classes, which
 * is what widening the facade (midnight-sdk#401) removes the reason to do.
 *
 * **When the second suite goes red, upstream has fixed it.** That is the good outcome: move the
 * entry point into `GUARDED` and drop it from `UNGUARDED`.
 */
const TTL = new Date('2030-01-01T00:00:00Z');
const NETWORK_ID = 'undeployed';

const foreignIntent = () => LedgerV8.Intent.new(TTL) as never;
const foreignOffer = () => LedgerV8.UnshieldedOffer.new([], [], []) as never;
const nativeIntent = () => LedgerV9.Intent.new(TTL);
const nativeOffer = () => LedgerV9.UnshieldedOffer.new([], [], []);
const transaction = () => LedgerV9.Transaction.fromParts(NETWORK_ID, undefined, undefined, nativeIntent());

describe('a ledger handle from a second instantiation', () => {
  // The majority case, and the one the rest of compact-js relies on: wasm-bindgen emits
  // `_assertClass`, so the mismatch is loud. Listed so that losing a guard upstream is a failure
  // here rather than a silent widening of the hazard below.
  const GUARDED: readonly [string, () => unknown][] = [
    ['Intent.addDeploy', () => nativeIntent().addDeploy(new LedgerV8.ContractDeploy(
      LedgerV8.ContractState.deserialize(new LedgerV9.ContractState().serialize()) as never
    ) as never)],
    ['new ChargedState', () => new LedgerV9.ChargedState(LedgerV8.StateValue.newNull() as never)],
    ['new ContractDeploy', () => new LedgerV9.ContractDeploy(LedgerV8.ContractState.deserialize(
      new LedgerV8.ContractState().serialize()
    ) as never)],
    ['partitionTranscripts', () => LedgerV9.partitionTranscripts(
      [new LedgerV8.PreTranscript(new LedgerV8.QueryContext(
        new LedgerV8.ChargedState(LedgerV8.StateValue.newNull()), LedgerV8.sampleContractAddress()
      ), []) as never],
      LedgerV9.LedgerParameters.initialParameters()
    )]
  ];

  it.each(GUARDED)('is rejected by %s', (_name, call) => {
    expect(call).toThrow();
  });

  // Each case sets a value two ways — once with a native handle, once with a foreign one — and
  // reads it back. The native read proves the setter works at all, so a case cannot pass vacuously
  // on a member that is simply always absent.
  //
  // `Intent.dustActions` and `Transaction.guaranteedOffer` share the codegen pattern but are absent
  // here: neither `DustActions` (five arguments) nor a `ZswapOffer` (real zswap input material) has
  // a cheap construction, so neither can be given the native control that keeps a case honest.
  const UNGUARDED: readonly [string, (which: 'native' | 'foreign') => unknown][] = [
    ['Transaction.fromParts', (w) =>
      LedgerV9.Transaction.fromParts(NETWORK_ID, undefined, undefined,
        w === 'native' ? nativeIntent() : foreignIntent()).intents],
    ['Transaction.fromPartsRandomized', (w) =>
      LedgerV9.Transaction.fromPartsRandomized(NETWORK_ID, undefined, undefined,
        w === 'native' ? nativeIntent() : foreignIntent()).intents],
    ['Intent.guaranteedUnshieldedOffer', (w) => {
      const intent = nativeIntent();
      intent.guaranteedUnshieldedOffer = w === 'native' ? nativeOffer() : foreignOffer();
      return intent.guaranteedUnshieldedOffer;
    }],
    ['Intent.fallibleUnshieldedOffer', (w) => {
      const intent = nativeIntent();
      intent.fallibleUnshieldedOffer = w === 'native' ? nativeOffer() : foreignOffer();
      return intent.fallibleUnshieldedOffer;
    }]
  ];

  it.each(UNGUARDED)('is silently discarded by %s, which does not throw', (_name, set) => {
    expect(set('native')).toBeDefined();
    expect(set('foreign')).toBeUndefined();
  });

  it('is not the only thing those setters swallow — a wrong class is ignored just as quietly', () => {
    // `Transaction.guaranteedOffer` takes a `ZswapOffer`. Handing it an `UnshieldedOffer` from its
    // *own* instantiation is accepted and discarded, which places the defect where it belongs: the
    // parameter is unchecked, and a second instantiation is only the way a correctly-typed program
    // reaches it. TypeScript rejects this line, hence the cast — the run-time silence is the point.
    const tx = transaction();
    tx.guaranteedOffer = nativeOffer() as never;
    expect(tx.guaranteedOffer).toBeUndefined();
  });
});
