'use client'

import React, { useState, useEffect } from 'react'
import { Download, X, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import clsx from 'clsx'

export const PWAInstallPrompt = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        const handler = (e: any) => {
            e.preventDefault()
            setDeferredPrompt(e)
            // Show prompt after a delay to not be intrusive
            const hasDismissed = localStorage.getItem('pwa-prompt-dismissed')
            if (!hasDismissed) {
                setTimeout(() => setIsVisible(true), 3000)
            }
        }

        window.addEventListener('beforeinstallprompt', handler)
        return () => window.removeEventListener('beforeinstallprompt', handler)
    }, [])

    const handleInstall = async () => {
        if (!deferredPrompt) return
        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        if (outcome === 'accepted') {
            setDeferredPrompt(null)
        }
        setIsVisible(false)
    }

    const handleDismiss = () => {
        setIsVisible(false)
        localStorage.setItem('pwa-prompt-dismissed', 'true')
    }

    if (!isVisible) return null

    return (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-md animate-in slide-in-from-bottom-8 fade-in duration-700">
            <div className="atelier-card !p-6 !bg-burgundy text-white flex items-center gap-4 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl pointer-events-none" />
                
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shrink-0">
                    <Smartphone className="w-6 h-6" />
                </div>
                
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-black uppercase tracking-widest mb-1">Install Studio Vault</h3>
                    <p className="text-[10px] text-white/60 font-medium uppercase tracking-wider">Add to your home screen for the full experience.</p>
                </div>

                <div className="flex items-center gap-2">
                    <Button 
                        variant="primary" 
                        size="sm" 
                        onClick={handleInstall}
                        className="!bg-none !bg-white !text-burgundy !py-2 !px-4 !text-[9px]"
                    >
                        Install
                    </Button>
                    <button 
                        onClick={handleDismiss}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    )
}
