# Authenticated conversation files

Companion to Server `AUTHENTICATED_FILES.md`. When the API flags a project as requiring authenticated files, a successful server-verified identify (a signed identity token via `Gleap.setUserJwt`, or the legacy user hash via `Gleap.identify(userId, data, userHash)`) supplies a short-lived file session to Messenger. The SDK refreshes it while active, preserves it only for the same identity, and requests revocation on logout. Guests and contacts identified without a signed identity (token or legacy hash) cannot read protected files.

The grant a signed identify returns (`identity.grant`) is a separate credential: it rides as `Gleap-Grant` on every SDK request (file uploads and feedback included) and goes to Messenger next to the session, never inside it, so the file session and the grant are never persisted together. Logout drops both.

A customer application configured for emailed file links must preserve `gleapFile` through its own login flow and identify the customer with a signed identity (`Gleap.setUserJwt`, or the legacy user hash); the SDK then asks the API for the authorized conversation and opens it. Deploy the API and compatible Messenger before enabling the per-project setting. Offline revocation cannot reach the server; tokens still expire after 15 minutes.

Validation: `npm test -- --runInBand --watchman=false` (277 tests), `npm run build`. No package publishing or synchronized SDK version bump is included.
