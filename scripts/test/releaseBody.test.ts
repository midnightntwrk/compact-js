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

import { describe, expect, it } from 'vitest';

import { buildReleaseBody, extractSection } from '../release-body.mjs';

/** The shape `changeset version` writes: an h1 of the package name, then one h2 per version. */
const changelog = (...sections: string[]) => ['# @midnightntwrk/compact-js', '', ...sections].join('\n');

const MAJOR = ['## 4.0.0', '', '### Major Changes', '', '- Renamed to the `@midnightntwrk` scope', ''].join('\n');
const PATCH = ['## 3.0.2', '', '### Patch Changes', '', '- Pinned the runtime at 0.21.0', ''].join('\n');

describe('extractSection', () => {
  it('returns the section body without its heading', () => {
    expect(extractSection(changelog(MAJOR, PATCH), '4.0.0')).toBe(
      '### Major Changes\n\n- Renamed to the `@midnightntwrk` scope'
    );
  });

  it('reads the last section to the end of the file', () => {
    expect(extractSection(changelog(MAJOR, PATCH), '3.0.2')).toBe(
      '### Patch Changes\n\n- Pinned the runtime at 0.21.0'
    );
  });

  it('returns empty for a bare heading, which is what a fixed-group bump leaves behind', () => {
    expect(extractSection(changelog('## 4.0.0', '', PATCH), '4.0.0')).toBe('');
  });

  it('returns empty when the version is absent', () => {
    expect(extractSection(changelog(PATCH), '4.0.0')).toBe('');
  });

  // The old `cd.yaml` extractor searched by substring, so a stable version matched its own
  // release candidate's section and published the rc's notes.
  it('does not match a prerelease of the same version', () => {
    const changelogWithRc = changelog(['## 4.0.0-rc.1', '', '- release candidate', ''].join('\n'));
    expect(extractSection(changelogWithRc, '4.0.0')).toBe('');
    expect(extractSection(changelogWithRc, '4.0.0-rc.1')).toBe('- release candidate');
  });

  it('keeps subheadings inside the section', () => {
    const body = extractSection(changelog(MAJOR, PATCH), '4.0.0');
    expect(body).toContain('### Major Changes');
  });
});

describe('buildReleaseBody', () => {
  const packages = [
    { name: '@midnightntwrk/compact-js', changelog: changelog(MAJOR) },
    { name: '@midnightntwrk/compact-js-node', changelog: changelog('## 4.0.0', '') },
    { name: '@midnightntwrk/compact-js-command', changelog: changelog(MAJOR) }
  ];

  it('concatenates each package under its own heading', () => {
    const body = buildReleaseBody(packages, '4.0.0');
    expect(body).toContain('## @midnightntwrk/compact-js\n\n### Major Changes');
    expect(body).toContain('## @midnightntwrk/compact-js-command\n\n### Major Changes');
  });

  it('skips a package whose section is a bare heading', () => {
    expect(buildReleaseBody(packages, '4.0.0')).not.toContain('@midnightntwrk/compact-js-node');
  });

  it('is empty when no package documented the version, so the caller can fail', () => {
    expect(buildReleaseBody(packages, '9.9.9')).toBe('');
  });

  it('tolerates a package with no CHANGELOG yet', () => {
    const body = buildReleaseBody([{ name: '@midnightntwrk/compact-js', changelog: '' }], '4.0.0');
    expect(body).toBe('');
  });
});
