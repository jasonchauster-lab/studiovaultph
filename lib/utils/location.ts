import { getGeocodeAction, getReverseGeocodeAction, getAutocompleteAction } from '../actions/location'

/**
 * Calculates the Haversine distance between two points in kilometers.
 * @param lat1 Latitude of the first point
 * @param lon1 Longitude of the first point
 * @param lat2 Latitude of the second point
 * @param lon2 Longitude of the second point
 * @returns Distance in kilometers
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Geocodes an address string to Latitude and Longitude using Google Maps Geocoding API (via Server Action).
 * Fallback to a free service or dummy coordinates if API Key is missing.
 */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number, full?: string, short?: string } | null> {
  // Use Server Action to avoid CORS
  const result = await getGeocodeAction(address);
  if (result.data) {
    const { location, full, short } = result.data;
    return { lat: location.lat, lng: location.lng, full, short };
  }

  // Fallback to OSM (Nominatim) directly if server action fails or key is missing
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      {
        headers: {
          'User-Agent': 'PilatesBridge/1.0 (contact@studiovaultph.com)'
        }
      }
    );
    const data = await response.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), full: data[0].display_name, short: data[0].name || data[0].display_name.split(',')[0] };
    }
  } catch (err) {
    console.error('OSM Fallback error:', err);
  }

  // Final fallback to Manila if everything fails
  return { lat: 14.5995, lng: 120.9842, full: 'Manila, Philippines', short: 'Manila' };
}

/**
 * Reverse geocodes coordinates to a human-readable address using Google Maps Geocoding API (via Server Action).
 */
export async function reverseGeocode(lat: number, lng: number): Promise<{ full: string, short: string } | null> {
  const result = await getReverseGeocodeAction(lat, lng);
  if (result.data) {
    return result.data;
  }

  // OSM Fallback (Nominatim)
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      {
        headers: {
          'User-Agent': 'PilatesBridge/1.0 (contact@studiovaultph.com)'
        }
      }
    );
    const data = await response.json();
    if (data && data.address) {
      const full = data.display_name;
      const short = data.address.neighborhood || data.address.suburb || data.address.city || data.address.town || "Nearby";
      return { full, short };
    }
  } catch (err) {
    console.error('OSM Reverse Geocode error:', err);
  }
  return { full: "Current Location", short: "Nearby" };
}

/**
 * Fetches address suggestions from Google Places Autocomplete API (via Server Action).
 */
export async function getAutocompleteSuggestions(input: string): Promise<string[]> {
  const result = await getAutocompleteAction(input);
  if (result.data) {
    return result.data;
  }
  return [];
}
