import { defineConfig } from 'vitest/config';

// Unit tests run in node; a test file that needs a DOM says so in its docblock (`@vitest-environment jsdom`).
// The built bundle is tested in a real browser by Playwright (playwright.config.mjs), not here.
export default defineConfig({
  test: {
    include: ['src/**/*.test.js', 'tools/**/*.test.mjs'],
    // The page URL the tests were written against (Jest's default). Vitest's own default adds port 3000.
    environmentOptions: { jsdom: { url: 'http://localhost/' } },
    // Node's own Web Storage (on by default from Node 25) shadows jsdom's localStorage. Workers always run without it.
    execArgv: ['--no-experimental-webstorage'],
  },
});
