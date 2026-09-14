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
Banner and modal frame URLs already have `setBannerUrl` and `setModalUrl` setters.

References:
- https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/start/advanced-settings/worker-as-origin/
- https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/security/certificate-management/issue-and-validate/validate-certificates/delegated-dcv/
