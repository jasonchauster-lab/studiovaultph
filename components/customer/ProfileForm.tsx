'use client'

import { useState, useRef } from 'react'
import { updateProfile } from '@/app/(dashboard)/customer/profile/actions'
import { Loader2, Camera, Save, User, FileText } from 'lucide-react'
import { isValidPhone, isValidEmail, phoneErrorMessage } from '@/lib/validation'
import Image from 'next/image'
import WaiverUpload from '@/components/customer/WaiverUpload'
import { normalizeImageFile } from '@/lib/utils/image-utils'
import { clsx } from 'clsx'
import Avatar from '@/components/shared/Avatar'

export default function ProfileForm({ profile }: { profile: any }) {
    const [isLoading, setIsLoading] = useState(false)
    const [message, setMessage] = useState<string | null>(null)
    const [selectedEquipment, setSelectedEquipment] = useState<string[]>(profile?.teaching_equipment || [])
    const [selectedMedicalConditions, setSelectedMedicalConditions] = useState<string[]>(profile?.medical_conditions || [])

    // State for avatar preview and file
    const [previewUrl, setPreviewUrl] = useState<string | null>(profile?.avatar_url || '/default-avatar.svg')
    const [avatarFile, setAvatarFile] = useState<File | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string | null>(profile?.banner_url || null)
    const [bannerFile, setBannerFile] = useState<File | null>(null)
    const bannerInputRef = useRef<HTMLInputElement>(null)

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setIsLoading(true)
            try {
                const processedFile = await normalizeImageFile(file)
                setAvatarFile(processedFile)
                const url = URL.createObjectURL(processedFile)
                setPreviewUrl(url)
            } catch (err) {
                console.error('Avatar processing failed', err)
                setMessage('Failed to process image format. Please try another photo.')
            } finally {
                setIsLoading(false)
            }
        }
    }

    const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setIsLoading(true)
            try {
                const processedFile = await normalizeImageFile(file)
                setBannerFile(processedFile)
                const url = URL.createObjectURL(processedFile)
                setBannerPreviewUrl(url)
            } catch (err) {
                console.error('Banner processing failed', err)
                setMessage('Failed to process banner image.')
            } finally {
                setIsLoading(false)
            }
        }
    }

    const handleSubmit = async (formData: FormData) => {
        const contactNumber = formData.get('contactNumber') as string
        const emergencyContactName = formData.get('emergencyContactName') as string
        const emergencyContactPhone = formData.get('emergencyContactPhone') as string

        if (contactNumber && !isValidPhone(contactNumber)) {
            setMessage(phoneErrorMessage)
            return
        }

        // For emergency contact phone, we check if it contains SOME digits if provided
        if (emergencyContactPhone && !/\d{7,}/.test(emergencyContactPhone)) {
            setMessage('Please include a valid phone number for your emergency contact.')
            return
        }

        if (!emergencyContactName && emergencyContactPhone) {
            setMessage('Please include a name for your emergency contact.')
            return
        }

        // Overwrite avatar if we have a processed one
        if (avatarFile) {
            formData.set('avatar', avatarFile)
        }

        // Overwrite banner if we have a processed one
        if (bannerFile) {
            formData.set('banner', bannerFile)
        }

        setIsLoading(true)
        setMessage(null)

        const result = await updateProfile(formData)

        if (result.success) {
            if (result.emailChangePending) {
                setMessage('Profile updated. A verification email has been sent to your new email address. Please click the link in that email to confirm the change.')
            } else {
                setMessage('Profile updated successfully!')
            }
        } else {
            setMessage('Failed to update profile. ' + (result.error || ''))
        }

        setIsLoading(false)
    }

    return (
        <form action={handleSubmit} className="space-y-8">

            {/* Banner Upload (Instructors Only) */}
            {profile?.role === 'instructor' && (
                <div className="space-y-4 pb-10 border-b border-cream-200/60">
                    <div className="flex items-center gap-3 border-b border-cream-200/60 pb-3">
                        <h3 className="text-xl font-serif font-bold text-charcoal-900 tracking-tight">Profile Banner</h3>
                        <div className="h-px flex-1 bg-cream-100/50" />
                    </div>
                    <div 
                        className="relative w-full aspect-[21/9] sm:aspect-[4/1] rounded-2xl overflow-hidden bg-cream-50 border-2 border-dashed border-cream-200 cursor-pointer group transition-all"
                        onClick={() => bannerInputRef.current?.click()}
                    >
                        {bannerPreviewUrl ? (
                            <Image
                                src={bannerPreviewUrl}
                                alt="Profile Banner"
                                fill
                                className="object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-charcoal-300">
                                <Camera className="w-8 h-8 mb-2" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Upload Banner Photo</span>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-charcoal-900/40 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-[2px]">
                            <div className="bg-white/90 p-3 rounded-full shadow-lg">
                                <Camera className="w-6 h-6 text-charcoal-900" />
                            </div>
                        </div>
                    </div>
                    <input
                        type="file"
                        ref={bannerInputRef}
                        className="hidden"
                        onChange={handleBannerChange}
                        accept="image/*,.heic,.heif"
                    />
                    <p className="text-[10px] text-charcoal-400 italic">Recommended: A wide horizontal photo (e.g. 1920x480) showing you in action.</p>
                </div>
            )}

            {/* Avatar Upload */}
            <div className="flex flex-col items-center sm:flex-row gap-8 pb-10 border-b border-cream-200/60">
                <div 
                    className="relative group cursor-pointer transition-transform duration-300 hover:scale-[1.02]" 
                    onClick={() => fileInputRef.current?.click()}
                >
                    <div className="w-36 h-36 rounded-full overflow-hidden border-[6px] border-white shadow-xl bg-cream-50 flex items-center justify-center relative z-10 transition-all duration-300 group-hover:shadow-2xl">
                        <Avatar
                            src={previewUrl}
                            fallbackName={profile?.fullName || profile?.full_name}
                            size={144}
                            className="w-full h-full transition-transform duration-700 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-charcoal-900/40 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center rounded-full backdrop-blur-[2px]">
                            <div className="bg-white/90 p-3 rounded-full shadow-lg">
                                <Camera className="w-6 h-6 text-charcoal-900" />
                            </div>
                        </div>
                    </div>
                    {/* Decorative Ring */}
                    <div className="absolute inset-[-10px] rounded-full border border-charcoal-900/5 scale-90 opacity-0 group-hover:opacity-100 group-hover:scale-100 transition-all duration-500 pointer-events-none" />

                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleAvatarChange}
                        accept="image/*,.heic,.heif"
                    />
                </div>

                <div className="text-center sm:text-left space-y-1.5">
                    <h3 className="text-2xl font-serif font-bold text-charcoal-900 tracking-tight">Profile Photo</h3>
                    <p className="text-[11px] font-medium text-charcoal-500 max-w-xs leading-relaxed">
                        This helps students and studios recognize you. Upload a clear photo of yourself.
                    </p>
                </div>
            </div>

            {/* Form Fields Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-10">
                <div className="space-y-8">
                    <div className="flex items-center gap-3 border-b border-cream-200/60 pb-3 mb-2">
                        <h3 className="text-xl font-serif font-bold text-charcoal-900 tracking-tight">Personal Details</h3>
                        <div className="h-px flex-1 bg-cream-100/50" />
                    </div>
                    
                    <div className="space-y-6">
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-charcoal-500 uppercase tracking-wider ml-1">Full Name</label>
                            <input
                                type="text"
                                name="fullName"
                                defaultValue={profile?.fullName || profile?.full_name || ''}
                                required
                                className="w-full px-5 py-4 bg-cream-50/20 border border-cream-200 rounded-xl text-charcoal-900 font-medium text-sm focus:outline-none focus:ring-4 focus:ring-charcoal-900/5 focus:border-charcoal-900 transition-all duration-300 shadow-sm placeholder:text-charcoal-300 hover:border-cream-300"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-charcoal-500 uppercase tracking-wider ml-1">Email Address</label>
                            <input
                                type="email"
                                name="email"
                                defaultValue={profile?.email || ''}
                                required
                                className="w-full px-5 py-4 bg-cream-50/20 border border-cream-200 rounded-xl text-charcoal-900 font-medium text-sm focus:outline-none focus:ring-4 focus:ring-charcoal-900/5 focus:border-charcoal-900 transition-all duration-300 shadow-sm placeholder:text-charcoal-300 hover:border-cream-300"
                            />
                            {profile?.new_email && (
                                <p className="mt-2 ml-2 text-[10px] text-gold font-bold uppercase tracking-[0.2em] animate-pulse">
                                    Pending verification: {profile.new_email}
                                </p>
                            )}
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-charcoal-500 uppercase tracking-wider ml-1">Instagram Handle</label>
                            <div className="relative group/input">
                                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-charcoal-400 font-bold text-sm">@</span>
                                <input
                                    type="text"
                                    name="instagram"
                                    defaultValue={profile?.instagram_handle || ''}
                                    className="w-full pl-10 pr-5 py-4 bg-cream-50/20 border border-cream-200 rounded-xl text-charcoal-900 font-medium text-sm focus:outline-none focus:ring-4 focus:ring-charcoal-900/5 focus:border-charcoal-900 transition-all duration-300 shadow-sm placeholder:text-charcoal-300 hover:border-cream-300"
                                    placeholder="username"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="flex items-center gap-3 border-b border-cream-200/60 pb-3 mb-2">
                        <h3 className="text-xl font-serif font-bold text-charcoal-900 tracking-tight">Contact & Safety</h3>
                        <div className="h-px flex-1 bg-cream-100/50" />
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-charcoal-500 uppercase tracking-wider ml-1">Phone Number</label>
                            <input
                                type="tel"
                                name="contactNumber"
                                defaultValue={profile?.contact_number || ''}
                                placeholder="09XXXXXXXXX"
                                maxLength={13}
                                className="w-full px-5 py-4 bg-cream-50/20 border border-cream-200 rounded-xl text-charcoal-900 font-medium text-sm focus:outline-none focus:ring-4 focus:ring-charcoal-900/5 focus:border-charcoal-900 transition-all duration-300 shadow-sm placeholder:text-charcoal-300 hover:border-cream-300"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-charcoal-500 uppercase tracking-wider ml-1">Emergency Name</label>
                            <input
                                type="text"
                                name="emergencyContactName"
                                defaultValue={profile?.emergency_contact_name || profile?.emergency_contact || ''}
                                placeholder="Contact Name"
                                className="w-full px-5 py-4 bg-cream-50/20 border border-cream-200 rounded-xl text-charcoal-900 font-medium text-sm focus:outline-none focus:ring-4 focus:ring-charcoal-900/5 focus:border-charcoal-900 transition-all duration-300 shadow-sm placeholder:text-charcoal-300 hover:border-cream-300"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-charcoal-500 uppercase tracking-wider ml-1">Emergency Phone</label>
                            <input
                                type="tel"
                                name="emergencyContactPhone"
                                defaultValue={profile?.emergency_contact_phone || ''}
                                placeholder="09XXXXXXXXX"
                                className="w-full px-5 py-4 bg-cream-50/20 border border-cream-200 rounded-xl text-charcoal-900 font-medium text-sm focus:outline-none focus:ring-4 focus:ring-charcoal-900/5 focus:border-charcoal-900 transition-all duration-300 shadow-sm placeholder:text-charcoal-300 hover:border-cream-300"
                            />
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2 pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                        <div className="md:col-span-1 space-y-1.5">
                            <label className="block text-xs font-bold text-charcoal-500 uppercase tracking-wider ml-1">Date of Birth</label>
                            <input
                                type="date"
                                name="birthday"
                                defaultValue={profile?.date_of_birth || ''}
                                className="w-full px-5 py-4 bg-cream-50/20 border border-cream-200 rounded-xl text-charcoal-900 font-medium text-sm focus:outline-none focus:ring-4 focus:ring-charcoal-900/5 focus:border-charcoal-900 transition-all duration-300 shadow-sm cursor-pointer hover:border-cream-300"
                            />
                        </div>
                        <div className="md:col-span-2 space-y-1.5">
                            <label className="block text-xs font-bold text-charcoal-500 uppercase tracking-wider ml-1">About You (Philosophy)</label>
                            <textarea
                                name="bio"
                                defaultValue={profile?.bio || ''}
                                rows={5}
                                placeholder="Tell studios and instructors about your fitness journey, goals, or philosophy..."
                                className="w-full px-6 py-5 bg-cream-50/20 border border-cream-200 rounded-2xl text-charcoal-900 font-medium text-sm focus:outline-none focus:ring-4 focus:ring-charcoal-900/5 focus:border-charcoal-900 resize-none transition-all duration-300 leading-relaxed shadow-sm placeholder:text-charcoal-300 hover:border-cream-300"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Medical Conditions */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 border-b border-cream-200/60 pb-3">
                    <div className="flex flex-col gap-0.5">
                        <h2 className="text-xl font-serif font-bold text-charcoal-900">Medical Conditions</h2>
                        <p className="text-[10px] font-bold text-charcoal-500 uppercase tracking-widest">Select all that apply to you</p>
                    </div>
                    <div className="h-px flex-1 bg-cream-100/50" />
                </div>

                <div className="flex flex-wrap gap-2.5">
                    {['Scoliosis', 'Obesity', 'Herniated Disc', 'Post-partum', 'Chronic Back Pain', 'Hypertension', 'Diabetes', 'Asthma', 'Osteoporosis', 'Others'].map((condition) => {
                        const isSelected = selectedMedicalConditions.includes(condition);
                        return (
                            <label
                                key={condition}
                                className={clsx(
                                    "relative flex items-center gap-3 px-5 py-3.5 border rounded-2xl cursor-pointer transition-all duration-500 overflow-hidden active:scale-95 group",
                                    isSelected 
                                        ? "border-forest shadow-md shadow-forest/10" 
                                        : "bg-white border-cream-200 hover:border-forest/30 hover:shadow-sm"
                                )}
                            >
                                <input
                                    type="checkbox"
                                    name="medical_conditions"
                                    value={condition}
                                    checked={isSelected}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedMedicalConditions([...selectedMedicalConditions, condition])
                                        } else {
                                            setSelectedMedicalConditions(selectedMedicalConditions.filter((item) => item !== condition))
                                        }
                                    }}
                                    className="peer absolute opacity-0"
                                />
                                <div className={clsx(
                                    "absolute inset-0 transition-opacity duration-500",
                                    isSelected ? "bg-forest opacity-100" : "bg-cream-50/30 opacity-0 group-hover:opacity-100"
                                )} />
                                
                                <div className={clsx(
                                    "relative z-10 w-4 h-4 flex-none rounded-full border-2 transition-all duration-500 flex items-center justify-center",
                                    isSelected ? "border-white" : "border-cream-200 group-hover:border-forest/40"
                                )}>
                                    <div className={clsx(
                                        "w-1.5 h-1.5 rounded-full transition-all duration-500",
                                        isSelected ? "bg-white scale-100" : "bg-forest scale-0"
                                    )} />
                                </div>
                                
                                <span className={clsx(
                                    "relative z-10 text-[10px] font-black uppercase tracking-[0.12em] transition-colors duration-500",
                                    isSelected ? "text-white" : "text-charcoal-600 group-hover:text-charcoal-900"
                                )}>
                                    {condition}
                                </span>
                            </label>
                        )
                    })}
                </div>
                {selectedMedicalConditions.includes('Others') && (
                    <div className="mt-8 animate-in slide-in-from-top-4 duration-500 space-y-1.5">
                        <label className="block text-xs font-bold text-charcoal-500 uppercase tracking-wider ml-1">Specify Other Conditions</label>
                        <input
                            type="text"
                            name="otherMedicalCondition"
                            defaultValue={profile?.other_medical_condition || ''}
                            placeholder="Please specify your condition(s)..."
                            className="w-full px-5 py-4 bg-cream-50/20 border border-cream-200 rounded-xl text-charcoal-900 font-medium text-sm focus:outline-none focus:ring-4 focus:ring-charcoal-900/5 focus:border-charcoal-900 transition-all duration-300 shadow-sm placeholder:text-charcoal-300 hover:border-cream-300"
                        />
                    </div>
                )}
            </div>

            {/* Teaching Equipment (Instructors Only) */}
            {profile?.role === 'instructor' && (
                <div className="space-y-6">
                    <div className="flex flex-col gap-1">
                        <label className="block text-[10px] font-black text-charcoal/60 uppercase tracking-[0.3em]">Equipment I can teach</label>
                        <p className="text-[10px] font-medium text-charcoal/50 italic">Select apparatuses you are qualified for</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {['Reformer', 'Cadillac', 'Tower', 'Chair', 'Ladder Barrel', 'Mat'].map((eq) => {
                            const isSelected = selectedEquipment.includes(eq);
                            return (
                                <label
                                    key={eq}
                                    className={clsx(
                                        "px-6 py-3.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] cursor-pointer transition-all duration-500 border shadow-sm flex items-center gap-3 active:scale-95",
                                        isSelected
                                            ? "bg-forest text-white border-forest shadow-forest/20"
                                            : "bg-white/40 text-charcoal/60 border-white/60 hover:bg-white hover:border-forest/30"
                                    )}
                                >
                                    <input
                                        type="checkbox"
                                        name="teaching_equipment"
                                        value={eq}
                                        checked={isSelected}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedEquipment([...selectedEquipment, eq])
                                            } else {
                                                setSelectedEquipment(selectedEquipment.filter((item) => item !== eq))
                                            }
                                        }}
                                        className="hidden"
                                    />
                                    {eq}
                                </label>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Teaching Rates (Instructors Only) */}
            {profile?.role === 'instructor' && (
                <div className="space-y-8 pt-4">
                    <div className="flex flex-col gap-1">
                        <label className="block text-[10px] font-black text-charcoal/60 uppercase tracking-[0.3em]">Rates per session (PHP)</label>
                        <p className="text-[10px] font-medium text-charcoal/50 italic">Define your pricing per session type</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {['Reformer', 'Cadillac', 'Tower', 'Chair', 'Ladder Barrel', 'Mat'].map((eq) => {
                            const isSelected = selectedEquipment.includes(eq);
                            return isSelected ? (
                                <div key={eq} className="animate-in zoom-in-95 duration-700 bg-white/30 backdrop-blur-sm p-6 rounded-[2rem] border border-white/60 shadow-sm">
                                    <label className="block text-[10px] font-black text-burgundy uppercase tracking-[0.3em] mb-4 ml-2">{eq}</label>
                                    <div className="relative">
                                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-charcoal/60 tracking-widest">PHP</span>
                                        <input
                                            type="number"
                                            name={`rate_${eq}`}
                                            defaultValue={profile?.rates?.[eq] || ''}
                                            placeholder="0.00"
                                            min="0"
                                            step="0.01"
                                            className="w-full pl-14 pr-6 py-5 bg-white border border-white/20 rounded-2xl text-charcoal font-serif text-xl outline-none focus:ring-4 focus:ring-burgundy/10 focus:border-burgundy/30 transition-all"
                                        />
                                    </div>
                                </div>
                            ) : null;
                        })}
                    </div>
                </div>
            )}

            {message && (
                <div className={clsx(
                    "p-5 rounded-[20px] text-xs font-bold uppercase tracking-wider animate-in slide-in-from-top-2",
                    message.includes('success') ? 'bg-sage/10 text-sage border border-sage/50 shadow-sm' : 'bg-red-50/20 text-red-600 border border-red-100'
                )}>
                    {message}
                </div>
            )}

            <div className="pt-12">
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full sm:w-auto px-14 py-5 bg-forest text-white rounded-[2rem] text-[11px] font-black uppercase tracking-[0.4em] hover:brightness-110 hover:shadow-2xl hover:shadow-forest/20 transition-all duration-500 shadow-xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-4 group"
                >
                    {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin text-gold" />
                    ) : (
                        <Save className="w-4 h-4 text-gold group-hover:rotate-12 group-hover:scale-110 transition-all duration-500" />
                    )}
                    {isLoading ? 'Processing' : 'Commit Changes'}
                </button>
            </div>
        </form>
    )
}
