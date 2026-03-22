'use server'

/**
 * Server-side wrapper for Google Maps APIs to avoid CORS issues in the browser.
 */

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export async function getGeocodeAction(address: string) {
    if (!GOOGLE_API_KEY) return { error: 'API Key missing' };

    try {
        const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&region=ph&key=${GOOGLE_API_KEY}`
        );
        const data = await response.json();
        if (data.status === 'OK' && data.results.length > 0) {
            const result = data.results[0];
            const components = result.address_components;
            
            // Try to find the most specific political/geographic area
            const neighborhood = components.find((c: any) => c.types.includes('neighborhood'))?.long_name;
            const sublocality2 = components.find((c: any) => c.types.includes('sublocality_level_2'))?.long_name;
            const sublocality1 = components.find((c: any) => c.types.includes('sublocality_level_1'))?.long_name;
            const sublocality = components.find((c: any) => c.types.includes('sublocality'))?.long_name;
            const city = components.find((c: any) => c.types.includes('locality'))?.long_name;
            
            const short = neighborhood || sublocality2 || sublocality1 || sublocality || city || result.formatted_address.split(',')[0];
            return { data: { location: result.geometry.location, full: result.formatted_address, short } };
        }
        console.error('Geocode Action Google Error:', data.status, data.error_message);
        return { error: data.status };
    } catch (error) {
        console.error('Geocode Action Fetch Error:', error);
        return { error: 'Fetch failed' };
    }
}

export async function getReverseGeocodeAction(lat: number, lng: number) {
    if (!GOOGLE_API_KEY) return { error: 'API Key missing' };

    try {
        const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&region=ph&key=${GOOGLE_API_KEY}`
        );
        const data = await response.json();
        if (data.status === 'OK' && data.results.length > 0) {
            const result = data.results[0];
            const components = result.address_components;
            
            const neighborhood = components.find((c: any) => c.types.includes('neighborhood'))?.long_name;
            const sublocality2 = components.find((c: any) => c.types.includes('sublocality_level_2'))?.long_name;
            const sublocality1 = components.find((c: any) => c.types.includes('sublocality_level_1'))?.long_name;
            const sublocality = components.find((c: any) => c.types.includes('sublocality'))?.long_name;
            const city = components.find((c: any) => c.types.includes('locality'))?.long_name;
            
            const short = neighborhood || sublocality2 || sublocality1 || sublocality || city || result.formatted_address.split(',')[0];
            return { data: { full: result.formatted_address, short } };
        }
        console.error('Reverse Geocode Action Google Error:', data.status, data.error_message);
        return { error: data.status };
    } catch (error) {
        console.error('Reverse Geocode Action Fetch Error:', error);
        return { error: 'Fetch failed' };
    }
}

export async function getAutocompleteAction(input: string) {
    if (!GOOGLE_API_KEY) return { error: 'API Key missing' };
    if (!input.trim()) return { data: [] };

    try {
        // Restrict to Philippines (components=country:ph)
        const response = await fetch(
            `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&components=country:ph&key=${GOOGLE_API_KEY}`
        );
        const data = await response.json();
        if (data.status === 'OK') {
            return { data: data.predictions.map((p: any) => p.description) };
        }
        console.error('Autocomplete Action Google Error:', data.status, data.error_message);
        return { error: data.status };
    } catch (error) {
        console.error('Autocomplete Action Fetch Error:', error);
        return { error: 'Fetch failed' };
    }
}

/**
 * Resolves a Google Maps URL (including short links like maps.app.goo.gl/...)
 * to extract lat/lng coordinates and a formatted address.
 */
export async function resolveGoogleMapsUrlAction(url: string) {
    if (!url?.trim()) return { error: 'No URL provided' };

    try {
        let finalUrl = url.trim();

        // Follow redirects for short URLs (maps.app.goo.gl, goo.gl/maps)
        if (finalUrl.includes('goo.gl') || finalUrl.includes('maps.app')) {
            try {
                const response = await fetch(finalUrl, {
                    method: 'HEAD',
                    redirect: 'follow',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (compatible; StudioVault/1.0)'
                    }
                });
                finalUrl = response.url || finalUrl;
            } catch {
                // If HEAD fails, try GET
                try {
                    const response = await fetch(finalUrl, {
                        redirect: 'follow',
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (compatible; StudioVault/1.0)'
                        }
                    });
                    finalUrl = response.url || finalUrl;
                } catch {
                    // Continue with original URL
                }
            }
        }

        // Extract coordinates from various Google Maps URL formats
        let lat: number | null = null;
        let lng: number | null = null;

        // Pattern 1: @lat,lng in URL (most common in full URLs)
        const atPattern = /@(-?\d+\.?\d*),(-?\d+\.?\d*)/;
        const atMatch = finalUrl.match(atPattern);
        if (atMatch) {
            lat = parseFloat(atMatch[1]);
            lng = parseFloat(atMatch[2]);
        }

        // Pattern 2: !3dLAT!4dLNG (in embed/data URLs)
        if (!lat || !lng) {
            const dataPattern = /!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/;
            const dataMatch = finalUrl.match(dataPattern);
            if (dataMatch) {
                lat = parseFloat(dataMatch[1]);
                lng = parseFloat(dataMatch[2]);
            }
        }

        // Pattern 3: query=lat,lng or q=lat,lng
        if (!lat || !lng) {
            const queryPattern = /[?&](?:query|q)=(-?\d+\.?\d*)[,+](-?\d+\.?\d*)/;
            const queryMatch = finalUrl.match(queryPattern);
            if (queryMatch) {
                lat = parseFloat(queryMatch[1]);
                lng = parseFloat(queryMatch[2]);
            }
        }

        // Pattern 4: /place/ URLs — extract the place name and geocode it
        if (!lat || !lng) {
            const placePattern = /\/place\/([^/@]+)/;
            const placeMatch = finalUrl.match(placePattern);
            if (placeMatch) {
                const placeName = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
                const geoResult = await getGeocodeAction(placeName);
                if (geoResult?.data) {
                    return {
                        data: {
                            lat: geoResult.data.location.lat,
                            lng: geoResult.data.location.lng,
                            address: geoResult.data.full,
                            short: geoResult.data.short
                        }
                    };
                }
            }
        }

        // Pattern 5: /search/ URLs - extract the query and geocode it
        if (!lat || !lng) {
            const searchPattern = /\/search\/([^/?]+)/;
            const searchMatch = finalUrl.match(searchPattern);
            if (searchMatch) {
                const searchQuery = decodeURIComponent(searchMatch[1].replace(/\+/g, ' '));
                const geoResult = await getGeocodeAction(searchQuery);
                if (geoResult?.data) {
                    return {
                        data: {
                            lat: geoResult.data.location.lat,
                            lng: geoResult.data.location.lng,
                            address: geoResult.data.full,
                            short: geoResult.data.short
                        }
                    };
                }
            }
        }

        if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
            return { error: 'Could not extract coordinates from this URL' };
        }

        // Reverse geocode to get the formatted address
        const reverseResult = await getReverseGeocodeAction(lat, lng);
        const address = reverseResult?.data?.full || `${lat}, ${lng}`;
        const short = reverseResult?.data?.short || '';

        return {
            data: { lat, lng, address, short }
        };
    } catch (error) {
        console.error('Resolve Google Maps URL error:', error);
        return { error: 'Failed to resolve Google Maps URL' };
    }
}
