'use client'

import { useState, useRef } from 'react'
import { updateProfile } from '@/app/(dashboard)/customer/profile/actions'
import { Loader2, Camera, Save, User, FileText } from 'lucide-react'
import { isValidPhone, isValidEmail, phoneErrorMessage } from '@/lib/validation'
import Image from 'next/image'
import WaiverUpload from '@/components/customer/WaiverUpload'
import { normalizeImageFile } from '@/lib/utils/image-utils'
import { clsx } from 'clsx'

export default function ProfileForm({ profile }: { profile: any }) {
    const [isLoading, setIsLoading] = useState(false)
    const [message, setMessage] = useState<string | null>(null)
    const [selectedEquipment, setSelectedEquipment] = useState<string[]>(profile?.teaching_equipment || [])
    const [selectedMedicalConditions, setSelectedMedicalConditions] = useState<string[]>(profile?.medical_conditions || [])

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

    // State for avatar preview
    const [previewUrl, setPreviewUrl] = useState<string | null>(profile?.avatar_url || '/default-avatar.svg')
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setIsLoading(true)
            try {
                const processedFile = await normalizeImageFile(file)
                const url = URL.createObjectURL(processedFile)
                setPreviewUrl(url)
            } catch (err) {
                console.error('Avatar processing failed', err)
                setMessage('Failed to process image format.')
            } finally {
                setIsLoading(false)
            }
        }
    }

    return (
        <form action={handleSubmit} className="space-y-12">

            {/* Avatar Upload */}
            <div className="flex flex-col items-center sm:flex-row gap-10 pb-12 border-b border-white/60">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-cloud bg-white/40 flex items-center justify-center relative z-10">
                        {previewUrl ? (
                            <Image
                                src={previewUrl}
                                alt="Profile"
                                width={128}
                                height={128}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                        ) : (
                            <User className="w-12 h-12 text-charcoal/10" />
                        )}
                        <div className="absolute inset-0 bg-charcoal/20 opacity-0 group-hover:opacity-100 transition-all duration-700 backdrop-blur-[2px] flex items-center justify-center">
                            <Camera className="w-8 h-8 text-white" />
                        </div>
                    </div>
                    {/* Decorative Ring */}
                    <div className="absolute inset-0 rounded-full border border-gold/20 scale-110 opacity-0 group-hover:opacity-100 transition-all duration-700 group-hover:scale-125 pointer-events-none" />

                    <input
                        type="file"
                        name="avatar"
                        accept="image/*,.heic,.heif"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleAvatarChange}
                    />
                </div>

                <div className="text-center sm:text-left">
                    <h3 className="text-2xl font-serif text-charcoal tracking-tight mb-2">Profile Picture</h3>
                    <p className="text-sm font-medium text-charcoal/60 max-w-xs leading-relaxed">
                        This helps students and studios recognize you.
                    </p>
                </div>
            </div>

            {/* Form Fields Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                <div className="space-y-8">
                    <div>
                        <label className="block text-xs font-semibold text-charcoal/60 uppercase tracking-wider mb-3">Full Name</label>
                        <input
                            type="text"
                            name="fullName"
                            defaultValue={profile?.fullName || profile?.full_name || ''}
                            required
                            className="w-full px-6 py-4 bg-white/40 border border-white/60 rounded-[20px] text-charcoal font-medium text-sm outline-none focus:ring-4 focus:ring-gold/10 focus:border-gold/30 transition-all shadow-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-charcoal/60 uppercase tracking-wider mb-3">Email Address</label>
                        <input
                            type="email"
                            name="email"
                            defaultValue={profile?.email || ''}
                            required
                            className="w-full px-6 py-4 bg-white/40 border border-white/60 rounded-[20px] text-charcoal font-medium text-sm outline-none focus:ring-4 focus:ring-gold/10 focus:border-gold/30 transition-all shadow-sm"
                        />
                        {profile?.new_email && (
                            <p className="mt-2 text-[10px] text-gold font-bold uppercase tracking-wider">
                                Pending verification: {profile.new_email}
                            </p>
                        )}
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-charcoal/60 uppercase tracking-wider mb-3">Instagram Handle</label>
                        <div className="relative">
                            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-gold font-bold text-sm">@</span>
                            <input
                                type="text"
                                name="instagram"
                                defaultValue={profile?.instagram_handle || ''}
                                className="w-full pl-12 pr-6 py-4 bg-white/40 border border-white/60 rounded-[20px] text-charcoal font-medium text-sm outline-none focus:ring-4 focus:ring-gold/10 focus:border-gold/30 transition-all shadow-sm"
                                placeholder="username"
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    <div>
                        <label className="block text-xs font-semibold text-charcoal/60 uppercase tracking-wider mb-3">Phone Number</label>
                        <input
                            type="tel"
                            name="contactNumber"
                            defaultValue={profile?.contact_number || ''}
                            placeholder="09XXXXXXXXX"
                            maxLength={13}
                            className="w-full px-6 py-4 bg-white/40 border border-white/60 rounded-[20px] text-charcoal font-medium text-sm outline-none focus:ring-4 focus:ring-gold/10 focus:border-gold/30 transition-all shadow-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-charcoal/60 uppercase tracking-wider mb-3">Emergency Name</label>
                        <input
                            type="text"
                            name="emergencyContactName"
                            defaultValue={profile?.emergency_contact_name || profile?.emergency_contact || ''}
                            placeholder="Contact Name"
                            className="w-full px-6 py-4 bg-white/40 border border-white/60 rounded-[20px] text-charcoal font-medium text-sm outline-none focus:ring-4 focus:ring-gold/10 focus:border-gold/30 transition-all shadow-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-charcoal/60 uppercase tracking-wider mb-3">Emergency Phone</label>
                        <input
                            type="tel"
                            name="emergencyContactPhone"
                            defaultValue={profile?.emergency_contact_phone || ''}
                            placeholder="09XXXXXXXXX"
                            className="w-full px-6 py-4 bg-white/40 border border-white/60 rounded-[20px] text-charcoal font-medium text-sm outline-none focus:ring-4 focus:ring-gold/10 focus:border-gold/30 transition-all shadow-sm"
                        />
                    </div>
                </div>

                <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-charcoal/60 uppercase tracking-wider mb-3">Date of Birth</label>
                    <input
                        type="date"
                        name="birthday"
                        defaultValue={profile?.date_of_birth || ''}
                        className="w-full sm:w-64 px-6 py-4 bg-white/40 border border-white/60 rounded-[20px] text-charcoal font-medium text-sm outline-none focus:ring-4 focus:ring-gold/10 focus:border-gold/30 transition-all shadow-sm cursor-pointer"
                    />
                </div>

                <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-charcoal/60 uppercase tracking-wider mb-3">About You</label>
                    <textarea
                        name="bio"
                        defaultValue={profile?.bio || ''}
                        rows={6}
                        placeholder="Tell studios and instructors about your fitness journey, goals, or philosophy..."
                        className="w-full px-6 py-6 bg-white/40 border border-white/60 rounded-[2rem] text-charcoal font-medium text-sm outline-none focus:ring-4 focus:ring-gold/10 focus:border-gold/30 resize-none transition-all leading-relaxed shadow-sm"
                    />
                </div>
            </div>

            {/* Medical Conditions */}
            <div className="space-y-6">
                <label className="block text-xs font-semibold text-charcoal/60 uppercase tracking-wider">Medical Conditions</label>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {['Scoliosis', 'Obesity', 'Herniated Disc', 'Post-partum', 'Chronic Back Pain', 'Hypertension', 'Diabetes', 'Asthma', 'Osteoporosis', 'Others'].map((condition) => (
                        <label key={condition} className="group flex items-center gap-4 p-5 bg-white/40 border border-white/60 rounded-[20px] hover:bg-white hover:border-gold/30 cursor-pointer transition-all duration-500 shadow-sm relative">
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
                                className="w-5 h-5 text-gold border-white/60 bg-white/20 rounded-lg focus:ring-gold/20 focus:ring-offset-0 transition-all cursor-pointer"
                            />
                            <span className="text-xs font-semibold text-charcoal/60 uppercase tracking-wide group-hover:text-charcoal transition-colors">{condition}</span>
                        </label>
                    ))}
                </div>
                {selectedMedicalConditions.includes('Others') && (
                    <div className="mt-6 animate-in slide-in-from-top-4">
                        <label className="block text-xs font-semibold text-charcoal/60 uppercase tracking-wider mb-3">Other Medical Conditions</label>
                        <input
                            type="text"
                            name="otherMedicalCondition"
                            defaultValue={profile?.other_medical_condition || ''}
                            placeholder="Please specify..."
                            className="w-full px-6 py-4 bg-white/40 border border-white/60 rounded-[20px] text-charcoal font-medium text-sm outline-none focus:ring-4 focus:ring-gold/10 focus:border-gold/30 transition-all shadow-sm"
                        />
                    </div>
                )}
            </div>

            {/* Teaching Equipment (Instructors Only) */}
            {profile?.role === 'instructor' && (
                <div className="space-y-6">
                    <label className="block text-xs font-semibold text-charcoal/60 uppercase tracking-wider">Equipment I can teach</label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                        {['Reformer', 'Cadillac', 'Chair', 'Ladder Barrel', 'Mat'].map((eq) => (
                            <label key={eq} className="group flex items-center gap-4 p-5 bg-white/40 border border-white/60 rounded-[20px] hover:bg-white hover:border-gold/30 cursor-pointer transition-all duration-500 shadow-sm">
                                <input
                                    type="checkbox"
                                    name="teaching_equipment"
                                    value={eq}
                                    checked={selectedEquipment.includes(eq)}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedEquipment([...selectedEquipment, eq])
                                        } else {
                                            setSelectedEquipment(selectedEquipment.filter((item) => item !== eq))
                                        }
                                    }}
                                    className="w-5 h-5 text-gold border-white/60 bg-white/20 rounded-lg focus:ring-gold/20 transition-all cursor-pointer"
                                />
                                <span className="text-xs font-semibold text-charcoal/60 uppercase tracking-wide group-hover:text-charcoal transition-colors">{eq}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}

            {/* Teaching Rates (Instructors Only) */}
            {profile?.role === 'instructor' && (
                <div className="space-y-6">
                    <label className="block text-xs font-semibold text-charcoal/60 uppercase tracking-wider">Rates per session (PHP)</label>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {['Reformer', 'Cadillac', 'Chair', 'Ladder Barrel', 'Mat'].map((eq) => {
                            const isSelected = selectedEquipment.includes(eq);
                            return isSelected ? (
                                <div key={eq} className="animate-in zoom-in-95 duration-500">
                                    <label className="block text-[10px] font-bold text-gold uppercase tracking-wider mb-2">{eq}</label>
                                    <div className="relative">
                                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-charcoal/20">₱</span>
                                        <input
                                            type="number"
                                            name={`rate_${eq}`}
                                            defaultValue={profile?.rates?.[eq] || ''}
                                            placeholder="0"
                                            min="0"
                                            step="0.01"
                                            className="w-full pl-8 pr-6 py-4 bg-white/40 border border-white/60 rounded-xl text-charcoal font-medium text-sm outline-none focus:ring-4 focus:ring-gold/10 focus:border-gold/30 transition-all shadow-sm"
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

            <div className="pt-10">
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full sm:w-auto px-16 py-6 bg-charcoal text-white rounded-[2rem] text-[11px] font-black uppercase tracking-[0.4em] hover:brightness-[1.2] transition-all shadow-cloud active:scale-95 disabled:opacity-50 flex items-center justify-center gap-4"
                >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-gold" /> : <Save className="w-5 h-5 text-gold stroke-[2px]" />}
                    {isLoading ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </form>
    )
}
