'use server'

/**
 * Server-side wrapper for Google Maps APIs to avoid CORS issues in the browser.
 */

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export async function getGeocodeAction(address: string) {
    if (!GOOGLE_API_KEY) return { error: 'API Key missing' };

    try {
        const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_API_KEY}`
        );
        const data = await response.json();
        if (data.status === 'OK' && data.results.length > 0) {
            const result = data.results[0];
            const components = result.address_components;
            const sublocality = components.find((c: any) => c.types.includes('sublocality_level_1'))?.long_name;
            const neighborhood = components.find((c: any) => c.types.includes('neighborhood'))?.long_name;
            const city = components.find((c: any) => c.types.includes('locality'))?.long_name;
            
            const short = neighborhood || sublocality || city || result.formatted_address.split(',')[0];
            return { data: { location: result.geometry.location, full: result.formatted_address, short } };
        }
        return { error: data.status };
    } catch (error) {
        console.error('Geocode Action Error:', error);
        return { error: 'Fetch failed' };
    }
}

export async function getReverseGeocodeAction(lat: number, lng: number) {
    if (!GOOGLE_API_KEY) return { error: 'API Key missing' };

    try {
        const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}`
        );
        const data = await response.json();
        if (data.status === 'OK' && data.results.length > 0) {
            const result = data.results[0];
            const components = result.address_components;
            const sublocality = components.find((c: any) => c.types.includes('sublocality_level_1'))?.long_name;
            const neighborhood = components.find((c: any) => c.types.includes('neighborhood'))?.long_name;
            const city = components.find((c: any) => c.types.includes('locality'))?.long_name;
            
            const short = neighborhood || sublocality || city || result.formatted_address.split(',')[0];
            return { data: { full: result.formatted_address, short } };
        }
        return { error: data.status };
    } catch (error) {
        console.error('Reverse Geocode Action Error:', error);
        return { error: 'Fetch failed' };
    }
}

export async function getAutocompleteAction(input: string) {
    if (!GOOGLE_API_KEY) return { error: 'API Key missing' };
    if (!input.trim()) return { data: [] };

    try {
        const response = await fetch(
            `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${GOOGLE_API_KEY}&components=country:ph`
        );
        const data = await response.json();
        if (data.status === 'OK') {
            return { data: data.predictions.map((p: any) => p.description) };
        }
        return { error: data.status };
    } catch (error) {
        console.error('Autocomplete Action Error:', error);
        return { error: 'Fetch failed' };
    }
}
