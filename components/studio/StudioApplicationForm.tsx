'use client'

import { useState, useRef, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createStudio } from '@/app/(dashboard)/studio/studio-actions'
import { Loader2, Upload, CheckCircle, X, ShieldCheck, ArrowRight, Sparkles, DollarSign } from 'lucide-react'
import Link from 'next/link'
import { normalizeImageFile, uploadContentType } from '@/lib/utils/image-utils'
import clsx from 'clsx'
import { createClient } from '@/lib/supabase/client'
import { STUDIO_AMENITIES } from '@/types'
import Image from 'next/image'
import { geocodeAddress, getAutocompleteSuggestions, resolveGoogleMapsUrl } from '@/lib/utils/location'
import { MapPin, Search } from 'lucide-react'

function FileUploadBox({ name, label, required, fileName, previewUrl, accept, setFileState }: any) {
    return (
        <div>
            <label className="block text-sm font-medium text-charcoal-700 mb-1">{label} {required && <span className="text-rose-gold font-bold">*</span>}</label>
            <div className="border-2 border-dashed border-cream-300 rounded-lg p-2 flex flex-col items-center justify-center bg-cream-50/50 hover:bg-cream-100/50 transition-colors relative cursor-pointer group h-[120px]">
                <input type="file" name={name} accept={accept} required={required}
                    onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        
                        try {
                            const normalized = await normalizeImageFile(file)
                            const url = normalized.type.startsWith('image/') ? URL.createObjectURL(normalized) : null
                            setFileState(normalized.name, url, normalized)
                        } catch (err: any) {
                            console.error('File normalization error:', err)
                            alert(err.message || 'Failed to process file')
                            e.target.value = '' // Reset input
                        }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                {previewUrl ? (
                    <div className="relative w-full h-full z-20 group/preview block">
                        <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="block w-full h-full relative">
                            <Image src={previewUrl} alt="Preview" fill className="object-contain cursor-pointer" unoptimized />
                        </a>
                        <div className="absolute top-1 right-1 bg-charcoal-900/70 p-1 rounded-full text-white cursor-pointer opacity-0 group-hover/preview:opacity-100 transition-opacity pointer-events-auto z-30" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFileState(null, null); }}>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </div>
                    </div>
                ) : fileName ? (
                    <div className="flex flex-col items-center justify-center w-full h-full z-20 relative group/file">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center mb-1 bg-green-100">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <p className="text-[10px] text-center font-medium text-charcoal-700 px-2 line-clamp-2 max-w-[90%] break-all">{fileName}</p>
                        <div className="absolute top-1 right-1 bg-charcoal-900/70 p-1 rounded-full text-white cursor-pointer opacity-0 group-hover/file:opacity-100 transition-opacity pointer-events-auto" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFileState(null, null); }}>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </div>
                    </div>
                ) : (
                    <>
                        <Upload className="w-5 h-5 text-rose-gold mb-1" />
                        <p className="text-[10px] text-center font-medium text-charcoal-700 px-2">Click to upload</p>
                        {accept && <p className="text-[8px] text-center text-charcoal-500 mt-0.5 max-w-[90%] break-words">{accept.replace(/,/g, ', ')}</p>}
                    </>
                )}
            </div>
        </div>
    )
}

export default function StudioApplicationForm({ originPortal = 'marketplace' }: { originPortal?: string }) {
    const searchParams = useSearchParams()
    const router = useRouter()
    const [activePortal, setActivePortal] = useState(originPortal)

    const [step, setStep] = useState(1)
    const [isPublic, setIsPublic] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    // Form Data State
    const [name, setName] = useState('')
    const [contactNumber, setContactNumber] = useState('')
    const [dateOfBirth, setDateOfBirth] = useState('')
    const [slug, setSlug] = useState('')
    const isCma = activePortal === 'cms'
    const [selectedPlan, setSelectedPlan] = useState('starter')
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'annually'>('monthly')
    const [identityConflict, setIdentityConflict] = useState<'marketplace' | null>(null)
    const [isCheckingIdentity, setIsCheckingIdentity] = useState(true)

    useEffect(() => {
        async function checkIdentity() {
            const supabase = createClient()
            const { data } = await supabase.auth.getUser();
    const user = data?.user
            
            if (user && isCma) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('origin_portal, role')
                    .eq('id', user.id)
                    .single()

                if (profile?.role === 'admin') {
                    router.push('/admin')
                    return
                }

                // If user is from marketplace but on CMA, flag conflict
                if (profile?.origin_portal === 'marketplace') {
                    setIdentityConflict('marketplace')
                }
            }
            setIsCheckingIdentity(false)
        }

        checkIdentity()
    }, [isCma])

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const host = window.location.hostname
            if (host.includes('studiovault.co') || host.includes('studiovault.local')) {
                setActivePortal('cms')
            }
        }
        
        // Pre-select plan from URL
        const planParam = searchParams.get('plan')
        const billingParam = searchParams.get('billing')
        if (planParam && ['starter', 'team', 'business', 'pro'].includes(planParam)) {
            // Note: 'pro' in pricing maps to 'team' in logic or we keep it as 'pro'?
            // Actually, my plans in StudioApplicationForm are 'starter', 'team', 'business'.
            // In pricing I used 'Starter', 'Team', 'Business'.
            setSelectedPlan(planParam === 'pro' ? 'team' : planParam) 
        }
        if (billingParam && ['monthly', 'annually'].includes(billingParam)) {
            setBillingCycle(billingParam as 'monthly' | 'annually')
        }
    }, [searchParams])


    const [birFileName, setBirFileName] = useState<string | null>(null)
    const [birPreviewUrl, setBirPreviewUrl] = useState<string | null>(null)
    const [govIdFileName, setGovIdFileName] = useState<string | null>(null)
    const [govIdPreviewUrl, setGovIdPreviewUrl] = useState<string | null>(null)
    const [insuranceFileName, setInsuranceFileName] = useState<string | null>(null)
    const [insurancePreviewUrl, setInsurancePreviewUrl] = useState<string | null>(null)

    const [birFile, setBirFile] = useState<File | null>(null)
    const [govIdFile, setGovIdFile] = useState<File | null>(null)
    const [insuranceFile, setInsuranceFile] = useState<File | null>(null)

    const [spacePhotos, setSpacePhotos] = useState<File[]>([])
    const spacePhotosInputRef = useRef<HTMLInputElement>(null)
    const [selectedEquipment, setSelectedEquipment] = useState<Record<string, boolean>>({})

    // Address & Location State
    const [address, setAddress] = useState('')
    const [lat, setLat] = useState('')
    const [lng, setLng] = useState('')
    const [googleMapsUrl, setGoogleMapsUrl] = useState('')
    const [isResolvingUrl, setIsResolvingUrl] = useState(false)
    const [isGeocoding, setIsGeocoding] = useState(false)

    // Autocomplete State
    const [suggestions, setSuggestions] = useState<string[]>([])
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [isSearching, setIsSearching] = useState(false)

    const handleAddressSearch = async (val: string) => {
        setAddress(val)
        if (val.length >= 3) {
            setIsSearching(true)
            const results = await getAutocompleteSuggestions(val)
            setSuggestions(results)
            setShowSuggestions(true)
            setIsSearching(false)
        } else {
            setSuggestions([])
            setShowSuggestions(false)
        }
    }

    const handleSuggestionSelect = async (suggestion: string) => {
        setAddress(suggestion)
        setShowSuggestions(false)
        setIsGeocoding(true)
        const res = await geocodeAddress(suggestion)
        if (res) {
            setLat(res.lat.toString())
            setLng(res.lng.toString())
            setAddress(res.full || suggestion)
            // Auto-derive google maps link from coordinates if not already set
            if (!googleMapsUrl) {
                setGoogleMapsUrl(`https://www.google.com/maps/search/?api=1&query=${res.lat},${res.lng}`)
            }
        }
        setIsGeocoding(false)
    }

    const handleGoogleMapsUrlBlur = async () => {
        if (!googleMapsUrl?.trim()) return
        if (!googleMapsUrl.includes('google') && !googleMapsUrl.includes('goo.gl') && !googleMapsUrl.includes('maps.app')) return
        setIsResolvingUrl(true)
        const result = await resolveGoogleMapsUrl(googleMapsUrl)
        if (result) {
            setLat(result.lat.toString())
            setLng(result.lng.toString())
            if (result.address && !address.trim()) {
                setAddress(result.address)
            }
        }
        setIsResolvingUrl(false)
    }

    const handleEquipmentChange = (id: string, checked: boolean) => {
        setSelectedEquipment(prev => ({ ...prev, [id]: checked }))
    }

    const handleSpacePhotosChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        const processedFiles: File[] = []
        for (const file of files) {
            try {
                const processed = await normalizeImageFile(file)
                processedFiles.push(processed)
            } catch (err: any) {
                console.error('Image processing error:', err)
                alert(`${file.name}: ${err.message || 'Failed to process image'}`)
            }
        }
        if (processedFiles.length > 0) {
            setSpacePhotos(prev => [...prev, ...processedFiles])
        }
    }

    const removeSpacePhoto = (e: React.MouseEvent, indexToRemove: number) => {
        e.preventDefault()
        setSpacePhotos(prev => prev.filter((_, idx) => idx !== indexToRemove))
    }

    const validateStep = () => {
        setError(null)
        if (step === 1) {
            if (!name) return setError('Studio Name is required')
            if (!contactNumber) return setError('Contact Number is required')
            if (!dateOfBirth) return setError('Date of Birth is required')
        }
        if (step === 2) {
            if (!address) return setError('Location is required')
            // googleMapsUrl is now optional for CMA
            if (!isCma) {
                if (!birFile) return setError('BIR Certificate is required')
                if (spacePhotos.length === 0) return setError('Please upload at least one space photo')
            }
        }
        if (step === 3) {
            if (!slug) return setError('Please choose a URL slug')
            if (slug.length < 3) return setError('Slug must be at least 3 characters')
        }
        if (step === 4) {
            if (!selectedPlan) return setError('Please select a plan')
        }
        return true
    }

    const nextStep = () => {
        if (validateStep()) {
            setStep((prev) => prev + 1)
            window.scrollTo(0, 0)
        }
    }

    const prevStep = () => setStep(prev => prev - 1)

    // Plans data
    interface PricingPlan {
        id: string;
        name: string;
        price: number;
        popular: boolean;
        features: string[];
    }

    const plans: PricingPlan[] = [
        { 
            id: 'starter', 
            name: 'Starter', 
            price: 2500, 
            popular: false, 
            features: ['Up to 50 bookings/mo', 'Basic analytics', 'Custom URL slug', 'Standard support'] 
        },
        { 
            id: 'team', 
            name: 'Team', 
            price: 6500, 
            popular: true, 
            features: ['Unlimited bookings', 'Advanced reporting', 'Multi-staff access', 'Priority support'] 
        },
        { 
            id: 'business', 
            name: 'Business', 
            price: 12500, 
            popular: false, 
            features: ['Custom domain logic', 'Whitelabel experience', 'Dedicated manager', 'API access'] 
        }
    ]

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const formData = new FormData(event.currentTarget)
        
        console.log('[StudioApplicationForm] Submitting form...', { name, contactNumber, slug, selectedPlan })
        setError(null)
        setIsLoading(true)

        try {
            const supabase = createClient()
            const { data } = await supabase.auth.getUser();
    const user = data?.user
            
            if (!user) {
                console.error('[StudioApplicationForm] No user found during submission')
                throw new Error('You must be logged in to apply.')
            }

            console.log(`[StudioApplicationForm] Authenticated as ${user.id}. Starting uploads...`)
            const timestamp = Date.now()

            // Upload Files
            const uploadTasks = []
            if (birFile) {
                const ext = birFile.name.split('.').pop()
                const path = `studios/${user.id}/bir_${timestamp}.${ext}`
                uploadTasks.push(supabase.storage.from('certifications').upload(path, birFile).then(({ error }: { error: any }) => {
                    if (error) throw error
                    formData.set('birCertificateUrl', path)
                }))
            }
            if (govIdFile) {
                const ext = govIdFile.name.split('.').pop()
                const path = `studios/${user.id}/govid_${timestamp}.${ext}`
                uploadTasks.push(supabase.storage.from('certifications').upload(path, govIdFile).then(({ error }: { error: any }) => {
                    if (error) throw error
                    formData.set('govIdUrl', path)
                }))
            }
            
            await Promise.all(uploadTasks)
            console.log('[StudioApplicationForm] Document uploads finished.')

            // Space Photos
            if (spacePhotos.length > 0) {
                console.log(`[StudioApplicationForm] Uploading ${spacePhotos.length} space photos...`)
                for (let i = 0; i < spacePhotos.length; i++) {
                    const file = spacePhotos[i]
                    const ext = file.name.split('.').pop()
                    const path = `studios/${user.id}/space_${timestamp}_${i}.${ext}`
                    await supabase.storage.from('avatars').upload(path, file, { contentType: uploadContentType(file) })
                    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
                    formData.append('spacePhotosUrls', publicUrl)
                }
            }

            // Sync Google Maps and Slug data for Server Action
            formData.set('slug', slug)
            formData.set('lat', lat)
            formData.set('lng', lng)
            
            // Auto-derive google maps link if not manually provided (to satisfy DB requirement)
            if (!googleMapsUrl) {
                const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
                formData.set('googleMapsUrl', mapUrl)
            } else {
                formData.set('googleMapsUrl', googleMapsUrl)
            }
            
            formData.append('plan', selectedPlan)
            formData.append('billingCycle', billingCycle)
            formData.append('subscription_status', 'trial')
            formData.set('is_public', String(isPublic))
            formData.set('marketplace_status', isPublic ? 'pending' : 'inactive')
            
            console.log('[StudioApplicationForm] Calling createStudio Server Action...')
            const result = await createStudio(formData)
            console.log('[StudioApplicationForm] Server Action result:', result)

            if (result?.error) {
                setError(result.error)
            } else if (result?.success) {
                console.log('[StudioApplicationForm] Success! Redirecting to /studio/website...')
                router.push('/studio/website?success=true')
            }
        } catch (err: any) {
            console.error('[StudioApplicationForm] Fatal error during submission:', err)
            setError(err.message || 'An unexpected error occurred.')
        } finally {
            setIsLoading(false)
        }
    }

    if (isCheckingIdentity) {
        return (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-forest/20" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate/40">Verifying Identity...</p>
            </div>
        )
    }

    if (identityConflict === 'marketplace') {
        return (
            <div className="bg-white border border-red-100 rounded-[2.5rem] p-12 text-center shadow-xl shadow-red-500/5 max-w-2xl mx-auto space-y-8 animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto border border-red-100">
                    <ShieldCheck className="w-10 h-10 text-red-500" />
                </div>
                
                <div className="space-y-4">
                    <h2 className="text-3xl font-serif text-charcoal tracking-tight">Identity Conflict Detected</h2>
                    <p className="text-sm text-slate/60 font-medium leading-relaxed max-w-md mx-auto">
                        We detected that you have a <span className="text-forest font-bold">Studio</span> or <span className="text-forest font-bold">Instructor account</span> linked to <span className="underline">studiovaultph.com</span>. 
                    </p>
                    <p className="text-xs text-slate/50 font-bold uppercase tracking-widest leading-relaxed pt-2">
                        To ensure absolute security and separation of your business financials, please use a <span className="text-charcoal underline">different email address</span> to register and link your studio account on this portal.
                    </p>
                </div>

                <div className="pt-8 border-t border-zinc-50 flex flex-col items-center gap-4">
                    <Link 
                        href="/logout" 
                        className="px-10 py-4 bg-charcoal text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:brightness-110 transition-all shadow-lg"
                    >
                        Sign Out to Use Different Email
                    </Link>
                    <Link 
                        href="/" 
                        className="text-[10px] font-bold text-slate/40 uppercase tracking-widest hover:text-forest transition-colors"
                    >
                        Return to Dashboard
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            {/* Multi-step indicator */}
            <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((num) => (
                    <div 
                        key={num} 
                        className={`h-1 flex-1 rounded-full transition-all duration-500 ${step >= num ? 'bg-forest' : 'bg-cream-200'}`} 
                    />
                ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Hidden Persistent Fields for Multi-Step Submission */}
                <input type="hidden" name="name" value={name} />
                <input type="hidden" name="contactNumber" value={contactNumber} />
                <input type="hidden" name="dateOfBirth" value={dateOfBirth} />
                <input type="hidden" name="address" value={address} />
                <input type="hidden" name="slug" value={slug} />
                <input type="hidden" name="selectedPlan" value={selectedPlan} />
                <input type="hidden" name="lat" value={lat} />
                <input type="hidden" name="lng" value={lng} />
                <input type="hidden" name="googleMapsUrl" value={googleMapsUrl} />
                <input type="hidden" name="billingCycle" value={billingCycle} />
                <input type="hidden" name="isPublic" value={String(isPublic)} />

                {error && (
                    <div className="p-4 text-xs font-black uppercase tracking-widest text-red-600 bg-red-50 border border-red-100 rounded-xl">
                        {error}
                    </div>
                )}

                {/* STEP 1: IDENTITY */}
                {step === 1 && (
                    <div className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-charcoal/40 mb-3">
                                Studio Name <span className="text-red-500">*</span>
                            </label>
                            <input 
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required 
                                placeholder="e.g. Pilates Logic" 
                                className="w-full px-6 py-4 border border-cream-200 bg-white rounded-2xl text-charcoal outline-none focus:ring-2 focus:ring-forest/20 transition-all font-serif text-lg" 
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-charcoal/40 mb-3">
                                    Contact Number <span className="text-red-500">*</span>
                                </label>
                                <input 
                                    value={contactNumber}
                                    onChange={(e) => setContactNumber(e.target.value)}
                                    required 
                                    placeholder="0917XXXXXXX" 
                                    className="w-full px-6 py-4 border border-cream-200 bg-white rounded-2xl text-charcoal outline-none focus:ring-2 focus:ring-forest/20 transition-all" 
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-charcoal/40 mb-3">
                                    Authorized Rep DOB <span className="text-red-500">*</span>
                                </label>
                                <input 
                                    type="date" 
                                    value={dateOfBirth}
                                    onChange={(e) => setDateOfBirth(e.target.value)}
                                    required 
                                    className="w-full px-6 py-4 border border-cream-200 bg-white rounded-2xl text-charcoal outline-none focus:ring-2 focus:ring-forest/20 transition-all" 
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 2: SETUP (TRUNCATED FOR BREVITY IN REPLACEMENT, KEEPING LOGIC) */}
                {step === 2 && (
                    <div className="space-y-6">
                         <div>
                            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-charcoal/40 mb-3">
                                Location <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate/40"><MapPin className="w-4 h-4" /></div>
                                <input
                                    type="text"
                                    value={address}
                                    onChange={(e) => handleAddressSearch(e.target.value)}
                                    autoComplete="off"
                                    required
                                    placeholder="Search for your studio address..."
                                    className="w-full pl-14 pr-12 py-4 border border-cream-200 bg-white rounded-2xl text-charcoal outline-none focus:ring-2 focus:ring-forest/20 transition-all font-serif text-lg"
                                />
                                {showSuggestions && suggestions.length > 0 && (
                                    <div className="absolute z-[100] top-full left-0 right-0 mt-2 bg-white border border-cream-100 rounded-2xl shadow-2xl overflow-hidden py-2">
                                        {suggestions.map((s, idx) => (
                                            <button key={idx} type="button" onMouseDown={() => handleSuggestionSelect(s)} className="w-full text-left px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate/60 hover:bg-cream-50 flex items-center gap-3">
                                                <Search className="w-3 h-3 opacity-20" /> {s}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {!isCma && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <FileUploadBox
                                    name="birCertificate"
                                    label="BIR Certificate"
                                    required={true}
                                    fileName={birFileName}
                                    previewUrl={birPreviewUrl}
                                    setFileState={(name: any, url: any, file: any) => { setBirFileName(name); setBirPreviewUrl(url); setBirFile(file); }}
                                />
                                <div className="space-y-4">
                                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-charcoal/40">Studio Photos <span className="text-red-500">*</span></label>
                                    <div 
                                        onClick={() => spacePhotosInputRef.current?.click()}
                                        className="border-2 border-dashed border-cream-200 rounded-2xl p-8 flex flex-col items-center justify-center bg-cream-50/30 hover:bg-cream-50 transition-colors cursor-pointer"
                                    >
                                        <Upload className="w-6 h-6 text-slate/20 mb-3" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate/40">{spacePhotos.length} Photos added</span>
                                        <input type="file" multiple className="hidden" ref={spacePhotosInputRef} onChange={handleSpacePhotosChange} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* STEP 3: IDENTITY & URL */}
                {step === 3 && (
                    <div className="space-y-8">
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-serif text-charcoal">Business Identity</h2>
                            <p className="text-xs text-slate/40 uppercase font-black tracking-widest">Choose your unique storefront URL</p>
                        </div>
                        <div className="max-w-md mx-auto">
                            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-charcoal/40 mb-3">
                                Your Custom URL <span className="text-red-500">*</span>
                            </label>
                            <div className="flex items-center border border-cream-200 bg-white rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-forest/20 transition-all">
                                <span className="px-6 py-4 bg-cream-50 text-slate/40 text-[10px] font-black uppercase tracking-widest border-r border-cream-100">
                                    studiovault.co/
                                </span>
                                <input 
                                    value={slug}
                                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                                    placeholder="your-studio"
                                    className="flex-1 px-6 py-4 outline-none text-charcoal font-black placeholder:text-slate/20"
                                />
                            </div>
                            <p className="mt-4 text-[10px] text-center text-slate/40 font-black uppercase tracking-widest leading-relaxed">
                                This will be your permanent link for client bookings. <br />
                                You can change this or add a custom domain later in settings.
                            </p>
                        </div>
                    </div>
                )}

                {/* STEP 4: PLAN SELECTION */}
                {step === 4 && (
                    <div className="space-y-12">
                        <div className="text-center space-y-4">
                            <h2 className="text-3xl font-serif text-charcoal">Select Your Plan</h2>
                            <p className="text-xs text-slate/40 uppercase font-black tracking-widest italic">All plans include a 1-month free trial</p>
                            
                            {/* Billing Toggle */}
                            <div className="flex items-center justify-center gap-6 mt-8">
                                <span className={clsx("text-[10px] font-black uppercase tracking-widest transition-all", billingCycle === 'monthly' ? "text-charcoal" : "text-slate/40")}>Monthly</span>
                                <button 
                                    type="button"
                                    onClick={() => setBillingCycle(prev => prev === 'monthly' ? 'annually' : 'monthly')}
                                    className="w-14 h-7 bg-cream-200 rounded-full p-1 relative transition-colors hover:bg-cream-300 ring-1 ring-black/5 shadow-inner"
                                >
                                    <div className={clsx(
                                        "w-5 h-5 bg-forest rounded-full transition-all duration-300 shadow-md",
                                        billingCycle === 'annually' ? "translate-x-7" : "translate-x-0"
                                    )} />
                                </button>
                                <div className="flex items-center gap-2">
                                    <span className={clsx("text-[10px] font-black uppercase tracking-widest transition-all", billingCycle === 'annually' ? "text-charcoal" : "text-slate/40")}>Annually</span>
                                    <span className="bg-emerald-100 text-emerald-600 text-[8px] font-black uppercase px-2 py-0.5 rounded-full">Save 20%</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {plans.map((p) => {
                                const price = billingCycle === 'annually' ? Math.floor(p.price * 0.8) : p.price
                                return (
                                    <div 
                                        key={p.id}
                                        onClick={() => setSelectedPlan(p.id)}
                                        className={clsx(
                                            "px-6 py-10 rounded-[2.5rem] border-2 cursor-pointer transition-all relative overflow-hidden group h-full flex flex-col justify-between",
                                            selectedPlan === p.id 
                                                ? 'border-forest bg-forest/[0.02] ring-4 ring-forest/10' 
                                                : 'border-cream-100 bg-white hover:border-forest/20 shadow-tight hover:shadow-ambient'
                                        )}
                                    >
                                        <div className="space-y-4 mb-8">
                                            <div className="flex justify-between items-center">
                                                <h4 className="text-lg font-bold text-charcoal">{p.name}</h4>
                                                {p.popular && <span className="bg-emerald-100 text-emerald-600 text-[8px] font-black uppercase px-2 py-0.5 rounded-full">Popular</span>}
                                            </div>
                                            <div className="flex items-baseline gap-1.5">
                                                <span className="text-2xl font-black text-charcoal tracking-tight">PHP {price.toLocaleString()}</span>
                                                <span className="text-[10px] uppercase font-bold tracking-[0.2em] opacity-30">/ mo</span>
                                            </div>
                                        </div>
                                        <ul className="space-y-4 mb-8 flex-1">
                                            {p.features.map(f => (
                                                <li key={f} className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate/70 flex items-start gap-3 leading-relaxed">
                                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" /> 
                                                    <span>{f}</span>
                                                </li>
                                            ))}
                                        </ul>
                                        <div className={`w-full h-1 rounded-full ${selectedPlan === p.id ? 'bg-forest' : 'bg-cream-100'}`} />
                                    </div>
                                )
                            })}
                        </div>
                        
                        <div className="p-10 bg-forest/[0.03] border border-forest/10 rounded-[2.5rem] flex flex-col sm:flex-row items-center gap-8 shadow-inner">
                            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-500/20">
                                <Sparkles className="w-8 h-8 text-emerald-600" />
                            </div>
                            <div className="space-y-2 text-center sm:text-left">
                                <h5 className="text-sm font-black uppercase tracking-widest text-charcoal">30-Day Free Trial Activated</h5>
                                <p className="text-[10px] text-slate/50 font-bold uppercase tracking-[0.2em] leading-relaxed">
                                    Your first payment of <span className="text-charcoal">PHP {((billingCycle === 'annually' ? Math.floor(plans.find(p => p.id === selectedPlan)!.price * 0.8) : plans.find(p => p.id === selectedPlan)!.price) * (billingCycle === 'annually' ? 12 : 1)).toLocaleString()}</span> isn&apos;t due until May 4, 2026. Cancel anytime.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 5: MARKETPLACE DISCOVERY */}
                {step === 5 && (
                    <div className="space-y-12">
                        <div className="text-center space-y-4">
                            <h2 className="text-3xl font-serif text-charcoal tracking-tight">Marketplace Discovery</h2>
                            <p className="text-[10px] text-slate/40 uppercase font-black tracking-[0.3em] italic">Choose how you want to be discovered</p>
                        </div>

                        <div className="max-w-2xl mx-auto">
                            <div 
                                onClick={() => setIsPublic(!isPublic)}
                                className={clsx(
                                    "p-10 rounded-[2.5rem] border-2 cursor-pointer transition-all relative overflow-hidden group",
                                    isPublic 
                                        ? "border-forest bg-forest/[0.02] ring-4 ring-forest/10" 
                                        : "border-cream-100 bg-white hover:border-cream-200"
                                )}
                            >
                                <div className="flex flex-col sm:flex-row items-center gap-8">
                                    <div className={clsx(
                                        "w-20 h-20 rounded-full flex items-center justify-center shrink-0 border transition-all duration-500",
                                        isPublic ? "bg-forest border-forest text-white" : "bg-cream-50 border-cream-100 text-slate/30"
                                    )}>
                                        <Sparkles className={clsx("w-10 h-10 transition-transform duration-500", isPublic && "scale-110")} />
                                    </div>
                                    <div className="space-y-4 text-center sm:text-left flex-1">
                                        <div className="flex items-center justify-center sm:justify-start gap-4">
                                            <h4 className="text-xl font-bold text-charcoal tracking-tight">List on StudioVault Marketplace</h4>
                                            <div className={clsx(
                                                "w-14 h-7 rounded-full p-1 relative transition-colors duration-500 ring-1 ring-black/10 shadow-inner",
                                                isPublic ? "bg-forest" : "bg-slate/20"
                                            )}>
                                                <div className={clsx(
                                                    "w-5 h-5 bg-white rounded-full transition-all duration-500 shadow-md",
                                                    isPublic ? "translate-x-7" : "translate-x-0"
                                                )} />
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-slate/60 font-black uppercase tracking-[0.1em] leading-relaxed">
                                            Monetize your studio&apos;s idle capacity by renting out unused equipment to independent instructors and students on the <span className="text-forest">StudioVault Marketplace</span>. <br />
                                            <span className="text-forest underline">Set your own rental prices and reach a wider community.</span>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 p-10 bg-cream-50/50 rounded-[2.5rem] border border-cream-100 italic text-center">
                                <p className="text-[10px] text-slate/50 font-black uppercase tracking-widest leading-relaxed">
                                    {isPublic 
                                        ? "PUBLIC: Your studio will be searchable on studiovaultph.com as soon as you are verified." 
                                        : "PRIVATE: Your studio will be hidden from public search. Only customers who have your direct link (studiovault.co/your-slug) will be able to book."
                                    }
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* NAVIGATION */}
                <div className="flex gap-4 pt-8">
                    {step > 1 && (
                        <button 
                            type="button" 
                            onClick={prevStep}
                            className="px-10 py-4 rounded-2xl border-2 border-cream-100 text-[10px] font-black uppercase tracking-widest text-slate/40 hover:bg-cream-50 transition-all"
                        >
                            Back
                        </button>
                    )}
                    
                    {step < 5 ? (
                        <button 
                            type="button" 
                            onClick={nextStep}
                            className="flex-1 py-4 bg-forest text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:brightness-110 transition-all shadow-xl shadow-forest/20 flex items-center justify-center gap-3 group"
                        >
                            Continue <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                    ) : (
                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="flex-1 py-4 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:brightness-110 transition-all shadow-xl flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Complete Setup & Launch'}
                        </button>
                    )}
                </div>
            </form>
        </div>
    )
}
