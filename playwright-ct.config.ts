import { defineConfig, devices } from '@playwright/experimental-ct-react';
import { resolve } from 'path';

export default defineConfig({
  testDir: './src',
  testMatch: '**/*.ct.tsx',
  snapshotDir: './__snapshots__',
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    trace: 'on-first-retry',
    ctPort: 3100,
    ctViteConfig: {
      resolve: {
        alias: {
          '@': resolve(__dirname, './src'),
          // Stub next-auth/react so components that call useSession() work in CT
          'next-auth/react': resolve(__dirname, './playwright/__mocks__/next-auth-react.ts'),
          // Stub the Supabase client so store actions don't crash
          '@/lib/supabase/client': resolve(__dirname, './playwright/__mocks__/supabase-client.ts'),
        },
      },
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
