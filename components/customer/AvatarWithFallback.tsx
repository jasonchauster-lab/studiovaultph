'use client'

import { useState } from 'react'
import Image from 'next/image'

interface AvatarWithFallbackProps {
  src: string | null | undefined
  alt: string
  initials?: string
}

export default function AvatarWithFallback({ src, alt }: AvatarWithFallbackProps) {
  const [errored, setErrored] = useState(false)
  const displaySrc = (src && !errored) ? src : '/default-avatar.svg'

  return (
    <Image
      src={displaySrc}
      alt={alt}
      width={48}
      height={48}
      className="w-full h-full object-cover"
      onError={() => setErrored(true)}
    />
  )
}
