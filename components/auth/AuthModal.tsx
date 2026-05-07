'use client'

import { useState, memo } from 'react'
import { X, Award } from 'lucide-react'
import Image from 'next/image'
import AuthForm from './AuthForm'
import { AnimatePresence, motion } from 'framer-motion'
import clsx from 'clsx'

interface AuthModalProps {
    isOpen: boolean
    onClose: () => void
    initialMode?: 'login' | 'signup'
    studioSlug?: string
    role?: string
    studioName?: string
    logoUrl?: string | null
    tagline?: string
}

function AuthModal({ 
    isOpen, 
    onClose, 
    initialMode = 'login',
    studioSlug,
    role = 'customer',
    studioName,
    logoUrl,
    tagline
}: AuthModalProps) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 bg-charcoal-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            {/* Click outside to close */}
            <div className="absolute inset-0 -z-10" onClick={onClose} />
            
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-white rounded-[2rem] shadow-2xl w-full max-w-[950px] overflow-hidden flex flex-col md:flex-row max-h-[90vh] relative border border-white/20"
            >
                {/* Close Button */}
                <button 
                    onClick={onClose}
                    className="absolute top-6 right-6 z-20 p-2 hover:bg-off-white rounded-full transition-all text-charcoal-400 hover:text-charcoal-900 shadow-tight hover:rotate-90"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Left Side - Visual Studio Branding */}
                <div className="hidden md:flex md:w-[45%] relative flex-col justify-center items-center p-12 overflow-hidden bg-burgundy/5 border-r border-border-grey/30">
                    <div className="absolute inset-0 opacity-10 mix-blend-multiply transition-transform hover:scale-105 duration-[15s]">
                         <Image 
                            src="/images/auth/auth-left-1.png" 
                            alt="Background" 
                            fill 
                            className="object-cover"
                        />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-white/40 to-white/80 z-0" />
                    
                    <div className="relative z-10 w-full text-center space-y-8 animate-in fade-in slide-in-from-left-4 duration-700">
                        <div className="inline-block p-4 bg-white rounded-3xl shadow-tight border border-border-grey mx-auto">
                            <Image src={logoUrl || "/logo4.png"} alt={`${studioName || 'StudioVault'} Logo`} width={180} height={60} className="h-12 w-auto object-contain" />
                        </div>
                        
                        <div className="space-y-4 px-4">
                            <h2 className="text-3xl font-serif font-bold text-charcoal-900 leading-tight tracking-tight whitespace-pre-line">
                                {tagline || (
                                    <>Your Wellness <br /><span className="text-burgundy italic">Sanctuary.</span></>
                                )}
                            </h2>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.3em] leading-relaxed">
                                Experience Pilates with the precision and grace of {studioName || 'StudioVault'}.
                            </p>
                        </div>

                        <div className="flex items-center justify-center gap-3 pt-4 opacity-50">
                            <Award className="w-4 h-4 text-burgundy" />
                            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600">Premium Studio Management</span>
                        </div>
                    </div>
                </div>

                {/* Right Side - The Auth Form */}
                <div className="flex-1 overflow-y-auto p-8 sm:p-12 lg:p-16 bg-white min-h-[500px] flex flex-col justify-center">
                    <div className="w-full max-w-sm mx-auto">
                        <AuthForm 
                            view="modal"
                            initialMode={initialMode === 'signup'}
                            initialRole={role}
                            isRoleLocked={true}
                            studioSlug={studioSlug}
                            onSuccess={() => {
                                // Close modal after successful login - usually handled by redirect, 
                                // but for instant feedback we close it.
                                setTimeout(onClose, 500)
                            }}
                        />
                    </div>
                </div>
            </motion.div>
        </div>
    )
}

export default memo(AuthModal)
