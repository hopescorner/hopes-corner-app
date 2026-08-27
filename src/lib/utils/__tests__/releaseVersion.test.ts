import { describe, expect, it } from 'vitest';

import {
    assertChangelogsMatchVersion,
    assertReleaseVersionsMatch,
    buildReleaseTag,
    readReleaseVersionsFromSources,
} from '../../../../scripts/releaseVersion.mjs';

describe('releaseVersion script', () => {
    it('reads matching release versions and builds a Git tag', () => {
        const versions = readReleaseVersionsFromSources({
            packageJsonSource: '{\n  "version": "0.5.26"\n}',
            appVersionSource: "export const APP_VERSION = '0.5.26';\n",
            serviceWorkerSource: "const APP_VERSION = '0.5.26';\n",
        });

        expect(versions).toEqual({
            packageVersion: '0.5.26',
            appVersion: '0.5.26',
            serviceWorkerVersion: '0.5.26',
        });
        expect(assertReleaseVersionsMatch(versions)).toBe('0.5.26');
        expect(buildReleaseTag('0.5.26')).toBe('v0.5.26');
    });

    it('fails when release versions drift apart', () => {
        expect(() =>
            assertReleaseVersionsMatch({
                packageVersion: '0.5.25',
                appVersion: '0.5.26',
                serviceWorkerVersion: '0.5.26',
            }),
        ).toThrow('Release version mismatch: package.json=0.5.25, appVersion.ts=0.5.26, public/sw.js=0.5.26');
    });

    it('passes when both changelogs cover the current version', () => {
        expect(() =>
            assertChangelogsMatchVersion({
                version: '0.5.26',
                appVersionSource:
                    "export const APP_VERSION = '0.5.26';\n" +
                    "export const CHANGELOG: ChangelogEntry[] = [\n    {\n        version: '0.5.26',\n",
                changelogMdSource: '# Changelog\n\n## [0.5.26] - 2026-07-20\n\n### Fixed\n\n- Something.\n',
            }),
        ).not.toThrow();
    });

    it('fails when the in-app changelog lags behind APP_VERSION', () => {
        expect(() =>
            assertChangelogsMatchVersion({
                version: '0.5.26',
                appVersionSource:
                    "export const APP_VERSION = '0.5.26';\n" +
                    "export const CHANGELOG: ChangelogEntry[] = [\n    {\n        version: '0.5.25',\n",
                changelogMdSource: '## [0.5.26] - 2026-07-20\n',
            }),
        ).toThrow('In-app changelog is out of date: appVersion.ts CHANGELOG[0].version=0.5.25 but APP_VERSION=0.5.26');
    });

    it('fails when CHANGELOG.md is missing the current version section', () => {
        expect(() =>
            assertChangelogsMatchVersion({
                version: '0.5.26',
                appVersionSource:
                    "export const CHANGELOG = [\n    {\n        version: '0.5.26',\n",
                changelogMdSource: '# Changelog\n\n## [0.5.25] - 2026-07-19\n',
            }),
        ).toThrow('CHANGELOG.md is missing a "## [0.5.26]" section');
    });

    it('fails when a required version marker is missing', () => {
        expect(() =>
            readReleaseVersionsFromSources({
                packageJsonSource: '{\n  "version": "0.5.26"\n}',
                appVersionSource: 'export const SOMETHING_ELSE = true;\n',
                serviceWorkerSource: "const APP_VERSION = '0.5.26';\n",
            }),
        ).toThrow('Could not find appVersion.ts APP_VERSION version.');
    });
});