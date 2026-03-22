'use client'

import { useState } from 'react'
import Image from 'next/image'
import { getTransformedImageUrl } from '@/lib/utils/image-utils'
import { getSupabaseAssetUrl } from '@/lib/supabase/utils'

interface AvatarWithFallbackProps {
  src: string | null | undefined
  alt: string
  initials?: string
  isOnline?: boolean
}

export default function AvatarWithFallback({ src, alt, isOnline = false }: AvatarWithFallbackProps) {
  const [errored, setErrored] = useState(false)
  
  // Try to resolve Supabase paths to full URLs if they aren't already
  // We don't know the exact bucket here, but 'avatars' is a safe default for profiles.
  // getSupabaseAssetUrl will return the string as-is if it already starts with http.
  const supabaseUrl = getSupabaseAssetUrl(src, 'avatars')
  
  const isHeic = supabaseUrl?.toLowerCase().endsWith('.heic') || supabaseUrl?.toLowerCase().endsWith('.heif')
  const finalSrc = (supabaseUrl && isHeic && supabaseUrl.includes('supabase.co'))
    ? getTransformedImageUrl(supabaseUrl, { width: 96, format: 'jpg' })
    : supabaseUrl;

  const displaySrc = (finalSrc && !errored) ? finalSrc : '/default-avatar.svg'

  return (
    <div className="relative w-full h-full">
      <Image
        src={displaySrc}
        alt={alt}
        width={48}
        height={48}
        className="w-full h-full object-cover"
        onError={() => setErrored(true)}
        unoptimized={(isHeic && !src?.includes('supabase.co')) || src?.startsWith('blob:')}
      />
      {/* Live Presence Dot */}
      {isOnline && (
        <span className="absolute bottom-0 right-0 flex h-3 w-3 translate-x-1/4 translate-y-1/4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-forest opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-forest border-2 border-white"></span>
        </span>
      )}
    </div>
  )
}
