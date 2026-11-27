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

import { resolve } from 'node:path';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

/**
 * The **type-only** half of era surface parity (#65).
 *
 * @remarks
 * `internal/era/conformance.ts` fails the build when the era entries stop sharing a *value*
 * export. It cannot reach the rest: `keyof typeof Namespace` omits type-only exports, and a
 * `.tst.ts` has the same blind spot, so there is no compile-time statement of the half where the
 * era differences actually live — every one below is an `export { type … }` erased at emit.
 *
 * Enumerating them means asking the compiler, which is what this does: one program over the two
 * entry sources, and the exported names of each facade read off the checker.
 *
 * Divergence is allowed by name rather than forbidden, because keeping a capability an era lacks
 * *absent* rather than present-and-failing is what #388 asks for. Each exception carries the era
 * fact behind it and is checked both ways — unlisted divergence fails, and an exception that
 * stopped being true fails as stale rather than being inherited by the next era.
 */
const PACKAGE_ROOT = resolve(import.meta.dirname, '../..');

const FACADES = ['Ledger', 'CompactRuntime', 'ContractExecutable'] as const;
const SURFACES = ['entry', ...FACADES] as const;

type Surface = (typeof SURFACES)[number];

/** Ascending, which `presenceOf` relies on to report an era list in a stable order. */
const ERA_SOURCES: readonly { readonly ledger: number; readonly source: string }[] = [
  { ledger: 8, source: 'src/v8/effect.ts' },
  { ledger: 9, source: 'src/v9/effect.ts' }
];

/** A name an era deliberately does not share, and the era fact that makes the absence correct. */
interface EraGatedName {
  readonly surface: Surface;
  readonly name: string;
  /** The ledger eras the name is present on, ascending. */
  readonly presentOn: readonly number[];
  readonly why: string;
}

const ERA_GATED: readonly EraGatedName[] = [
  {
    surface: 'CompactRuntime',
    name: 'ProofData',
    presentOn: [8],
    why: '0.16 hangs proof data off `CircuitResults`; 0.19 moved it onto the call trace'
  },
  {
    surface: 'CompactRuntime',
    name: 'CallProofData',
    presentOn: [9],
    why: 'the call-tree entry — 0.16 runs one flat frame and `v0_16.readExecution` synthesises its trace'
  },
  {
    surface: 'CompactRuntime',
    name: 'CommunicationCommitmentData',
    presentOn: [9],
    why: 'set only for a cross-contract sub-call, which 0.16 cannot make'
  },
  {
    surface: 'CompactRuntime',
    name: 'ContractStateProvider',
    presentOn: [9],
    why: '0.16 has no `crossContractCall`, so its `createExecutionContext` rejects a provider outright'
  },
  {
    surface: 'CompactRuntime',
    name: 'ContractModuleProvider',
    presentOn: [9],
    why: 'the other half of the cross-contract pair 0.16 lacks'
  },
  {
    surface: 'CompactRuntime',
    name: 'Module',
    presentOn: [9],
    why: 'what a `ContractModuleProvider` resolves, so it exists only where that provider does'
  },
  {
    surface: 'CompactRuntime',
    name: 'ModuleThunk',
    presentOn: [9],
    why: 'as `Module` — reachable only through the cross-contract provider'
  },
  {
    surface: 'CompactRuntime',
    name: 'RunningCost',
    presentOn: [9],
    why: '0.16 overwrites `context.gasCost` per query instead of accumulating, so it has no cost map to type'
  },
  // The value half of these four is `conformance.ts`'s `EraGatedEntryName`; both halves are gated
  // for the one reason, that ledger 8 cannot emit contract events at all.
  ...['ContractEventStore', 'ContractEventValidationError', 'ContractLog', 'validateEvents'].map(
    (name): EraGatedName => ({
      surface: 'entry',
      name,
      presentOn: [9],
      why: 'onchain-runtime-v3 has no `LogEvent` and accumulates none, so ledger 8 cannot emit events'
    })
  )
];

/** Every exported name of each entry's surfaces, type-only re-exports included. */
const exportsByEra = ((): ReadonlyMap<number, ReadonlyMap<Surface, ReadonlySet<string>>> => {
  const { options } = ts.parseJsonConfigFileContent(
    ts.readConfigFile(resolve(PACKAGE_ROOT, 'tsconfig.src.json'), ts.sys.readFile).config,
    ts.sys,
    PACKAGE_ROOT
  );
  const program = ts.createProgram(
    ERA_SOURCES.map((era) => resolve(PACKAGE_ROOT, era.source)),
    { ...options, composite: false, declaration: false, noEmit: true }
  );
  const checker = program.getTypeChecker();
  const target = (symbol: ts.Symbol): ts.Symbol =>
    symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
  const namesOf = (symbol: ts.Symbol): ReadonlySet<string> =>
    new Set(checker.getExportsOfModule(symbol).map((exported) => exported.getName()));

  return new Map(
    ERA_SOURCES.map((era) => {
      const file = program.getSourceFile(resolve(PACKAGE_ROOT, era.source));
      const moduleSymbol = file === undefined ? undefined : checker.getSymbolAtLocation(file);
      if (moduleSymbol === undefined) {
        throw new Error(`${era.source} did not resolve to a module symbol.`);
      }

      const exported = checker.getExportsOfModule(moduleSymbol);
      const surfaces = new Map<Surface, ReadonlySet<string>>([['entry', namesOf(moduleSymbol)]]);
      for (const facade of FACADES) {
        const namespace = exported.find((symbol) => symbol.getName() === facade);
        if (namespace === undefined) {
          throw new Error(`${era.source} exports no ${facade} namespace.`);
        }
        surfaces.set(facade, namesOf(target(namespace)));
      }

      return [era.ledger, surfaces] as const;
    })
  );
})();

const exportsOf = (ledger: number, surface: Surface): ReadonlySet<string> => {
  const names = exportsByEra.get(ledger)?.get(surface);
  if (names === undefined) throw new Error(`No ${surface} names enumerated for ledger ${ledger}.`);
  return names;
};

/** Which eras each name of a surface appears on. */
const presenceOf = (surface: Surface): ReadonlyMap<string, readonly number[]> => {
  const presence = new Map<string, number[]>();
  for (const { ledger } of ERA_SOURCES) {
    for (const name of exportsOf(ledger, surface)) {
      presence.set(name, [...(presence.get(name) ?? []), ledger]);
    }
  }
  return presence;
};

const describeDivergence = (name: string, presentOn: readonly number[]) =>
  `${name} on ledger ${[...presentOn].sort((a, b) => a - b).join(' and ')}`;

describe('era surface parity, at the type level', () => {
  it.each([...SURFACES])('shares every %s name across eras, bar the explained ones', (surface) => {
    const presence = presenceOf(surface);
    const divergent = [...presence]
      .filter(([, presentOn]) => presentOn.length !== ERA_SOURCES.length)
      .map(([name, presentOn]) => describeDivergence(name, presentOn))
      .sort();

    const explained = ERA_GATED.filter((gate) => gate.surface === surface)
      .map((gate) => describeDivergence(gate.name, gate.presentOn))
      .sort();

    expect(divergent).toEqual(explained);
  });

  it.each(ERA_GATED)('still diverges on $name, as its exception claims', (gate) => {
    expect(presenceOf(gate.surface).get(gate.name)).toEqual([...gate.presentOn]);
  });

  it.each(ERA_SOURCES)('enumerates a real surface for ledger $ledger', ({ ledger }) => {
    // The comparisons above all pass vacuously on an empty enumeration.
    expect([...exportsOf(ledger, 'Ledger')]).toContain('ContractState');
    expect([...exportsOf(ledger, 'CompactRuntime')]).toContain('createExecutionContext');
    expect([...exportsOf(ledger, 'ContractExecutable')]).toContain('make');
  });
});
