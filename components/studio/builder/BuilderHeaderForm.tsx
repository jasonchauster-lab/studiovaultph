'use client'

import { ArrowLeft, Check, Palette, Globe, Laptop, Smartphone, Layout, ChevronDown, ChevronRight, Image as ImageIcon, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { uploadStudioAsset } from '@/app/(dashboard)/studio/studio-actions'

interface BuilderHeaderFormProps {
    config: any
    studioId: string
    setConfig: (config: any) => void
    goBack: () => void
}

function LocalColorInput({ value, onChange, label, description }: { value: string, onChange: (val: string) => void, label: string, description?: string }) {
    const [localValue, setLocalValue] = useState(value)
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        setLocalValue(value)
    }, [value])

    const handleColorChange = (newColor: string) => {
        setLocalValue(newColor)
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        timeoutRef.current = setTimeout(() => {
            onChange(newColor)
        }, 150)
    }

    return (
        <div className="space-y-4">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 px-1">{label}</label>
            <div className="flex items-center gap-4 bg-zinc-50/50 p-4 rounded-xl border border-zinc-100 shadow-inner group">
                <input 
                    type="text"
                    value={localValue || '#ffffff'}
                    onChange={(e) => handleColorChange(e.target.value)}
                    className="flex-1 bg-transparent border-none text-[13px] font-mono font-bold text-zinc-900 focus:ring-0 outline-none"
                />
                <div className="relative w-8 h-8 rounded-full border border-zinc-200 overflow-hidden shadow-sm">
                    <input 
                        type="color"
                        value={localValue || '#ffffff'}
                        onChange={(e) => handleColorChange(e.target.value)}
                        className="absolute -inset-2 w-[200%] h-[200%] cursor-pointer border-none p-0"
                    />
                </div>
            </div>
            {description && <p className="text-[11px] text-zinc-400 px-1">{description}</p>}
        </div>
    )
}

import { useEffect, useRef } from 'react'

export default function BuilderHeaderForm({ config, studioId, setConfig, goBack }: BuilderHeaderFormProps) {
    const [isUploading, setIsUploading] = useState(false)
    const [activeAccordion, setActiveAccordion] = useState<'logo' | 'color' | null>('color')

    const updateHeader = (updates: any) => {
        setConfig((prev: any) => ({
            ...prev,
            header: { ...prev.header, ...updates }
        }))
    }

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
                    <h3 className="text-4xl font-serif font-bold text-zinc-900">Header</h3>
                    <p className="text-[13px] text-zinc-500 font-medium leading-relaxed">
                        Keep your header clean, concise and comprehensive
                    </p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 scrollbar-hide">
                {/* Logo Section */}
                <div className="border border-zinc-100 rounded-2xl overflow-hidden shadow-sm">
                    <button 
                        onClick={() => setActiveAccordion(activeAccordion === 'logo' ? null : 'logo')}
                        className="w-full flex items-center justify-between p-5 bg-white hover:bg-zinc-50 transition-colors text-left"
                    >
                        <span className="text-[13px] font-bold text-zinc-900 tracking-tight">Logo image</span>
                        {activeAccordion === 'logo' ? <ChevronDown className="w-4 h-4 text-zinc-400" /> : <ChevronRight className="w-4 h-4 text-zinc-400" />}
                    </button>
                    
                    {activeAccordion === 'logo' && (
                        <div className="p-6 pt-2 bg-white space-y-6 border-t border-zinc-50 animate-in fade-in duration-300">
                            {/* branding type toggle */}
                            <div className="space-y-3">
                                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest px-1">Branding Style</label>
                                <div className="grid grid-cols-3 gap-2 p-1 bg-zinc-50 rounded-2xl border border-zinc-100">
                                    {[
                                        { id: 'typography', label: 'Text' },
                                        { id: 'seal', label: 'Seal (Circle)' },
                                        { id: 'standard', label: 'Standard' }
                                    ].map(style => (
                                        <button
                                            key={style.id}
                                            onClick={() => updateHeader({ logoStyle: style.id })}
                                            className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                                (config.header?.logoStyle || 'typography') === style.id
                                                    ? 'bg-white text-zinc-900 shadow-sm border border-zinc-100 flex items-center justify-center gap-1.5'
                                                    : 'text-zinc-400 hover:text-zinc-600'
                                            }`}
                                        >
                                            {(config.header?.logoStyle || 'typography') === style.id && <Check className="w-3 h-3 text-emerald-500" />}
                                            {style.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center gap-6 bg-zinc-50/50 p-6 rounded-2xl border border-zinc-100 shadow-inner">
                                <div className={`w-20 h-20 bg-white border border-zinc-200 flex items-center justify-center overflow-hidden shadow-sm transition-all duration-500 ${config.header?.logoStyle === 'seal' ? 'rounded-full' : 'rounded-xl'}`}>
                                    {config.header?.logoUrl ? (
                                        <img 
                                            src={config.header.logoUrl} 
                                            className={`w-full h-full ${config.header?.logoStyle === 'seal' ? 'object-cover' : 'object-contain'}`} 
                                            alt="Logo" 
                                        />
                                    ) : (
                                        <Globe className="w-8 h-8 text-zinc-200" />
                                    )}
                                </div>
                                <div className="flex-1 space-y-3">
                                    <label className="inline-flex items-center justify-center bg-zinc-900 text-white px-6 py-2.5 rounded-full text-[11px] font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all cursor-pointer disabled:opacity-50 active:scale-95">
                                        {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : null}
                                        {isUploading ? 'Uploading...' : 'Upload Logo'}
                                        <input 
                                            type="file" 
                                            className="hidden" 
                                            accept="image/*"
                                            disabled={isUploading}
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0]
                                                if (!file) return
                                                setIsUploading(true)
                                                // ... keep existing upload logic
                                                const formData = new FormData()
                                                formData.append('file', file)
                                                formData.append('studioId', studioId)
                                                formData.append('type', 'logo')
                                                const res = await uploadStudioAsset(formData)
                                                if (res.success && res.url) {
                                                    updateHeader({ logoUrl: res.url })
                                                }
                                                setIsUploading(false)
                                            }}
                                        />
                                    </label>
                                    <p className="text-[10px] text-zinc-400 italic">Recommended: SVG or Transparent PNG</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Colour Section */}
                <div className="border border-zinc-100 rounded-2xl overflow-hidden shadow-sm">
                    <button 
                        onClick={() => setActiveAccordion(activeAccordion === 'color' ? null : 'color')}
                        className="w-full flex items-center justify-between p-5 bg-white hover:bg-zinc-50 transition-colors text-left"
                    >
                        <span className="text-[13px] font-bold text-zinc-900 tracking-tight">Colour</span>
                        {activeAccordion === 'color' ? <ChevronDown className="w-4 h-4 text-zinc-400" /> : <ChevronRight className="w-4 h-4 text-zinc-400" />}
                    </button>
                    
                    {activeAccordion === 'color' && (
                        <div className="p-6 pt-2 bg-white space-y-6 border-t border-zinc-50 animate-in fade-in duration-300">
                                <LocalColorInput 
                                    label="Background"
                                    value={config.header?.backgroundColor || '#ffffff'}
                                    onChange={(val) => updateHeader({ backgroundColor: val })}
                                    description="Used as Header background colour only."
                                />

                                <LocalColorInput 
                                    label="Text"
                                    value={config.header?.textColor || '#000000'}
                                    onChange={(val) => updateHeader({ textColor: val })}
                                    description="Used as header text colour only. Also used for button."
                                />
                        </div>
                    )}
                </div>

                {/* Navigation Section */}
                <div className="border border-zinc-100 rounded-2xl overflow-hidden shadow-sm">
                    <button 
                        onClick={() => setActiveAccordion(activeAccordion === 'navigation' ? null : 'navigation')}
                        className="w-full flex items-center justify-between p-5 bg-white hover:bg-zinc-50 transition-colors text-left"
                    >
                        <span className="text-[13px] font-bold text-zinc-900 tracking-tight">Navigation</span>
                        {activeAccordion === 'navigation' ? <ChevronDown className="w-4 h-4 text-zinc-400" /> : <ChevronRight className="w-4 h-4 text-zinc-400" />}
                    </button>
                    
                    {activeAccordion === 'navigation' && (
                        <div className="p-6 pt-2 bg-white space-y-6 border-t border-zinc-50 animate-in fade-in duration-300">
                            <div className="p-5 bg-forest/5 rounded-[1.5rem] border border-forest/10 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-[12px] font-bold text-charcoal-700">Sync with Online Store</span>
                                    <button 
                                        onClick={() => updateHeader({ useStoreNav: !config.header?.useStoreNav })}
                                        className={`w-12 h-7 rounded-full transition-all relative ${config.header?.useStoreNav ? 'bg-forest' : 'bg-zinc-200'}`}
                                    >
                                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${config.header?.useStoreNav ? 'left-6 shadow-sm' : 'left-1'}`} />
                                    </button>
                                </div>
                                <p className="text-[10px] text-zinc-400 leading-relaxed font-medium">
                                    When enabled, your header navigation will automatically pull links from <span className="text-charcoal-900 italic font-bold">Online Store &gt; Navigation</span>.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    )
}
