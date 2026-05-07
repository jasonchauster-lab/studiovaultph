export function normalizeStudioSlug(value: string | null | undefined) {
    return (value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}
