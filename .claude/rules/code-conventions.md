---
paths:
  - "src/**/*.js"
---

# Code conventions

For new files and the code you change; do not rewrite other code to match. The code around you is full of patterns new code must not copy, so copy the examples below, not your neighbours. `node tools/quality/check.mjs` checks the rules it can see; it judges only what your branch adds.

- **Size:** aim for files under 400 lines and never write a new one over 700. Functions 80 lines, counted without blanks and comments. These are working values, not proven limits. Tests and fixtures have none. A file or function already too big must not grow (`Gleap.js`, `GleapSession.js`, `UI.js`, `GleapFrameManager.js` and others are): put the new part in its own module and call it from there. Split by responsibility; never squeeze code onto fewer lines.
- **Parameters:** at most 2 positional, from 3 on one object with named fields. Callbacks a browser API or library calls are exempt. Existing public methods keep their signatures (`AGENTS.md` → Public API).
- **Modules:** one responsibility per file in `src/`, named after it in PascalCase (`GleapTourSelector.js`), unique in the repo: no new `index`, `utils` or `helpers`. Named exports only: a default export has no canonical name, so agents cannot find or rename it reliably. `src/index.js` keeps its default export, the package's entry. Existing default exports and `getInstance()` singletons stay; new logic is plain exported functions, with state in a class only when it has a lifecycle (start, stop).
- **Imports:** relative paths. A module that only needs one manager imports it from its own file, not from `./Gleap`: that file pulls in the whole SDK and makes cycles. No new runtime package: `smoke/bundleCost.spec.mjs` fails on an import package.json does not declare, and adding one is a Stop-and-ask (`AGENTS.md`).
- **Values:** a closed set of values is one frozen object of named constants (`Object.freeze({ OPEN: 'open' })`) next to the code that owns it, with no string literals in comparisons or `case`. The values are the stored or wire strings: add members, never rename a value, and handle a value the Server or the Messenger may add later. DOM values (`event.key === 'Enter'`, `typeof x === 'string'`) are fine.
- **One definition:** before adding a helper, constant or message name, search for an existing one and extend it if it covers most of the need. A value the Server stores keeps exactly the Server's strings (`../Server`, from a worktree `../../Server`); a message name the Messenger reads keeps the Messenger's (`../Messenger-App`).
- **Noise:** no `console.log`; `console.warn` and `console.error` only for what the customer's developer must act on, naming Gleap (`[Gleap] …`), at most once per cause. No commented-out code. A comment says why, in English, in one or two lines, and only where the code cannot. No ticket or PR numbers, people's names, dates or decision histories: those belong in the PR.
- **JSDoc** on every new exported function: what it does, `@param` and `@returns` with types. It is the only type information this code has.

## One job, one system

Where the code has a helper for a job, new code uses it. Each one carries a rule the direct call misses.

| Job | Use | Not in new code |
|---|---|---|
| Browser storage | `saveToGleapCache`, `loadFromGleapCache`, `clearGleapCache` (`src/GleapHelper.js`) | `localStorage` directly, a key without the `gleap-` prefix |
| Cookies | `setGleapCookie`, `getGleapCookie`, `eraseGleapCookie` (`src/GleapHelper.js`) | `document.cookie` directly |
| `<script>` and `<style>` the SDK creates | `applyGleapCSPNonce(element)` before it is added | an element without the page's nonce |
| A Gleap frame | `bootstrapGleapFrame` (`src/GleapHelper.js`): stamps the nonce, reports CSP blocks, falls back to `src` | `document.write` or `srcdoc` of your own |
| Sending to a frame | `postMessage(JSON.stringify(data), frameTargetOrigin(frame, url))` (`src/GleapMessageSecurity.js`) | `'*'` as the target origin |
| Receiving from a frame | `event.source === frame.contentWindow`, or `originMatchesUrl(event.origin, url)` | `includes`, `startsWith` or a regex on an origin |
| Opening a link | the frame manager's url handler, which checks `isSafeNavigationUrl` | `window.open` or `location.href` with a URL from a message or the server |
| Requests to the Gleap API | `XMLHttpRequest` to `GleapSession.getInstance().apiUrl` with `GleapSession.getInstance().injectSession(xhr)` | a literal API host, headers set by hand |
| Selectors from the dashboard | `querySelectorSafe`, `querySelectorAllSafe` (`src/GleapSafeSelector.js`) | `document.querySelector` with a server value |
| Work that can wait | `runWhenIdle` (`src/GleapIdle.js`) | `requestIdleCallback` directly |
| Masking in screenshots and replays | `src/GleapInputMasking.js` | a masking rule of your own |
| Network logs | `src/GleapNetworkLogSanitizer.js` (blacklist, redaction) | logging headers or bodies unredacted |

## Examples to copy

The closest we have today, so copy only what each line names, and not their default exports.

- Small module of exported functions with its test beside it: `src/GleapMessageSecurity.js`, `src/GleapMessageSecurity.test.js`.
- Logic with a DOM, tested in jsdom: `src/GleapSafeSelector.js`, `src/GleapShadowSelector.test.js`.
- A wrapper that restores only its own patch: `stop()` in `src/GleapConsoleLogManager.js`.
