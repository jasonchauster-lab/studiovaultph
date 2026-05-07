'use client'

import React, { useState } from 'react'
import { clsx } from 'clsx'
import LegalPolicyModal from './LegalPolicyModal'

interface LegalAgreementCheckboxProps {
    checked: boolean
    onChange: (checked: boolean) => void
    legalConfig?: {
        terms?: string
        privacy?: string
        refund?: string
    }
}

export default function LegalAgreementCheckbox({ checked, onChange, legalConfig }: LegalAgreementCheckboxProps) {
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean
        title: string
        content: string
        type: 'terms' | 'privacy' | 'refund'
    }>({
        isOpen: false,
        title: '',
        content: '',
        type: 'terms'
    })

    const openModal = (type: 'terms' | 'privacy' | 'refund') => {
        const titles = {
            terms: 'Terms and Conditions',
            privacy: 'Privacy Policy',
            refund: 'Refund & Cancellation Policy'
        }
        setModalConfig({
            isOpen: true,
            title: titles[type],
            content: legalConfig?.[type] || '',
            type
        })
    }

    return (
        <div className="space-y-4">
            <div className="flex items-start gap-3 group cursor-pointer" onClick={() => onChange(!checked)}>
                <div className={clsx(
                    "flex-shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                    checked 
                        ? "bg-charcoal-900 border-charcoal-900 text-white" 
                        : "bg-white border-cream-200 group-hover:border-charcoal-400"
                )}>
                    {checked && (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                        </svg>
                    )}
                </div>
                <p className="text-xs sm:text-sm text-charcoal-600 leading-snug">
                    I agree to the{' '}
                    <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); openModal('terms') }}
                        className="font-bold text-charcoal-900 underline underline-offset-2 hover:text-forest transition-colors"
                    >
                        Terms & Conditions
                    </button>
                    ,{' '}
                    <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); openModal('privacy') }}
                        className="font-bold text-charcoal-900 underline underline-offset-2 hover:text-forest transition-colors"
                    >
                        Privacy Policy
                    </button>
                    , and{' '}
                    <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); openModal('refund') }}
                        className="font-bold text-charcoal-900 underline underline-offset-2 hover:text-forest transition-colors"
                    >
                        Refund & Cancellation Policy
                    </button>.
                </p>
            </div>

            <LegalPolicyModal 
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
                title={modalConfig.title}
                content={modalConfig.content}
                type={modalConfig.type}
            />
        </div>
    )
}
