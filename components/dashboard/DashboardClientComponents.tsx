'use client'

import dynamic from 'next/dynamic'

export const StudioStatCards = dynamic(() => import('@/components/dashboard/StudioStatCards'), {
    loading: () => <div className="h-44 bg-zinc-100 animate-pulse rounded-[2.5rem]" />,
    ssr: false
})

export const RevenueTrendChart = dynamic(() => import('@/components/dashboard/RevenueTrendChart'), {
    loading: () => <div className="h-[380px] bg-zinc-100 animate-pulse rounded-[2.5rem]" />,
    ssr: false
})

export const StudioAgenda = dynamic(() => import('@/components/dashboard/StudioAgenda'), {
    loading: () => <div className="h-[600px] bg-zinc-100 animate-pulse rounded-[3rem]" />,
    ssr: false
})

export const LiveActivityFeed = dynamic(() => import('@/components/dashboard/LiveActivityFeed'), {
    loading: () => <div className="h-[500px] bg-zinc-100 animate-pulse rounded-[2.5rem]" />,
    ssr: false
})

export const LocationSwitcher = dynamic(() => import('@/components/studio/LocationSwitcher'), {
    ssr: false
})

export const OnboardingChecklist = dynamic(() => import('@/components/studio/OnboardingChecklist'), {
    ssr: false
})
