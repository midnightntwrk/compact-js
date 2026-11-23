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

import { Command } from '@effect/cli';
import { FileSystem } from '@effect/platform';
import { describe, it } from '@effect/vitest';
import * as Configuration from '@midnight-ntwrk/platform-js/effect/Configuration';
import { deployCommand, maintainCommand } from '@midnightntwrk/compact-js-command/effect';
import {
  ContractState as LedgerContractState,
  Intent,
  MaintenanceUpdate,
  type PreBinding,
  type PreProof,
  ReplaceAuthority,
  type SignatureEnabled,
  sampleSigningKey
} from '@midnightntwrk/ledger-v9';
import { Effect, Layer, Option } from 'effect';
import { vi } from 'vitest';

import * as CommandConfigProvider from '../../src/effect/internal/commandConfigProvider.js';
import * as InternalOptions from '../../src/effect/internal/options.js';
import { ensureRemovePath } from './cleanup.js';
import { useConfigFixture } from './configFixture.js';
import * as MockConsole from './MockConsole.js';
import { testLayer } from './testLayer.js';

/**
 * `--signing-kind` and `--new-signing-kind`: stating a signing key's signature scheme from the
 * command line.
 *
 * @remarks
 * platform-js has read `keys.signingKind` since it started tagging keys, so `KEYS_SIGNING_KIND` and
 * a `signingKind` in `contract.config.ts` were already honoured — the scheme was simply unreachable
 * from the command line, which left `-s` able to supply an ECDSA key that the CLI then used as a
 * Schnorr one (midnightntwrk/compact-js#70).
 *
 * What the options buy is a *statement*, not a validation. Both schemes are 32-byte scalars, and
 * ledger 9 derives a perfectly valid Schnorr verifying key from ECDSA bytes and vice versa, so
 * nothing here can detect a caller who names the wrong scheme. Rejecting a mismatched tag would be
 * a ledger change. These tests therefore pin which scheme the CLI *chose*, read back off the
 * authority committee the invocation actually produced.
 */

// Test files run in parallel, so each owns a distinct path for every artefact it writes — the
// config fixture (which is transpiled to a sibling `.js` before import) as much as the outputs
// below: a shared name lets one file's cleanup delete another's artefact mid-read.
const COUNTER_CONFIG_FILEPATH = useConfigFixture(
  resolve(import.meta.dirname, '../contract/counter/contract.config.ts'),
  'signing-kind'
);
const COUNTER_STATE_FILEPATH = resolve(import.meta.dirname, '../contract/counter/state.bin');
const COUNTER_OUTPUT_FILEPATH = resolve(import.meta.dirname, '../contract/counter/output_signing_kind.bin');
const COUNTER_OUTPUT_OC_FILEPATH = resolve(import.meta.dirname, '../contract/counter/output_signing_kind_onchain.bin');
const COUNTER_OUTPUT_PS_FILEPATH = resolve(import.meta.dirname, '../contract/counter/output_signing_kind.json');
const COUNTER_OUTPUT_ZSWAP_FILEPATH = resolve(import.meta.dirname, '../contract/counter/output_signing_kind_zswap.json');
const COUNTER_ADDRESS = '0a2d0e34db258f640dc2ec410fb0e4eea9cd6f9661ba6a86f0c35a708e1b811a';

const COIN_PUBLIC_KEY = 'd2dc8d175c0ef7d1f7e5b7f32bd9da5fcd4c60fa1b651f1d312986269c2d3c79';
const SCHNORR_SIGNING_KEY = sampleSigningKey('schnorr').value;
const ECDSA_SIGNING_KEY = sampleSigningKey('ecdsa').value;

const deployCli = Command.run(deployCommand, { name: 'deploy', version: '0.0.0' });
const maintainCli = Command.run(maintainCommand, { name: 'maintain', version: '0.0.0' });

/**
 * Resolves the signing key a command would be given, from a contract configuration and a set of
 * parsed options, through the same provider chain `invocationHandler` builds.
 *
 * Reading it back off platform-js's own `Keys` service rather than off the raw configuration is
 * what makes this a test of the key the executable receives, tag included.
 */
const configuredSigningKey = (
  jsonConfig: unknown,
  cliOptions: Partial<InternalOptions.AllConfigurableOptionInputs>
) =>
  Configuration.Keys.pipe(
    Effect.map((keys) => keys.getSigningKey()),
    Effect.provide(
      Configuration.layer.pipe(
        Layer.provide(
          Layer.setConfigProvider(
            CommandConfigProvider.make(jsonConfig, InternalOptions.asConfigProvider(cliOptions))
          )
        )
      )
    )
  );

const configuredScheme = (
  jsonConfig: unknown,
  cliOptions: Partial<InternalOptions.AllConfigurableOptionInputs>
) => configuredSigningKey(jsonConfig, cliOptions).pipe(Effect.map(Option.map((key) => key.tag)));

const contractConfig = (keys: Record<string, string>) => ({ keys: { coinPublic: COIN_PUBLIC_KEY, ...keys } });

describe('signing key scheme options', () => {
  describe('configuration precedence', () => {
    it.effect('takes the scheme from --signing-kind over the contract configuration', () =>
      Effect.gen(function* () {
        const scheme = yield* configuredScheme(contractConfig({ signing: ECDSA_SIGNING_KEY, signingKind: 'schnorr' }), {
          signingKind: Option.some('ecdsa')
        });

        expect(scheme).toStrictEqual(Option.some('ecdsa'));
      })
    );

    it.effect('takes the scheme from --signing-kind over KEYS_SIGNING_KIND', () =>
      Effect.gen(function* () {
        vi.stubEnv('KEYS_SIGNING_KIND', 'schnorr');

        const scheme = yield* configuredScheme(contractConfig({ signing: ECDSA_SIGNING_KEY }), {
          signingKind: Option.some('ecdsa')
        });

        expect(scheme).toStrictEqual(Option.some('ecdsa'));
      }).pipe(Effect.ensuring(Effect.sync(() => vi.unstubAllEnvs())))
    );

    it.effect('leaves KEYS_SIGNING_KIND in force when the option is omitted', () =>
      Effect.gen(function* () {
        // An omitted option must reach the provider as *missing*, not as a defaulted 'schnorr':
        // a default here would outrank both the environment and the contract configuration, which
        // platform-js has honoured all along.
        vi.stubEnv('KEYS_SIGNING_KIND', 'ecdsa');

        const scheme = yield* configuredScheme(contractConfig({ signing: ECDSA_SIGNING_KEY }), {});

        expect(scheme).toStrictEqual(Option.some('ecdsa'));
      }).pipe(Effect.ensuring(Effect.sync(() => vi.unstubAllEnvs())))
    );

    it.effect('falls back to the contract configuration when neither the option nor the environment names one', () =>
      Effect.gen(function* () {
        const scheme = yield* configuredScheme(contractConfig({ signing: ECDSA_SIGNING_KEY, signingKind: 'ecdsa' }), {});

        expect(scheme).toStrictEqual(Option.some('ecdsa'));
      })
    );

    it.effect('defaults to schnorr when no scheme is configured anywhere', () =>
      Effect.gen(function* () {
        const scheme = yield* configuredScheme(contractConfig({ signing: SCHNORR_SIGNING_KEY }), {});

        expect(scheme).toStrictEqual(Option.some('schnorr'));
      })
    );
  });

  describe('deploy', () => {
    const deployArgs = (...schemeArgs: string[]) => [
      'node', 'deploy.ts',
      '-c', COUNTER_CONFIG_FILEPATH,
      ...schemeArgs,
      '--output', COUNTER_OUTPUT_FILEPATH,
      '--output-oc', COUNTER_OUTPUT_OC_FILEPATH,
      '--output-ps', COUNTER_OUTPUT_PS_FILEPATH,
      '--output-zswap', COUNTER_OUTPUT_ZSWAP_FILEPATH
    ];

    const deployedAuthorityScheme = Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      // Read the console first: a reported failure would otherwise surface as a missing-file error
      // from the read below, naming a path instead of the reason.
      expect((yield* MockConsole.getLines({ stripAnsi: true })).join('\n')).toBe('');

      const committee = LedgerContractState.deserialize(yield* fs.readFile(COUNTER_OUTPUT_OC_FILEPATH))
        .maintenanceAuthority.committee;
      expect(committee).toHaveLength(1);
      return committee[0].tag;
    });

    const ensureOutputsRemoved = <A, E, R>(test: Effect.Effect<A, E, R>) =>
      test.pipe(
        Effect.ensuring(ensureRemovePath(COUNTER_OUTPUT_FILEPATH)),
        Effect.ensuring(ensureRemovePath(COUNTER_OUTPUT_OC_FILEPATH)),
        Effect.ensuring(ensureRemovePath(COUNTER_OUTPUT_PS_FILEPATH)),
        Effect.ensuring(ensureRemovePath(COUNTER_OUTPUT_ZSWAP_FILEPATH)),
        Effect.provide(testLayer)
      );

    it.effect(
      'records an ECDSA maintenance authority for --signing-kind ecdsa',
      () =>
        ensureOutputsRemoved(
          Effect.gen(function* () {
            yield* deployCli(deployArgs('-s', ECDSA_SIGNING_KEY, '--signing-kind', 'ecdsa'));

            expect(yield* deployedAuthorityScheme).toBe('ecdsa');
          })
        ),
      30_000
    );

    it.effect(
      'records a schnorr maintenance authority when no scheme is given',
      () =>
        ensureOutputsRemoved(
          Effect.gen(function* () {
            yield* deployCli(deployArgs('-s', SCHNORR_SIGNING_KEY));

            expect(yield* deployedAuthorityScheme).toBe('schnorr');
          })
        ),
      30_000
    );
  });

  describe('maintain contract', () => {
    const maintainArgs = (...schemeArgs: string[]) => [
      'node', 'maintain.ts', 'contract',
      '-c', COUNTER_CONFIG_FILEPATH,
      '-s', SCHNORR_SIGNING_KEY,
      '--input', COUNTER_STATE_FILEPATH,
      '--output', COUNTER_OUTPUT_FILEPATH,
      ...schemeArgs,
      COUNTER_ADDRESS, ECDSA_SIGNING_KEY
    ];

    /** The scheme of the authority the written intent's `ReplaceAuthority` would install. */
    const replacementAuthorityScheme = Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      expect((yield* MockConsole.getLines({ stripAnsi: true })).join('\n')).toBe('');

      const intent = Intent.deserialize<SignatureEnabled, PreProof, PreBinding>(
        'signature', 'pre-proof', 'pre-binding', yield* fs.readFile(COUNTER_OUTPUT_FILEPATH)
      );
      const updates = intent.actions.filter((action) => action instanceof MaintenanceUpdate);
      expect(updates).toHaveLength(1);
      const replacements = updates[0].updates.filter((update) => update instanceof ReplaceAuthority);
      expect(replacements).toHaveLength(1);
      expect(replacements[0].authority.committee).toHaveLength(1);
      return replacements[0].authority.committee[0].tag;
    });

    it.effect(
      'installs an ECDSA authority for --new-signing-kind ecdsa',
      () =>
        Effect.gen(function* () {
          yield* maintainCli(maintainArgs('--new-signing-kind', 'ecdsa'));

          expect(yield* replacementAuthorityScheme).toBe('ecdsa');
        }).pipe(Effect.ensuring(ensureRemovePath(COUNTER_OUTPUT_FILEPATH)), Effect.provide(testLayer)),
      30_000
    );

    it.effect(
      "installs the era's default scheme when --new-signing-kind is omitted",
      () =>
        Effect.gen(function* () {
          // The same ECDSA key bytes as the test above, rotated in without naming a scheme: the
          // bytes are not what decides the authority's scheme, the tag is.
          yield* maintainCli(maintainArgs());

          expect(yield* replacementAuthorityScheme).toBe('schnorr');
        }).pipe(Effect.ensuring(ensureRemovePath(COUNTER_OUTPUT_FILEPATH)), Effect.provide(testLayer)),
      30_000
    );
  });

  describe('parsing', () => {
    it.effect('rejects a scheme neither ledger admits', () =>
      Effect.gen(function* () {
        const exit = yield* Effect.exit(
          deployCli(['node', 'deploy.ts', '-c', COUNTER_CONFIG_FILEPATH, '--signing-kind', 'bls'])
        );

        expect(exit._tag).toBe('Failure');
        expect(String(exit)).toMatch(/schnorr/);
        expect(String(exit)).toMatch(/ecdsa/);
      }).pipe(Effect.provide(testLayer))
    );
  });
});
