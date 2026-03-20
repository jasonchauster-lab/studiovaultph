/**
 * Helper to generate a standardized Supabase asset URL for avatars or other public objects.
 * Supports the public storage bucket path.
 */
export function getSupabaseAssetUrl(path: string | null | undefined, bucket: 'avatars' | 'studios' | 'certifications' = 'avatars') {
    if (!path) return null
    if (path.startsWith('http')) return path
    
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wzacmyemiljzpdskyvie.supabase.co'
    
    // Ensure the path doesn't have a leading slash if we add one in the template
    const cleanPath = path.startsWith('/') ? path.substring(1) : path
    
    return `${baseUrl}/storage/v1/object/public/${bucket}/${cleanPath}`
}
