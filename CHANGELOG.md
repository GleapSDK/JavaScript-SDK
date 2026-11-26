# Changelog

## 19.9.2

### Breaking changes
- None.

### Fixed
- In product tours, a sender photo that is not square is centered in its round frame instead of cropped to the top left. ([#242](https://github.com/GleapSDK/JavaScript-SDK/pull/242))

## 19.9.1

### Breaking changes
- TypeScript: `Gleap.setStyles` is typed with positional arguments, as the SDK always took them. A call with one object now fails to compile (it never worked). Pass the values as arguments. ([#230](https://github.com/GleapSDK/JavaScript-SDK/pull/230))
- `Gleap.identify` and `Gleap.updateContact` reject with an `Error` with a message, not `undefined` or a string. Error trackers now report these failures; catch them if you don't want that. ([#231](https://github.com/GleapSDK/JavaScript-SDK/pull/231))
- A logout while `identify` or `updateContact` is still running resolves instead of rejecting. ([#231](https://github.com/GleapSDK/JavaScript-SDK/pull/231))

### Changed
- A product tour that is not live on the page no longer logs to `console.error`. ([#231](https://github.com/GleapSDK/JavaScript-SDK/pull/231))

## 19.9.0

### Breaking changes
- **Record screen** in the feedback form uses the microphone only when **Developer options → Microphone** is on, and starts muted. Turn the setting on to keep sound in form recordings. ([#224](https://github.com/GleapSDK/JavaScript-SDK/pull/224))

### Added
- Product tours and tooltips can point at elements inside open shadow roots with `host >>> inner`. ([#222](https://github.com/GleapSDK/JavaScript-SDK/pull/222))

### Changed
- On desktop Chromium, **Mark the bug** and **Record screen** capture the current tab, after one click in the browser's share dialog. The server render stays the fallback. ([#214](https://github.com/GleapSDK/JavaScript-SDK/pull/214))
- Replay recording starts once the page is idle, at most 2 s after `Gleap.initialize`. ([#216](https://github.com/GleapSDK/JavaScript-SDK/pull/216))

### Fixed
- On iPhone, the launcher sometimes did not open the widget until a reload. ([#215](https://github.com/GleapSDK/JavaScript-SDK/pull/215))
- A tour whose start URL has a query string never started. ([#218](https://github.com/GleapSDK/JavaScript-SDK/pull/218))
- A second tour in the same page load moved two steps per click. ([#222](https://github.com/GleapSDK/JavaScript-SDK/pull/222))
- `index.d.ts` declares `setAiChatbarPlaceholder`, `getChecklistData`, `setOfflineMode`, `close(resetRoutes)`, `onToken` and `cancelStream`. ([#221](https://github.com/GleapSDK/JavaScript-SDK/pull/221))

## 19.8.1

### Breaking changes
- None.

### Fixed
- `package.json` declares `"license": "MIT"`, matching the LICENSE file. No code changes. ([#219](https://github.com/GleapSDK/JavaScript-SDK/pull/219))

## 19.8.0

### Breaking changes
- Banners set to **Until dismissed** show until the person closes them, then stay closed. Before, they showed once per person. ([#205](https://github.com/GleapSDK/JavaScript-SDK/pull/205))

## 19.7.0

### Breaking changes
- Signed sessions end when they expire and no new identity token arrives. The user goes on as a new visitor, like after `Gleap.clearIdentity()`. Users identified without a token or hash are not affected. ([#212](https://github.com/GleapSDK/JavaScript-SDK/pull/212))
- A page left open past the expiry ends the session too. If the Messenger is open, it ends once the Messenger closes, at most one hour later. ([#212](https://github.com/GleapSDK/JavaScript-SDK/pull/212))

### Changed
- Before a session ends, the SDK tries once to sign it again with `setUserJwt` or the JWT provider. ([#212](https://github.com/GleapSDK/JavaScript-SDK/pull/212))

## 19.6.1

### Breaking changes
- None.

### Changed
- Documentation only: the README and doc comments use the name Project ID and `setUserJwt`. No code changes. ([#210](https://github.com/GleapSDK/JavaScript-SDK/pull/210))

## 19.6.0

### Breaking changes
- None.

### Added
- `Gleap.initialize({ projectId, sessionDuration })` takes the Project ID inside the options object. ([#209](https://github.com/GleapSDK/JavaScript-SDK/pull/209))

### Changed
- The key `Gleap.initialize` takes is now called **Project ID** (formerly SDK key or API key). Existing keys keep working. ([#209](https://github.com/GleapSDK/JavaScript-SDK/pull/209))

## 19.5.2

### Breaking changes
- None.

### Fixed
- `Gleap.setUserJwtProvider` alone did not sign the session again after a page reload. ([#208](https://github.com/GleapSDK/JavaScript-SDK/pull/208))
- Cookies were not stored on IP address hosts such as `http://127.0.0.1:8080`. ([#208](https://github.com/GleapSDK/JavaScript-SDK/pull/208))

## 19.5.1

### Breaking changes
- None.

### Fixed
- TypeScript: `getIdentity()` lists the user's fields (`userId`, `name`, `email`, `phone`, `companyId`) again. ([#207](https://github.com/GleapSDK/JavaScript-SDK/pull/207))

## 19.5.0

### Breaking changes
- None.

### Added
- `Gleap.setUserJwt(token)` signs the user in with an identity token (an HS256 JWT from your backend). ([#203](https://github.com/GleapSDK/JavaScript-SDK/pull/203))
- `Gleap.setUserJwtProvider(provider)` gives Gleap a function that returns a fresh token. ([#203](https://github.com/GleapSDK/JavaScript-SDK/pull/203))
- `Gleap.setAuthTokens(tokens)` stores per-user tokens for your API tools. ([#203](https://github.com/GleapSDK/JavaScript-SDK/pull/203))
- `Gleap.setSessionDuration(ms)` and the `sessionDuration` option ask for a shorter signed session. ([#203](https://github.com/GleapSDK/JavaScript-SDK/pull/203))
- `Gleap.getIdentity()` returns the signed session grant. ([#203](https://github.com/GleapSDK/JavaScript-SDK/pull/203))

## 19.4.1

### Breaking changes
- None.

### Fixed
- Since 19.4.0, the SDK failed to load on pages that are not UTF-8. ([#206](https://github.com/GleapSDK/JavaScript-SDK/pull/206))

## 19.4.0

### Breaking changes
- None.

### Added
- **Show me** chat cards scroll to and outline the button or field they name. `Gleap.disableQueryParams()` turns it off. ([#204](https://github.com/GleapSDK/JavaScript-SDK/pull/204))

## 19.3.9

### Breaking changes
- None.

### Fixed
- A hotspot tooltip floated over the page when the panel around it scrolled. ([#202](https://github.com/GleapSDK/JavaScript-SDK/pull/202))

## 19.3.8

### Breaking changes
- None.

### Fixed
- `Gleap.identify` with a `userHash` sent nothing when the same user was cached without a hash, so the contact was never verified. ([#200](https://github.com/GleapSDK/JavaScript-SDK/pull/200))

## 19.3.7

### Breaking changes
- None.

### Fixed
- The launcher can be used with the keyboard (Enter and Space open it, focus moves into the Messenger and back). ([#198](https://github.com/GleapSDK/JavaScript-SDK/pull/198))
- Hotspot tooltips follow page changes in apps that navigate without a reload (Turbo, SPAs). ([#196](https://github.com/GleapSDK/JavaScript-SDK/pull/196))

## 19.3.6

### Breaking changes
- None.

### Fixed
- A language switch in the app did not reach the contact when the user data was unchanged. ([#194](https://github.com/GleapSDK/JavaScript-SDK/pull/194))
- `Gleap.clearIdentity()` before the widget loaded kept the last contact's notifications. ([#190](https://github.com/GleapSDK/JavaScript-SDK/pull/190))
- Cached notification cards ignored disabled notifications. ([#192](https://github.com/GleapSDK/JavaScript-SDK/pull/192))

## 19.3.5

### Breaking changes
- None.

### Fixed
- A tour step that matched only a hidden element froze the page. Steps use the first visible match. ([#188](https://github.com/GleapSDK/JavaScript-SDK/pull/188))

## 19.3.4

### Breaking changes
- None.

### Added
- The widget can switch the visitor to a contact after the **Verify email** workflow step. A user your app identified is never replaced. ([#185](https://github.com/GleapSDK/JavaScript-SDK/pull/185))
- `Gleap.registerCustomAction` callbacks get the action's `data`. ([#187](https://github.com/GleapSDK/JavaScript-SDK/pull/187))

## 19.3.3

### Breaking changes
- None.

### Fixed
- Charts and other SVG graphics could be missing from screenshots. ([#186](https://github.com/GleapSDK/JavaScript-SDK/pull/186))

## 19.3.2

### Breaking changes
- None.

### Fixed
- Screenshots show the content of same-origin iframes instead of an empty box. ([#184](https://github.com/GleapSDK/JavaScript-SDK/pull/184))

## 19.3.1

### Breaking changes
- Security: the default URL handler opens only http(s), mailto, tel and relative links. `javascript:` and `data:` links no longer open. ([#182](https://github.com/GleapSDK/JavaScript-SDK/pull/182))

### Changed
- Security: new tabs open with `noopener`, and messages between the SDK and its frames need an exact origin match. ([#182](https://github.com/GleapSDK/JavaScript-SDK/pull/182))

### Fixed
- Screenshot and recording logs are sent only once the capture is saved. ([#182](https://github.com/GleapSDK/JavaScript-SDK/pull/182))
- With `Gleap.setApiUrl`, the SDK's own calls stay out of the network logs, and the `Gleap-Hash` header is always masked. ([#182](https://github.com/GleapSDK/JavaScript-SDK/pull/182))
- Images that can't be downloaded no longer break a screenshot, and switching users no longer races. ([#180](https://github.com/GleapSDK/JavaScript-SDK/pull/180))

## 19.3.0

### Breaking changes
- None.

### Changed
- New capture bar when Kai or a teammate asks for a screenshot or recording. Recordings can pause and resume. ([#177](https://github.com/GleapSDK/JavaScript-SDK/pull/177))
- The default recording limit is 2 minutes. ([#177](https://github.com/GleapSDK/JavaScript-SDK/pull/177))

## 19.2.3

### Breaking changes
- None.

### Fixed
- The websocket closes with code 1000 and does not open a second socket when the browser goes back online. ([#175](https://github.com/GleapSDK/JavaScript-SDK/pull/175))
- The keepalive is one `PING` frame every 25 s. ([#175](https://github.com/GleapSDK/JavaScript-SDK/pull/175))

## 19.2.2

### Breaking changes
- None.

### Fixed
- A tour or tooltip selector that is not valid CSS no longer throws. The tour ends cleanly. ([#172](https://github.com/GleapSDK/JavaScript-SDK/pull/172))
- The tour element picker no longer stores ids and classes that Mantine and React generate at runtime. ([#172](https://github.com/GleapSDK/JavaScript-SDK/pull/172))

## 19.2.1

### Breaking changes
- `Gleap.close()` on a widget that is already closed no longer fires the `close` event. ([#170](https://github.com/GleapSDK/JavaScript-SDK/pull/170))

### Changed
- Surveys skip email, name and phone questions for an identified contact (with **Skip when known**). ([#170](https://github.com/GleapSDK/JavaScript-SDK/pull/170))
- Surveys wait up to 5 s for an `identify` or `updateContact` still running. ([#170](https://github.com/GleapSDK/JavaScript-SDK/pull/170))

### Fixed
- A survey with nothing left to ask could leave an empty white card on screen. ([#170](https://github.com/GleapSDK/JavaScript-SDK/pull/170))

## 19.2.0

### Breaking changes
- None.

### Added
- Surveys 2.0: `Gleap.showSurvey(surveyId, options)` takes `format`, `fields`, `personalToken`, `container` and `resume`. Old format strings keep working. ([#168](https://github.com/GleapSDK/JavaScript-SDK/pull/168))
- New survey looks: a corner card (a bottom sheet on phones), full screen, and inline `page`. ([#168](https://github.com/GleapSDK/JavaScript-SDK/pull/168))
- New events `survey-shown`, `survey-answered`, `survey-completed` and `survey-closed`. ([#168](https://github.com/GleapSDK/JavaScript-SDK/pull/168))
- New `survey-embed.js` (about 3 KB) shows a survey inline, as a popup or behind a side tab. ([#168](https://github.com/GleapSDK/JavaScript-SDK/pull/168))

### Fixed
- Inline banners did not show on pages whose `body` clips its overflow. ([#169](https://github.com/GleapSDK/JavaScript-SDK/pull/169))

## 19.1.1

### Breaking changes
- None.

### Fixed
- The product tour editor works from the dashboard on app.gleap.ai. ([#167](https://github.com/GleapSDK/JavaScript-SDK/pull/167))

## 19.1.0

### Breaking changes
- None.

### Added
- Workflows, AI agents and teammates can ask the customer for a screenshot or screen recording in a conversation. Sensitive fields are masked. ([#163](https://github.com/GleapSDK/JavaScript-SDK/pull/163))
- They can also collect the page's console logs, network logs and other bug report data in the background. ([#163](https://github.com/GleapSDK/JavaScript-SDK/pull/163))
- Both are on by default. `Gleap.setCaptureEnabled(false)` and `Gleap.setRemoteLogCollectionEnabled(false)` turn them off. ([#163](https://github.com/GleapSDK/JavaScript-SDK/pull/163))

### Changed
- The browser bundle grows by about 34 KB gzipped. ([#163](https://github.com/GleapSDK/JavaScript-SDK/pull/163))

### Fixed
- The classic screen recording stops cleanly on the browser's **Stop sharing** and is uploaded only once. ([#163](https://github.com/GleapSDK/JavaScript-SDK/pull/163))

## 19.0.1

### Breaking changes
- None.

### Fixed
- The SDK's tour styles made the host page slower. ([#165](https://github.com/GleapSDK/JavaScript-SDK/pull/165))

## 19.0.0

### Breaking changes
- `Gleap.setNetworkLogPropsToIgnore` and `Gleap.setNetworkLogsBlacklist` replace their previous list instead of adding to it. Pass the full list in one call. ([#154](https://github.com/GleapSDK/JavaScript-SDK/pull/154))
- The SDK wraps the console methods in place instead of replacing `window.console`. `Gleap.disableConsoleLogOverwrite()` restores only the methods Gleap still owns. ([#154](https://github.com/GleapSDK/JavaScript-SDK/pull/154))

### Added
- Dark and light mode for the widget: turn on **Widget → Look & feel → Adapt to dark / light mode**. `Gleap.setColorScheme("auto" | "light" | "dark")` overrides it at runtime. ([#154](https://github.com/GleapSDK/JavaScript-SDK/pull/154))

### Changed
- Console logs format objects, errors and `%s`-style arguments, and include uncaught errors and rejections. ([#154](https://github.com/GleapSDK/JavaScript-SDK/pull/154))
- Network logs no longer keep responses in memory. Streaming and binary responses are not read. ([#154](https://github.com/GleapSDK/JavaScript-SDK/pull/154))
- Network logs record more headers and bodies, and failed requests carry their error. ([#154](https://github.com/GleapSDK/JavaScript-SDK/pull/154))
- Props to ignore match without case and apply to headers, nested JSON, forms and query parameters. `Authorization` and `Cookie` headers are always redacted. ([#154](https://github.com/GleapSDK/JavaScript-SDK/pull/154))

### Fixed
- Tracked events were lost when the API was overloaded. They now stay queued and retry with backoff. ([#154](https://github.com/GleapSDK/JavaScript-SDK/pull/154))
- The websocket reconnected every 5 s forever. It now backs off up to 60 s and waits while offline. ([#154](https://github.com/GleapSDK/JavaScript-SDK/pull/154))

## 18.1.2

### Breaking changes
- None.

### Fixed
- Screenshots keep the layout around blocked elements, so drawings mark the right content. ([#159](https://github.com/GleapSDK/JavaScript-SDK/pull/159))

## 18.1.1

### Breaking changes
- None.

### Changed
- Screenshots and replays mask form fields by the same rules. Password and card fields are always masked. ([#155](https://github.com/GleapSDK/JavaScript-SDK/pull/155))
- `Gleap.setReplayOptions` masking options apply to screenshots too. Screenshots and replays may mask more fields than before. ([#155](https://github.com/GleapSDK/JavaScript-SDK/pull/155))

### Fixed
- Security: screenshots sent the values of password fields to Gleap. ([#155](https://github.com/GleapSDK/JavaScript-SDK/pull/155))
- Screenshots captured the content of blocked elements (`rr-block`, `gl-block`). ([#157](https://github.com/GleapSDK/JavaScript-SDK/pull/157))
- Text in `rr-mask` and `gl-mask` elements was not masked in screenshots. ([#157](https://github.com/GleapSDK/JavaScript-SDK/pull/157))

## 18.1.0

### Breaking changes
- None.

### Added
- `Gleap.setEnvDataPropsToIgnore(keys)` removes single env data keys from tickets. ([#153](https://github.com/GleapSDK/JavaScript-SDK/pull/153))
- `Gleap.setDisableEnvData(true)` stops collecting env data. ([#153](https://github.com/GleapSDK/JavaScript-SDK/pull/153))

## 18.0.1

### Breaking changes
- None.

### Added
- Support for authenticated conversation files (opt-in per project). ([#147](https://github.com/GleapSDK/JavaScript-SDK/pull/147))

### Changed
- The session replay buffer is capped at about 10 MB. ([#148](https://github.com/GleapSDK/JavaScript-SDK/pull/148))

### Fixed
- A report rejected as too large (HTTP 413) is resent without the replay instead of being lost. ([#148](https://github.com/GleapSDK/JavaScript-SDK/pull/148))

## 18.0.0

### Breaking changes
- None. The major version matches the other Gleap SDKs for the data region release. Without `Gleap.setRegion` the SDK works as in 17.x.

### Added
- `Gleap.setRegion("eu" | "us")` sets all API hosts for a data region. `Gleap.getRegion()` returns it. ([#146](https://github.com/GleapSDK/JavaScript-SDK/pull/146))
- `Gleap.setAgentConversationUrl` overrides the agent conversation frame URL. ([#146](https://github.com/GleapSDK/JavaScript-SDK/pull/146))
- The `GleapRegion` type. ([#146](https://github.com/GleapSDK/JavaScript-SDK/pull/146))

### Changed
- `gleap.ai` is on the default network log blacklist. ([#146](https://github.com/GleapSDK/JavaScript-SDK/pull/146))

### Fixed
- `messenger-app.gleap.io` was never added to the consentmanager allowlist. ([#146](https://github.com/GleapSDK/JavaScript-SDK/pull/146))
