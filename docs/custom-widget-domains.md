# Custom widget domains

Configure before `Gleap.initialize()`. These are example hostnames; provision your own domains before using them.

```js
import Gleap from 'gleap';

Gleap.setApiUrl('https://api.support.example.com');
Gleap.setFrameUrl('https://widget.support.example.com');
Gleap.setWSApiUrl('wss://ws.support.example.com');
Gleap.setRealtimeHost('sockets.support.example.com');
Gleap.initialize('YOUR_PROJECT_SDK_KEY');
```

`setRealtimeHost` takes a hostname only; the messenger uses WSS on port 443.
It configures messenger realtime, whereas `setWSApiUrl` configures SDK streaming.
The regular widget and AI chatbar both receive the realtime host. The chatbar
loads `/chatbar` from the configured frame URL. Omitting the realtime override
preserves the messenger's environment/default hostname.

Deploy the updated Messenger-App before releasing the updated SDK. An older
messenger ignores `realtimeHost` and continues using its default realtime domain.
The agent dashboard requires no changes.

## Data regions

Gleap projects live in a data region. Select it with `Gleap.setRegion` before
`Gleap.initialize()`. The default region is `eu`, so existing integrations need
no change.

```js
import Gleap from 'gleap';

Gleap.setRegion('us'); // "eu" | "us", case-insensitive
Gleap.initialize('YOUR_PROJECT_SDK_KEY');
```

`setRegion` sets three hosts at once:

| Region | API (`setApiUrl`) | SDK streaming (`setWSApiUrl`) | Messenger realtime (`setRealtimeHost`) |
|--------|-------------------|-------------------------------|----------------------------------------|
| `eu` (default) | `https://api.eu.gleap.ai` | `wss://ws.eu.gleap.ai` | `sockets.eu.gleap.ai` |
| `us` | `https://api.us.gleap.ai` | `wss://ws.us.gleap.ai` | `sockets.us.gleap.ai` |

An unknown region logs a console warning and changes nothing.
`Gleap.getRegion()` returns the active region. Without a `setRegion` call the
realtime host is not sent to the messenger, which then uses its own default
(`sockets.eu.gleap.ai`), exactly as before.

### Order rule

The last call wins:

- A manual setter (`setApiUrl`, `setWSApiUrl`, `setRealtimeHost`) called AFTER
  `setRegion` overrides that single host; the other two keep the region's value.
- `setRegion` called after manual setters overrides all three region hosts.

```js
Gleap.setRegion('us');
Gleap.setApiUrl('https://api.support.example.com'); // only the API host is custom
Gleap.initialize('YOUR_PROJECT_SDK_KEY');
```

### Static widget hosts are global

The static widget hosts are the same for every region: `messenger-app.gleap.io`
(widget frame), `outboundmedia.gleap.io` (banners, modals, agent conversation),
`sdk.gleap.io` and `js.gleap.io` (SDK script and assets). `setRegion` never
changes `setFrameUrl`, `setBannerUrl`, `setModalUrl` or
`setAgentConversationUrl`; those setters keep working independently.

If you use a Content-Security-Policy or a network allowlist, US projects must
additionally allow `https://api.us.gleap.ai`, `wss://ws.us.gleap.ai` and
`wss://sockets.us.gleap.ai` (`connect-src`) next to the global `*.gleap.io`
widget hosts.

The region table lives in one place in the SDK: `src/GleapRegions.js`.

## Hosting requirements

Provision DNS, valid TLS certificates and reverse proxy routing for each custom
hostname before enabling these settings. The API hostname must serve both SDK
requests and messenger `/v3` requests. Preserve WebSocket upgrades, CORS, paths,
query parameters and authentication headers; do not cache session/auth responses.

## Network allowlisting acceptance

These overrides cover the core widget endpoints, not every external resource.
Bundle the SDK with the customer's app or proxy its script delivery separately.
Test with Gleap domains blocked, including files/uploads, avatars, help content,
banners/modals and any enabled voice integrations. Proxy/configure remaining
required resources before promising that no Gleap domains need allowlisting.
Banner and modal frame URLs already have `setBannerUrl` and `setModalUrl` setters;
the `<gleap-agent-conversation>` frame has `setAgentConversationUrl` (call it
before the element is attached to the DOM).

References:
- https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/start/advanced-settings/worker-as-origin/
- https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/security/certificate-management/issue-and-validate/validate-certificates/delegated-dcv/
