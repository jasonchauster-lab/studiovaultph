'use client'

import { useState } from 'react'
import Image from 'next/image'
import { getTransformedImageUrl } from '@/lib/utils/image-utils'

interface AvatarWithFallbackProps {
  src: string | null | undefined
  alt: string
  initials?: string
}

export default function AvatarWithFallback({ src, alt }: AvatarWithFallbackProps) {
  const [errored, setErrored] = useState(false)
  
  const isHeic = src?.toLowerCase().endsWith('.heic') || src?.toLowerCase().endsWith('.heif')
  const finalSrc = (src && isHeic && src.includes('supabase.co'))
    ? getTransformedImageUrl(src, { width: 96, format: 'jpg' })
    : src;

  const displaySrc = (finalSrc && !errored) ? finalSrc : '/default-avatar.svg'

  return (
    <Image
      src={displaySrc}
      alt={alt}
      width={48}
      height={48}
      className="w-full h-full object-cover"
      onError={() => setErrored(true)}
      unoptimized={isHeic && !src?.includes('supabase.co')}
    />
  )
}
