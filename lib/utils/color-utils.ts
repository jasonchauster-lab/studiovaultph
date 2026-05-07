/**
 * Calculates the relative luminance of a color.
 * L = 0.2126 * R + 0.7152 * G + 0.0722 * B
 * Formula: https://www.w3.org/WAI/GL/wiki/Relative_luminance
 */
function getRelativeLuminance(hex: string): number {
    // Remove hash
    const color = hex.replace(/^#/, '');
    
    // Parse R, G, B
    let r = parseInt(color.substring(0, 2), 16) / 255;
    let g = parseInt(color.substring(2, 4), 16) / 255;
    let b = parseInt(color.substring(4, 6), 16) / 255;

    r = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
    g = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
    b = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculates the contrast ratio between two colors.
 * Formula: (L1 + 0.05) / (L2 + 0.05)
 * Range: 1 (no contrast) to 21 (extreme contrast)
 */
export function getContrastRatio(hex1: string, hex2: string): number {
    const l1 = getRelativeLuminance(hex1);
    const l2 = getRelativeLuminance(hex2);

    const brighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);

    return (brighter + 0.05) / (darker + 0.05);
}

/**
 * Checks if a color pair meets WCAG 2.1 accessibility levels.
 * AA: 4.5:1 for normal text, 3:1 for large text
 * AAA: 7:1 for normal text, 4.5:1 for large text
 */
export function isContrastSafe(hex1: string, hex2: string, level: 'AA' | 'AAA' = 'AA'): boolean {
    const ratio = getContrastRatio(hex1, hex2);
    return level === 'AA' ? ratio >= 4.5 : ratio >= 7;
}

/**
 * Convenience check for primary brand color against white text (buttons).
 */
export function isButtonContrastSafe(bgColor: string, textColor: string = '#ffffff'): boolean {
    const ratio = getContrastRatio(bgColor, textColor);
    return ratio >= 3.0; // Buttons/Large text only need 3:1 for AA
}
