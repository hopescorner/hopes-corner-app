import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGE_JSON_PATH = 'package.json';
const APP_VERSION_PATH = 'src/lib/utils/appVersion.ts';
const SERVICE_WORKER_PATH = 'public/sw.js';

const PACKAGE_VERSION_PATTERN = /"version"\s*:\s*"([^"]+)"/;
const APP_VERSION_PATTERN = /export const APP_VERSION = '([^']+)'/;
const SERVICE_WORKER_VERSION_PATTERN = /const APP_VERSION = '([^']+)'/;

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
    };
}

function runCli() {
    const command = process.argv[2] ?? 'check';
    const { version, tag } = readCurrentReleaseState();

    if (command === 'check') {
        console.log(`Release versions are synchronized at ${version}`);
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