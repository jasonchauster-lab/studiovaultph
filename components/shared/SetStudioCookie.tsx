'use client'

import { useEffect } from 'react'

export default function SetStudioCookie({ slug }: { slug: string }) {
    useEffect(() => {
        // Set a cookie that lasts for 7 days
        const expires = new Date()
        expires.setDate(expires.getDate() + 7)
        document.cookie = `last_studio_slug=${slug}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`
    }, [slug])

    return null
}
