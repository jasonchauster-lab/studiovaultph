/**
 * Validates if a file or URL/path is an HEIC or HEIF image.
 * Supports File objects and string URLs/paths.
 */
export const isHeicFile = (file: File | string | null | undefined): boolean => {
    if (!file) return false;
    
    if (typeof file === 'string') {
        const lower = file.toLowerCase();
        // Handle URLs with query parameters safely
        const pathPart = lower.split('?')[0];
        return pathPart.endsWith('.heic') || pathPart.endsWith('.heif');
    }

    const name = file.name.toLowerCase();
    return (
        file.type === 'image/heic' ||
        file.type === 'image/heif' ||
        name.endsWith('.heic') ||
        name.endsWith('.heif')
    );
};

/**
 * Sanitize filename to prevent issues with multipart/form-data parsing
 */
export const sanitizeFileName = (name: string): string => {
    // Remove special characters, keep extension
    const parts = name.split('.');
    const ext = parts.pop();
    const base = parts.join('.');
    const cleanBase = base.replace(/[^a-z0-9]/gi, '_').replace(/_{2,}/g, '_');
    return `${cleanBase}.${ext}`;
};

/**
 * Canvas-based image conversion and resizing.
 * Works natively on iOS and Android to decode HEIC/HEIF and normalize formats.
 */
const convertViaCanvas = (file: File, options: { maxWidth?: number; quality?: number } = {}): Promise<File> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            
            // Default to 1600px for general usage, unless specific maxWidth provided
            const MAX_SIZE = options.maxWidth || 1600;
            const QUALITY = options.quality ?? 0.8; // default to 0.8 for good balance

            let width = img.naturalWidth;
            let height = img.naturalHeight;

            if (width > MAX_SIZE || height > MAX_SIZE) {
                if (width > height) {
                    height = Math.round((height * MAX_SIZE) / width);
                    width = MAX_SIZE;
                } else {
                    width = Math.round((width * MAX_SIZE) / height);
                    height = MAX_SIZE;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) { reject(new Error('No canvas context')); return; }
            
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);
            
            canvas.toBlob((blob) => {
                if (!blob) { reject(new Error('Canvas toBlob failed')); return; }
                const newName = file.name.replace(/\.(heic|heif|png|webp|avif)$/i, '.jpg');
                resolve(new File([blob], sanitizeFileName(newName), { 
                    type: 'image/jpeg', 
                    lastModified: Date.now() 
                }));
            }, 'image/jpeg', QUALITY);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Image decode failed'));
        };
        img.src = url;
    });
};

const isMobile = (): boolean =>
    typeof navigator !== 'undefined' && /iPad|iPhone|iPod|Android/i.test(navigator.userAgent);

const MAX_UPLOAD_SIZE = 15 * 1024 * 1024; // 15MB limit

/**
 * Normalizes any image file for upload across all platforms (iPhone, Android, desktop).
 * Multi-stage Fallback: Canvas (Fast/Native) -> heic2any (Chrome Desktop) -> Error
 */
export const normalizeImageFile = async (
    file: File, 
    options: { maxWidth?: number; quality?: number } = {}
): Promise<File> => {
    const logPrefix = `[ImageNormalization:${file.name}]`;
    const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
    console.log(`${logPrefix} Starting... Type: ${file.type || 'unknown'}, Size: ${fileSizeMB}MB`);

    if (file.size > MAX_UPLOAD_SIZE) {
        throw new Error(`File is too large (${fileSizeMB}MB). Maximum size is 15MB.`);
    }

    try {
        const isHeic = isHeicFile(file);
        // Relaxed normalization: only if HEIC, missing type, or larger than 2MB
        const needsNormalization = isHeic || !file.type || file.size > 2 * 1024 * 1024 || options.maxWidth || options.quality;

        if (!needsNormalization) {
            console.log(`${logPrefix} Normalization skipped (small/standard file)`);
            return file;
        }

        // --- STAGE 1: CANVAS (Fast, handles Native HEIC on iOS/Safari and Resizing) ---
        if (typeof document !== 'undefined') {
            try {
                const result = await convertViaCanvas(file, options);
                console.log(`${logPrefix} Success via Canvas. New size: ${(result.size / 1024 / 1024).toFixed(2)}MB`);
                return result;
            } catch (err) {
                console.warn(`${logPrefix} Canvas failed, trying fallback...`, err);
            }
        }

        // --- STAGE 2: DYNAMIC HEIC2ANY (For HEIC on Chrome/Firefox desktop) ---
        if (isHeic) {
            try {
                console.log(`${logPrefix} Attempting heic2any...`);
                const heic2any = (await import('heic2any')).default;
                const result = await heic2any({
                    blob: file,
                    toType: 'image/jpeg',
                    quality: 0.8,
                    multiple: false // Ensure we only get one result
                });
                const blob = Array.isArray(result) ? result[0] : result;
                const newName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
                console.log(`${logPrefix} Success via heic2any`);
                return new File([blob], sanitizeFileName(newName), { type: 'image/jpeg', lastModified: Date.now() });
            } catch (err) {
                console.error(`${logPrefix} heic2any failed`, err);
                throw new Error('This image format (HEIC) is not supported on your current browser. Please try uploading a JPEG or PNG, or use a mobile device.');
            }
        }

        // --- STAGE 3: LAST RESORT (Faked Content Type) ---
        // If we reached here and it's NOT HEIC, we just try to treat it as a JPEG.
        console.log(`${logPrefix} Returning original with JPEG type fallback`);
        const finalName = file.name.match(/\.(jpg|jpeg|png)$/i) ? file.name : `${file.name.split('.')[0]}.jpg`;
        return new File([file], sanitizeFileName(finalName), { 
            type: 'image/jpeg', 
            lastModified: file.lastModified 
        });

    } catch (err: any) {
        console.error(`${logPrefix} Normalization failed`, err);
        throw err; // Re-throw to be handled by caller
    }
};

/**
 * Returns the best content-type string to use when uploading to Supabase Storage.
 */
export const uploadContentType = (file: File): string => {
    if (file.type && file.type !== 'application/octet-stream') return file.type;
    const name = file.name.toLowerCase();
    if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
    if (name.endsWith('.png')) return 'image/png';
    if (name.endsWith('.heic') || name.endsWith('.heif')) return 'image/heic';
    return 'application/octet-stream';
};

/**
 * Transforms a Supabase public URL into a transformation URL.
 * Used to convert HEIC to JPEG on-the-fly via Supabase's transformation engine.
 */
export const getTransformedImageUrl = (url: string, options: { width?: number; format?: string } = {}) => {
    if (!url || !url.includes('supabase.co')) return url;
    
    // Check if it's already a transformation URL or not a public object URL
    if (url.includes('/render/image/public/') || !url.includes('/storage/v1/object/public/')) {
        return url;
    }

    const { width, format = 'jpg' } = options;
    
    // Convert object/public to render/image/public
    let transformedUrl = url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');
    
    const params = new URLSearchParams();
    if (width) params.append('width', width.toString());
    if (format) params.append('format', format);
    
    const queryString = params.toString();
    return queryString ? `${transformedUrl}?${queryString}` : transformedUrl;
};
