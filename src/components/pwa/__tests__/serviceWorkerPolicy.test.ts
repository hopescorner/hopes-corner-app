import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('service worker privacy and cache policy', () => {
    const source = readFileSync(resolve(process.cwd(), 'public/sw.js'), 'utf8');

    it('does not precache authenticated application routes', () => {
        const precache = source.slice(source.indexOf('const PRECACHE_ASSETS'), source.indexOf('];') + 2);
        expect(precache).not.toContain("'/check-in'");
        expect(precache).not.toContain("'/services'");
        expect(precache).not.toContain("'/dashboard'");
        expect(precache).toContain("'/offline.html'");
    });

    it('only runtime-caches versioned static assets', () => {
        expect(source).toContain("url.pathname.startsWith('/_next/static/')");
        expect(source).toContain('STATIC_CACHE_NAME');
        expect(source).not.toContain('return cached || networkFetch');
    });
});
