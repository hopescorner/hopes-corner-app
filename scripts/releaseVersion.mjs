import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGE_JSON_PATH = 'package.json';
const APP_VERSION_PATH = 'src/lib/utils/appVersion.ts';
const SERVICE_WORKER_PATH = 'public/sw.js';
const CHANGELOG_MD_PATH = 'CHANGELOG.md';

const PACKAGE_VERSION_PATTERN = /"version"\s*:\s*"([^"]+)"/;
const APP_VERSION_PATTERN = /export const APP_VERSION = '([^']+)'/;
const SERVICE_WORKER_VERSION_PATTERN = /const APP_VERSION = '([^']+)'/;
const IN_APP_CHANGELOG_FIRST_VERSION_PATTERN = /export const CHANGELOG[\s\S]*?version:\s*'([^']+)'/;

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function extractVersion(source, pattern, label) {
    const match = source.match(pattern);

    if (!match) {
        throw new Error(`Could not find ${label} version.`);
    }

    return match[1];
}

export function readReleaseVersionsFromSources({
    packageJsonSource,
    appVersionSource,
    serviceWorkerSource,
}) {
    return {
        packageVersion: extractVersion(packageJsonSource, PACKAGE_VERSION_PATTERN, 'package.json'),
        appVersion: extractVersion(appVersionSource, APP_VERSION_PATTERN, 'appVersion.ts APP_VERSION'),
        serviceWorkerVersion: extractVersion(serviceWorkerSource, SERVICE_WORKER_VERSION_PATTERN, 'service worker APP_VERSION'),
    };
}

export function assertReleaseVersionsMatch({ packageVersion, appVersion, serviceWorkerVersion }) {
    const uniqueVersions = new Set([packageVersion, appVersion, serviceWorkerVersion]);

    if (uniqueVersions.size !== 1) {
        throw new Error(
            `Release version mismatch: package.json=${packageVersion}, appVersion.ts=${appVersion}, public/sw.js=${serviceWorkerVersion}`,
        );
    }

    return packageVersion;
}

export function buildReleaseTag(version) {
    return `v${version}`;
}

export function assertChangelogsMatchVersion({ version, appVersionSource, changelogMdSource }) {
    const latestInAppVersion = extractVersion(
        appVersionSource,
        IN_APP_CHANGELOG_FIRST_VERSION_PATTERN,
        'appVersion.ts CHANGELOG first entry',
    );

    if (latestInAppVersion !== version) {
        throw new Error(
            `In-app changelog is out of date: appVersion.ts CHANGELOG[0].version=${latestInAppVersion} but APP_VERSION=${version}. ` +
            'Add a new entry at the top of the CHANGELOG array in src/lib/utils/appVersion.ts.',
        );
    }

    const escapedVersion = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!new RegExp(`^## \\[${escapedVersion}\\]`, 'm').test(changelogMdSource)) {
        throw new Error(
            `CHANGELOG.md is missing a "## [${version}]" section for the current release. ` +
            'Add one at the top of CHANGELOG.md.',
        );
    }
}

export function readCurrentReleaseState(baseDir = repoRoot) {
    const packageJsonSource = fs.readFileSync(path.join(baseDir, PACKAGE_JSON_PATH), 'utf8');
    const appVersionSource = fs.readFileSync(path.join(baseDir, APP_VERSION_PATH), 'utf8');
    const serviceWorkerSource = fs.readFileSync(path.join(baseDir, SERVICE_WORKER_PATH), 'utf8');
    const versions = readReleaseVersionsFromSources({
        packageJsonSource,
        appVersionSource,
        serviceWorkerSource,
    });
    const version = assertReleaseVersionsMatch(versions);

    return {
        version,
        tag: buildReleaseTag(version),
        versions,
        appVersionSource,
    };
}

function runCli() {
    const command = process.argv[2] ?? 'check';
    const { version, tag, appVersionSource } = readCurrentReleaseState();

    if (command === 'check') {
        const changelogMdSource = fs.readFileSync(path.join(repoRoot, CHANGELOG_MD_PATH), 'utf8');
        assertChangelogsMatchVersion({ version, appVersionSource, changelogMdSource });
        console.log(`Release versions are synchronized at ${version} and changelogs are up to date`);
        return;
    }

    if (command === 'tag') {
        console.log(tag);
        return;
    }

    throw new Error(`Unknown command: ${command}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    try {
        runCli();
    } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
    }
}