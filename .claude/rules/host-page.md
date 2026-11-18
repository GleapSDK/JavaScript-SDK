---
paths:
  - "src/**/*.js"
---

# Code on the customer's page

This code runs inside websites we do not own, next to their frameworks, their monitoring tools and their Content Security Policy, in browsers we do not choose. For new code and the code you change; do not rewrite old code to match. Each rule names the helper that already does it right.

## Leave the page as it was

- **One global, `window.Gleap`.** No new `window.*` properties, no changes to built-in prototypes, no polyfills. The canvas patch at the top of `src/Gleap.js` is old and not a pattern. `npm run test:smoke` fails on a new global.
- **Custom elements** start with `gleap-` and are defined only if `customElements.get` finds none (`src/GleapChecklist.js`).
- **CSS** reaches only our own elements: selectors under a `gleap-` class or inside our shadow root, never bare element selectors, never `!important` on the page's elements.
- **Wrapping `fetch`, `XMLHttpRequest` or `console`:** only when the feature starts, once; call the original with the original `this` and arguments, never throw from the wrapper, and on stop restore only where our wrapper is still installed (`stop()` in `src/GleapConsoleLogManager.js`).
- **Everything you start, you stop:** each listener, observer, timer and frame has a teardown that `Gleap.destroy()` reaches. Scroll, touch and wheel listeners are `{ passive: true }`.
- **Never throw into the page.** A public method catches its own errors; a callback the customer passed us is called inside `try`. An unreachable Gleap API is normal: the page keeps working, at most one warning.

## Content Security Policy and Trusted Types

Many customers send a strict CSP, and the about:blank frames the SDK writes inherit it.

- No `eval`, `new Function`, or a string passed to `setTimeout` or `setInterval`.
- Every `<script>` and `<style>` the SDK creates goes through `applyGleapCSPNonce`; frame markup goes through `bootstrapGleapFrame`, which stamps the nonce.
- Set styles through `element.style.x` or `style.setProperty`: a `style` attribute in markup, `setAttribute('style')` and `cssText` are blocked under `style-src` without `'unsafe-inline'`.
- Build DOM with `createElement` and `textContent`. No new `innerHTML`, `insertAdjacentHTML`, `outerHTML` or `srcdoc` with text from the server, a message or the page: those are what Trusted Types forbids and where XSS starts. Static markup we wrote ourselves is the one exception.

## Frames and messages

- Send with `frameTargetOrigin(frame, url)`; `'*'` only for data any page may see, with a comment saying why.
- Act on a message only after `event.source === frame.contentWindow` or `originMatchesUrl(event.origin, url)` (`src/GleapMessageSecurity.js`). Parse it inside `try`, act only on names you know, and ignore the rest: an older or newer Messenger sends names this version does not know.
- A message name or field the Messenger sends or reads keeps working in both directions. Rename nothing; add a new name and keep handling the old one (`AGENTS.md` → Stop and ask).
- A URL from a message or the server opens only through the url handler (`isSafeNavigationUrl`), and never reaches an HTML sink.

## Privacy

- Cookies through `setGleapCookie` (credentials get `SameSite=Lax`, and `Secure` on https), storage through `saveToGleapCache`. New keys start with `gleap-`. Never rename an existing key: that signs users out. Respect `Gleap.setUseCookies(false)`.
- Screenshots, replays and logs mask with the shared rules (`src/GleapInputMasking.js`, `src/GleapNetworkLogSanitizer.js`) before anything leaves the browser. A new capture path reuses them; masking stays on by default.
- No fingerprinting: collect only what a feature shows to the support team, and nothing a page did not hand us.
- No identity token, grant or auth token in storage, a cookie we did not design for it, a log or a URL.

## Load time and size

- Loading the bundle only registers: no request, no layout read, no timer. Work starts in `Gleap.initialize` or later, and what can wait goes through `runWhenIdle`.
- Long work is split into tasks under 50 ms; buffers are capped; state per DOM node lives in a `WeakMap`.
- Every customer downloads the whole bundle on every page. A new dependency or a large feature says its size cost in the PR; `npm run test:smoke` enforces the budgets in `smoke/bundleCost.spec.mjs`, raised only with a reason.

## Browsers

Babel compiles our syntax; nothing adds missing APIs. The capture modules and our dependencies need ES2020 browsers (`babel.config.js`: Chrome and Edge 80, Firefox 74, Safari 13.1). An API newer than that is feature-detected with a fallback, like `runWhenIdle` for Safari's missing `requestIdleCallback`. Changing the browser targets is a build change: stop and ask.
