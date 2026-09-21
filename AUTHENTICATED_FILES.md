# Authenticated conversation files

Companion to Server `AUTHENTICATED_FILES.md`. When the API flags a project as requiring authenticated files, a successful server-verified `identify` call supplies a short-lived file session to Messenger. The SDK refreshes it while active, preserves it only for the same identity, and requests revocation on logout. Unverified anonymous sessions cannot read protected files.

A customer application configured for emailed file links must preserve `gleapFile` through its own login flow and call verified `identify`; the SDK then asks the API for the authorized conversation and opens it. Deploy the API and compatible Messenger before enabling the per-project setting. Offline revocation cannot reach the server; tokens still expire after 15 minutes.

Validation: `npm test -- --runInBand --watchman=false` (277 tests), `npm run build`. No package publishing or synchronized SDK version bump is included.
