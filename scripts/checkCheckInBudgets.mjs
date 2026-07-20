import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const manifestPath = '.next/server/app/(protected)/check-in/page_client-reference-manifest.js';
const source = readFileSync(manifestPath, 'utf8');
const jsonStart = source.indexOf('{', source.indexOf(' = {', source.indexOf('__RSC_MANIFEST[')));
const manifest = JSON.parse(source.slice(jsonStart, source.lastIndexOf(';')));
const entries = manifest.entryJSFiles;
const pageKey = '[project]/src/app/(protected)/check-in/page';
const layoutKey = '[project]/src/app/(protected)/layout';
const layoutChunks = new Set(entries[layoutKey] || []);
const routeChunks = (entries[pageKey] || []).filter((chunk) => !layoutChunks.has(chunk));
const routeGzipBytes = routeChunks.reduce((total, chunk) => (
    total + gzipSync(readFileSync(`.next/${chunk}`)).byteLength
), 0);
const jsBudgetBytes = 130 * 1024;

const guest = (index) => ({
    id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    guestId: `HC-${index}`,
    firstName: `Guest${index}`,
    lastName: `Person${index}`,
    name: `Guest${index} Person${index}`,
    preferredName: '',
    housingStatus: 'Unhoused',
    age: 'Adult',
    gender: 'Unknown',
    location: 'Mountain View',
    bannedAt: null,
    bannedUntil: null,
    banReason: '',
    isBanned: false,
    bannedFromMeals: false,
    bannedFromShower: false,
    bannedFromLaundry: false,
    bannedFromBicycle: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-07-19T00:00:00.000Z',
    warningCount: 0,
    linkedGuestCount: 0,
    reminderCount: 0,
    lastVisitDate: '2026-07-18',
    recentMeal: true,
});
const representativeSnapshot = {
    generatedAt: '2026-07-19T18:00:00.000Z',
    directoryVersion: 'budget-fixture',
    serviceDate: '2026-07-19',
    guests: Array.from({ length: 2_824 }, (_, index) => guest(index)),
    todayByGuest: {},
    dailyNotes: [],
};
const snapshotGzipBytes = gzipSync(JSON.stringify(representativeSnapshot)).byteLength;
const snapshotBudgetBytes = 300 * 1024;

console.log(`Check-in route JS: ${(routeGzipBytes / 1024).toFixed(1)} KiB gzip / 130 KiB`);
console.log(`Representative snapshot: ${(snapshotGzipBytes / 1024).toFixed(1)} KiB gzip / 300 KiB`);

if (routeGzipBytes > jsBudgetBytes) throw new Error('Check-in route JavaScript budget exceeded');
if (snapshotGzipBytes > snapshotBudgetBytes) throw new Error('Check-in snapshot transfer budget exceeded');
