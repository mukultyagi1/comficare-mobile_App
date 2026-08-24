// Matches comficare-frontend's LocationDetailPanel.jsx / LocationPage.jsx
// exactly: a location only counts as Live while isSharing is true AND the
// last update is under 90s old (an ungraceful disconnect — phone locked,
// network drop — can leave isSharing stale for a while).
const LIVE_STALE_AFTER_MS = 90_000;

export function isLive(location) {
  if (!location?.isSharing) return false;
  return Date.now() - new Date(location.updatedAt).getTime() < LIVE_STALE_AFTER_MS;
}

// Single-point map embed via Google's Maps Embed API, shown inside a
// WebView — matches comficare-frontend's googleMapsEmbedUrl (utils/geocode.js).
// Needs "Maps Embed API" enabled for EXPO_PUBLIC_GOOGLE_MAPS_API_KEY.
export function mapEmbedUrl(latitude, longitude, zoom = 16) {
  const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  return `https://www.google.com/maps/embed/v1/place?key=${key}&q=${latitude},${longitude}&zoom=${zoom}`;
}
