'use client'

import { ArrowLeft, Check, Smartphone, MessageSquare, ChevronDown, ChevronRight, ArrowUp, Sparkles } from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'

interface BuilderFloatingWidgetsFormProps {
    config: any
    setConfig: (config: any) => void
    goBack: () => void
    outletId?: string
}

export default function BuilderFloatingWidgetsForm({ config, setConfig, goBack, outletId }: BuilderFloatingWidgetsFormProps) {
    const [activeAccordion, setActiveAccordion] = useState<'whatsapp' | 'backToTop' | 'aiChat' | null>('whatsapp')

    // Selection scope: global or branch override
    const currentScope = outletId ? config.branchOverrides?.[outletId]?.floatingWidgets : config.floatingWidgets
    const globalScope = config.floatingWidgets || {}

    const updateWidgets = (updates: any) => {
        setConfig((prev: any) => {
            if (outletId) {
                const branchOverrides = prev.branchOverrides || {}
                const branchConfig = branchOverrides[outletId] || {}
                return {
                    ...prev,
                    branchOverrides: {
                        ...branchOverrides,
                        [outletId]: {
                            ...branchConfig,
                            floatingWidgets: {
                                ...(branchConfig.floatingWidgets || {}),
                                ...updates
                            }
                        }
                    }
                }
            } else {
                return {
                    ...prev,
                    floatingWidgets: {
                        ...(prev.floatingWidgets || {}),
                        ...updates
                    }
                }
            }
        })
    }

    const whatsapp = currentScope?.whatsapp || {}
    const backToTop = currentScope?.backToTop || {}
    const aiChat = currentScope?.aiChat || {}

    return (
        <div className="flex flex-col h-full bg-white animate-in slide-in-from-right duration-300">
            {/* Header Control */}
            <div className="p-8 pb-6 border-b border-zinc-50 space-y-4">
                <button 
                    onClick={goBack}
                    className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400 hover:text-zinc-900 transition-colors group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Go back
                </button>
                <div className="space-y-1">
                    <h3 className="text-4xl font-serif font-bold text-zinc-900">Floating Widgets</h3>
                    <p className="text-[13px] text-zinc-500 font-medium leading-relaxed">
                        Manage floating action buttons and branch-specific overrides
                    </p>
                </div>
                {outletId && (
                    <div className="px-4 py-2 bg-amber-50 border border-amber-100 rounded-xl">
                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Editing Branch Override</p>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 scrollbar-hide">
                {/* WhatsApp Section */}
                <div className={clsx(
                    "border rounded-2xl overflow-hidden transition-all duration-300 shadow-sm",
                    activeAccordion === 'whatsapp' ? 'border-zinc-200' : 'border-zinc-100'
                )}>
                    <button 
                        onClick={() => setActiveAccordion(activeAccordion === 'whatsapp' ? null : 'whatsapp')}
                        className="w-full flex items-center justify-between p-5 bg-white hover:bg-zinc-50 transition-colors text-left"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center">
                                <MessageSquare className="w-4 h-4" />
                            </div>
                            <span className="text-[13px] font-bold text-zinc-900 tracking-tight">WhatsApp Button</span>
                        </div>
                        {activeAccordion === 'whatsapp' ? <ChevronDown className="w-4 h-4 text-zinc-400" /> : <ChevronRight className="w-4 h-4 text-zinc-400" />}
                    </button>
                    
                    {activeAccordion === 'whatsapp' && (
                        <div className="p-6 pt-2 bg-white space-y-6 border-t border-zinc-50 animate-in fade-in duration-300">
                            {/* Toggle */}
                            <div className="space-y-3">
                                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest px-1">Visibility</label>
                                <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-50 rounded-2xl border border-zinc-100">
                                    {[
                                        { id: true, label: 'Enabled' },
                                        { id: false, label: 'Disabled' }
                                    ].map(option => (
                                        <button
                                            key={option.label}
                                            onClick={() => updateWidgets({ 
                                                whatsapp: { ...whatsapp, enabled: option.id } 
                                            })}
                                            className={clsx(
                                                "py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                                (whatsapp.enabled ?? globalScope.whatsapp?.enabled ?? false) === option.id
                                                    ? 'bg-white text-zinc-900 shadow-sm border border-zinc-100'
                                                    : 'text-zinc-400 hover:text-zinc-600'
                                            )}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Phone Number Input */}
                            <div className="space-y-3">
                                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest px-1">
                                    {outletId ? 'Branch WhatsApp Number' : 'Global WhatsApp Number'}
                                </label>
                                <div className="space-y-2">
                                    <input 
                                        type="tel"
                                        placeholder={outletId ? "Fallback to studio number" : "+63 900 000 0000"}
                                        value={whatsapp.number || ''}
                                        onChange={(e) => updateWidgets({ 
                                            whatsapp: { ...whatsapp, number: e.target.value } 
                                        })}
                                        className="w-full px-5 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-[13px] font-bold text-zinc-900 focus:bg-white focus:ring-4 focus:ring-zinc-100/50 outline-none transition-all"
                                    />
                                    <p className="text-[10px] text-zinc-400 px-1 italic">
                                        Format: +[Country Code][Number] - e.g. +639171234567
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Back to Top Section */}
                <div className={clsx(
                    "border rounded-2xl overflow-hidden transition-all duration-300 shadow-sm",
                    activeAccordion === 'backToTop' ? 'border-zinc-200' : 'border-zinc-100'
                )}>
                    <button 
                        onClick={() => setActiveAccordion(activeAccordion === 'backToTop' ? null : 'backToTop')}
                        className="w-full flex items-center justify-between p-5 bg-white hover:bg-zinc-50 transition-colors text-left"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-zinc-50 text-zinc-500 flex items-center justify-center">
                                <ArrowUp className="w-4 h-4" />
                            </div>
                            <span className="text-[13px] font-bold text-zinc-900 tracking-tight">Back to Top Button</span>
                        </div>
                        {activeAccordion === 'backToTop' ? <ChevronDown className="w-4 h-4 text-zinc-400" /> : <ChevronRight className="w-4 h-4 text-zinc-400" />}
                    </button>
                    
                    {activeAccordion === 'backToTop' && (
                        <div className="p-6 pt-2 bg-white space-y-6 border-t border-zinc-50 animate-in fade-in duration-300">
                            <div className="space-y-3">
                                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest px-1">Visibility</label>
                                <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-50 rounded-2xl border border-zinc-100">
                                    {[
                                        { id: true, label: 'Enabled' },
                                        { id: false, label: 'Disabled' }
                                    ].map(option => (
                                        <button
                                            key={option.label}
                                            onClick={() => updateWidgets({ 
                                                backToTop: { ...backToTop, enabled: option.id } 
                                            })}
                                            className={clsx(
                                                "py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                                (backToTop.enabled ?? globalScope.backToTop?.enabled ?? false) === option.id
                                                    ? 'bg-white text-zinc-900 shadow-sm border border-zinc-100'
                                                    : 'text-zinc-400 hover:text-zinc-600'
                                            )}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <p className="text-[11px] text-zinc-400 px-1 leading-relaxed">
                                A minimal arrow button that appears after scrolling down, helping users return to the top quickly.
                            </p>
                        </div>
                    )}
                </div>

                {/* AI Chat Assistant Section */}
                <div className={clsx(
                    "border rounded-2xl overflow-hidden transition-all duration-300 shadow-sm",
                    activeAccordion === 'aiChat' ? 'border-zinc-200' : 'border-zinc-100'
                )}>
                    <button 
                        onClick={() => setActiveAccordion(activeAccordion === 'aiChat' ? null : 'aiChat')}
                        className="w-full flex items-center justify-between p-5 bg-white hover:bg-zinc-50 transition-colors text-left"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center">
                                <Sparkles className="w-4 h-4" />
                            </div>
                            <span className="text-[13px] font-bold text-zinc-900 tracking-tight">AI Chat Concierge</span>
                        </div>
                        {activeAccordion === 'aiChat' ? <ChevronDown className="w-4 h-4 text-zinc-400" /> : <ChevronRight className="w-4 h-4 text-zinc-400" />}
                    </button>
                    
                    {activeAccordion === 'aiChat' && (
                        <div className="p-6 pt-2 bg-white space-y-6 border-t border-zinc-50 animate-in fade-in duration-300">
                            <div className="space-y-3">
                                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest px-1">Visibility</label>
                                <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-50 rounded-2xl border border-zinc-100">
                                    {[
                                        { id: true, label: 'Enabled' },
                                        { id: false, label: 'Disabled' }
                                    ].map(option => (
                                        <button
                                            key={option.label}
                                            onClick={() => updateWidgets({ 
                                                aiChat: { ...aiChat, enabled: option.id } 
                                            })}
                                            className={clsx(
                                                "py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                                (aiChat.enabled ?? globalScope.aiChat?.enabled ?? false) === option.id
                                                    ? 'bg-white text-zinc-900 shadow-sm border border-zinc-100'
                                                    : 'text-zinc-400 hover:text-zinc-600'
                                            )}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <p className="text-[11px] text-zinc-400 px-1 leading-relaxed">
                                A smart assistant that helps visitors with class schedules, package information, and instructor details. 
                                <br/><br/>
                                <span className="font-bold text-zinc-500 italic">Note: Usage is subject to your monthly AI credit limit.</span>
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
