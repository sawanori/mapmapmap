/**
 * Open Google Maps directions in a new tab (walking mode).
 */
export function openRoute(
  place: { lat: number; lng: number; id: string },
  userLat: number,
  userLng: number,
): void {
  const url = `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${place.lat},${place.lng}&destination_place_id=${place.id}&travelmode=walking`;
  window.open(url, '_blank');
}
