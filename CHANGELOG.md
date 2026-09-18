# Changelog

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
