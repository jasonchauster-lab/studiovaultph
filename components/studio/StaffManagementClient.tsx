'use client'

import { useState } from 'react'
import { UserPlus, Trash2, Loader2 } from 'lucide-react'
import InviteStaffModal from './InviteStaffModal'
import { removeStudioMember } from '@/app/(dashboard)/studio/studio-actions'
import Avatar from '@/components/shared/Avatar'
import { clsx } from 'clsx'

interface StaffMember {
    id: string
    role: string
    created_at: string
    profile: {
        id: string
        full_name: string
        email: string
        avatar_url: string | null
    }
}

interface StaffManagementClientProps {
    studioId: string
    initialMembers: StaffMember[]
    isPro: boolean
}

export default function StaffManagementClient({ studioId, initialMembers, isPro }: StaffManagementClientProps) {
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
    const [isRemoving, setIsRemoving] = useState<string | null>(null)

    const handleRemove = async (memberId: string) => {
        if (!confirm('Are you sure you want to remove this staff member? They will lose access to the studio dashboard immediately.')) return

        setIsRemoving(memberId)
        try {
            const result = await removeStudioMember(memberId)
            if (result.error) {
                alert(result.error)
            }
        } catch (err) {
            console.error('Error removing member:', err)
        } finally {
            setIsRemoving(null)
        }
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-end">
                {isPro ? (
                    <button 
                        onClick={() => setIsInviteModalOpen(true)}
                        className="px-8 py-4 bg-forest text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-card flex items-center gap-3"
                    >
                        <UserPlus className="w-4 h-4" />
                        Invite Staff Member
                    </button>
                ) : null}
            </div>

            <div className="grid grid-cols-1 gap-4">
                {initialMembers.map((member) => (
                    <div key={member.id} className="atelier-card p-8 bg-white border border-burgundy/5 shadow-tight flex items-center gap-8 group hover:shadow-ambient transition-all duration-500">
                        <Avatar 
                            src={member.profile?.avatar_url || ''}
                            fallbackName={member.profile?.full_name}
                            size={64}
                            className="border-2 border-white shadow-card group-hover:scale-105 transition-transform"
                        />
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                                <h3 className="text-xl font-serif text-charcoal tracking-tight">{member.profile?.full_name}</h3>
                                <span className={clsx(
                                    "px-2.5 py-1 text-[8px] font-black uppercase tracking-widest rounded-lg",
                                    member.role === 'admin' ? "bg-forest/10 text-forest" : "bg-burgundy/5 text-burgundy/60"
                                )}>
                                    {member.role}
                                </span>
                            </div>
                            <p className="text-[10px] font-bold text-charcoal/30 uppercase tracking-widest">{member.profile?.email}</p>
                        </div>
                        
                        <button 
                            onClick={() => handleRemove(member.id)}
                            disabled={isRemoving === member.id}
                            className="p-3 text-charcoal/10 hover:text-red-500 transition-colors disabled:opacity-50"
                            title="Remove Staff"
                        >
                            {isRemoving === member.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                        </button>
                    </div>
                ))}
                
                {initialMembers.length === 0 && isPro && (
                    <div className="py-24 flex flex-col items-center justify-center bg-off-white/20 rounded-[3rem] border border-dashed border-border-grey/60 text-center">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-tight mb-6">
                            <UserPlus className="w-6 h-6 text-charcoal/20" />
                        </div>
                        <h3 className="text-lg font-serif text-charcoal/40 tracking-tight">Your team is just you (for now)</h3>
                        <p className="text-[10px] font-black text-charcoal/30 uppercase tracking-[0.4em] mt-2 mb-8">Ready to grow? Invite your first staff member.</p>
                        <button 
                            onClick={() => setIsInviteModalOpen(true)}
                            className="px-8 py-3.5 border-2 border-forest/20 text-forest rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-forest hover:text-white transition-all shadow-tight"
                        >
                            Start Inviting
                        </button>
                    </div>
                )}
            </div>

            <InviteStaffModal 
                studioId={studioId}
                isOpen={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
            />
        </div>
    )
}
