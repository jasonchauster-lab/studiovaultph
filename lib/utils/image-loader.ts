import { getSupabaseAssetUrl } from '@/lib/supabase/utils';

/**
 * Custom Next.js Image Loader for Supabase Storage
 * Maps internal image requests to the Supabase Transformation Engine.
 * 
 * Usage in next.config.ts or component level:
 * <Image loader={supabaseLoader} ... />
 */
export default function supabaseLoader({ src, width, quality }: { src: string; width: number; quality?: number }) {
    // 1. If it's already an external URL (not Supabase), return as is
    if (src.startsWith('http') && !src.includes('supabase.co')) {
        return src;
    }

    // 2. Extract bucket and path from the URL if it's a full Supabase URL
    // Format: .../storage/v1/object/public/[bucket]/[path]
    if (src.includes('supabase.co')) {
        try {
            const url = new URL(src);
            const pathParts = url.pathname.split('/');
            const publicIdx = pathParts.indexOf('public');
            
            if (publicIdx !== -1 && pathParts.length > publicIdx + 2) {
                const bucket = pathParts[publicIdx + 1] as any;
                const path = pathParts.slice(publicIdx + 2).join('/');
                
                return getSupabaseAssetUrl(path, bucket, {
                    width,
                    quality: quality || 80,
                    format: 'webp' // Force WebP for better performance
                });
            }
        } catch (e) {
            console.warn('[SupabaseLoader] Failed to parse URL:', src);
            return src;
        }
    }

    // 3. If it's a relative path, we assume it's from the 'studios' bucket by default (common in config)
    // or the caller should provide a full path if using this loader.
    return getSupabaseAssetUrl(src, 'studios', {
        width,
        quality: quality || 80,
        format: 'webp'
    }) || src;
}
