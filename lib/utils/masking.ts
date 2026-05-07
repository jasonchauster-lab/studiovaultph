/**
 * Masks sensitive information for privacy.
 * Example: 123456789 -> *****6789
 */
export function maskAccountNumber(accountNumber: string | null | undefined) {
    if (!accountNumber) return '---'
    if (accountNumber.length <= 4) return '****'
    return '*'.repeat(accountNumber.length - 4) + accountNumber.slice(-4)
}

export function maskEmail(email: string | null | undefined) {
    if (!email) return '---'
    const [user, domain] = email.split('@')
    if (!domain) return '***'
    return user.slice(0, 2) + '***@' + domain
}

export function maskGovernmentId(id: string | null | undefined) {
    if (!id) return '---'
    if (id.length <= 3) return '***'
    return id.slice(0, 2) + '***' + id.slice(-1)
}
