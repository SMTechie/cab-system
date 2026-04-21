export interface Coordinate {
  latitude: number;
  longitude: number;
}

export function haversineKm(origin: Coordinate, destination: Coordinate) {
  const radiusKm = 6371;
  const dLat = degreesToRadians(destination.latitude - origin.latitude);
  const dLng = degreesToRadians(destination.longitude - origin.longitude);
  const lat1 = degreesToRadians(origin.latitude);
  const lat2 = degreesToRadians(destination.latitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return Number((2 * radiusKm * Math.asin(Math.sqrt(a))).toFixed(2));
}

function degreesToRadians(value: number) {
  return (value * Math.PI) / 180;
}
