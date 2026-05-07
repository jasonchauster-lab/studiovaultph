'use client'

import dynamic from 'next/dynamic'

const SupportChatWidget = dynamic(() => import('./SupportChatWidget'), {
    ssr: false,
})

export default function SupportChatWrapper({ 
    userId, 
    hideFloatingButton, 
    hideHeader,
    externalOpen, 
    onToggle 
}: { 
    userId: string, 
    hideFloatingButton?: boolean, 
    hideHeader?: boolean,
    externalOpen?: boolean, 
    onToggle?: (open: boolean) => void 
}) {
    return (
        <SupportChatWidget 
            userId={userId} 
            hideFloatingButton={hideFloatingButton} 
            hideHeader={hideHeader}
            externalOpen={externalOpen} 
            onToggle={onToggle} 
        />
    )
}
