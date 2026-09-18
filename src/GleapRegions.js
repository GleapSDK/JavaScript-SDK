/**
 * Gleap data regions.
 *
 * This is the single source of truth for the region specific hosts. To move a
 * region to new hosts, edit this table only. EU uses `*.eu.gleap.ai`; the
 * legacy `*.gleap.io` hosts (api/ws/sockets.gleap.io) keep serving older SDKs
 * and remain valid values for the manual setters.
 *
 * Only the API, the SDK streaming (WS) and the messenger realtime host are
 * region specific. The static widget hosts (messenger-app.gleap.io,
 * outboundmedia.gleap.io, sdk.gleap.io, js.gleap.io) are global for every
 * region and are intentionally NOT part of this table.
 */
export const GLEAP_REGIONS = {
  eu: {
    apiUrl: 'https://api.eu.gleap.ai',
    wsApiUrl: 'wss://ws.eu.gleap.ai',
    realtimeHost: 'sockets.eu.gleap.ai',
  },
  us: {
    apiUrl: 'https://api.us.gleap.ai',
    wsApiUrl: 'wss://ws.us.gleap.ai',
    realtimeHost: 'sockets.us.gleap.ai',
  },
};

export const GLEAP_DEFAULT_REGION = 'eu';

/**
 * Normalizes a region identifier (case-insensitive).
 * @param {string} region
 * @returns {string|null} The region key or null if the region is unknown.
 */
export const resolveGleapRegion = (region) => {
  if (typeof region !== 'string') {
    return null;
  }

  const regionKey = region.trim().toLowerCase();
  if (!Object.prototype.hasOwnProperty.call(GLEAP_REGIONS, regionKey)) {
    return null;
  }

  return regionKey;
};
