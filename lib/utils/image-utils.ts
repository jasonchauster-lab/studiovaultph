import heic2any from 'heic2any';

/**
 * Validates if a file is an HEIC or HEIF image.
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
