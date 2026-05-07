import DOMPurify from 'isomorphic-dompurify'

/**
 * Security Utility: Masks sensitive keys for UI display.
 * Example: xnd_sk_development_12345 -> xnd_sk_dev...2345
 */
export function maskSecretKey(key: string | null | undefined): string {
    if (!key) return ''
    if (key.length <= 8) return '********'
    
    const prefix = key.slice(0, 7)
    const suffix = key.slice(-4)
    return `${prefix}****************${suffix}`
}

/**
 * Sanitizes HTML to prevent XSS attacks.
 */
export function sanitizeHtml(html: string): string {
    return DOMPurify.sanitize(html)
}
