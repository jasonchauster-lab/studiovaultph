'use client'

import dynamic from 'next/dynamic'

const SupportChatWidget = dynamic(() => import('./SupportChatWidget'), {
    ssr: false,
})

export default function SupportChatWrapper({ userId }: { userId: string }) {
    return <SupportChatWidget userId={userId} />
}
