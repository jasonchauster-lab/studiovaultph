'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

const STORAGE_KEY = 'studio-builder-onboarding-v1'

interface OnboardingContextType {
    seenTips: string[]
    tipsEnabled: boolean
    isLoaded: boolean
    shouldShow: (tipId: string, dependency?: string | string[]) => boolean
    dismissTip: (tipId: string) => void
    resetOnboarding: () => void
    toggleTips: (enabled: boolean) => void
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined)

export function OnboardingProvider({ children }: { children: ReactNode }) {
    const [seenTips, setSeenTips] = useState<string[]>([])
    const [tipsEnabled, setTipsEnabled] = useState(true)
    const [isLoaded, setIsLoaded] = useState(false)

    useEffect(() => {
        const storedSeen = localStorage.getItem(STORAGE_KEY)
        const storedEnabled = localStorage.getItem(STORAGE_KEY + '-enabled')
        
        if (storedSeen) {
            try {
                setSeenTips(JSON.parse(storedSeen))
            } catch (e) {
                console.error('Failed to parse onboarding state', e)
            }
        }

        if (storedEnabled !== null) {
            setTipsEnabled(storedEnabled === 'true')
        }

        setIsLoaded(true)
    }, [])

    const dismissTip = useCallback((tipId: string) => {
        setSeenTips(prev => {
            if (prev.includes(tipId)) return prev
            const next = [...prev, tipId]
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
            return next
        })
    }, [])

    const toggleTips = useCallback((enabled: boolean) => {
        setTipsEnabled(enabled)
        localStorage.setItem(STORAGE_KEY + '-enabled', String(enabled))
    }, [])

    const resetOnboarding = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY)
        localStorage.setItem(STORAGE_KEY + '-enabled', 'true')
        setSeenTips([])
        setTipsEnabled(true)
    }, [])

    const shouldShow = useCallback((tipId: string, dependency?: string | string[]) => {
        if (!isLoaded || !tipsEnabled) return false
        if (seenTips.includes(tipId)) return false
        
        if (dependency) {
            const deps = Array.isArray(dependency) ? dependency : [dependency]
            const hasMetDependency = deps.some(d => seenTips.includes(d))
            if (!hasMetDependency) return false
        }
        
        return true
    }, [isLoaded, tipsEnabled, seenTips])

    const value = React.useMemo(() => ({
        seenTips,
        tipsEnabled,
        isLoaded,
        shouldShow,
        dismissTip,
        resetOnboarding,
        toggleTips
    }), [seenTips, tipsEnabled, isLoaded, shouldShow, dismissTip, resetOnboarding, toggleTips])

    return (
        <OnboardingContext.Provider value={value}>
            {children}
        </OnboardingContext.Provider>
    )
}

export function useOnboarding() {
    const context = useContext(OnboardingContext)
    if (context === undefined) {
        throw new Error('useOnboarding must be used within an OnboardingProvider')
    }
    return context
}
