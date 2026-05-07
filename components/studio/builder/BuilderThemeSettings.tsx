'use client'

import { ArrowLeft, Check, Palette, Type, Share2, Globe, Laptop, Smartphone, Layout, ChevronRight, ChevronDown, Image as ImageIcon, Code, Search, X, Loader2, AlertCircle, AlertTriangle } from 'lucide-react'
import { themes } from '@/lib/studio/themes'
import { uploadStudioAsset } from '@/app/(dashboard)/studio/studio-actions'
import { useState, useMemo, useEffect, useRef } from 'react'
import { getContrastRatio } from '@/lib/utils/color-utils'

interface BuilderThemeSettingsProps {
    subView: string
    config: any
    studioId: string
    setConfig: (config: any) => void
    goBack: () => void
    setNavPath: (path: any) => void
}

const FONT_LIBRARY = [
    { name: 'Playfair Display', category: 'Serif' },
    { name: 'Inter', category: 'Sans' },
    { name: 'Montserrat', category: 'Sans' },
    { name: 'Lora', category: 'Serif' },
    { name: 'Oswald', category: 'Modern' },
    { name: 'Outfit', category: 'Modern' },
    { name: 'DM Sans', category: 'Sans' },
    { name: 'Merriweather', category: 'Serif' },
    { name: 'Playfair Display SC', category: 'Serif' },
    { name: 'Libre Baskerville', category: 'Serif' },
    { name: 'Quicksand', category: 'Sans' },
    { name: 'Work Sans', category: 'Sans' },
    { name: 'Cormorant Garamond', category: 'Serif' },
    { name: 'Cinzel', category: 'Modern' },
    { name: 'Syncopate', category: 'Modern' },
    { name: 'Unbounded', category: 'Modern' },
    { name: 'Syne', category: 'Modern' },
    { name: 'Bebas Neue', category: 'Modern' },
    { name: 'Epilogue', category: 'Modern' },
    { name: 'Josefin Sans', category: 'Sans' },
    { name: 'Prata', category: 'Serif' }
]

export default function BuilderThemeSettings({ subView, config, studioId, setConfig, goBack, setNavPath }: BuilderThemeSettingsProps) {
    const [isUploading, setIsUploading] = useState(false)
    const [expandedAccordion, setExpandedAccordion] = useState<string | null>('secondary')
    const [fontSelector, setFontSelector] = useState<{ type: 'heading' | 'body' } | null>(null)
    const [searchQuery, setSearchQuery] = useState('')

    const updateTheme = (updates: any) => {
        setConfig((prev: any) => ({
            ...prev,
            theme: { ...prev.theme, ...updates }
        }))
    }

    const filteredFonts = useMemo(() => {
        return FONT_LIBRARY.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    }, [searchQuery])

    const ColorInput = ({ label, value, onChange, description, contrastWith }: { label: string, value: string, onChange: (val: string) => void, description?: string, contrastWith?: string }) => {
        const contrastRatio = contrastWith ? getContrastRatio(value, contrastWith) : null;
        const isLowContrast = contrastRatio !== null && contrastRatio < 4.5;
        
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
            <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                    <label className="text-[13px] font-medium text-zinc-600">{label}</label>
                    {contrastRatio !== null && (
                        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight ${
                            contrastRatio >= 4.5 ? 'text-emerald-600 bg-emerald-50' : 
                            contrastRatio >= 3.0 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50'
                        }`}>
                            Contrast: {contrastRatio.toFixed(1)}:1
                            {contrastRatio < 4.5 && <AlertTriangle className="w-3 h-3" />}
                        </div>
                    )}
                </div>
                <div className={`flex items-center gap-2 bg-white border rounded-xl p-3 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all ${
                    isLowContrast ? 'border-amber-200' : 'border-zinc-200'
                }`}>
                    <input 
                        type="text"
                        value={localValue}
                        onChange={(e) => handleColorChange(e.target.value)}
                        className="flex-1 bg-transparent border-none text-[14px] font-mono font-medium text-zinc-900 focus:ring-0 outline-none p-0"
                    />
                    <div className="relative group">
                        <div 
                            className="w-6 h-6 rounded-full border border-zinc-200 shadow-sm cursor-pointer"
                            style={{ backgroundColor: localValue }}
                        />
                        <input 
                            type="color"
                            value={localValue.startsWith('#') ? localValue : '#000000'}
                            onInput={(e: any) => handleColorChange(e.target.value)}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                    </div>
                </div>
                {isLowContrast && (
                    <p className="text-[10px] text-amber-600 font-medium px-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        This color might be hard to read for some users.
                    </p>
                )}
                {description && <p className="text-[11px] text-zinc-400 italic px-1">{description}</p>}
            </div>
        )
    }

    const MenuLink = ({ icon: Icon, label, id, subLabel }: { icon: any, label: string, id: string, subLabel?: string }) => (
        <button
            onClick={() => setNavPath({ view: 'settings', subView: id })}
            className="w-full flex items-center justify-between p-5 bg-white border border-zinc-100 rounded-2xl hover:bg-zinc-50 transition-all group"
        >
            <div className="flex items-center gap-4">
                <div className="p-2.5 bg-zinc-50 rounded-xl group-hover:bg-white transition-colors">
                    <Icon className="w-5 h-5 text-zinc-400 group-hover:text-zinc-900" />
                </div>
                <div className="text-left">
                    <span className="block text-[14px] font-bold text-zinc-900">{label}</span>
                    {subLabel && <span className="text-[11px] text-zinc-400 font-medium">{subLabel}</span>}
                </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-zinc-900 group-hover:translate-x-1 transition-all" />
        </button>
    )

    if (fontSelector) {
        return (
            <div className="flex flex-col h-full animate-in slide-in-from-bottom-5 duration-500 bg-white">
                <div className="flex items-center justify-between p-6 border-b border-zinc-100 sticky top-0 bg-white z-10">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setFontSelector(null)} className="p-2 hover:bg-zinc-50 rounded-lg transition-colors"><X className="w-5 h-5 text-zinc-900" /></button>
                        <h3 className="text-xl font-serif font-black text-zinc-900">Choose {fontSelector.type === 'heading' ? 'Header' : 'Body'} Font</h3>
                    </div>
                </div>

                <div className="p-6 space-y-4 flex-1 overflow-y-auto pb-32">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <input 
                            type="text" 
                            placeholder="Find a font..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-4 pl-12 pr-4 text-[14px] font-medium focus:ring-2 focus:ring-zinc-900/5 transition-all outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                        {filteredFonts.map(font => (
                            <button
                                key={font.name}
                                onClick={() => {
                                    updateTheme({ [fontSelector.type === 'heading' ? 'headingFont' : 'bodyFont']: font.name })
                                    setFontSelector(null)
                                }}
                                className={`w-full text-left p-6 rounded-2xl border-2 transition-all group ${
                                    (fontSelector.type === 'heading' ? config.theme.headingFont : config.theme.bodyFont) === font.name
                                        ? 'border-zinc-900 bg-zinc-900 text-white'
                                        : 'border-zinc-50 bg-white hover:border-zinc-200 text-zinc-900'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="text-[18px]" style={{ fontFamily: font.name }}>{font.name}</p>
                                        <p className={`text-[10px] font-black uppercase tracking-widest ${
                                            (fontSelector.type === 'heading' ? config.theme.headingFont : config.theme.bodyFont) === font.name
                                                ? 'text-white/40' : 'text-zinc-400'
                                        }`}>{font.category}</p>
                                    </div>
                                    {(fontSelector.type === 'heading' ? config.theme.headingFont : config.theme.bodyFont) === font.name && <Check className="w-4 h-4 text-white" />}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    if (subView === 'main') {
        return (
            <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
                <div className="flex items-center gap-4 border-b border-zinc-100 pb-8">
                    <button onClick={goBack} className="p-2.5 rounded-xl hover:bg-zinc-50 transition-colors border border-transparent hover:border-zinc-100"><ArrowLeft className="w-5 h-5 text-zinc-900" /></button>
                    <div>
                        <h3 className="text-2xl font-serif font-black text-zinc-900 tracking-tight">Theme Settings</h3>
                    </div>
                </div>

                <div className="space-y-3">
                    <MenuLink icon={Layout} label="Templates Library" id="templates" subLabel="Choose a theme template" />
                    <MenuLink icon={Smartphone} label="Layout & Spacing" id="layout" subLabel="Global padding & card radius" />
                    <MenuLink icon={Palette} label="Colours" id="colors" />
                    <MenuLink icon={Type} label="Typography" id="typography" />
                    <MenuLink icon={Layout} label="Footer" id="footer" subLabel="Footer Tagline & Links" />
                    <MenuLink icon={Share2} label="Social media" id="social" subLabel="Social Links" />
                    <MenuLink icon={ImageIcon} label="Fav Icon" id="favicon" />
                    <MenuLink icon={Code} label="Custom CSS" id="css" />
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center gap-4 border-b border-zinc-100 pb-8">
                <button onClick={() => setNavPath({ view: 'settings', subView: 'main' })} className="p-2.5 rounded-xl hover:bg-zinc-50 transition-colors border border-transparent hover:border-zinc-100"><ArrowLeft className="w-5 h-5 text-zinc-900" /></button>
                <div>
                    <h3 className="text-2xl font-serif font-black text-zinc-900 tracking-tight capitalize">
                        {subView === 'css' ? 'Custom CSS' : subView === 'templates' ? 'Templates Library' : subView}
                    </h3>
                </div>
            </div>

            <div className="space-y-6 pb-20">
                {subView === 'layout' && (
                    <div className="space-y-6">
                        <div className="p-6 bg-zinc-50 rounded-2xl border border-zinc-100">
                             <p className="text-[11px] font-bold text-zinc-900 uppercase tracking-widest mb-1 italic">Visual Harmony</p>
                             <p className="text-[11px] text-zinc-500 leading-relaxed">Adjust the global white space and container smoothness for a consistent feel across your studio site.</p>
                        </div>
                        
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest px-1">Card Smoothness</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['0.5rem', '1.5rem', '3rem'].map(r => (
                                        <button 
                                            key={r}
                                            onClick={() => updateTheme({ cardRadius: r })}
                                            className={`py-4 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest transition-all ${config.theme.cardRadius === r ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-100 text-zinc-400 hover:border-zinc-200'}`}
                                        >
                                            {r === '0.5rem' ? 'Modern' : r === '1.5rem' ? 'Soft' : 'Premium'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest px-1">Section Breathing Room</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['3rem', '6rem', '10rem'].map(p => (
                                        <button 
                                            key={p}
                                            onClick={() => updateTheme({ sectionPadding: p })}
                                            className={`py-4 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest transition-all ${config.theme.sectionPadding === p ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-100 text-zinc-400 hover:border-zinc-200'}`}
                                        >
                                            {p === '3rem' ? 'Compact' : p === '6rem' ? 'Spaced' : 'Luxe'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-6 border-t border-zinc-100">
                                <ColorInput 
                                    label="Global Background" 
                                    value={config.theme.backgroundColor || '#ffffff'} 
                                    onChange={(val) => updateTheme({ backgroundColor: val })} 
                                    description="The base canvas color for your entire website."
                                />
                            </div>
                        </div>
                    </div>
                )}
                {subView === 'templates' && (
                    <div className="space-y-4">
                        <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 mb-4">
                             <p className="text-[11px] text-indigo-700 leading-relaxed font-medium">Switching templates updates your colors and typography but preserves your content sections.</p>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            {Object.values(themes).map((theme: any) => (
                                <button 
                                    key={theme.id}
                                    onClick={() => updateTheme({ 
                                        themeId: theme.id,
                                        primaryColor: theme.colors.primary,
                                        backgroundColor: theme.colors.background,
                                        textColor: theme.colors.text,
                                        headingFont: theme.fonts.heading,
                                        bodyFont: theme.fonts.body,
                                        buttonRadius: theme.styles.buttonRadius,
                                        sectionPadding: theme.styles.sectionPadding,
                                        cardShadow: theme.styles.cardShadow
                                    })}
                                    className={`w-full text-left p-6 rounded-[2rem] border-2 transition-all group relative ${
                                        (config.theme.themeId || 'zen-minimalist') === theme.id 
                                            ? "border-[#283ba7] bg-indigo-50/30" 
                                            : "border-transparent bg-white shadow-sm hover:border-zinc-200"
                                    }`}

                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm" style={{ backgroundColor: theme.colors.background }}>
                                                <Palette className="w-6 h-6" style={{ color: theme.colors.primary }} />
                                            </div>
                                            <div>
                                                <h5 className="text-[13px] font-black text-zinc-900 leading-tight">{theme.name}</h5>
                                                <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest mt-0.5">{theme.id === 'zen-minimalist' ? 'Luxe & Neutral' : 'Bold & Modern'}</p>
                                            </div>
                                        </div>
                                        {(config.theme.themeId || 'zen-minimalist') === theme.id && (
                                            <div className="bg-[#283ba7] text-white p-1 rounded-full">
                                                <Check className="w-3.5 h-3.5" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        {[theme.colors.primary, theme.colors.secondary, theme.colors.accent].map((c, i) => (
                                            <div key={i} className="w-8 h-2 rounded-full" style={{ backgroundColor: c }} />
                                        ))}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                {subView === 'colors' && (
                    <div className="space-y-3">
                        {/* Primary Color Accordion */}
                        <div className="bg-white border border-zinc-100 rounded-[1.5rem] overflow-hidden shadow-sm">
                            <button 
                                onClick={() => setExpandedAccordion(expandedAccordion === 'primary' ? null : 'primary')}
                                className="w-full flex items-center justify-between p-6 hover:bg-zinc-50/50 transition-colors"
                            >
                                <span className="text-[15px] font-bold text-zinc-900">Primary color</span>
                                <ChevronDown className={`w-4 h-4 text-zinc-300 transition-transform duration-500 ${expandedAccordion === 'primary' ? 'rotate-180' : ''}`} />
                            </button>
                            <div className={`transition-all duration-500 ease-in-out ${expandedAccordion === 'primary' ? 'max-h-[500px] p-6 pt-0 opacity-100' : 'max-h-0 opacity-0'}`}>
                                <ColorInput 
                                    label="Brand Color" 
                                    value={config.theme.primaryColor} 
                                    onChange={(val) => updateTheme({ primaryColor: val })} 
                                    description="Used for branding, icons, and highlights."
                                    contrastWith="#ffffff"
                                />
                            </div>
                        </div>

                        {/* Secondary Color Accordion */}
                        <div className="bg-white border border-zinc-100 rounded-[1.5rem] overflow-hidden shadow-sm">
                            <button 
                                onClick={() => setExpandedAccordion(expandedAccordion === 'secondary' ? null : 'secondary')}
                                className="w-full flex items-center justify-between p-6 hover:bg-zinc-50/50 transition-colors"
                            >
                                <span className="text-[15px] font-bold text-zinc-900">Secondary color</span>
                                <ChevronDown className={`w-4 h-4 text-zinc-300 transition-transform duration-500 ${expandedAccordion === 'secondary' ? 'rotate-180' : ''}`} />
                            </button>
                            <div className={`transition-all duration-500 ease-in-out ${expandedAccordion === 'secondary' ? 'max-h-[500px] p-6 pt-0 opacity-100' : 'max-h-0 opacity-0'}`}>
                                <div className="space-y-6">
                                    <ColorInput 
                                        label="Background color" 
                                        value={config.theme.backgroundColor || '#fdf9f4'} 
                                        onChange={(val) => updateTheme({ backgroundColor: val })} 
                                        description="Used as secondary background colour."
                                        contrastWith={config.theme.textColor || '#000000'}
                                    />
                                    <ColorInput 
                                        label="Text color" 
                                        value={config.theme.textColor || '#000000'} 
                                        onChange={(val) => updateTheme({ textColor: val })} 
                                        description="Used for text colour only."
                                        contrastWith={config.theme.backgroundColor || '#ffffff'}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Buttons Accordion */}
                        <div className="bg-white border border-zinc-100 rounded-[1.5rem] overflow-hidden shadow-sm">
                            <button 
                                onClick={() => setExpandedAccordion(expandedAccordion === 'buttons' ? null : 'buttons')}
                                className="w-full flex items-center justify-between p-6 hover:bg-zinc-50/50 transition-colors"
                            >
                                <span className="text-[15px] font-bold text-zinc-900">Buttons</span>
                                <ChevronDown className={`w-4 h-4 text-zinc-300 transition-transform duration-500 ${expandedAccordion === 'buttons' ? 'rotate-180' : ''}`} />
                            </button>
                            <div className={`transition-all duration-500 ease-in-out ${expandedAccordion === 'buttons' ? 'max-h-[500px] p-6 pt-0 opacity-100' : 'max-h-0 opacity-0'}`}>
                                <div className="space-y-6">
                                    <ColorInput 
                                        label="Button Background" 
                                        value={config.theme.buttonColor || config.theme.primaryColor} 
                                        onChange={(val) => updateTheme({ buttonColor: val })} 
                                        contrastWith="#ffffff"
                                    />
                                    <div className="space-y-3">
                                        <label className="text-[13px] font-medium text-zinc-600">Button Sharpness</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {['0px', '12px', '99px'].map(r => (
                                                <button 
                                                    key={r}
                                                    onClick={() => updateTheme({ buttonRadius: r })}
                                                    className={`py-3 rounded-lg border-2 text-[10px] font-bold transition-all ${config.theme.buttonRadius === r ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-zinc-100 text-zinc-400 hover:border-zinc-200'}`}
                                                >
                                                    {r === '0px' ? 'Sharp' : r === '12px' ? 'Rounded' : 'Pill'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {subView === 'typography' && (
                    <div className="space-y-3">
                        {/* Header Font Accordion */}
                        <div className="bg-white border border-zinc-100 rounded-[1.5rem] overflow-hidden shadow-sm">
                            <button 
                                onClick={() => setExpandedAccordion(expandedAccordion === 'h-font' ? null : 'h-font')}
                                className="w-full flex items-center justify-between p-6 hover:bg-zinc-50/50 transition-colors"
                            >
                                <span className="text-[15px] font-bold text-zinc-900">Header Font</span>
                                <ChevronDown className={`w-4 h-4 text-zinc-300 transition-transform duration-500 ${expandedAccordion === 'h-font' ? 'rotate-180' : ''}`} />
                            </button>
                            <div className={`transition-all duration-500 ease-in-out ${expandedAccordion === 'h-font' ? 'max-h-[500px] p-6 pt-0 opacity-100' : 'max-h-0 opacity-0'}`}>
                                <div className="space-y-6">
                                    <h4 className="text-[24px] font-medium text-zinc-900" style={{ fontFamily: config.theme.headingFont || 'serif' }}>{config.theme.headingFont || 'Playfair Display'}</h4>
                                    <button 
                                        onClick={() => setFontSelector({ type: 'heading' })}
                                        className="w-full py-4 bg-[#283ba7] text-white rounded-2xl text-[12px] font-black uppercase tracking-widest hover:brightness-110 transition-all"
                                    >
                                        Change
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Body Font Accordion */}
                        <div className="bg-white border border-zinc-100 rounded-[1.5rem] overflow-hidden shadow-sm">
                            <button 
                                onClick={() => setExpandedAccordion(expandedAccordion === 'b-font' ? null : 'b-font')}
                                className="w-full flex items-center justify-between p-6 hover:bg-zinc-50/50 transition-colors"
                            >
                                <span className="text-[15px] font-bold text-zinc-900">Body Font</span>
                                <ChevronDown className={`w-4 h-4 text-zinc-300 transition-transform duration-500 ${expandedAccordion === 'b-font' ? 'rotate-180' : ''}`} />
                            </button>
                            <div className={`transition-all duration-500 ease-in-out ${expandedAccordion === 'b-font' ? 'max-h-[500px] p-6 pt-0 opacity-100' : 'max-h-0 opacity-0'}`}>
                                <div className="space-y-6">
                                    <h4 className="text-[16px] text-zinc-600" style={{ fontFamily: config.theme.bodyFont || 'sans-serif' }}>{config.theme.bodyFont || 'Inter'}</h4>
                                    <button 
                                        onClick={() => setFontSelector({ type: 'body' })}
                                        className="w-full py-4 bg-[#283ba7] text-white rounded-2xl text-[12px] font-black uppercase tracking-widest hover:brightness-110 transition-all"
                                    >
                                        Change
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {subView === 'social' && (
                    <div className="space-y-6">
                        <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100">
                             <p className="text-[11px] font-bold text-indigo-900 uppercase tracking-widest mb-1 italic">Pro Tip</p>
                             <p className="text-[11px] text-indigo-700 leading-relaxed">These links populate your site footer automatically. Enter the full URL (e.g., https://instagram.com/yourhandle).</p>
                        </div>
                         {['Instagram', 'Facebook', 'TikTok', 'Twitter'].map(platform => (
                             <div key={platform} className="space-y-2">
                                 <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest px-1">{platform}</label>
                                 <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm focus-within:ring-2 focus-within:ring-zinc-900 transition-all">
                                     <Share2 className="w-4 h-4 text-zinc-300" />
                                     <input 
                                        type="text" 
                                        value={config.socialLinks?.[platform.toLowerCase()] || ''}
                                        onChange={(e) => setConfig((prev:any) => ({
                                            ...prev,
                                            socialLinks: { ...prev.socialLinks, [platform.toLowerCase()]: e.target.value }
                                        }))}
                                        placeholder={`${platform} URL`} 
                                        className="flex-1 bg-transparent border-none text-[13px] font-medium focus:ring-0 outline-none text-zinc-900 placeholder:text-zinc-200" 
                                     />
                                 </div>
                             </div>
                         ))}
                    </div>
                )}

                {subView === 'favicon' && (
                    <div className="space-y-6">
                        <div className="bg-zinc-50 p-8 rounded-[2rem] border-2 border-dashed border-zinc-200 text-center space-y-4">
                            <div className="w-16 h-16 bg-white rounded-2xl border border-zinc-100 mx-auto shadow-indigo-100 shadow-xl flex items-center justify-center overflow-hidden">
                                {config.theme.favicon ? (
                                    <img src={config.theme.favicon} className="w-full h-full object-contain" alt="Favicon" />
                                ) : (
                                    <Globe className="w-8 h-8 text-zinc-200" />
                                )}
                            </div>
                            <div className="space-y-2">
                                <label className="inline-block px-8 py-3 bg-zinc-900 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:brightness-110 transition-all cursor-pointer disabled:opacity-50">
                                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Upload Icon'}
                                    <input 
                                        type="file" 
                                        className="hidden" 
                                        accept="image/*"
                                        disabled={isUploading}
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0]
                                            if (!file) return
                                            setIsUploading(true)
                                            const formData = new FormData()
                                            formData.append('file', file)
                                            formData.append('studioId', studioId)
                                            formData.append('type', 'favicon')
                                            const res = await uploadStudioAsset(formData)
                                            if (res.success && res.url) updateTheme({ favicon: res.url })
                                            setIsUploading(false)
                                        }}
                                    />
                                </label>
                                <p className="text-[10px] text-zinc-400">Best results with 32x32 PNG or ICO.</p>
                            </div>
                        </div>
                    </div>
                )}

                {subView === 'css' && (
                    <div className="space-y-4">
                        <div className="bg-zinc-950 rounded-[2rem] p-6 shadow-2xl border border-white/5">
                            <div className="flex items-center justify-between mb-4 px-2">
                                <span className="text-[11px] font-bold text-white/40 uppercase tracking-[0.2em]">style.css</span>
                                <div className="flex gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.3)]" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/20" />
                                </div>
                            </div>
                            <textarea 
                                value={config.theme.customCss || ''}
                                onChange={(e) => updateTheme({ customCss: e.target.value })}
                                placeholder="/* Add your custom CSS here */\n\n#storefront-preview {\n  /* example */\n}"
                                className="w-full h-[400px] bg-transparent border-none text-emerald-400 font-mono text-[13px] leading-relaxed focus:ring-0 outline-none resize-none p-0 scrollbar-hide"
                            />
                        </div>
                        <p className="text-[11px] text-zinc-400 italic px-4 leading-relaxed">Changes are scoped to the storefront only. Experimental features may impact builder performance.</p>
                    </div>
                )}

                {subView === 'branding' && (
                    <div className="space-y-6">
                        <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100">
                             <p className="text-[11px] font-bold text-indigo-900 uppercase tracking-widest mb-1 italic">Studio Identity</p>
                             <p className="text-[11px] text-indigo-700 leading-relaxed">Your studio motto or slogan appears on your splash screen and in the authentication modal.</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest px-1">Studio Motto / Slogan</label>
                            <div className="bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm focus-within:ring-2 focus-within:ring-zinc-900 transition-all">
                                <textarea 
                                    value={config.footer?.tagline || ''}
                                    onChange={(e) => setConfig((prev: any) => ({
                                        ...prev,
                                        footer: { ...prev.footer, tagline: e.target.value }
                                    }))}
                                    placeholder="e.g. Move stronger. Feel better. Stay consistent." 
                                    className="w-full bg-transparent border-none text-[13px] font-medium focus:ring-0 outline-none text-zinc-900 placeholder:text-zinc-200 resize-none h-24" 
                                />
                            </div>
                            <p className="text-[10px] text-zinc-400 px-1 italic">Tip: Use Shift + Enter for line breaks to control layout.</p>
                        </div>
                    </div>
                )}

                {subView === 'footer' && (
                    <div className="space-y-6">
                        <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100">
                             <p className="text-[11px] font-bold text-indigo-900 uppercase tracking-widest mb-1 italic">Footer Settings</p>
                             <p className="text-[11px] text-indigo-700 leading-relaxed">Manage your site footer's appearance and messaging.</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest px-1">Footer Tagline</label>
                            <div className="bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm focus-within:ring-2 focus-within:ring-zinc-900 transition-all">
                                <textarea 
                                    value={config.footer?.tagline || ''}
                                    onChange={(e) => setConfig((prev: any) => ({
                                        ...prev,
                                        footer: { ...prev.footer, tagline: e.target.value }
                                    }))}
                                    placeholder="e.g. Move stronger. Feel better. Stay consistent." 
                                    className="w-full bg-transparent border-none text-[13px] font-medium focus:ring-0 outline-none text-zinc-900 placeholder:text-zinc-200 resize-none h-20" 
                                />
                            </div>
                        </div>
                        <div className="pt-4 border-t border-zinc-50">
                            <MenuLink icon={Share2} label="Configure Social Links" id="social" subLabel="Manage your Instagram, Facebook, etc." />
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
