# Gleap JavaScript SDK

The `gleap` package customers embed in their websites and web apps: the launcher, the Messenger frame, banners, modals, tours, checklists, surveys, the AI chat bar, bug reports with screenshots, replays and network and console logs. Plain JavaScript (ES modules in `src/`, no TypeScript sources), Babel 7, webpack 5 with terser, npm, Node 24 in CI. Runtime dependencies: `@floating-ui/dom`, `@rrweb/record`, `@rrweb/packer`, `modern-screenshot`. The public types are hand-written in `index.d.ts`.

Terms, as in the Server: a conversation is a ticket (`Bug` in the Server's model), the end user is a session, the project's key is the Project ID (formerly SDK key or API key).

How it ships:

- **CDN:** `build/browser/index.js` assigns `window.Gleap`. Cloudflare Workers Builds deploys `published/` (`wrangler.jsonc`) to `sdk.gleap.io` on every push to `master`, so `sdk.gleap.io/latest/index.js` changes for every customer that loads `latest` with each merge. The build adds `published/<version>/` for the current version only: an older version's URL keeps working only while its folder is committed.
- **npm:** `gleap` with `build/esm/index.mjs`, `build/cjs/index.js` (UMD) and `index.d.ts`, published by `.github/workflows/release.yml` when a version tag is pushed (README.md → Releasing). Apps pin versions, so old SDKs stay out there for years.
- **The Messenger** (the Messenger-App repo) runs in an iframe the SDK writes (`bootstrapGleapFrame` in `src/GleapHelper.js`) and talks to it by `postMessage`. It deploys on its own, so every SDK version still out there talks to today's Messenger.

## Commands

```bash
npx vitest run <file>                # one test file; npm test runs all (CI runs it)
npx vitest related <files> --run     # the tests that reach the files you changed
npm run typecheck                    # the shipped typings, index.d.ts
node tools/quality/check.mjs         # the quality check on what this branch adds (.claude/rules/code-conventions.md)
npm run build                        # the ESM, CJS, CDN and survey-embed bundles
npm run test:smoke                   # Playwright on the built bundles: globals, typings against runtime, strict CSP, size budgets
```

Unit tests run in node; a test file that needs a DOM starts with a `@vitest-environment jsdom` docblock. `npm run test:smoke` needs a build first and, once per machine, `npx playwright install --only-shell chromium`. Several sessions share this machine, so locally run only what you touched: `npx vitest related <changed files> --run`, never the full suite.

CI (`.github/workflows/ci.yml`) runs the tests, the typings check, the build, the smoke tests and `npm pack --dry-run` on every PR and push to `master`. `.github/workflows/quality.yml` runs the quality check on PRs.

Done means the tests that reach your change pass, the quality check passes, and CI is green. Also run `npm run typecheck` when `index.d.ts` changed, and `npm run build` then `npm run test:smoke` when the change touches the public API, what runs when the bundle loads, a dependency, or the build. Say which commands you ran and what they printed.

A build rewrites the tracked `build/` and `published/latest/` and adds `published/<version>/`. Leave them out of your commits: `git checkout -- build published/latest` and remove the new version folder. Releases and their version folders are made by people.

Do not start the demo or a dev server (`npm start`, `npm run dev`, `preview_start`) unless asked. If you must, say so first, check `lsof -nP -iTCP -sTCP:LISTEN`, and stop it in the same turn. Never run `npm run deploy`, `npm run deploy:staging`, `npm publish` or `wrangler`: they ship to customers.

New worktree: run `./scripts/setup-worktree.sh` first (installs the push hook, runs `npm ci`, fetches Playwright's Chromium). The SDK reads no `.env`; never copy one from another checkout.

`git push` runs the quality check on your branch (`.githooks/pre-push`). Agents fix what it reports and push again; they do not use `--no-verify`.

## Code

New files and the code you change follow `.claude/rules/code-conventions.md`, code that runs on the customer's page follows `.claude/rules/host-page.md`, and tests follow `.claude/rules/testing.md`. Read them before your first edit: old code here is no precedent.

## Public API

Everything a customer can call or rely on is public: `window.Gleap`, every `Gleap.*` method, its parameters, option keys, defaults, callbacks and events, the `exports`/`main`/`module`/`types` fields, the `gleap-*` custom elements, and the cookie and storage keys a signed-in user's session lives in.

- **Never remove, rename or change the meaning of any of it in a minor or patch version.** Sites on `latest` get the change with the next merge, without a deploy of their own. Add instead: a new optional parameter, an option, a method. From the third parameter on, take an options object.
- **Deprecate, don't delete:** keep the behaviour, mark it `@deprecated` in `index.d.ts` with what to use instead, and say so in `CHANGELOG.md`. Removal needs a major version, which is a product decision: stop and ask.
- **A change to the API updates `index.d.ts`, `CHANGELOG.md` and, for a new call, `README.md` in the same PR.** `npm run test:smoke` checks that every function `index.d.ts` declares exists on `window.Gleap`.
- **New behaviour is opted into.** A project gets it from a dashboard setting or a new call, never because the SDK was updated. A missing setting keeps today's behaviour.

## Customer requests

A ticket is one customer's view, a bug report too. Before changing anything for it:

- **A feature or a change:** decide whether it is right for the product. Would most customers want it, or does it belong behind a setting every customer can use?
- **A bug report:** first check whether the code does something other than intended, from its tests, comments, docs and history. If it works as designed and the customer expected something else, it is not a bug: change nothing, and say so in your report, with what the customer can do instead. Changing intended behaviour is a product decision: stop and ask.
- **Never special-case one customer in code:** no project, organisation or user ids, customer names or domains in conditions. If the only fix that works is specific to one customer, stop and ask; an approved exception goes in a setting with an owner and a removal condition, not in code.

## Stop and ask

Keep going while a step needs no input. Stop and ask before merging, releasing (a version bump, a tag, `published/`), adding a dependency (runtime or dev), changing the build (`webpack.config.js`, `babel.config.js`, browser targets, `package.json` scripts), deploy config (`wrangler.jsonc`, `published/_headers`, `.github/workflows/release.yml`), removing or changing anything public (above), or changing a message the SDK and the Messenger exchange.

## Production

There is no staging for `latest`: a merge to `master` reaches every page that loads `sdk.gleap.io/latest/index.js` within minutes. Rolling back the CDN: Cloudflare dashboard → Workers → jssdk → Deployments; it needs Cloudflare access, so ask. An npm version cannot be republished: a broken release is fixed by a new version.
