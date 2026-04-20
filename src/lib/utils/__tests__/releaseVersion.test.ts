import { describe, expect, it } from 'vitest';

import {
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