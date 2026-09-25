# Changelog

## 18.1.0
Added control over the env data (device, browser and page details shown under the Env data tab of a ticket) the SDK collects:
`Gleap.setEnvDataPropsToIgnore(["currentUrl", "userAgent"])` removes individual env data keys from every ticket and conversation before it is sent. Each call replaces the previous list; an empty list resets it.
`Gleap.setDisableEnvData(true)` stops collecting env data entirely (tickets arrive with an empty Env data tab); `Gleap.setDisableEnvData(false)` turns it back on.
Both can be called before or after `Gleap.initialize` and apply to the next ticket. The per-form "Exclude data → Env data" switch in the dashboard keeps working as before.

## 18.0.1
The session replay buffer is now capped by size as well as by time (about 10 MB of events, on top of the existing three 5-minute checkpoints). When it grows past that, the oldest checkpoints are dropped first; if a single checkpoint outgrows the budget on a page that re-renders constantly, a fresh checkpoint replaces it (at most every 30 seconds), so the most recent activity is always kept. This bounds the memory the recorder holds in the host page and the size of the report upload.
A report that the API (or a proxy in front of it) rejects as too large (HTTP 413) is no longer lost: it is resent without the session replay, and if needed without screenshot data and network logs.
Added support for authenticated conversation files (opt-in per project): after a server-verified `identify`, the SDK hands a short-lived file session to the messenger, refreshes it while active, keeps it only for the same identity and revokes it on logout. Projects that have not enabled the setting are unaffected.

## 18.0.0
No breaking changes: major version aligned across all Gleap SDKs for the data-region release. Without `Gleap.setRegion` the SDK behaves exactly as 17.x (EU hosts).

Added data regions: `Gleap.setRegion("eu" | "us")` (case-insensitive, call before `Gleap.initialize`) sets the API url, the SDK streaming (WS) url and the messenger realtime host for the region at once; `Gleap.getRegion()` returns the active region. The default region stays `eu`. An unknown region logs a console warning and changes nothing.
(eu: `https://api.gleap.io`, `wss://ws.gleap.io`, `sockets.gleap.io`; us: `https://api.us.gleap.ai`, `wss://ws.us.gleap.ai`, `sockets.us.gleap.ai`)
Manual host setters are unchanged and keep working: `setApiUrl`, `setWSApiUrl`, `setRealtimeHost`, `setFrameUrl`, `setBannerUrl`, `setModalUrl`. The last call wins: a manual setter called after `setRegion` overrides that single host, `setRegion` called after manual setters overrides the three region hosts.
The static widget hosts stay global for every region (`messenger-app.gleap.io`, `outboundmedia.gleap.io`, `sdk.gleap.io`, `js.gleap.io`); `setRegion` never changes the frame, banner or modal url.
Added `Gleap.setAgentConversationUrl` to override the `<gleap-agent-conversation>` iframe url (same as `setBannerUrl` / `setModalUrl`).
Added `gleap.ai` to the default network-log blacklist, so the SDK does not record its own US traffic.
Added the `GleapRegion` type to the TypeScript definitions.
Fixed the consentmanager allowlist (`window.cmp_block_ignoredomains`): `messenger-app.gleap.io` was never actually added because the result of `concat` was discarded.
