// Matches comficare-frontend's LocationDetailPanel.jsx / LocationPage.jsx
// exactly: a location only counts as Live while isSharing is true AND the
// last update is under 90s old (an ungraceful disconnect — phone locked,
// network drop — can leave isSharing stale for a while).
const LIVE_STALE_AFTER_MS = 90_000;

export function isLive(location) {
  if (!location?.isSharing) return false;
  return Date.now() - new Date(location.updatedAt).getTime() < LIVE_STALE_AFTER_MS;
}

export function osmEmbedUrl(latitude, longitude, delta = 0.006) {
  const bbox = [longitude - delta, latitude - delta, longitude + delta, latitude + delta].join(',');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&marker=${latitude},${longitude}&layer=mapnik`;
}
