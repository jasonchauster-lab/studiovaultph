'use client'

import { useState } from 'react'
import Image from 'next/image'
import { User } from 'lucide-react'

interface AvatarWithFallbackProps {
  src: string | null | undefined
  alt: string
  initials?: string
}

export default function AvatarWithFallback({ src, alt, initials }: AvatarWithFallbackProps) {
  const [errored, setErrored] = useState(false)

  if (src && !errored) {
    return (
      <Image
        src={src}
        alt={alt}
        width={48}
        height={48}
        className="w-full h-full object-cover"
        onError={() => setErrored(true)}
      />
    )
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-off-white to-walking-vinnie/40">
      {initials ? (
        <span className="text-burgundy font-bold text-base font-serif">{initials}</span>
      ) : (
        <User className="w-5 h-5 text-burgundy/40" />
      )}
    </div>
  )
}
