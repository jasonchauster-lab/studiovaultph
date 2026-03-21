/**
 * Helper to generate a standardized Supabase asset URL for avatars or other public objects.
 * Supports the public storage bucket path and image transformation options.
 */
export function getSupabaseAssetUrl(
    path: string | null | undefined, 
    bucket: 'avatars' | 'studios' | 'certifications' | 'payment-proofs' | 'waivers' = 'avatars',
    options?: {
        width?: number;
        height?: number;
        quality?: number;
        format?: 'origin' | 'webp' | 'avif';
        resize?: 'cover' | 'contain' | 'fill';
    }
) {
    if (!path) return null
    if (path.startsWith('http') || path.startsWith('blob:') || path.startsWith('data:')) return path
    
    const baseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wzacmyemiljzpdskyvie.supabase.co').replace(/\/$/, '')
    
    // Ensure the path doesn't have a leading slash
    const cleanPath = path.startsWith('/') ? path.substring(1) : path

    // If no options are provided, return the public object URL
    if (!options || Object.keys(options).length === 0) {
        return `${baseUrl}/storage/v1/object/public/${bucket}/${cleanPath}`
    }

    // Use Supabase's image transformation engine
    const params = new URLSearchParams()
    if (options.width) params.append('width', options.width.toString())
    if (options.height) params.append('height', options.height.toString())
    if (options.quality) params.append('quality', options.quality.toString())
    if (options.format) params.append('format', options.format)
    if (options.resize) params.append('resize', options.resize)

    return `${baseUrl}/storage/v1/render/image/public/${bucket}/${cleanPath}?${params.toString()}`
}
