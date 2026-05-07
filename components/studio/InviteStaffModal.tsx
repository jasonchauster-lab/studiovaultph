'use client'

import { useState } from 'react'
import { addStudioMember } from '@/app/(dashboard)/studio/studio-actions'
import { Loader2, UserPlus, X, Mail, Shield } from 'lucide-react'
import clsx from 'clsx'

interface InviteStaffModalProps {
    studioId: string
    isOpen: boolean
    onClose: () => void
}

export default function InviteStaffModal({ studioId, isOpen, onClose }: InviteStaffModalProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)
        setSuccess(false)

        const formData = new FormData(e.currentTarget)
        formData.append('studioId', studioId)

        try {
            const result = await addStudioMember(formData)
            if (result.error) {
                setError(result.error)
            } else {
                setSuccess(true)
                setTimeout(() => {
                    onClose()
                    setSuccess(false)
                }, 2000)
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-burgundy/60" onClick={onClose} />
            
            <div className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl border border-burgundy/5 animate-in zoom-in-95 duration-300 overflow-hidden">
                <div className="p-8 border-b border-burgundy/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-forest/10 rounded-2xl flex items-center justify-center">
                            <UserPlus className="w-6 h-6 text-forest" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-serif text-charcoal tracking-tight">Invite Staff</h2>
                            <p className="text-[10px] font-black text-charcoal/30 uppercase tracking-widest mt-0.5">Add a new member to your team</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-charcoal/20 hover:text-charcoal transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-charcoal/40 uppercase tracking-[0.2em] ml-1">Staff Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal/20" />
                            <input
                                type="email"
                                name="email"
                                required
                                placeholder="name@example.com"
                                className="w-full pl-12 pr-4 py-4 bg-off-white/40 border border-border-grey/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest transition-all"
                            />
                        </div>
                        <p className="text-[10px] text-charcoal/30 italic ml-1">The user must have an existing StudioVault account.</p>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-charcoal/40 uppercase tracking-[0.2em] ml-1">Permissions Role</label>
                        <div className="relative">
                            <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal/20" />
                            <select
                                name="role"
                                defaultValue="staff"
                                className="w-full pl-12 pr-4 py-4 bg-off-white/40 border border-border-grey/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest transition-all appearance-none"
                            >
                                <option value="staff">Staff (Standard Dashboard Access)</option>
                                <option value="instructor">Instructor (Schedule Management Only)</option>
                                <option value="admin">Admin (Full Studio Management)</option>
                            </select>
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-xs font-black uppercase tracking-wider text-center">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="p-4 bg-forest/10 border border-forest/20 text-forest rounded-2xl text-xs font-black uppercase tracking-wider text-center">
                            Staff member added successfully!
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading || success}
                        className={clsx(
                            "w-full py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] shadow-card transition-all flex items-center justify-center gap-3",
                            isLoading || success ? "bg-stone-100 text-charcoal/20" : "bg-forest text-white hover:brightness-110 active:scale-[0.98]"
                        )}
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                        {isLoading ? 'Processing...' : 'Send Invitation'}
                    </button>
                    
                    <p className="text-[9px] text-charcoal/30 text-center uppercase tracking-widest leading-relaxed">
                        By inviting staff, you grant them access to your studio's dashboard according to their assigned role.
                    </p>
                </form>
            </div>
        </div>
    )
}
