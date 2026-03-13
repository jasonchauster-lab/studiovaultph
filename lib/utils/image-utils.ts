import heic2any from 'heic2any';

/**
 * Validates if a file is an HEIC or HEIF image.
 * Also catches files with empty MIME types that have HEIC/HEIF extensions.
 */
export const isHeicFile = (file: File): boolean => {
    const name = file.name.toLowerCase();
    return (
        file.type === 'image/heic' ||
        file.type === 'image/heif' ||
        name.endsWith('.heic') ||
        name.endsWith('.heif')
    );
};

/**
 * Converts an HEIC/HEIF file to a JPEG Blob.
 * If the file is not HEIC, it returns the original file.
 */
export const convertHeicToJpeg = async (file: File): Promise<Blob | File> => {
    if (!isHeicFile(file)) {
        return file;
    }

    const result = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.8,
    });

    // heic2any can return an array if multiple images are in the container
    const blob = Array.isArray(result) ? result[0] : result;
    return blob;
};

/**
 * Helper to create a new File object from a Blob (with .jpg extension).
 */
export const ensureJpegFile = async (file: File): Promise<File> => {
    if (!isHeicFile(file)) return file;

    const convertedBlob = await convertHeicToJpeg(file);

    // Replace extension with .jpg
    const newName = file.name.replace(/\.(heic|heif)$/i, '.jpg');

    return new File([convertedBlob], newName, {
        type: 'image/jpeg',
        lastModified: Date.now(),
    });
};

/**
 * Canvas-based image conversion and resizing.
 * Works natively on iOS and Android to decode HEIC/HEIF and normalize formats.
 */
const convertViaCanvas = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            
            // Maximum dimension constraint (e.g., 2560px for 2K-ish quality)
            const MAX_SIZE = 2560;
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
            
            // Use better image smoothing
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            ctx.drawImage(img, 0, 0, width, height);
            
            canvas.toBlob((blob) => {
                if (!blob) { reject(new Error('Canvas toBlob failed')); return; }
                const newName = file.name.replace(/\.(heic|heif|png|webp|avif)$/i, '.jpg');
                resolve(new File([blob], newName, { 
                    type: 'image/jpeg', 
                    lastModified: Date.now() 
                }));
            }, 'image/jpeg', 0.85); // 0.85 quality is a good balance for web
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Image load failed'));
        };
        img.src = url;
    });
};

const isMobile = (): boolean =>
    typeof navigator !== 'undefined' && /iPad|iPhone|iPod|Android/i.test(navigator.userAgent);

/**
 * Normalizes any image file for upload across all platforms (iPhone, Android, desktop).
 * - On Mobile/Safari: uses canvas first (decodes HEIC natively, no WASM needed)
 * - On Desktop: tries heic2any first, then canvas fallback
 * - Automatically resizes images larger than 2560px
 * - Never throws — returns original file as last resort
 */
export const normalizeImageFile = async (file: File): Promise<File> => {
    try {
        // We always normalize if it's HEIC, or if it might be a very large photo
        const isPhoto = file.type.startsWith('image/') || !file.type;
        const needsNormalization = isHeicFile(file) || !file.type || (isPhoto && file.size > 2 * 1024 * 1024);

        if (!needsNormalization) return file;

        // Normalise file metadata for downstream checks
        const normalizedFile = !file.type && (file.name.split('.').pop()?.toLowerCase() ?? '').match(/heic|heif/)
            ? new File([file], file.name, { type: 'image/heic', lastModified: file.lastModified })
            : file;

        // Mobile/Safari/Chrome on Mobile: go straight to canvas for performance and native HEIC support
        if (isMobile()) {
            try { return await convertViaCanvas(normalizedFile); } catch { /* fall through */ }
            // If canvas failed, return original with a generic type
            return new File([file], file.name || 'image.jpg', { type: 'image/jpeg', lastModified: file.lastModified });
        }

        // Desktop: try heic2any (handles HEIC on Chrome/Firefox which lack native support)
        if (isHeicFile(normalizedFile)) {
            try { return await ensureJpegFile(normalizedFile); } catch { /* fall through to canvas */ }
        }

        // Canvas fallback (Safari on macOS supports HEIC natively, also handles resizing)
        try { return await convertViaCanvas(normalizedFile); } catch { /* fall through */ }

        return file;
    } catch {
        return file;
    }
};

/**
 * Returns the best content-type string to use when uploading to Supabase Storage.
 */
export const uploadContentType = (file: File): string => {
    if (file.type) return file.type;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
    if (ext === 'png') return 'image/png';
    return 'application/octet-stream';
};
