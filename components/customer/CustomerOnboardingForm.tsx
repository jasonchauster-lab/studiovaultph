'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateProfile } from '@/app/(dashboard)/customer/profile/actions'
import { Loader2, Save, Phone, Calendar, HeartPulse } from 'lucide-react'
import { isValidPhone, phoneErrorMessage } from '@/lib/validation'
import { clsx } from 'clsx'

export default function CustomerOnboardingForm({ profile }: { profile: any }) {
    const [isLoading, setIsLoading] = useState(false)
    const [message, setMessage] = useState<string | null>(null)
    const [selectedMedicalConditions, setSelectedMedicalConditions] = useState<string[]>(profile?.medical_conditions || [])
    const router = useRouter()

    const handleSubmit = async (formData: FormData) => {
        const contactNumber = formData.get('contactNumber') as string
        const birthday = formData.get('birthday') as string

        if (!birthday) {
            setMessage('Please provide your date of birth.')
            return
        }

        if (!contactNumber) {
            setMessage('Please provide your contact number.')
            return
        }

        if (contactNumber && !isValidPhone(contactNumber)) {
            setMessage(phoneErrorMessage)
            return
        }

        setIsLoading(true)
        setMessage(null)

        // Ensure we pass fullName and other required fields from existing profile
        // because updateProfile overwrites them if not provided
        formData.append('fullName', profile.full_name)
        
        const result = await updateProfile(formData)

        if (result.success) {
            setMessage('Profile updated successfully! Redirecting...')
            setTimeout(() => {
                router.push('/customer')
                router.refresh()
            }, 1500)
        } else {
            setMessage('Failed to update profile. ' + (result.error || ''))
            setIsLoading(false)
        }
    }

    return (
        <form action={handleSubmit} className="space-y-10">
            <div className="space-y-8">
                {/* Phone Number */}
                <div className="space-y-3">
                    <label className="flex items-center gap-2 text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em] px-1">
                        <Phone className="w-3 h-3 text-burgundy" />
                        Contact Number
                    </label>
                    <input
                        type="tel"
                        name="contactNumber"
                        defaultValue={profile?.contact_number || ''}
                        placeholder="09XXXXXXXXX"
                        maxLength={13}
                        required
                        className="w-full px-6 py-4 bg-off-white border border-border-grey rounded-xl text-charcoal font-medium text-sm outline-none focus:ring-1 focus:ring-burgundy transition-all placeholder:text-slate/30"
                    />
                </div>

                {/* Date of Birth */}
                <div className="space-y-3">
                    <label className="flex items-center gap-2 text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em] px-1">
                        <Calendar className="w-3 h-3 text-burgundy" />
                        Date of Birth
                    </label>
                    <input
                        type="date"
                        name="birthday"
                        defaultValue={profile?.date_of_birth || ''}
                        required
                        className="w-full px-6 py-4 bg-off-white border border-border-grey rounded-xl text-charcoal font-medium text-sm outline-none focus:ring-1 focus:ring-burgundy transition-all"
                    />
                </div>

                {/* Medical Conditions */}
                <div className="space-y-6">
                    <label className="flex items-center gap-2 text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em] px-1">
                        <HeartPulse className="w-3 h-3 text-burgundy" />
                        Medical Conditions
                    </label>
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
                                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide group-hover:text-charcoal transition-colors">{condition}</span>
                            </label>
                        ))}
                    </div>
                    {selectedMedicalConditions.includes('Others') && (
                        <div className="mt-4 animate-in slide-in-from-top-2">
                            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em] mb-2 px-1">Other Medical Conditions</label>
                            <input
                                type="text"
                                name="otherMedicalCondition"
                                defaultValue={profile?.other_medical_condition || ''}
                                placeholder="Please specify..."
                                className="w-full px-6 py-4 bg-off-white border border-border-grey rounded-xl text-charcoal font-medium text-sm outline-none focus:ring-1 focus:ring-burgundy transition-all shadow-tight"
                            />
                        </div>
                    )}
                </div>
            </div>

            {message && (
                <div className={clsx(
                    "p-5 rounded-xl text-[10px] font-bold uppercase tracking-widest animate-in fade-in slide-in-from-top-2 text-center border shadow-tight",
                    message.includes('success') ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'
                )}>
                    {message}
                </div>
            )}

            <button
                type="submit"
                disabled={isLoading}
                className="btn-forest w-full py-5 rounded-xl text-[11px] font-bold uppercase tracking-[0.3em] shadow-tight disabled:opacity-50 flex items-center justify-center gap-4 transition-all active:scale-95"
            >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {isLoading ? 'Saving...' : 'Complete Registration'}
            </button>
        </form>
    )
}
