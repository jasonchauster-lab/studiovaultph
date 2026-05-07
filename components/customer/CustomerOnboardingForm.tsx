'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { updateProfile } from '@/app/(dashboard)/customer/profile/actions'
import { Loader2, Camera, Check, ChevronDown, Globe } from 'lucide-react'
import { isValidPhone, phoneErrorMessage } from '@/lib/validation'
import { clsx } from 'clsx'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

const COUNTRIES = [
    { name: 'Philippines', code: 'PH', dialCode: '+63', flag: '🇵🇭' },
    { name: 'Singapore', code: 'SG', dialCode: '+65', flag: '🇸🇬' },
    { name: 'United Arab Emirates', code: 'AE', dialCode: '+971', flag: '🇦🇪' },
    { name: 'United States', code: 'US', dialCode: '+1', flag: '🇺🇸' },
    { name: 'Australia', code: 'AU', dialCode: '+61', flag: '🇦🇺' },
]

export default function CustomerOnboardingForm({ profile, studio }: { profile: any, studio?: any }) {
    const [isLoading, setIsLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null)
    const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url || null)
    const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0])
    const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false)
    const [gender, setGender] = useState(profile?.gender || '')
    const [selectedMedicalConditions, setSelectedMedicalConditions] = useState<string[]>(profile?.medical_conditions || [])
    
    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsCountryDropdownOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onloadend = () => {
                setAvatarPreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleSubmit = async (formData: FormData) => {
        const contactNumber = formData.get('contactNumber') as string
        const firstName = formData.get('firstName') as string
        const lastName = formData.get('lastName') as string

        if (!firstName || !lastName) {
            setMessage({ type: 'error', text: 'Please provide your first and last name.' })
            return
        }

        const birthday = formData.get('birthday') as string
        if (!birthday) {
            setMessage({ type: 'error', text: 'Please provide your date of birth.' })
            return
        }

        if (!contactNumber) {
            setMessage({ type: 'error', text: 'Please provide your mobile number.' })
            return
        }

        // Add dial code if not present
        const fullPhone = contactNumber.startsWith('+') ? contactNumber : `${selectedCountry.dialCode}${contactNumber.replace(/^0/, '')}`
        
        setIsLoading(true)
        setMessage(null)

        // Set gender manually since radio buttons can be tricky with FormData sometimes in some setups
        formData.set('gender', gender)
        
        // Handle referral code from localStorage
        if (studio?.slug) {
            const refCode = localStorage.getItem(`studio_ref_${studio.slug}`)
            if (refCode) {
                formData.set('referralCode', refCode)
                formData.set('studioId', studio.id)
            }
        }
        
        const result = await updateProfile(formData)

        if (result.success) {
            setMessage({ type: 'success', text: 'Profile updated successfully! Redirecting...' })
            setTimeout(() => {
                // Try to get the slug from the studio prop or from the cookie
                const cookieSlug = document.cookie.split('; ').find(row => row.startsWith('last_studio_slug='))?.split('=')[1]
                const finalSlug = studio?.slug || cookieSlug || 'clubpilatesph'
                
                const nextPath = `/s/${finalSlug}/onboarding/waiver`
                router.push(nextPath)
                router.refresh()
            }, 1500)
        } else {
            setMessage({ type: 'error', text: 'Failed to update profile. ' + (result.error || '') })
            setIsLoading(false)
        }
    }

    const inputClasses = "w-full px-5 h-14 bg-white border border-border-grey rounded-xl text-charcoal font-medium text-sm outline-none focus:ring-1 focus:ring-burgundy transition-all placeholder:text-slate-300"

    return (
        <form action={handleSubmit} className="space-y-12 max-w-xl mx-auto">
            {/* Account Information Section */}
            <div className="space-y-6">
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-charcoal-900/40 border-b border-border-grey/50 pb-4">
                    Account information
                </h3>
                
                <div className="space-y-3">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Mobile number</label>
                    <div className="flex gap-3">
                        {/* Country Selector */}
                        <div className="relative" ref={dropdownRef}>
                            <button
                                type="button"
                                onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                                className="h-14 px-4 bg-white border border-border-grey rounded-xl flex items-center gap-2 hover:border-burgundy/30 transition-all min-w-[100px]"
                            >
                                <span className="text-xl">{selectedCountry.flag}</span>
                                <span className="text-sm font-bold text-charcoal">{selectedCountry.dialCode}</span>
                                <ChevronDown className={clsx("w-3 h-3 text-slate-400 transition-transform", isCountryDropdownOpen && "rotate-180")} />
                            </button>
                            
                            <AnimatePresence>
                                {isCountryDropdownOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="absolute top-full left-0 mt-2 w-[240px] bg-white border border-border-grey rounded-2xl shadow-xl z-50 overflow-hidden"
                                    >
                                        <div className="max-h-[200px] overflow-y-auto p-1">
                                            {COUNTRIES.map((c) => (
                                                <button
                                                    key={c.code}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedCountry(c)
                                                        setIsCountryDropdownOpen(false)
                                                    }}
                                                    className="w-full flex items-center justify-between p-3 hover:bg-off-white rounded-xl transition-colors group"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xl">{c.flag}</span>
                                                        <span className="text-xs font-bold text-slate-600">{c.name}</span>
                                                    </div>
                                                    <span className="text-[10px] font-black text-slate-400 group-hover:text-burgundy transition-colors">{c.dialCode}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        
                        <input
                            type="tel"
                            name="contactNumber"
                            defaultValue={profile?.contact_number?.replace(/^\+63|^0/, '') || ''}
                            placeholder="917 123 4567"
                            required
                            className={clsx(inputClasses, "flex-1")}
                        />
                    </div>
                </div>
            </div>

            {/* Personal Information Section */}
            <div className="space-y-8">
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-charcoal-900/40 border-b border-border-grey/50 pb-4">
                    Personal information
                </h3>

                {/* Profile Picture Upload */}
                <div className="flex flex-col items-center gap-4">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Profile picture (Optional)</label>
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="relative group cursor-pointer"
                    >
                        <div className="w-28 h-28 rounded-full border-2 border-dashed border-border-grey flex items-center justify-center overflow-hidden bg-off-white group-hover:border-burgundy/50 transition-all duration-500 shadow-tight">
                            {avatarPreview ? (
                                <Image src={avatarPreview} alt="Preview" fill className="object-cover transition-transform group-hover:scale-110 duration-700" />
                            ) : (
                                <div className="flex flex-col items-center gap-2">
                                    <User className="w-8 h-8 text-slate-300" />
                                </div>
                            )}
                        </div>
                        <div className="absolute bottom-0 right-0 w-8 h-8 bg-burgundy rounded-full flex items-center justify-center text-white shadow-lg transform group-hover:scale-110 transition-transform">
                            <Camera className="w-4 h-4" />
                        </div>
                        <input 
                            type="file" 
                            name="avatar" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            accept="image/*" 
                            className="hidden" 
                        />
                    </div>
                </div>

                {/* Name Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">First Name</label>
                        <input
                            type="text"
                            name="firstName"
                            defaultValue={profile?.first_name || profile?.full_name?.split(' ')[0] || ''}
                            required
                            className={inputClasses}
                            placeholder="Jane"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Last Name</label>
                        <input
                            type="text"
                            name="lastName"
                            defaultValue={profile?.last_name || profile?.full_name?.split(' ').slice(1).join(' ') || ''}
                            required
                            className={inputClasses}
                            placeholder="Doe"
                        />
                    </div>
                </div>

                {/* Date of Birth */}
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 flex items-center gap-2">
                        Date of birth
                    </label>
                    <input
                        type="date"
                        name="birthday"
                        defaultValue={profile?.date_of_birth || ''}
                        required
                        className={inputClasses}
                    />
                </div>

                {/* Gender */}
                <div className="space-y-3">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 flex items-center gap-2">
                        Gender
                    </label>
                    <div className="flex flex-wrap gap-4 px-2">
                        {['Male', 'Female', 'Prefer not to say'].map((option) => (
                            <label key={option} className="flex items-center gap-3 cursor-pointer group">
                                <div className="relative">
                                    <input
                                        type="radio"
                                        name="gender_radio"
                                        value={option}
                                        checked={gender === option}
                                        onChange={() => setGender(option)}
                                        className="sr-only"
                                    />
                                    <div className={clsx(
                                        "w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center",
                                        gender === option ? "border-burgundy" : "border-border-grey group-hover:border-slate-300"
                                    )}>
                                        {gender === option && <div className="w-2 h-2 bg-burgundy rounded-full animate-in zoom-in-50" />}
                                    </div>
                                </div>
                                <span className={clsx(
                                    "text-xs font-semibold uppercase tracking-wider transition-colors",
                                    gender === option ? "text-charcoal-900" : "text-slate-500 group-hover:text-slate-700"
                                )}>
                                    {option}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Marketing Consent */}
                <label className="flex items-start gap-4 p-5 bg-off-white/50 border border-border-grey/30 rounded-2xl cursor-pointer group hover:bg-white transition-all">
                    <div className="pt-1">
                        <input
                            type="checkbox"
                            name="marketingConsent"
                            defaultChecked={profile?.marketing_consent}
                            className="w-5 h-5 rounded-lg border-border-grey text-burgundy focus:ring-burgundy transition-all cursor-pointer"
                        />
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                        Keep me updated with news, special promotions and latest events via email and SMS.
                    </p>
                </label>
            </div>

            {/* Health Information Section (Keeping existing data logic) */}
            <div className="space-y-6 pt-8">
                 <h3 className="text-xs font-black uppercase tracking-[0.3em] text-charcoal-900/40 border-b border-border-grey/50 pb-4">
                    Health considerations
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {['Scoliosis', 'Obesity', 'Herniated Disc', 'Post-partum', 'Chronic Back Pain', 'Hypertension', 'Diabetes', 'Asthma', 'Osteoporosis', 'Others'].map((condition) => (
                         <label key={condition} className="group flex items-center gap-4 p-4 bg-white border border-border-grey rounded-xl hover:border-burgundy/30 cursor-pointer transition-all shadow-tight">
                         <input
                             type="checkbox"
                             name="medical_conditions"
                             value={condition}
                             checked={selectedMedicalConditions.includes(condition)}
                             onChange={(e) => {
                                 if (e.target.checked) {
                                     setSelectedMedicalConditions([...selectedMedicalConditions, condition])
                                 } else {
                                     setSelectedMedicalConditions(selectedMedicalConditions.filter((item) => item !== condition))
                                 }
                             }}
                             className="w-5 h-5 text-burgundy border-border-grey rounded-lg focus:ring-burgundy transition-all cursor-pointer"
                         />
                         <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest group-hover:text-charcoal transition-colors">{condition}</span>
                     </label>
                    ))}
                </div>
            </div>

            {/* Legal and Footer */}
            <div className="pt-8 space-y-8 text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] leading-relaxed max-w-sm mx-auto">
                    By signing up, you agree to our <Link href="/terms-of-service" className="text-burgundy">Terms of Use</Link> and verify you have read the <Link href="/privacy" className="text-burgundy">Privacy Policy</Link>.
                </p>

                {message && (
                    <div className={clsx(
                        "p-5 rounded-xl text-[10px] font-bold uppercase tracking-widest border animate-in slide-in-from-top-2",
                        message.type === 'success' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'
                    )}>
                        {message.text}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-16 bg-charcoal-900 text-white rounded-2xl text-[12px] font-black uppercase tracking-[0.4em] shadow-xl hover:bg-charcoal group active:scale-[0.98] transition-all disabled:opacity-50"
                >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Complete Profile'}
                </button>
            </div>
        </form>
    )
}

function User({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    )
}
