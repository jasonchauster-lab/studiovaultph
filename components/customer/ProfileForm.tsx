'use client'

import { useState, useRef } from 'react'
import { updateProfile } from '@/app/(dashboard)/customer/profile/actions'
import { Loader2, Camera, User } from 'lucide-react'
import { isValidPhone, isValidEmail } from '@/lib/validation'
import Image from 'next/image'

export default function ProfileForm({ profile }: { profile: any }) {
    const [isLoading, setIsLoading] = useState(false)
    const [message, setMessage] = useState<string | null>(null)
    const [selectedEquipment, setSelectedEquipment] = useState<string[]>(profile?.teaching_equipment || [])

    const handleSubmit = async (formData: FormData) => {
        const contactNumber = formData.get('contactNumber') as string
        const emergencyContact = formData.get('emergencyContact') as string

        if (contactNumber && !isValidPhone(contactNumber)) {
            setMessage('Please enter a valid contact number (at least 7 digits).')
            return
        }

        // For emergency contact, we just check if it contains SOME digits if provided
        if (emergencyContact && !/\d{7,}/.test(emergencyContact)) {
            setMessage('Please include a phone number in your emergency contact.')
            return
        }

        setIsLoading(true)
        setMessage(null)

        const result = await updateProfile(formData)

        if (result.success) {
            setMessage('Profile updated successfully!')
        } else {
            setMessage('Failed to update profile. ' + (result.error || ''))
        }

        setIsLoading(false)
    }

    // State for avatar preview
    const [previewUrl, setPreviewUrl] = useState<string | null>(profile?.avatar_url || null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const url = URL.createObjectURL(file)
            setPreviewUrl(url)
        }
    }

    return (
        <form action={handleSubmit} className="space-y-6">

            {/* Avatar Upload */}
            {/* Profile Header: Avatar and Name */}
            <div className="flex flex-col items-center sm:flex-row gap-8 pb-8 border-b border-cream-100">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-md bg-cream-100 flex items-center justify-center">
                        {previewUrl ? (
                            <Image
                                src={previewUrl}
                                alt="Profile"
                                width={128}
                                height={128}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <User className="w-12 h-12 text-charcoal-300" />
                        )}
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                            <Camera className="w-8 h-8 text-white" />
                        </div>
                    </div>
                    <input
                        type="file"
                        name="avatar"
                        accept="image/*"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleAvatarChange}
                    />
                </div>

                <div className="text-center sm:text-left space-y-2">
                    <h3 className="text-xl font-serif text-charcoal-900">Profile Picture</h3>
                    <p className="text-sm text-charcoal-500 max-w-xs">
                        Upload a clear photo of yourself. This helps students and studios recognize you.
                    </p>
                </div>
            </div>

            {/* Form Fields Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Full Name</label>
                        <input
                            type="text"
                            name="fullName"
                            defaultValue={profile?.full_name || ''}
                            required
                            className="w-full px-4 py-3 bg-cream-50 border border-cream-200 rounded-xl text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-charcoal-900 transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Instagram Handle</label>
                        <div className="relative">
                            <span className="absolute left-4 top-3.5 text-charcoal-400">@</span>
                            <input
                                type="text"
                                name="instagram"
                                defaultValue={profile?.instagram_handle || ''}
                                className="w-full pl-10 pr-4 py-3 bg-cream-50 border border-cream-200 rounded-xl text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-charcoal-900 transition-all"
                                placeholder="username"
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Contact Number</label>
                        <input
                            type="text"
                            name="contactNumber"
                            defaultValue={profile?.contact_number || ''}
                            placeholder="e.g. 09171234567"
                            className="w-full px-4 py-3 bg-cream-50 border border-cream-200 rounded-xl text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-charcoal-900 transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Emergency Contact</label>
                        <input
                            type="text"
                            name="emergencyContact"
                            defaultValue={profile?.emergency_contact || ''}
                            placeholder="Name and Phone Number"
                            className="w-full px-4 py-3 bg-cream-50 border border-cream-200 rounded-xl text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-charcoal-900 transition-all"
                        />
                    </div>
                    <p className="text-xs text-charcoal-400 mt-2 italic">
                        Highly recommended for safety during in-studio sessions.
                    </p>
                </div>

                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Bio</label>
                    <textarea
                        name="bio"
                        defaultValue={profile?.bio || ''}
                        rows={5}
                        placeholder="Tell others about yourself, your fitness journey, or your teaching style..."
                        className="w-full px-4 py-3 bg-cream-50 border border-cream-200 rounded-xl text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-charcoal-900 resize-none transition-all"
                    />
                </div>
            </div>

            {/* Teaching Equipment (Instructors Only) */}
            {profile?.role === 'instructor' && (
                <div>
                    <label className="block text-sm font-medium text-charcoal-700 mb-2">Teaching Equipment</label>
                    <div className="grid grid-cols-2 gap-2">
                        {['Reformer', 'Cadillac', 'Chair', 'Barrel', 'Mat'].map((eq) => (
                            <label key={eq} className="flex items-center gap-2 p-3 border border-cream-200 rounded-lg hover:bg-cream-50 cursor-pointer transition-colors">
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
                                    className="w-4 h-4 text-charcoal-900 rounded border-cream-300 focus:ring-charcoal-500"
                                />
                                <span className="text-sm text-charcoal-700">{eq}</span>
                            </label>
                        ))}
                    </div>
                    <p className="text-xs text-charcoal-500 mt-1">Select the equipment you are certified to teach.</p>
                </div>
            )}

            {/* Teaching Rates (Instructors Only) */}
            {profile?.role === 'instructor' && (
                <div>
                    <label className="block text-sm font-medium text-charcoal-700 mb-2">Teaching Rates (PHP/hr)</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {['Reformer', 'Cadillac', 'Chair', 'Barrel', 'Mat'].map((eq) => {
                            const isSelected = selectedEquipment.includes(eq);
                            return (
                                <div key={eq} className={`transition-all duration-300 ${!isSelected ? 'opacity-40 grayscale' : ''}`}>
                                    <label className="block text-xs font-medium text-charcoal-600 mb-1">{eq}</label>
                                    <div className="relative">
                                        <span className={`absolute left-3 top-2 text-sm transition-colors ${isSelected ? 'text-charcoal-400' : 'text-charcoal-300'}`}>₱</span>
                                        <input
                                            type="number"
                                            name={`rate_${eq}`}
                                            defaultValue={profile?.rates?.[eq] || ''}
                                            placeholder="0.00"
                                            min="0"
                                            step="0.01"
                                            disabled={!isSelected}
                                            className="w-full pl-7 pr-3 py-2 bg-white border border-cream-200 rounded-lg text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-charcoal-900 text-sm disabled:bg-cream-50/50 disabled:cursor-not-allowed transition-all"
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {message && (
                <p className={`text-sm ${message.includes('Success') ? 'text-green-600' : 'text-green-600'}`}>
                    {message}
                </p>
            )}

            <button
                type="submit"
                disabled={isLoading}
                className="bg-charcoal-900 text-cream-50 px-6 py-2 rounded-lg font-medium hover:bg-charcoal-800 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Changes
            </button>
        </form>
    )
}
