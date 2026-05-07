'use client'

// Force rebuild comment to check if syntax error persists
import { ArrowLeft, Check, Trash2, Plus, Image as ImageIcon, Palette, Type, Sliders, AlertTriangle, ChevronRight, Eye, EyeOff, Layout, Instagram, Linkedin } from 'lucide-react'

import { useState, useEffect, useRef } from 'react'
import { clsx } from 'clsx'
import { getContrastRatio } from '@/lib/utils/color-utils'

interface BuilderSectionFormProps {
    sectionId: string
    config: any
    studioId: string
    updateSectionContent: (id: string, updates: any) => void
    goBack: () => void
    memberships?: any[]
    packages?: any[]
}


import { uploadStudioAsset } from '@/app/(dashboard)/studio/studio-actions'
import { normalizeImageFile, sanitizeFileName } from '@/lib/utils/image-utils'
import { Loader2 } from 'lucide-react'
import LinkPicker from './LinkPicker'
import { useOnboarding } from '@/lib/hooks/useOnboarding'
import OnboardingTooltip from './OnboardingTooltip'



function LocalColorPicker({ value, onChange, label, className }: { value: string, onChange: (val: string) => void, label?: string, className?: string }) {
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
        <div className={clsx("flex items-center gap-3", className)}>
            <div className="flex-1 bg-cream-50 border border-cream-100 rounded-xl px-4 py-2.5 flex items-center gap-3">
                <div 
                    className="w-5 h-5 rounded-full border border-zinc-200 shadow-sm"
                    style={{ backgroundColor: localValue || '#ffffff' }}
                />
                <input 
                    type="text"
                    value={localValue || '#ffffff'}
                    onChange={(e) => handleColorChange(e.target.value)}
                    className="bg-transparent border-none text-[12px] font-mono font-bold text-zinc-600 focus:ring-0 outline-none p-0 w-full"
                    placeholder="#ffffff"
                />
            </div>
            <div className="relative group overflow-hidden rounded-xl border border-cream-100 bg-white">
                <div className="p-2.5 cursor-pointer hover:bg-cream-50 transition-colors">
                    <Sliders className="w-4 h-4 text-zinc-400" />
                </div>
                <input 
                    type="color"
                    value={localValue?.startsWith('#') ? localValue : '#ffffff'}
                    onChange={(e) => handleColorChange(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
            </div>
        </div>
    )
}


export default function BuilderSectionForm({ 
    sectionId, config, studioId, updateSectionContent, goBack,
    memberships = [], packages = []
}: BuilderSectionFormProps) {

    const [isUploading, setIsUploading] = useState(false)
    const [activeSubView, setActiveSubView] = useState<string | null>(null)
    const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null)
    const { shouldShow, dismissTip } = useOnboarding()
    const colorTipRef = useRef<HTMLDivElement>(null)
    const linkTipRef = useRef<HTMLDivElement>(null)
    const uploadTipRef = useRef<HTMLButtonElement>(null)

    // Search for section within the active page or across all pages if not found
    const findSection = () => {
        // First try the new multi-page structure
        if (config.pages) {
            for (const pageName in config.pages) {
                const found = config.pages[pageName].sections?.find((s: any) => s.id === sectionId)
                if (found) return found
            }
        }
        // Fallback to legacy flat structure
        return config.sections?.find((s: any) => s.id === sectionId)
    }

    const section = findSection()
    if (!section) return null

    const uploadImageToField = async (
        file: File,
        type: string,
        fieldName = 'imageUrl',
        maxWidth = 1600,
        quality = 0.85
    ) => {
        setIsUploading(true)
        try {
            const normalizedFile = await normalizeImageFile(file, { maxWidth, quality })
            const sanitizedFile = new File([normalizedFile], sanitizeFileName(normalizedFile.name), { type: normalizedFile.type })
            
            const formData = new FormData()
            formData.append('file', sanitizedFile)
            formData.append('studioId', studioId)
            formData.append('type', type)
            const res = await uploadStudioAsset(formData)
            if (res.success && res.url) {
                updateSectionContent(sectionId, { [fieldName]: res.url })
            } else {
                alert(res.error || 'Upload failed')
            }
        } catch (err: any) {
            console.error(`${section.type} upload error:`, err)
            alert(err.message || 'Normalization failed')
        } finally {
            setIsUploading(false)
        }
    }


    return (
        <div className="space-y-8">
            {/* Header Control */}
            <div className="flex items-center gap-4 border-b border-cream-100 pb-6">
                <button 
                    onClick={selectedItemIndex !== null ? () => setSelectedItemIndex(null) : (activeSubView ? () => setActiveSubView(null) : goBack)}
                    className="p-2 rounded-full hover:bg-cream-100 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-charcoal-900" />
                </button>
                <div className="flex-1">
                    <h3 className="text-xl font-serif font-bold text-charcoal-900 capitalize italic leading-tight">
                        {selectedItemIndex !== null ? `Edit ${section.type.slice(0, -1)}` : (activeSubView ? activeSubView.replace(/-/g, ' ') : section.type)}
                    </h3>
                    {!activeSubView && <p className="text-[10px] text-charcoal-400 font-black uppercase tracking-widest">Editing {section.type} section</p>}
                </div>
            </div>

            {/* Dynamic Fields based on Type */}
            <div className="space-y-6">
                {section.type === 'hero' && (
                    <>
                        <div className="space-y-4 pt-4 border-t border-cream-100">
                             <div className="flex items-center justify-between">
                                 <label className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400 px-1">Layout Settings</label>
                             </div>
                             <div 
                                 onClick={() => updateSectionContent(sectionId, { showDots: !section.content.showDots })}
                                 className="flex items-center justify-between p-4 bg-white rounded-xl border border-cream-100 cursor-pointer hover:bg-cream-50 transition-colors"
                             >
                                 <span className="text-[12px] font-bold text-zinc-700">Show Slideshow Pagination Dots</span>
                                 <div className={`w-10 h-6 rounded-full transition-colors relative ${section.content.showDots ? 'bg-forest' : 'bg-zinc-200'}`}>
                                     <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${section.content.showDots ? 'left-5' : 'left-1'}`} />
                                 </div>
                             </div>
                        </div>
                        <div className="space-y-4 pt-4 border-t border-cream-100">
                           <div className="flex items-center justify-between">
                               <label className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400 px-1">Background Images</label>
                               <span className="text-[10px] font-bold text-forest bg-forest/5 px-2 py-1 rounded">Reserves 8 images max</span>
                           </div>
                           <div className="grid grid-cols-3 gap-2">
                               {section.content.images?.map((img: string, idx: number) => (
                                   <div key={idx} className="aspect-square rounded-xl overflow-hidden relative group">
                                       <img src={img} className="w-full h-full object-cover" />
                                       <button 
                                            onClick={() => {
                                                const newImages = section.content.images.filter((_: any, i: number) => i !== idx)
                                                updateSectionContent(sectionId, { images: newImages })
                                            }}
                                            className="absolute top-1 right-1 p-1 bg-white/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                       >
                                           <Trash2 className="w-3 h-3 text-red-500" />
                                       </button>
                                   </div>
                               ))}
                               {(!section.content.images || section.content.images.length < 8) && (
                                   <div className="col-span-3 aspect-video rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50 flex flex-col items-center justify-center p-8 text-center gap-4 relative group transition-all hover:bg-zinc-100/50">
                                       <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center border border-zinc-100">
                                           <ImageIcon className="w-6 h-6 text-zinc-300" />
                                       </div>
                                       
                                       <div className="space-y-1">
                                           <button 
                                                ref={uploadTipRef}
                                                disabled={isUploading}
                                                className="bg-[#2c3e50] text-white px-6 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest hover:bg-[#1a2531] transition-all flex items-center gap-2 mx-auto disabled:opacity-50 relative"
                                           >
                                               {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                                               <span>Upload image</span>
                                               <input 
                                                    type="file" 
                                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                                    accept="image/*"
                                                    disabled={isUploading}
                                                    onChange={async (e) => {
                                                        const file = e.target.files?.[0]
                                                        if (!file) return
                                                        setIsUploading(true)
                                                        try {
                                                            const normalizedFile = await normalizeImageFile(file, { maxWidth: 1600, quality: 0.85 })
                                                            const sanitizedFile = new File([normalizedFile], sanitizeFileName(normalizedFile.name), { type: normalizedFile.type })
                                                            
                                                            const formData = new FormData()
                                                            formData.append('file', sanitizedFile)
                                                            formData.append('studioId', studioId)
                                                            formData.append('type', 'hero')
                                                            const res = await uploadStudioAsset(formData)
                                                            if (res.success && res.url) {
                                                                const currentImages = section.content.images || []
                                                                updateSectionContent(sectionId, { images: [...currentImages, res.url] })
                                                            } else {
                                                                alert(res.error || 'Upload failed')
                                                            }
                                                        } catch (err: any) {
                                                            console.error('Hero upload error:', err)
                                                            alert(err.message || 'Normalization failed')
                                                        } finally {
                                                            setIsUploading(false)
                                                        }
                                                    }}
                                               />
                                               <OnboardingTooltip
                                                    id="editor-upload"
                                                    show={shouldShow('editor-upload', 'select-section')}
                                                    title="High Quality Assets"
                                                    content="Upload images that represent your studio. We automatically optimize them to keep your site fast!"
                                                    position="top"
                                                    onDismiss={() => dismissTip('editor-upload')}
                                                    targetRef={uploadTipRef}
                                                    className="mb-4"
                                                />
                                           </button>
                                           <p className="text-[11px] font-medium text-zinc-400">Drop to upload image</p>
                                       </div>

                                       <div className="pt-2">
                                           <p className="text-[10px] text-zinc-400">File type: JPG, PNG or GIF</p>
                                           <p className="text-[10px] text-zinc-400">File size: &lt; 500kb</p>
                                       </div>
                                   </div>
                               )}

                           </div>
                        </div>

                        {/* Design Settings */}
                        <div className="space-y-4 pt-4 border-t border-cream-100">
                             <div className="flex items-center gap-2 px-1">
                                 <Palette className="w-3.5 h-3.5 text-charcoal-400" />
                                 <label className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400">Design Settings</label>
                             </div>
                             
                             <div className="space-y-6 bg-white rounded-2xl border border-cream-100 p-6 shadow-sm">
                                 <div className="space-y-3">
                                     <div className="flex items-center justify-between">
                                         <span className="text-[12px] font-bold text-zinc-700">Overlay Darkness</span>
                                         <div className="flex items-center gap-2">
                                            { (section.content.overlayOpacity ?? 0.4) < 0.3 && (
                                                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                                            )}
                                            <span className="text-[11px] font-mono text-zinc-400">{Math.round((section.content.overlayOpacity ?? 0.4) * 100)}%</span>
                                         </div>
                                     </div>
                                     <input 
                                         type="range"
                                         min="0"
                                         max="1"
                                         step="0.05"
                                         value={section.content.overlayOpacity ?? 0.4}
                                         onChange={(e) => updateSectionContent(sectionId, { overlayOpacity: parseFloat(e.target.value) })}
                                         className="w-full h-1.5 bg-zinc-100 rounded-lg appearance-none cursor-pointer accent-forest"
                                     />
                                     <p className="text-[10px] text-zinc-400 italic">Increases contrast for better text readability.</p>
                                 </div>

                                 <div className="space-y-3 pt-4 border-t border-cream-50">
                                     <div className="flex items-center justify-between">
                                         <span className="text-[12px] font-bold text-zinc-700">Text Color</span>
                                         {(() => {
                                             const ratio = getContrastRatio(section.content.textColor || '#ffffff', '#000000');
                                             return (
                                                 <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ratio >= 4.5 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                                     Contrast: {ratio.toFixed(1)}:1
                                                 </span>
                                             )
                                         })()}
                                     </div>
                                     <div className="relative" ref={colorTipRef}>
                                         <LocalColorPicker 
                                             value={section.content.textColor || '#ffffff'}
                                             onChange={(val) => updateSectionContent(sectionId, { textColor: val })}
                                         />
                                         <OnboardingTooltip
                                            id="editor-colors"
                                            show={shouldShow('editor-colors', 'editor-upload')}
                                            title="Brand Consistency"
                                            content="Use high-contrast colors for text. Our indicator shows if your choice is readable against the background."
                                            position="top"
                                            onDismiss={() => dismissTip('editor-colors')}
                                            targetRef={colorTipRef}
                                            className="mb-4"
                                        />
                                     </div>
                                 </div>

                                 <div className="space-y-4 pt-6 border-t border-cream-50">
                                     <div className="space-y-2">
                                         <label className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400 px-1">Primary Button</label>
                                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                             <input 
                                                 type="text"
                                                 value={section.content.primaryBtnText || ''}
                                                 onChange={(e) => updateSectionContent(sectionId, { primaryBtnText: e.target.value })}
                                                 className="w-full bg-cream-50 border border-cream-100 rounded-xl p-4 text-sm font-bold text-charcoal-700 focus:ring-2 focus:ring-forest outline-none transition-all"
                                                 placeholder="Label (e.g. Book Now)"
                                             />
                                             <div className="relative" ref={linkTipRef}>
                                                 <LinkPicker 
                                                     value={section.content.primaryBtnLink || ''}
                                                     onChange={(val) => updateSectionContent(sectionId, { primaryBtnLink: val })}
                                                     config={config}
                                                     memberships={memberships}
                                                     packages={packages}
                                                 />
                                                 <OnboardingTooltip
                                                    id="editor-links"
                                                    show={shouldShow('editor-links', 'editor-colors')}
                                                    title="Drive Checkouts"
                                                    content="Link buttons directly to your Memberships or Packages to speed up the purchase flow for new clients."
                                                    position="top"
                                                    onDismiss={() => dismissTip('editor-links')}
                                                    targetRef={linkTipRef}
                                                    className="mb-4"
                                                />
                                             </div>
                                         </div>
                                     </div>
                                     <div className="space-y-2">
                                         <label className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400 px-1">Secondary Button</label>
                                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                             <input 
                                                 type="text"
                                                 value={section.content.secondaryBtnText || ''}
                                                 onChange={(e) => updateSectionContent(sectionId, { secondaryBtnText: e.target.value })}
                                                 className="w-full bg-cream-50 border border-cream-100 rounded-xl p-4 text-sm font-bold text-charcoal-700 focus:ring-2 focus:ring-forest outline-none transition-all"
                                                 placeholder="Label (e.g. Learn More)"
                                             />
                                             <LinkPicker 
                                                 value={section.content.secondaryBtnLink || ''}
                                                 onChange={(val) => updateSectionContent(sectionId, { secondaryBtnLink: val })}
                                                 config={config}
                                                 memberships={memberships}
                                                 packages={packages}
                                             />
                                         </div>
                                     </div>
                                 </div>
                             </div>
                        </div>
                    </>
                )}

                {section.type === 'about' && (
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400 px-1">Section Title</label>
                            <input
                                type="text"
                                value={section.content.title || ''}
                                onChange={(e) => updateSectionContent(sectionId, { title: e.target.value })}
                                className="w-full bg-cream-50 border border-cream-100 rounded-xl p-4 text-sm font-bold text-forest focus:ring-2 focus:ring-forest outline-none transition-all shadow-sm"
                                placeholder="About Our Studio"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400 px-1">Biography / About Story</label>
                            <textarea 
                                value={section.content.text || ''}
                                onChange={(e) => updateSectionContent(sectionId, { text: e.target.value })}
                                className="w-full bg-cream-50 border border-cream-100 rounded-xl p-4 text-sm min-h-[300px] text-charcoal-700 leading-relaxed focus:ring-2 focus:ring-forest outline-none transition-all shadow-sm"
                                placeholder="Share the history and passion behind your studio..."
                            />
                        </div>

                        <div className="space-y-4 pt-4 border-t border-cream-100">
                             <div className="flex items-center gap-2 px-1">
                                 <label className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400">Section Button</label>
                             </div>
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                 <input 
                                     type="text"
                                     value={section.content.primaryBtnText || ''}
                                     onChange={(e) => updateSectionContent(sectionId, { primaryBtnText: e.target.value })}
                                     className="w-full bg-cream-50 border border-cream-100 rounded-xl p-4 text-sm font-bold text-charcoal-700 focus:ring-2 focus:ring-forest outline-none transition-all"
                                     placeholder="Label (e.g. Learn More)"
                                 />
                                 <LinkPicker 
                                     value={section.content.primaryBtnLink || ''}
                                     onChange={(val) => updateSectionContent(sectionId, { primaryBtnLink: val })}
                                     config={config}
                                     memberships={memberships}
                                     packages={packages}
                                 />
                             </div>
                        </div>

                        {/* Image Settings for About */}
                        <div className="space-y-4 pt-4 border-t border-cream-100">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400 px-1">Feature Image</label>
                            {section.content.imageUrl ? (
                                <div className="aspect-[4/5] rounded-2xl overflow-hidden relative group bg-zinc-50">
                                    <img src={section.content.imageUrl} className="w-full h-full object-cover" alt="About section preview" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                        <label className="cursor-pointer bg-white text-charcoal-950 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-xl">
                                            {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Replace'}
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="image/*"
                                                disabled={isUploading}
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0]
                                                    if (!file) return
                                                    await uploadImageToField(file, 'about')
                                                }}
                                            />
                                        </label>
                                        <button
                                            onClick={() => updateSectionContent(sectionId, { imageUrl: null })}
                                            className="p-2 bg-white rounded-full text-red-500 shadow-xl"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="aspect-[4/5] rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50 flex flex-col items-center justify-center p-8 text-center gap-4 relative group transition-all hover:bg-zinc-100/50">
                                    <ImageIcon className="w-8 h-8 text-zinc-300" />
                                    <button className="bg-zinc-900 text-white px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest relative flex items-center gap-2">
                                        {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Choose Image'}
                                        <input
                                            type="file"
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            accept="image/*"
                                            disabled={isUploading}
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0]
                                                if (!file) return
                                                await uploadImageToField(file, 'about')
                                            }}
                                        />
                                    </button>
                                    <p className="text-[11px] text-zinc-400">Optional, but recommended for a stronger story section.</p>
                                </div>
                            )}

                             <div className="flex items-center gap-2 px-1">
                                 <Palette className="w-3.5 h-3.5 text-charcoal-400" />
                                 <label className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400">Image Design</label>
                             </div>
                             
                             <div className="space-y-6 bg-white rounded-2xl border border-cream-100 p-6 shadow-sm">
                                 <div className="space-y-3">
                                     <div className="flex items-center justify-between">
                                         <span className="text-[12px] font-bold text-zinc-700">Image Brightness</span>
                                         <span className="text-[11px] font-mono text-zinc-400">{Math.round((section.content.imageBrightness ?? 1) * 100)}%</span>
                                     </div>
                                     <input 
                                         type="range"
                                         min="0"
                                         max="1.5"
                                         step="0.05"
                                         value={section.content.imageBrightness ?? 1}
                                         onChange={(e) => updateSectionContent(sectionId, { imageBrightness: parseFloat(e.target.value) })}
                                         className="w-full h-1.5 bg-zinc-100 rounded-lg appearance-none cursor-pointer accent-forest"
                                     />
                                 </div>
                             </div>
                        </div>
                    </div>
                )}

                {section.type === 'appointments' && (
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400 px-1">Section Title</label>
                            <input
                                type="text"
                                value={section.content.title || ''}
                                onChange={(e) => updateSectionContent(sectionId, { title: e.target.value })}
                                className="w-full bg-cream-50 border border-cream-100 rounded-xl p-4 text-sm font-bold text-forest focus:ring-2 focus:ring-forest outline-none transition-all shadow-sm"
                                placeholder="Start Your Journey"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400 px-1">Section Subtitle</label>
                            <textarea
                                value={section.content.subtitle || ''}
                                onChange={(e) => updateSectionContent(sectionId, { subtitle: e.target.value })}
                                className="w-full bg-cream-50 border border-cream-100 rounded-xl p-4 text-sm min-h-[120px] text-charcoal-700 leading-relaxed focus:ring-2 focus:ring-forest outline-none transition-all shadow-sm"
                                placeholder="Invite visitors to book a class, private session, or intro offer."
                            />
                        </div>

                        <div className="space-y-4 pt-4 border-t border-cream-100">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400 px-1">Section Button</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <input
                                    type="text"
                                    value={section.content.btnText || ''}
                                    onChange={(e) => updateSectionContent(sectionId, { btnText: e.target.value })}
                                    className="w-full bg-cream-50 border border-cream-100 rounded-xl p-4 text-sm font-bold text-charcoal-700 focus:ring-2 focus:ring-forest outline-none transition-all"
                                    placeholder="Label (e.g. Book Now)"
                                />
                                <LinkPicker
                                    value={section.content.btnLink || ''}
                                    onChange={(val) => updateSectionContent(sectionId, { btnLink: val })}
                                    config={config}
                                    memberships={memberships}
                                    packages={packages}
                                />
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-cream-100">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400 px-1">Banner Image</label>
                            {section.content.imageUrl ? (
                                <div className="aspect-video rounded-2xl overflow-hidden relative group bg-zinc-50">
                                    <img src={section.content.imageUrl} className="w-full h-full object-cover" alt="Appointments banner preview" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                        <label className="cursor-pointer bg-white text-charcoal-950 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-xl">
                                            {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Replace'}
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="image/*"
                                                disabled={isUploading}
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0]
                                                    if (!file) return
                                                    await uploadImageToField(file, 'appointments')
                                                }}
                                            />
                                        </label>
                                        <button
                                            onClick={() => updateSectionContent(sectionId, { imageUrl: null })}
                                            className="p-2 bg-white rounded-full text-red-500 shadow-xl"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="aspect-video rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50 flex flex-col items-center justify-center p-8 text-center gap-4 relative group transition-all hover:bg-zinc-100/50">
                                    <ImageIcon className="w-8 h-8 text-zinc-300" />
                                    <button className="bg-zinc-900 text-white px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest relative flex items-center gap-2">
                                        {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Choose Image'}
                                        <input
                                            type="file"
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            accept="image/*"
                                            disabled={isUploading}
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0]
                                                if (!file) return
                                                await uploadImageToField(file, 'appointments')
                                            }}
                                        />
                                    </button>
                                    <p className="text-[11px] text-zinc-400">Optional banner to make the booking section feel alive.</p>
                                </div>
                            )}
                        </div>

                        {section.content.imageUrl && (
                            <div className="space-y-4 pt-4 border-t border-cream-100">
                                <div className="flex items-center gap-2 px-1">
                                    <Palette className="w-3.5 h-3.5 text-charcoal-400" />
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400">Banner Appearance</label>
                                </div>
                                <div className="space-y-6 bg-white rounded-2xl border border-cream-100 p-6 shadow-sm">
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[12px] font-bold text-zinc-700">Overlay Darkness</span>
                                            <span className="text-[11px] font-mono text-zinc-400">{Math.round((section.content.overlayOpacity ?? 0.2) * 100)}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.05"
                                            value={section.content.overlayOpacity ?? 0.2}
                                            onChange={(e) => updateSectionContent(sectionId, { overlayOpacity: parseFloat(e.target.value) })}
                                            className="w-full h-1.5 bg-zinc-100 rounded-lg appearance-none cursor-pointer accent-forest"
                                        />
                                    </div>
                                    <div className="space-y-3 pt-4 border-t border-cream-50">
                                        <span className="text-[12px] font-bold text-zinc-700">Text Color</span>
                                        <LocalColorPicker
                                            value={section.content.textColor || '#ffffff'}
                                            onChange={(val) => updateSectionContent(sectionId, { textColor: val })}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {section.type === 'memberships' && (
                    <>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400 px-1">Section Title</label>
                                <input 
                                    type="text"
                                    value={section.content.title || ''}
                                    onChange={(e) => updateSectionContent(sectionId, { title: e.target.value })}
                                    className="w-full bg-cream-50 border border-cream-100 rounded-xl p-4 text-sm font-bold text-forest focus:ring-2 focus:ring-forest outline-none transition-all shadow-sm"
                                    placeholder="Pricing & Memberships"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400 px-1">Section Subtitle</label>
                                <textarea 
                                    value={section.content.subtitle || ''}
                                    onChange={(e) => updateSectionContent(sectionId, { subtitle: e.target.value })}
                                    className="w-full bg-cream-50 border border-cream-100 rounded-xl p-4 text-sm min-h-[80px] text-charcoal-700 focus:ring-2 focus:ring-forest outline-none transition-all shadow-sm"
                                    placeholder="Choose the perfect plan for your practice..."
                                />
                            </div>
                        </div>
                        <div className="bg-forest/5 p-6 rounded-2xl border border-forest/10 space-y-4 mt-6">
                            <div className="flex items-center gap-3 text-forest">
                                <Check className="w-5 h-5" />
                                <h4 className="text-sm font-bold uppercase tracking-widest">Pricing Plan Sync Active</h4>
                            </div>
                            <p className="text-xs text-charcoal-500 leading-relaxed">
                                This section automatically displays your **Memberships** defined in the <span className="font-bold text-charcoal-900 italic">Pricing Plans</span> module. Only "Public" plans will be shown.
                            </p>
                        </div>
                    </>
                )}

                {section.type === 'packages' && (
                    <>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400 px-1">Section Title</label>
                                <input 
                                    type="text"
                                    value={section.content.title || ''}
                                    onChange={(e) => updateSectionContent(sectionId, { title: e.target.value })}
                                    className="w-full bg-cream-50 border border-cream-100 rounded-xl p-4 text-sm font-bold text-forest focus:ring-2 focus:ring-forest outline-none transition-all shadow-sm"
                                    placeholder="Session Packages"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400 px-1">Section Subtitle</label>
                                <textarea 
                                    value={section.content.subtitle || ''}
                                    onChange={(e) => updateSectionContent(sectionId, { subtitle: e.target.value })}
                                    className="w-full bg-cream-50 border border-cream-100 rounded-xl p-4 text-sm min-h-[80px] text-charcoal-700 focus:ring-2 focus:ring-forest outline-none transition-all shadow-sm"
                                    placeholder="Flexible bundles for every practitioner..."
                                />
                            </div>
                        </div>
                        <div className="bg-forest/5 p-6 rounded-2xl border border-forest/10 space-y-4 mt-6">
                            <div className="flex items-center gap-3 text-forest">
                                <Check className="w-5 h-5" />
                                <h4 className="text-sm font-bold uppercase tracking-widest">Pricing Plan Sync Active</h4>
                            </div>
                            <p className="text-xs text-charcoal-500 leading-relaxed">
                                This section automatically displays your **Packages** defined in the <span className="font-bold text-charcoal-900 italic">Pricing Plans</span> module.
                            </p>
                        </div>
                    </>
                )}

                {section.type === 'cta' && (
                    <>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400 px-1">Main Heading</label>
                                <input 
                                    type="text"
                                    value={section.content.title || ''}
                                    onChange={(e) => updateSectionContent(sectionId, { title: e.target.value })}
                                    className="w-full bg-cream-50 border border-cream-100 rounded-xl p-4 text-sm font-bold text-forest focus:ring-2 focus:ring-forest outline-none transition-all shadow-sm"
                                    placeholder="Ready to Start?"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400 px-1">Subtext</label>
                                <textarea 
                                    value={section.content.subtitle || ''}
                                    onChange={(e) => updateSectionContent(sectionId, { subtitle: e.target.value })}
                                    className="w-full bg-cream-50 border border-cream-100 rounded-xl p-4 text-sm min-h-[100px] text-charcoal-700 focus:ring-2 focus:ring-forest outline-none transition-all shadow-sm"
                                    placeholder="Tell them why they should join..."
                                />
                            </div>
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400 px-1">Primary Button</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <input 
                                            type="text"
                                            value={section.content.primaryBtnText || ''}
                                            onChange={(e) => updateSectionContent(sectionId, { primaryBtnText: e.target.value })}
                                            className="w-full bg-cream-50 border border-cream-100 rounded-xl p-4 text-sm font-bold text-charcoal-700"
                                            placeholder="Label (e.g. Book Now)"
                                        />
                                        <LinkPicker 
                                            value={section.content.primaryBtnLink || ''}
                                            onChange={(val) => updateSectionContent(sectionId, { primaryBtnLink: val })}
                                            config={config}
                                            memberships={memberships}
                                            packages={packages}
                                        />

                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400 px-1">Secondary Button</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <input 
                                            type="text"
                                            value={section.content.secondaryBtnText || ''}
                                            onChange={(e) => updateSectionContent(sectionId, { secondaryBtnText: e.target.value })}
                                            className="w-full bg-cream-50 border border-cream-100 rounded-xl p-4 text-sm font-bold text-charcoal-700"
                                            placeholder="Label (e.g. Our Packages)"
                                        />
                                        <LinkPicker 
                                            value={section.content.secondaryBtnLink || ''}
                                            onChange={(val) => updateSectionContent(sectionId, { secondaryBtnLink: val })}
                                            config={config}
                                            memberships={memberships}
                                            packages={packages}
                                        />

                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-4 pt-4 border-t border-cream-100">
                           <label className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400 px-1">Banner Image</label>
                           {section.content.imageUrl ? (
                               <div className="aspect-video rounded-2xl overflow-hidden relative group">
                                   <img src={section.content.imageUrl} className="w-full h-full object-cover" />
                                   <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                       <button 
                                            onClick={() => updateSectionContent(sectionId, { imageUrl: null })}
                                            className="p-2 bg-white rounded-full text-red-500 shadow-xl"
                                       >
                                           <Trash2 className="w-4 h-4" />
                                       </button>
                                   </div>
                               </div>
                           ) : (
                               <div className="aspect-video rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50 flex flex-col items-center justify-center p-8 text-center gap-4 relative group transition-all hover:bg-zinc-100/50">
                                   <ImageIcon className="w-8 h-8 text-zinc-300" />
                                   <button className="bg-zinc-900 text-white px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest relative">
                                       {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Choose Image'}
                                       <input 
                                            type="file" 
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            disabled={isUploading}
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0]
                                                if (!file) return
                                                setIsUploading(true)
                                                try {
                                                    const normalizedFile = await normalizeImageFile(file, { maxWidth: 1600, quality: 0.85 })
                                                    const sanitizedFile = new File([normalizedFile], sanitizeFileName(normalizedFile.name), { type: normalizedFile.type })
                                                    
                                                    const formData = new FormData()
                                                    formData.append('file', sanitizedFile)
                                                    formData.append('studioId', studioId)
                                                    formData.append('type', 'banners')
                                                    const res = await uploadStudioAsset(formData)
                                                    if (res.success && res.url) {
                                                        updateSectionContent(sectionId, { imageUrl: res.url })
                                                    } else {
                                                        alert(res.error || 'Upload failed')
                                                    }
                                                } catch (err: any) {
                                                    console.error('CTA upload error:', err)
                                                    alert(err.message || 'Normalization failed')
                                                } finally {
                                                    setIsUploading(false)
                                                }
                                            }}
                                       />
                                   </button>
                               </div>
                           )}
                        </div>

                        {/* Design Settings for CTA */}
                        {section.content.imageUrl && (
                            <div className="space-y-4 pt-4 border-t border-cream-100">
                                 <div className="flex items-center gap-2 px-1">
                                     <Palette className="w-3.5 h-3.5 text-charcoal-400" />
                                     <label className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400">Banner Appearance</label>
                                 </div>
                                 
                                 <div className="space-y-6 bg-white rounded-2xl border border-cream-100 p-6 shadow-sm">
                                     <div className="space-y-3">
                                         <div className="flex items-center justify-between">
                                             <span className="text-[12px] font-bold text-zinc-700">Overlay Darkness</span>
                                             <span className="text-[11px] font-mono text-zinc-400">{Math.round((section.content.overlayOpacity ?? 0.6) * 100)}%</span>
                                         </div>
                                         <input 
                                             type="range"
                                             min="0"
                                             max="1"
                                             step="0.05"
                                             value={section.content.overlayOpacity ?? 0.6}
                                             onChange={(e) => updateSectionContent(sectionId, { overlayOpacity: parseFloat(e.target.value) })}
                                             className="w-full h-1.5 bg-zinc-100 rounded-lg appearance-none cursor-pointer accent-forest"
                                         />
                                     </div>

                                     <div className="space-y-3 pt-4 border-t border-cream-50">
                                         <span className="text-[12px] font-bold text-zinc-700">Banner Text Color</span>
                                         <LocalColorPicker 
                                         value={section.content.textColor || '#ffffff'}
                                         onChange={(val) => updateSectionContent(sectionId, { textColor: val })}
                                     />
                                     </div>
                                 </div>
                            </div>
                        )}
                    </>
                )}

                {(section.type === 'events' || section.type === 'classes' || section.type === 'blogs') && (
                    <div className="space-y-6">
                        {!activeSubView ? (
                            <>
                                <div className="p-4 bg-forest/5 rounded-2xl border border-forest/10 mb-4">
                                     <p className="text-[11px] text-forest font-medium leading-relaxed italic">
                                        {section.type === 'blogs' 
                                            ? "Blogs help increase web traffic, connect with communities, and build brand awareness."
                                            : "Highlighting popular items informs customers about what you have to offer as soon as they visit."}
                                     </p>
                                </div>
                                <div className="bg-white rounded-2xl border border-cream-100 overflow-hidden shadow-sm">
                                    <button onClick={() => setActiveSubView('title')} className="w-full flex items-center justify-between p-5 hover:bg-cream-50 transition-all group">
                                        <span className="text-[14px] font-bold text-charcoal-800">Title</span>
                                        <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-charcoal-900 translate-x-0 group-hover:translate-x-1 transition-all" />
                                    </button>
                                    <button onClick={() => setActiveSubView('description')} className="w-full flex items-center justify-between p-5 border-t border-cream-100 hover:bg-cream-50 transition-all group">
                                        <span className="text-[14px] font-bold text-charcoal-800">Description</span>
                                        <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-charcoal-900 translate-x-0 group-hover:translate-x-1 transition-all" />
                                    </button>
                                    <button onClick={() => setActiveSubView('buttons')} className="w-full flex items-center justify-between p-5 border-t border-cream-100 hover:bg-cream-50 transition-all group">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[14px] font-bold text-charcoal-800">Buttons</span>
                                            {section.content.showButtons === false && <EyeOff className="w-3.5 h-3.5 text-zinc-300" />}
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-charcoal-900 translate-x-0 group-hover:translate-x-1 transition-all" />
                                    </button>
                                    <button onClick={() => setActiveSubView(section.type)} className="w-full flex items-center justify-between p-5 border-t border-cream-100 hover:bg-cream-50 transition-all group">
                                        <span className="text-[14px] font-bold text-charcoal-800 capitalize">{section.type === 'classes' ? 'Class' : section.type === 'blogs' ? 'Blog' : 'Events'}</span>
                                        <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-charcoal-900 translate-x-0 group-hover:translate-x-1 transition-all" />
                                    </button>
                                    <button onClick={() => setActiveSubView('service-layout')} className="w-full flex items-center justify-between p-5 border-t border-cream-100 hover:bg-cream-50 transition-all group">
                                        <span className="text-[14px] font-bold text-charcoal-800">Service Layout</span>
                                        <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-charcoal-900 translate-x-0 group-hover:translate-x-1 transition-all" />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                {activeSubView === 'title' && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400 px-1">Section Title</label>
                                        <input 
                                            type="text"
                                            value={section.content.title || ''}
                                            onChange={(e) => updateSectionContent(sectionId, { title: e.target.value })}
                                            className="w-full bg-cream-50 border border-cream-100 rounded-xl p-4 text-sm font-bold text-forest focus:ring-2 focus:ring-forest outline-none transition-all"
                                            placeholder={`Featured ${section.type}`}
                                        />
                                    </div>
                                )}
                                {activeSubView === 'description' && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400 px-1">Section Description</label>
                                        <textarea 
                                            value={section.content.description || ''}
                                            onChange={(e) => updateSectionContent(sectionId, { description: e.target.value })}
                                            className="w-full bg-cream-50 border border-cream-100 rounded-xl p-4 text-sm min-h-[120px] text-charcoal-700 leading-relaxed focus:ring-2 focus:ring-forest outline-none transition-all"
                                            placeholder={`Tell your customers more about your ${section.type}...`}
                                        />
                                    </div>
                                )}
                                {activeSubView === 'buttons' && (
                                    <div className="space-y-6">
                                        <div 
                                            onClick={() => updateSectionContent(sectionId, { showButtons: section.content.showButtons === false ? true : false })}
                                            className="flex items-center justify-between p-5 bg-white rounded-2xl border border-cream-100 cursor-pointer hover:bg-cream-50 transition-all shadow-sm"
                                        >
                                            <div className="flex items-center gap-3">
                                                {section.content.showButtons === false ? <EyeOff className="w-4 h-4 text-zinc-400" /> : <Eye className="w-4 h-4 text-forest" />}
                                                <span className="text-[14px] font-bold text-charcoal-800">Show Section Button</span>
                                            </div>
                                            <div className={`w-10 h-6 rounded-full transition-all relative ${section.content.showButtons !== false ? 'bg-forest' : 'bg-zinc-200'}`}>
                                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${section.content.showButtons !== false ? 'left-5' : 'left-1'}`} />
                                            </div>
                                        </div>
                                        
                                        {section.content.showButtons !== false && (
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400 px-1">Button text</label>
                                                <input 
                                                    type="text"
                                                    value={section.content.btnText || ''}
                                                    onChange={(e) => updateSectionContent(sectionId, { btnText: e.target.value })}
                                                    className="w-full bg-cream-50 border border-cream-100 rounded-xl p-4 text-sm font-bold text-forest focus:ring-2 focus:ring-forest outline-none transition-all"
                                                    placeholder="View all"
                                                />
                                                <LinkPicker 
                                                    value={section.content.btnLink || ''}
                                                    onChange={(val) => updateSectionContent(sectionId, { btnLink: val })}
                                                    config={config}
                                                    memberships={memberships}
                                                    packages={packages}
                                                />
                                            </div>

                                        )}
                                    </div>
                                )}
                                {activeSubView === 'service-layout' && (
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400 px-1">Layout Style</label>
                                        <div className="grid grid-cols-1 gap-3">
                                            {['grid', 'list', 'minimal'].map(layout => (
                                                <button 
                                                    key={layout}
                                                    onClick={() => updateSectionContent(sectionId, { layout })}
                                                    className={clsx(
                                                        "flex items-center justify-between p-5 rounded-2xl border-2 transition-all text-left group",
                                                        (section.content.layout || 'grid') === layout 
                                                            ? "border-forest bg-forest/5 text-forest" 
                                                            : "border-cream-100 bg-white text-zinc-400 hover:border-zinc-200"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <Layout className="w-5 h-5 opacity-40" />
                                                        <span className="text-[14px] font-bold capitalize">{layout}</span>
                                                    </div>
                                                    {(section.content.layout || 'grid') === layout && <Check className="w-4 h-4" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {(activeSubView === 'classes' || activeSubView === 'events' || activeSubView === 'blogs') && (
                                    <div className="space-y-6">
                                        {selectedItemIndex === null ? (
                                            <>
                                                <div className="flex items-center justify-between px-1">
                                                    <label className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400">Pinned {activeSubView}</label>
                                                    <span className="text-[10px] font-bold text-forest bg-forest/5 px-2 py-1 rounded">{(section.content.items || []).length} / 6 pinned</span>
                                                </div>
                                                
                                                <div className="space-y-2">
                                                    {(section.content.items || []).map((item: any, idx: number) => (
                                                        <button 
                                                            key={idx}
                                                            onClick={() => setSelectedItemIndex(idx)}
                                                            className="w-full flex items-center justify-between p-4 bg-white border border-cream-100 rounded-xl hover:bg-cream-50 transition-all group shadow-sm"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-lg bg-cream-50 overflow-hidden border border-cream-100">
                                                                    {item.image ? <img src={item.image} className="w-full h-full object-cover" /> : <ImageIcon className="w-4 h-4 m-2 text-zinc-300" />}
                                                                </div>
                                                                <div className="text-left">
                                                                    <p className="text-[13px] font-bold text-charcoal-800 line-clamp-1">{item.name || item.title || `Unnamed ${section.type.slice(0, -1)}`}</p>
                                                                    <p className="text-[10px] text-zinc-400 font-medium">{item.level || item.category || item.date || 'No details'}</p>
                                                                </div>
                                                            </div>
                                                            <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-charcoal-900" />
                                                        </button>
                                                    ))}

                                                    <button 
                                                        onClick={() => {
                                                            const newItems = [...(section.content.items || []), { id: Date.now().toString() }]
                                                            updateSectionContent(sectionId, { items: newItems })
                                                            setSelectedItemIndex(newItems.length - 1)
                                                        }}
                                                        className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-cream-100 rounded-xl text-zinc-400 hover:border-forest/20 hover:text-forest transition-all hover:bg-forest/5"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                        <span className="text-[11px] font-black uppercase tracking-widest">Add {activeSubView.slice(0, -1)}</span>
                                                    </button>
                                                </div>

                                                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex gap-3">
                                                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                                                    <p className="text-[11px] text-amber-700 leading-relaxed font-medium capitalize">
                                                        Manual pinning is enabled. These items will appear on your home page regardless of your {section.type} dashboard.
                                                    </p>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                                {/* Editing individual item */}
                                                <div className="space-y-4">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400 px-1">Item Image</label>
                                                        <div className="aspect-video rounded-xl bg-cream-50 border border-cream-100 overflow-hidden relative group">
                                                            {section.content.items[selectedItemIndex].image ? (
                                                                <>
                                                                    <img src={section.content.items[selectedItemIndex].image} className="w-full h-full object-cover" />
                                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                        <label className="cursor-pointer bg-white text-charcoal-950 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest">
                                                                            Change
                                                                            <input 
                                                                                type="file" className="hidden" accept="image/*"
                                                                                onChange={async (e) => {
                                                                                    const file = e.target.files?.[0]
                                                                                    if (!file) return
                                                                                    setIsUploading(true)
                                                                                    try {
                                                                                        const normalized = await normalizeImageFile(file, { maxWidth: 1200, quality: 0.8 })
                                                                                        const sanitizedFile = new File([normalized], sanitizeFileName(normalized.name), { type: normalized.type })
                                                                                        
                                                                                        const formData = new FormData()
                                                                                        formData.append('file', sanitizedFile); formData.append('studioId', studioId); formData.append('type', section.type)
                                                                                        const res = await uploadStudioAsset(formData)
                                                                                        if (res.success && res.url) {
                                                                                            const newItems = [...section.content.items]
                                                                                            newItems[selectedItemIndex] = { ...newItems[selectedItemIndex], image: res.url }
                                                                                            updateSectionContent(sectionId, { items: newItems })
                                                                                        } else {
                                                                                            alert(res.error || 'Upload failed')
                                                                                        }
                                                                                    } catch (err: any) {
                                                                                        console.error('Item upload error:', err)
                                                                                        alert(err.message || 'Normalization failed')
                                                                                    } finally { setIsUploading(false) }
                                                                                }}
                                                                            />
                                                                        </label>
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-8 text-center cursor-pointer hover:bg-cream-100 transition-all relative">
                                                                    <ImageIcon className="w-8 h-8 text-zinc-300" />
                                                                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Upload Image</span>
                                                                    <input 
                                                                        type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*"
                                                                        onChange={async (e) => {
                                                                            const file = e.target.files?.[0]
                                                                            if (!file) return
                                                                            setIsUploading(true)
                                                                            try {
                                                                                const normalized = await normalizeImageFile(file, { maxWidth: 1200, quality: 0.8 })
                                                                                const sanitizedFile = new File([normalized], sanitizeFileName(normalized.name), { type: normalized.type })
                                                                                
                                                                                const formData = new FormData()
                                                                                formData.append('file', sanitizedFile); formData.append('studioId', studioId); formData.append('type', section.type)
                                                                                const res = await uploadStudioAsset(formData)
                                                                                if (res.success && res.url) {
                                                                                    const newItems = [...section.content.items]
                                                                                    newItems[selectedItemIndex] = { ...newItems[selectedItemIndex], image: res.url }
                                                                                    updateSectionContent(sectionId, { items: newItems })
                                                                                } else {
                                                                                    alert(res.error || 'Upload failed')
                                                                                }
                                                                            } catch (err: any) {
                                                                                console.error('Item upload error:', err)
                                                                                alert(err.message || 'Normalization failed')
                                                                            } finally { setIsUploading(false) }
                                                                        }}
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="space-y-4">
                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400 px-1">Name / Title</label>
                                                            <input 
                                                                type="text"
                                                                value={section.content.items[selectedItemIndex].name || section.content.items[selectedItemIndex].title || ''}
                                                                onChange={(e) => {
                                                                    const newItems = [...section.content.items]
                                                                    if (activeSubView === 'blogs') newItems[selectedItemIndex].title = e.target.value
                                                                    else newItems[selectedItemIndex].name = e.target.value
                                                                    updateSectionContent(sectionId, { items: newItems })
                                                                }}
                                                                className="w-full bg-cream-50 border border-cream-100 rounded-xl p-4 text-sm font-bold text-charcoal-900 focus:ring-2 focus:ring-forest outline-none transition-all"
                                                                placeholder={`${activeSubView.slice(0, -1)} Name`}
                                                            />
                                                        </div>

                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400 px-1">
                                                                {activeSubView === 'classes' ? 'Difficulty Level' : activeSubView === 'blogs' ? 'Category' : 'Date'}
                                                            </label>
                                                            <input 
                                                                type="text"
                                                                value={section.content.items[selectedItemIndex].level || section.content.items[selectedItemIndex].category || section.content.items[selectedItemIndex].date || ''}
                                                                onChange={(e) => {
                                                                    const newItems = [...section.content.items]
                                                                    if (activeSubView === 'classes') newItems[selectedItemIndex].level = e.target.value
                                                                    else if (activeSubView === 'blogs') newItems[selectedItemIndex].category = e.target.value
                                                                    else newItems[selectedItemIndex].date = e.target.value
                                                                    updateSectionContent(sectionId, { items: newItems })
                                                                }}
                                                                className="w-full bg-cream-50 border border-cream-100 rounded-xl p-4 text-sm font-bold text-charcoal-900 focus:ring-2 focus:ring-forest outline-none transition-all"
                                                                placeholder={activeSubView === 'classes' ? 'e.g. Intermediate' : activeSubView === 'blogs' ? 'e.g. Wellness' : 'e.g. Oct 24'}
                                                            />
                                                        </div>

                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400 px-1">
                                                                {activeSubView === 'events' ? 'Location' : 'Duration / Subtitle'}
                                                            </label>
                                                            <input 
                                                                type="text"
                                                                value={section.content.items[selectedItemIndex].duration || section.content.items[selectedItemIndex].location || ''}
                                                                onChange={(e) => {
                                                                    const newItems = [...section.content.items]
                                                                    if (activeSubView === 'events') newItems[selectedItemIndex].location = e.target.value
                                                                    else newItems[selectedItemIndex].duration = e.target.value
                                                                    updateSectionContent(sectionId, { items: newItems })
                                                                }}
                                                                className="w-full bg-cream-50 border border-cream-100 rounded-xl p-4 text-sm font-bold text-charcoal-900 focus:ring-2 focus:ring-forest outline-none transition-all"
                                                                placeholder={activeSubView === 'events' ? 'e.g. Main Studio' : 'e.g. 55 mins'}
                                                            />
                                                        </div>
                                                    </div>

                                                    <button 
                                                        onClick={() => {
                                                            const newItems = section.content.items.filter((_: any, i: number) => i !== selectedItemIndex)
                                                            updateSectionContent(sectionId, { items: newItems })
                                                            setSelectedItemIndex(null)
                                                        }}
                                                        className="w-full flex items-center justify-center gap-2 p-4 text-red-500 font-black uppercase tracking-widest text-[10px] hover:bg-red-50 rounded-xl transition-all"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                        Remove {section.type.slice(0, -1)}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {section.type === 'locations' && (
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400 px-1">Section Headline</label>
                            <input
                                type="text"
                                value={section.content.title || ''}
                                onChange={(e) => updateSectionContent(sectionId, { title: e.target.value })}
                                className="w-full bg-cream-50 border border-cream-100 rounded-xl p-4 text-sm font-bold text-forest focus:ring-2 focus:ring-forest outline-none transition-all shadow-sm"
                                placeholder="Our Flagship Studio Sanctuary."
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400 px-1">Section Note</label>
                            <textarea
                                value={section.content.subtitle || ''}
                                onChange={(e) => updateSectionContent(sectionId, { subtitle: e.target.value })}
                                className="w-full bg-cream-50 border border-cream-100 rounded-xl p-4 text-sm min-h-[100px] text-charcoal-700 leading-relaxed focus:ring-2 focus:ring-forest outline-none transition-all shadow-sm"
                                placeholder="Tap below to find your way to our serene practice space."
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400 px-1">Studio Address</label>
                            <textarea 
                                value={section.content.address || ''}
                                onChange={(e) => updateSectionContent(sectionId, { address: e.target.value })}
                                className="w-full bg-cream-50 border border-cream-100 rounded-xl p-4 text-sm min-h-[100px] text-charcoal-700 leading-relaxed focus:ring-2 focus:ring-forest outline-none transition-all shadow-sm"
                                placeholder="Full studio address..."
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400 px-1">Google Maps Link</label>
                            <input 
                                type="text"
                                value={section.content.mapUrl || ''}
                                onChange={(e) => updateSectionContent(sectionId, { mapUrl: e.target.value })}
                                className="w-full bg-cream-50 border border-cream-100 rounded-xl p-4 text-sm font-bold text-forest focus:ring-2 focus:ring-forest outline-none transition-all shadow-sm"
                                placeholder="https://maps.google.com/..."
                            />
                            <p className="text-[11px] text-charcoal-400 px-1 italic">This link will open in a new tab when clicked.</p>
                        </div>
                        <div className="space-y-4 pt-4 border-t border-cream-100">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400 px-1">Map Button</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <input
                                    type="text"
                                    value={section.content.btnText || ''}
                                    onChange={(e) => updateSectionContent(sectionId, { btnText: e.target.value })}
                                    className="w-full bg-cream-50 border border-cream-100 rounded-xl p-4 text-sm font-bold text-charcoal-700 focus:ring-2 focus:ring-forest outline-none transition-all"
                                    placeholder="Open in Maps"
                                />
                                <LinkPicker
                                    value={section.content.btnLink || section.content.mapUrl || ''}
                                    onChange={(val) => updateSectionContent(sectionId, { btnLink: val })}
                                    config={config}
                                    memberships={memberships}
                                    packages={packages}
                                />
                            </div>
                        </div>
                        <div className="space-y-4 pt-4 border-t border-cream-100">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400 px-1">Feature Image</label>
                            {section.content.imageUrl ? (
                                <div className="aspect-video rounded-2xl overflow-hidden relative group bg-zinc-50">
                                    <img src={section.content.imageUrl} className="w-full h-full object-cover" alt="Location section preview" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                        <label className="cursor-pointer bg-white text-charcoal-950 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-xl">
                                            {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Replace'}
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="image/*"
                                                disabled={isUploading}
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0]
                                                    if (!file) return
                                                    await uploadImageToField(file, 'locations')
                                                }}
                                            />
                                        </label>
                                        <button
                                            onClick={() => updateSectionContent(sectionId, { imageUrl: null })}
                                            className="p-2 bg-white rounded-full text-red-500 shadow-xl"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="aspect-video rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50 flex flex-col items-center justify-center p-8 text-center gap-4 relative group transition-all hover:bg-zinc-100/50">
                                    <ImageIcon className="w-8 h-8 text-zinc-300" />
                                    <button className="bg-zinc-900 text-white px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest relative flex items-center gap-2">
                                        {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Choose Image'}
                                        <input
                                            type="file"
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            accept="image/*"
                                            disabled={isUploading}
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0]
                                                if (!file) return
                                                await uploadImageToField(file, 'locations')
                                            }}
                                        />
                                    </button>
                                    <p className="text-[11px] text-zinc-400">Optional image for the map side of the section.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                
                {section.type === 'contact' && (
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400 px-1">Contact Title</label>
                                <input 
                                    type="text"
                                    value={section.content.title || ''}
                                    onChange={(e) => updateSectionContent(sectionId, { title: e.target.value })}
                                    className="w-full bg-cream-50 border border-cream-100 rounded-xl p-4 text-sm font-bold text-forest focus:ring-2 focus:ring-forest outline-none transition-all shadow-sm"
                                    placeholder="Get in touch"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400 px-1">Email Address</label>
                                    <input 
                                        type="email"
                                        value={section.content.email || ''}
                                        onChange={(e) => updateSectionContent(sectionId, { email: e.target.value })}
                                        className="w-full bg-cream-50 border border-cream-100 rounded-xl p-4 text-sm font-bold text-forest outline-none"
                                        placeholder="hello@studio.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400 px-1">Phone Number</label>
                                    <input 
                                        type="text"
                                        value={section.content.phone || ''}
                                        onChange={(e) => updateSectionContent(sectionId, { phone: e.target.value })}
                                        className="w-full bg-cream-50 border border-cream-100 rounded-xl p-4 text-sm font-bold text-forest outline-none"
                                        placeholder="+63 917..."
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400 px-1">WhatsApp / Messenger</label>
                                <input 
                                    type="text"
                                    value={section.content.messengerUrl || ''}
                                    onChange={(e) => updateSectionContent(sectionId, { messengerUrl: e.target.value })}
                                    className="w-full bg-cream-50 border border-cream-100 rounded-xl p-4 text-sm font-bold text-forest outline-none"
                                    placeholder="Link to your chat..."
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400 px-1">Business Hours</label>
                                <textarea 
                                    value={section.content.hours || ''}
                                    onChange={(e) => updateSectionContent(sectionId, { hours: e.target.value })}
                                    className="w-full bg-cream-50 border border-cream-100 rounded-xl p-4 text-sm min-h-[80px] text-charcoal-700 outline-none"
                                    placeholder="Monday - Friday: 8am - 8pm..."
                                />
                            </div>
                        </div>
                    </div>
                )}

                {section.type === 'gallery' && (
                    <div className="space-y-6">
                        <div className="space-y-4 pt-4 border-t border-cream-100">
                             <label className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400 px-1">Gallery Layout</label>
                             <div className="grid grid-cols-2 gap-2">
                                 {['grid', 'slideshow'].map((layout) => (
                                     <button
                                        key={layout}
                                        onClick={() => updateSectionContent(sectionId, { layout })}
                                        className={clsx(
                                            "px-4 py-3 rounded-xl border-2 text-[11px] font-bold uppercase tracking-widest transition-all",
                                            (section.content.layout || 'grid') === layout 
                                                ? "bg-forest border-forest text-white" 
                                                : "bg-white border-zinc-100 text-zinc-400 hover:border-zinc-200"
                                        )}
                                     >
                                         {layout}
                                     </button>
                                 ))}
                             </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-cream-100">
                             <div className="flex items-center justify-between">
                                 <label className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400 px-1">Studio Photos</label>
                                 <span className="text-[10px] font-bold text-charcoal-400">{section.content.images?.length || 0}/8</span>
                             </div>
                             
                             <div className="grid grid-cols-4 gap-2">
                                {section.content.images?.map((img: string, idx: number) => (
                                    <div key={idx} className="aspect-square rounded-xl overflow-hidden relative group border border-zinc-100">
                                        <img src={img} className="w-full h-full object-cover" />
                                        <button 
                                            onClick={() => {
                                                const newImages = section.content.images.filter((_: any, i: number) => i !== idx)
                                                updateSectionContent(sectionId, { images: newImages })
                                            }}
                                            className="absolute top-1 right-1 p-1 bg-white/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                        >
                                            <Trash2 className="w-3 h-3 text-red-500" />
                                        </button>
                                    </div>
                                ))}
                                {(!section.content.images || section.content.images.length < 8) && (
                                    <div className="aspect-square rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50 flex items-center justify-center relative hover:bg-zinc-100 transition-colors">
                                        {isUploading ? <Loader2 className="w-4 h-4 animate-spin text-zinc-300" /> : <Plus className="w-4 h-4 text-zinc-300" />}
                                        <input 
                                            type="file"
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            accept="image/*"
                                            disabled={isUploading}
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0]
                                                if (!file) return
                                                setIsUploading(true)
                                                try {
                                                    const normalizedFile = await normalizeImageFile(file, { maxWidth: 1600, quality: 0.85 })
                                                    const sanitizedFile = new File([normalizedFile], sanitizeFileName(normalizedFile.name), { type: normalizedFile.type })
                                                    
                                                    const formData = new FormData()
                                                    formData.append('file', sanitizedFile)
                                                    formData.append('studioId', studioId)
                                                    formData.append('type', 'gallery')
                                                    const res = await uploadStudioAsset(formData)
                                                    if (res.success && res.url) {
                                                        const current = section.content.images || []
                                                        updateSectionContent(sectionId, { images: [...current, res.url] })
                                                    } else {
                                                        alert(res.error || 'Upload failed')
                                                    }
                                                } catch (err: any) {
                                                    console.error('Gallery upload error:', err)
                                                    alert(err.message || 'Normalization failed')
                                                } finally {
                                                    setIsUploading(false)
                                                }
                                            }}
                                        />
                                    </div>
                                )}
                             </div>
                        </div>
                    </div>
                )}

                {section.type === 'reviews' && (
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400 px-1">Review Source</label>
                            <div className="grid grid-cols-3 gap-2">
                                {['database', 'manual', 'hybrid'].map(src => (
                                    <button 
                                        key={src}
                                        onClick={() => updateSectionContent(sectionId, { source: src })}
                                        className={clsx(
                                            "py-3 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest transition-all",
                                            (section.content.source || 'database') === src 
                                                ? "border-forest bg-forest text-white" 
                                                : "border-zinc-100 text-zinc-400 hover:border-zinc-200 bg-white"
                                        )}
                                    >
                                        {src}
                                    </button>
                                ))}
                            </div>
                            <p className="text-[10px] text-zinc-400 italic px-1">
                                {section.content.source === 'database' ? 'Fetching real reviews from your studio profile.' : 
                                 section.content.source === 'manual' ? 'Displaying only the testimonials added below.' : 
                                 'Combining your real studio reviews with manual highlights.'}
                            </p>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-cream-100">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400 px-1">Customer Testimonials</label>
                            
                            <div className="space-y-4">
                                {(section.content.reviews || []).map((review: any, idx: number) => (
                                    <div key={idx} className="bg-white border border-cream-100 rounded-2xl p-6 shadow-sm space-y-4 relative group">
                                        <button 
                                            onClick={() => {
                                                const newReviews = section.content.reviews.filter((_: any, i: number) => i !== idx)
                                                updateSectionContent(sectionId, { reviews: newReviews })
                                            }}
                                            className="absolute top-4 right-4 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        
                                        <div className="flex gap-4">
                                            <div className="w-12 h-12 bg-zinc-100 rounded-full shrink-0 overflow-hidden relative border border-zinc-100">
                                                {review.avatar ? (
                                                    <img src={review.avatar} className="w-full h-full object-cover" />
                                                ) : (
                                                    <ImageIcon className="w-5 h-5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-zinc-300" />
                                                )}
                                                <input 
                                                    type="file"
                                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                                    onChange={async (e) => {
                                                        const file = e.target.files?.[0]
                                                        if (!file) return
                                                        setIsUploading(true)
                                                        try {
                                                            const normalizedFile = await normalizeImageFile(file, { maxWidth: 400, quality: 0.85 })
                                                            const sanitizedFile = new File([normalizedFile], sanitizeFileName(normalizedFile.name), { type: normalizedFile.type })
                                                            
                                                            const formData = new FormData()
                                                            formData.append('file', sanitizedFile)
                                                            formData.append('studioId', studioId)
                                                            formData.append('type', 'avatars')
                                                            const res = await uploadStudioAsset(formData)
                                                            if (res.success && res.url) {
                                                                const newReviews = [...section.content.reviews]
                                                                newReviews[idx].avatar = res.url
                                                                updateSectionContent(sectionId, { reviews: newReviews })
                                                            } else {
                                                                alert(res.error || 'Avatar upload failed')
                                                            }
                                                        } catch (err: any) {
                                                            console.error('Avatar upload error:', err)
                                                            alert(err.message || 'Normalization failed')
                                                        } finally {
                                                            setIsUploading(false)
                                                        }
                                                    }}
                                                />
                                            </div>
                                            <div className="flex-1 space-y-2">
                                                <input 
                                                    type="text"
                                                    value={review.name || ''}
                                                    onChange={(e) => {
                                                        const newReviews = [...section.content.reviews]
                                                        newReviews[idx].name = e.target.value
                                                        updateSectionContent(sectionId, { reviews: newReviews })
                                                    }}
                                                    className="w-full bg-cream-50 border-none rounded-lg p-3 text-[12px] font-bold text-charcoal-900 outline-none"
                                                    placeholder="Customer Name"
                                                />
                                                <textarea 
                                                    value={review.text || ''}
                                                    onChange={(e) => {
                                                        const newReviews = [...section.content.reviews]
                                                        newReviews[idx].text = e.target.value
                                                        updateSectionContent(sectionId, { reviews: newReviews })
                                                    }}
                                                    className="w-full bg-cream-50 border-none rounded-lg p-3 text-[12px] text-charcoal-600 min-h-[80px] outline-none"
                                                    placeholder="The most amazing studio experience..."
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <button 
                                    onClick={() => {
                                        const current = section.content.reviews || []
                                        updateSectionContent(sectionId, { 
                                            reviews: [...current, { name: '', text: '', avatar: '' }] 
                                        })
                                    }}
                                    className="w-full py-4 border-2 border-dashed border-zinc-200 rounded-2xl flex items-center justify-center gap-2 text-zinc-400 hover:bg-zinc-50 hover:border-zinc-300 transition-all text-[11px] font-black uppercase tracking-widest"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Review
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {section.type === 'faq' && (
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400 px-1">Section Title</label>
                                <input 
                                    type="text"
                                    value={section.content.title || ''}
                                    onChange={(e) => updateSectionContent(sectionId, { title: e.target.value })}
                                    className="w-full bg-cream-50 border border-cream-100 rounded-xl p-4 text-sm font-bold text-forest transition-all"
                                    placeholder="Common Questions"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400 px-1">Subtitle</label>
                                <textarea 
                                    value={section.content.subtitle || ''}
                                    onChange={(e) => updateSectionContent(sectionId, { subtitle: e.target.value })}
                                    className="w-full bg-cream-50 border border-cream-100 rounded-xl p-4 text-sm min-h-[80px] text-charcoal-600 leading-relaxed"
                                    placeholder="Everything you need to know..."
                                />
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-cream-100">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400 px-1">Support Callout</label>
                            <div className="space-y-2">
                                <input
                                    type="text"
                                    value={section.content.supportTitle || ''}
                                    onChange={(e) => updateSectionContent(sectionId, { supportTitle: e.target.value })}
                                    className="w-full bg-cream-50 border border-cream-100 rounded-xl p-4 text-sm font-bold text-forest transition-all"
                                    placeholder="Still have questions?"
                                />
                                <textarea
                                    value={section.content.supportSubtitle || ''}
                                    onChange={(e) => updateSectionContent(sectionId, { supportSubtitle: e.target.value })}
                                    className="w-full bg-cream-50 border border-cream-100 rounded-xl p-4 text-sm min-h-[80px] text-charcoal-600 leading-relaxed"
                                    placeholder="We’re here to help your clients start with confidence."
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <input
                                    type="text"
                                    value={section.content.supportBtnText || ''}
                                    onChange={(e) => updateSectionContent(sectionId, { supportBtnText: e.target.value })}
                                    className="w-full bg-cream-50 border border-cream-100 rounded-xl p-4 text-sm font-bold text-charcoal-700 focus:ring-2 focus:ring-forest outline-none transition-all"
                                    placeholder="Contact Support"
                                />
                                <LinkPicker
                                    value={section.content.supportBtnLink || ''}
                                    onChange={(val) => updateSectionContent(sectionId, { supportBtnLink: val })}
                                    config={config}
                                    memberships={memberships}
                                    packages={packages}
                                />
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-cream-100">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400 px-1">Questions & Answers</label>
                            <div className="space-y-3">
                                {(section.content.faqs || []).map((faq: any, idx: number) => (
                                    <div key={idx} className="bg-white border border-cream-100 rounded-2xl p-6 shadow-sm space-y-4 group relative">
                                        <button 
                                            onClick={() => {
                                                const newFaqs = section.content.faqs.filter((_: any, i: number) => i !== idx)
                                                updateSectionContent(sectionId, { faqs: newFaqs })
                                            }}
                                            className="absolute top-4 right-4 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        <div className="space-y-4">
                                            <input 
                                                type="text"
                                                value={faq.question || ''}
                                                onChange={(e) => {
                                                    const newFaqs = [...section.content.faqs]
                                                    newFaqs[idx].question = e.target.value
                                                    updateSectionContent(sectionId, { faqs: newFaqs })
                                                }}
                                                className="w-full bg-cream-50 border-none rounded-lg p-3 text-[13px] font-bold text-charcoal-900 outline-none"
                                                placeholder="Question"
                                            />
                                            <textarea 
                                                value={faq.answer || ''}
                                                onChange={(e) => {
                                                    const newFaqs = [...section.content.faqs]
                                                    newFaqs[idx].answer = e.target.value
                                                    updateSectionContent(sectionId, { faqs: newFaqs })
                                                }}
                                                className="w-full bg-cream-50 border-none rounded-lg p-3 text-[12px] text-charcoal-600 min-h-[100px] outline-none leading-relaxed"
                                                placeholder="Answer..."
                                            />
                                        </div>
                                    </div>
                                ))}
                                <button 
                                    onClick={() => {
                                        const current = section.content.faqs || []
                                        updateSectionContent(sectionId, { 
                                            faqs: [...current, { question: '', answer: '' }] 
                                        })
                                    }}
                                    className="w-full py-4 border-2 border-dashed border-zinc-200 rounded-2xl flex items-center justify-center gap-2 text-zinc-400 hover:bg-zinc-50 hover:border-zinc-300 transition-all text-[11px] font-black uppercase tracking-widest"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Question
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {section.type === 'timetable' && (
                    <div className="space-y-6">
                        <div className="bg-emerald-50/50 p-6 rounded-[2rem] border border-emerald-100 space-y-4">
                            <div className="flex items-center gap-3 text-emerald-600">
                                <Check className="w-6 h-6" />
                                <h4 className="text-sm font-black uppercase tracking-widest">Real-time Schedule Sync</h4>
                            </div>
                            <p className="text-[12px] text-emerald-800/70 leading-relaxed italic">
                                This section is automatically populated from your **Class Timetable**. No manual editing required.
                            </p>
                        </div>
                        <div className="space-y-4 p-1">
                            <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Preview Tip</p>
                            <p className="text-[12px] text-zinc-500 leading-relaxed font-serif italic">
                                The timetable in the preview uses default styles. Site visitors will see your real-time availability.
                            </p>
                        </div>
                    </div>
                )}

                {section.type === 'instructors' && (
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400 px-1">Section Title</label>
                                <input 
                                    type="text"
                                    value={section.content.title || ''}
                                    onChange={(e) => updateSectionContent(sectionId, { title: e.target.value })}
                                    className="w-full bg-cream-50 border border-cream-100 rounded-xl p-4 text-sm font-bold text-forest transition-all"
                                    placeholder="Our Expert Instructors"
                                />
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-cream-100">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400 px-1">Instructor Profiles</label>
                            <div className="space-y-3">
                                {(section.content.items || []).map((inst: any, idx: number) => (
                                    <div key={idx} className="bg-white border border-cream-100 rounded-2xl p-6 shadow-sm space-y-4 group relative">
                                        <button 
                                            onClick={() => {
                                                const newItems = section.content.items.filter((_: any, i: number) => i !== idx)
                                                updateSectionContent(sectionId, { items: newItems })
                                            }}
                                            className="absolute top-4 right-4 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all z-10"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        
                                        <div className="flex gap-4">
                                            <div className="w-20 h-24 bg-zinc-100 rounded-xl shrink-0 overflow-hidden relative border border-zinc-100">
                                                {inst.image ? (
                                                    <img src={inst.image} className="w-full h-full object-cover" />
                                                ) : (
                                                    <ImageIcon className="w-6 h-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-zinc-300" />
                                                )}
                                                <input 
                                                    type="file"
                                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                                    onChange={async (e) => {
                                                        const file = e.target.files?.[0]
                                                        if (!file) return
                                                        setIsUploading(true)
                                                        try {
                                                            const normalized = await normalizeImageFile(file, { maxWidth: 600, quality: 0.85 })
                                                            const formData = new FormData()
                                                            formData.append('file', normalized); formData.append('studioId', studioId); formData.append('type', 'instructors')
                                                            const res = await uploadStudioAsset(formData)
                                                            if (res.success && res.url) {
                                                                const newItems = [...section.content.items]
                                                                newItems[idx].image = res.url
                                                                updateSectionContent(sectionId, { items: newItems })
                                                            }
                                                        } finally { setIsUploading(false) }
                                                    }}
                                                />
                                            </div>
                                            <div className="flex-1 space-y-2">
                                                <input 
                                                    type="text"
                                                    value={inst.name || ''}
                                                    onChange={(e) => {
                                                        const newItems = [...section.content.items]
                                                        newItems[idx].name = e.target.value
                                                        updateSectionContent(sectionId, { items: newItems })
                                                    }}
                                                    className="w-full bg-cream-50 border-none rounded-lg p-3 text-[13px] font-bold text-charcoal-900 outline-none"
                                                    placeholder="Full Name"
                                                />
                                                <input 
                                                    type="text"
                                                    value={inst.specialty || ''}
                                                    onChange={(e) => {
                                                        const newItems = [...section.content.items]
                                                        newItems[idx].specialty = e.target.value
                                                        updateSectionContent(sectionId, { items: newItems })
                                                    }}
                                                    className="w-full bg-cream-50 border-none rounded-lg p-3 text-[11px] font-bold text-forest outline-none uppercase tracking-widest"
                                                    placeholder="Specialty (e.g. Reformer)"
                                                />
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="relative">
                                                        <Instagram className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                                                        <input 
                                                            type="text"
                                                            value={inst.instagram || ''}
                                                            onChange={(e) => {
                                                                const newItems = [...section.content.items]
                                                                newItems[idx].instagram = e.target.value
                                                                updateSectionContent(sectionId, { items: newItems })
                                                            }}
                                                            className="w-full bg-cream-50 border-none rounded-lg py-2.5 pl-9 pr-3 text-[11px] font-medium text-charcoal-700 outline-none"
                                                            placeholder="Instagram Link"
                                                        />
                                                    </div>
                                                    <div className="relative">
                                                        <Linkedin className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                                                        <input 
                                                            type="text"
                                                            value={inst.linkedin || ''}
                                                            onChange={(e) => {
                                                                const newItems = [...section.content.items]
                                                                newItems[idx].linkedin = e.target.value
                                                                updateSectionContent(sectionId, { items: newItems })
                                                            }}
                                                            className="w-full bg-cream-50 border-none rounded-lg py-2.5 pl-9 pr-3 text-[11px] font-medium text-charcoal-700 outline-none"
                                                            placeholder="LinkedIn Link"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <textarea 
                                            value={inst.bio || ''}
                                            onChange={(e) => {
                                                const newItems = [...section.content.items]
                                                newItems[idx].bio = e.target.value
                                                updateSectionContent(sectionId, { items: newItems })
                                            }}
                                            className="w-full bg-cream-50 border-none rounded-lg p-3 text-[12px] text-charcoal-600 min-h-[80px] outline-none leading-relaxed"
                                            placeholder="A short biography about the instructor..."
                                        />
                                    </div>
                                ))}
                                <button 
                                    onClick={() => {
                                        const current = section.content.items || []
                                        updateSectionContent(sectionId, { 
                                            items: [...current, { name: '', specialty: '', bio: '', image: '' }] 
                                        })
                                    }}
                                    className="w-full py-4 border-2 border-dashed border-zinc-200 rounded-2xl flex items-center justify-center gap-2 text-zinc-400 hover:bg-zinc-50 hover:border-zinc-300 transition-all text-[11px] font-black uppercase tracking-widest"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Instructor
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Advanced Styling Panel - Universal for all sections */}
                <div className="pt-10 border-t border-cream-100 space-y-6">
                    <button 
                        onClick={() => setActiveSubView(activeSubView === 'advanced-styling' ? null : 'advanced-styling')}
                        className="w-full flex items-center justify-between p-5 bg-zinc-950 rounded-[2rem] text-white hover:brightness-125 transition-all shadow-xl group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Palette className="w-5 h-5 text-zinc-400" />
                            </div>
                            <div className="text-left">
                                <span className="block text-[13px] font-bold tracking-tight">Advanced Styling</span>
                                <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Section Overrides</span>
                            </div>
                        </div>
                        <ChevronRight className={clsx("w-4 h-4 text-white/20 transition-transform", activeSubView === 'advanced-styling' ? 'rotate-90' : '')} />
                    </button>

                    {activeSubView === 'advanced-styling' && (
                        <div className="space-y-6 p-6 bg-zinc-50 rounded-[2rem] border border-zinc-100 animate-in slide-in-from-top-4 duration-500">
                             <div className="space-y-4">
                                 <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 px-1">Section Background</label>
                                 <LocalColorPicker 
                                     value={section.content.customBgColor || '#ffffff'}
                                     onChange={(val) => updateSectionContent(sectionId, { customBgColor: val })}
                                 />
                                 <p className="text-[10px] text-zinc-400 italic px-1">Override the global background for this specific section.</p>
                             </div>

                             <div className="space-y-4 pt-4 border-t border-zinc-100">
                                 <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 px-1">Vertical Spacing</label>
                                 <div className="grid grid-cols-3 gap-2">
                                     {['2rem', '5rem', '8rem'].map(v => (
                                         <button 
                                             key={v}
                                             onClick={() => updateSectionContent(sectionId, { verticalSpacing: v })}
                                             className={clsx(
                                                 "py-3 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest transition-all",
                                                 (section.content.verticalSpacing || '5rem') === v 
                                                     ? "border-forest bg-forest text-white" 
                                                     : "border-white bg-white text-zinc-400 hover:border-zinc-200"
                                             )}
                                         >
                                             {v === '2rem' ? 'Tight' : v === '5rem' ? 'Normal' : 'Luxe'}
                                         </button>
                                     ))}
                                 </div>
                             </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    )
}
