import React from 'react'
import StoreSidebar from '@/components/studio/StoreSidebar'
import OnlineStoreMobileNav from '@/components/studio/OnlineStoreMobileNav'

export default function OnlineStoreLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden">
            {/* Secondary Sidebar */}
            <aside className="hidden lg:block shrink-0">
                <StoreSidebar />
            </aside>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto scrollbar-premium">
                <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 py-8">
                    <OnlineStoreMobileNav />
                    {children}
                </div>
            </div>
        </div>
    )
}
