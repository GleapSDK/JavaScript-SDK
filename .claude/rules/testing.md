---
paths:
  - "src/**/*.js"
  - "smoke/**"
---

# Testing

Tests come first and stay fixed while the code is written: an agent that may change a test will change it to get green.

- **New behaviour or a bug fix:** write the test first, from the requirement and not from the code. Use the `test-writer` subagent if you can start one. See it fail for the expected reason and commit it on its own, then write the code without touching it. A new module may start as a file with its exported signatures throwing `not implemented`. Use `npx vitest related <file> --run` to see which tests already cover what you change.
- **Refactor without a behaviour change:** tests stay unchanged. A move may change a test's import path, never its assertions. Nothing covers the code? Pin today's behaviour with a test first.
- **Never edit, skip or delete an existing test to make a change pass,** and never detect test inputs or hardcode answers. No `.skip`, `.only`, retries or sleeps. If a test looks wrong, stop and report `BLOCKED` with the reason. A test changes only when the required behaviour changed; say so in the PR.

## What needs what

| Code | Test |
|---|---|
| Logic without a DOM | `src/<Name>.test.js` beside it, in node |
| Logic on the DOM: selectors, masking, injected UI, frames | `src/<Name>.test.js` starting with a `@vitest-environment jsdom` docblock |
| Several aspects of one big module | `src/<Name>.<aspect>.test.js` (`GleapHelper.bootstrap.test.js`) |
| The public API, what runs when the bundle loads, CSP, the build | `smoke/*.spec.mjs` (Playwright, the built bundle in Chromium) |
| Copy or styling only | nothing |

New code always; existing code when its behaviour changes. Tests import `describe`, `it`, `expect` and `vi` from `vitest`.

- **Fake only the edges:** the network with a fake `XMLHttpRequest` or `fetch` the test drives (`MockXhr` in `src/GleapFeedback.test.js`), time with `vi.useFakeTimers()` and `vi.useRealTimers()` in `afterEach`, the Messenger frame's `contentWindow.postMessage` with `vi.spyOn`. Mock `./Gleap` only to keep the whole SDK out of a test of one module, and only the managers the module reads (`src/GleapFrameManager.test.js`). Do not mock the module under test or its helpers.
- **A module that runs code when it loads** (nonce detection, singletons): `vi.resetModules()` and `await import()` inside the test (`src/GleapCSPNonce.test.js`).
- jsdom has no layout: give elements their boxes with `getBoundingClientRect` stubs (`src/ScreenCapture.test.js`), and test real layout, CSP or a real browser API in `smoke/`.
- Assert behaviour, not that code ran.

## What to run

- While you work: `npx vitest run <file>`.
- Before you finish: `npx vitest related <changed files> --run`, `npm run typecheck` when `index.d.ts` changed, and `npm run build` then `npm run test:smoke` for the cases `AGENTS.md` names.
- Never the full suite locally. CI runs it on every PR.

`vitest related` runs nothing for a file no test reaches, and the stop hook, which passes `--passWithNoTests`, stays green. That is not a pass: say in your report what no test covered.
