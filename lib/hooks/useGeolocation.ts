import { useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { reverseGeocode } from '@/lib/utils/location'

interface GeolocationOptions {
    enableHighAccuracy?: boolean
    timeout?: number
    maximumAge?: number
}

const DEFAULT_OPTIONS: GeolocationOptions = {
    enableHighAccuracy: false, // Faster resolution
    timeout: 5000,
    maximumAge: 60000 // Cache for 1 minute
}

export function useGeolocation() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [isDetecting, setIsDetecting] = useState(false)

    const detectLocation = useCallback(async (options: GeolocationOptions = {}): Promise<{ full: string; short: string; lat: number; lng: number } | null> => {
        if (!navigator.geolocation) {
            alert('Geolocation not supported')
            return null
        }

        setIsDetecting(true)
        
        return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    const { latitude, longitude } = pos.coords
                    const params = new URLSearchParams(searchParams.toString())
                    
                    params.set('lat', latitude.toString())
                    params.set('lng', longitude.toString())
                    
                    if (!params.has('radius') || params.get('radius') === 'all') {
                        params.set('radius', '10')
                    }
                    
                    // Get address name for better UX directly
                    const res = await reverseGeocode(latitude, longitude)
                    
                    router.push(`/customer?${params.toString()}`)
                    setIsDetecting(false)
                    
                    if (res) {
                        resolve({
                            ...res,
                            lat: latitude,
                            lng: longitude
                        })
                    } else {
                        resolve(null)
                    }
                },
                (err) => {
                    console.error('Geolocation error:', err)
                    alert('Could not detect location. Please search for an address manually.')
                    setIsDetecting(false)
                    resolve(null)
                },
                { ...DEFAULT_OPTIONS, ...options }
            )
        })
    }, [router, searchParams])

    return {
        isDetecting,
        detectLocation
    }
}
