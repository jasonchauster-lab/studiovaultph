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

    try {
        const result = await heic2any({
            blob: file,
            toType: 'image/jpeg',
            quality: 0.8,
        });

        // heic2any can return an array if multiple images are in the container
        const blob = Array.isArray(result) ? result[0] : result;
        return blob;
    } catch (error) {
        console.error('HEIC conversion failed:', error);
        return file; // Fallback to original
    }
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
 * Normalizes any image file for upload across all platforms (iPhone, Android, desktop).
 * - Converts HEIC/HEIF to JPEG
 * - Handles files with empty MIME types (common on some iOS/Android exports)
 * - Returns a File guaranteed to have a valid image MIME type
 */
export const normalizeImageFile = async (file: File): Promise<File> => {
    // Explicit HEIC/HEIF by type or extension
    if (isHeicFile(file)) {
        return ensureJpegFile(file);
    }

    // Empty MIME type — some iOS/Android versions omit the type entirely.
    // If the extension hints at HEIC, try conversion. Otherwise stamp as image/jpeg.
    if (!file.type) {
        const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
        if (ext === 'heic' || ext === 'heif') {
            try {
                return await ensureJpegFile(
                    new File([file], file.name, { type: 'image/heic', lastModified: file.lastModified })
                );
            } catch {
                // fall through
            }
        }
        // Unknown extension with no type — treat as JPEG so browsers can display it
        return new File([file], file.name || 'image.jpg', {
            type: 'image/jpeg',
            lastModified: file.lastModified,
        });
    }

    return file;
};

/**
 * Returns the best content-type string to use when uploading to Supabase Storage.
 * Falls back to 'image/jpeg' if the file has no type.
 */
export const uploadContentType = (file: File): string => file.type || 'image/jpeg';
