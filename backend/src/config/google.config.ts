export function getGoogleConfig() {
  return {
    mapsApiKey: process.env.GOOGLE_MAPS_API_KEY ?? '',
    placesApiKey: process.env.GOOGLE_PLACES_API_KEY ?? process.env.GOOGLE_MAPS_API_KEY ?? '',
  };
}
