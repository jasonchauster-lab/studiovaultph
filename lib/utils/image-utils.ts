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
 * Canvas-based image conversion. Works natively on iOS Safari for HEIC files
 * because iOS can decode HEIC without any library.
 */
const convertViaCanvas = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) { reject(new Error('No canvas context')); return; }
            ctx.drawImage(img, 0, 0);
            canvas.toBlob((blob) => {
                if (!blob) { reject(new Error('Canvas toBlob failed')); return; }
                const newName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
                resolve(new File([blob], newName, { type: 'image/jpeg', lastModified: Date.now() }));
            }, 'image/jpeg', 0.85);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Image load failed'));
        };
        img.src = url;
    });
};

const isIOS = (): boolean =>
    typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

/**
 * Normalizes any image file for upload across all platforms (iPhone, Android, desktop).
 * - On iOS: uses canvas first (iOS Safari decodes HEIC natively, no WASM needed)
 * - On desktop: tries heic2any first, then canvas fallback
 * - Handles files with empty MIME types
 * - Never throws — returns original file as last resort
 */
export const normalizeImageFile = async (file: File): Promise<File> => {
    try {
        const needsConversion = isHeicFile(file) || !file.type;

        if (!needsConversion) return file;

        // Normalise file type for downstream checks
        const heicFile = !file.type && (file.name.split('.').pop()?.toLowerCase() ?? '').match(/heic|heif/)
            ? new File([file], file.name, { type: 'image/heic', lastModified: file.lastModified })
            : file;

        // iOS Safari: go straight to canvas — it decodes HEIC natively, no WASM required
        if (isIOS()) {
            try { return await convertViaCanvas(heicFile); } catch { /* fall through */ }
            // Canvas failed (e.g. corrupted file) — return with at least a valid MIME type
            return new File([file], file.name || 'image.jpg', { type: 'image/jpeg', lastModified: file.lastModified });
        }

        // Desktop: try heic2any (handles HEIC on Chrome/Firefox which lack native support)
        if (isHeicFile(heicFile)) {
            try { return await ensureJpegFile(heicFile); } catch { /* fall through to canvas */ }
        }

        // Canvas fallback (Safari on macOS supports HEIC natively, or for empty-type files)
        try { return await convertViaCanvas(heicFile); } catch { /* fall through */ }

        // Last resort: stamp a MIME type so the browser can at least attempt the upload
        return new File([file], file.name || 'image.jpg', {
            type: 'image/jpeg',
            lastModified: file.lastModified,
        });
    } catch {
        // Absolute safety net — never throw
        return file;
    }
};

/**
 * Returns the best content-type string to use when uploading to Supabase Storage.
 * Falls back to 'image/jpeg' if the file has no type.
 */
export const uploadContentType = (file: File): string => file.type || 'image/jpeg';
