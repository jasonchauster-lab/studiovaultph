'use client'

import { useState } from 'react'
import { Plus, Search, Filter, Mail, Phone, ChevronDown, MoreHorizontal, Shield, User, MapPin, Loader2, UserPlus, Info, Trash2 } from 'lucide-react'
import { clsx } from 'clsx'
import Link from 'next/link'
import Avatar from '@/components/shared/Avatar'
import { updateStaffMember } from '@/app/(dashboard)/studio/management/actions'
import { removeStudioMember } from '@/app/(dashboard)/studio/studio-actions'

interface StaffMember {
    id: string
    role: string
    created_at: string
    profile: {
        id: string
        full_name: string
        email: string
        avatar_url: string
    }
    outlet_members: {
        id: string
        outlet_id: string
    }[]
    metadata?: any
    invited_by?: {
        full_name: string
    }
}

interface StaffManagementViewProps {
    studio: any
    initialMembers: StaffMember[]
    outlets: any[]
}

const TABS = ['Staff', 'Guest', 'Invited', 'Locked', 'Deactivated', 'Draft']

export default function StaffManagementView({ studio, initialMembers, outlets }: StaffManagementViewProps) {
    const [members, setMembers] = useState(initialMembers)
    const [searchQuery, setSearchQuery] = useState('')
    const [activeTab, setActiveTab] = useState('Staff')
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    // Filter logic
    const filteredMembers = members.filter(member => {
        const profile = member.profile || { full_name: '', email: '' }
        const name = (profile.full_name || '').toLowerCase()
        const email = (profile.email || '').toLowerCase()
        const search = searchQuery.toLowerCase()

        const matchesSearch = name.includes(search) || email.includes(search)
        
        // Temporarily allow all members in 'Staff' tab for visibility
        if (activeTab === 'Staff') return matchesSearch
        
        // Filter for other tabs based on metadata status if available
        const status = String(member.metadata?.status || 'active').toLowerCase()
        if (activeTab === 'Invited' && status === 'invited') return matchesSearch
        if (activeTab === 'Locked' && status === 'locked') return matchesSearch
        if (activeTab === 'Deactivated' && status === 'deactivated') return matchesSearch
        
        return false
    })

    const [editingMember, setEditingMember] = useState<StaffMember | null>(null)

    const handleRemoveMember = async (memberId: string) => {
        if (!confirm('Are you sure you want to remove this staff member?')) return
        
        setIsLoading(true)
        try {
            const res = await removeStudioMember(memberId)
            if (res?.error) {
                alert(res.error)
            } else {
                setMembers(prev => prev.filter(m => m.id !== memberId))
            }
        } catch (error) {
            console.error(error)
            alert('An unexpected error occurred.')
        } finally {
            setIsLoading(false)
            setActiveDropdown(null)
        }
    }

    const handleUpdateRole = async (memberId: string, newRoleId: string) => {
        setIsLoading(true)
        const formData = new FormData()
        formData.append('memberId', memberId)
        formData.append('role', newRoleId)
        
        try {
            const res = await updateStaffMember(formData)
            if (res.success) {
                const roleName = roles?.find(r => r.id === newRoleId)?.name || newRoleId
                setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: roleName } : m))
                setEditingMember(null)
            } else {
                alert(res.error)
            }
        } catch (err) {
            alert('Failed to update role')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="space-y-10 pb-20">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black text-zinc-900 tracking-tightest font-atelier text-6xl">Staff</h1>
                </div>
                <Link 
                    href="/studio/management/staff/members/add"
                    className="flex items-center gap-3 px-8 py-4 bg-[#2D3282] text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-zinc-200"
                >
                    <Plus className="w-4 h-4" />
                    Add Staff
                </Link>
            </div>

            {/* Content Card */}
            <div className="bg-white rounded-[2.5rem] border border-zinc-100 shadow-sm overflow-hidden min-h-[600px] flex flex-col">
                {/* Search & Filters Bar */}
                <div className="p-8 border-b border-zinc-50 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="flex items-center gap-6 overflow-x-auto scrollbar-hide">
                        {TABS.map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={clsx(
                                    "whitespace-nowrap pb-2 text-[11px] font-black uppercase tracking-widest transition-all relative",
                                    activeTab === tab ? "text-[#2D3282]" : "text-zinc-300 hover:text-zinc-500"
                                )}
                            >
                                {tab}
                                {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2D3282]" />}
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Filters */}
                        <div className="flex items-center gap-2 px-6 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-zinc-400">
                            Location: All <ChevronDown className="w-3 h-3" />
                        </div>
                        <div className="flex items-center gap-2 px-6 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-zinc-400">
                            Role: All <ChevronDown className="w-3 h-3" />
                        </div>
                        <div className="flex items-center gap-2 px-6 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-zinc-400">
                            Availability <ChevronDown className="w-3 h-3" />
                        </div>
                        
                        {/* Search Input */}
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                            <input
                                type="text"
                                placeholder="Search email, name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-14 pr-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-[13px] font-medium outline-none focus:bg-white focus:ring-4 focus:ring-zinc-100/50 transition-all placeholder:text-zinc-300"
                            />
                        </div>
                    </div>
                </div>

                {/* Table Area */}
                <div className="flex-1 overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-zinc-50">
                                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-[#2D3282]/40">Staff</th>
                                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-[#2D3282]/40">Role</th>
                                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-[#2D3282]/40 text-center">Invited by</th>
                                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-[#2D3282]/40 text-center">Invited on</th>
                                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-[#2D3282]/40 text-center">Availability</th>
                                <th className="px-10 py-6 sr-only">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                            {filteredMembers.map((member) => (
                                <tr key={member.id} className="group hover:bg-zinc-50/50 transition-colors">
                                    <td className="px-10 py-8">
                                        <div className="flex items-center gap-4">
                                            <Avatar 
                                                src={member.profile?.avatar_url} 
                                                fallbackName={member.profile?.full_name} 
                                                className="w-12 h-12 rounded-[1.25rem] shadow-sm"
                                            />
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-zinc-900 tracking-tight">{member.profile?.full_name || 'Unknown'}</span>
                                                <span className="text-[11px] font-medium text-zinc-400">{member.profile?.email || 'No email'}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-10 py-8">
                                        <span className="px-3 py-1 bg-zinc-100 rounded-lg text-[9px] font-black uppercase tracking-widest text-zinc-500 whitespace-nowrap">
                                            {member.role || 'Staff'}
                                        </span>
                                    </td>
                                    <td className="px-10 py-8 text-center text-xs font-bold text-zinc-500">
                                        {member.invited_by?.full_name || 'System'}
                                    </td>
                                    <td className="px-10 py-8 text-center text-xs font-bold text-zinc-500">
                                        {member.created_at ? new Date(member.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                                    </td>
                                    <td className="px-10 py-8 border-r border-[#2D3282]/5">
                                        <div className="flex justify-center">
                                            <div className={clsx(
                                                "w-2.5 h-2.5 rounded-full shadow-sm",
                                                member.metadata?.is_bookable !== false ? "bg-forest" : "bg-zinc-200"
                                            )} />
                                        </div>
                                    </td>
                                    <td className="px-10 py-8 text-right">
                                        <div className="flex items-center justify-end gap-2 relative">
                                            <button 
                                                onClick={() => handleRemoveMember(member.id)}
                                                className="p-2 text-zinc-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                                                title="Remove Staff"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                            
                                            <div className="relative">
                                                <button 
                                                    onClick={() => setActiveDropdown(activeDropdown === member.id ? null : member.id)}
                                                    className={clsx(
                                                        "p-2 rounded-lg transition-colors",
                                                        activeDropdown === member.id ? "bg-zinc-100 text-zinc-900" : "text-zinc-300 hover:text-zinc-900"
                                                    )}
                                                >
                                                    <MoreHorizontal className="w-5 h-5" />
                                                </button>

                                                {activeDropdown === member.id && (
                                                    <>
                                                        <div 
                                                            className="fixed inset-0 z-10" 
                                                            onClick={() => setActiveDropdown(null)}
                                                        />
                                                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-zinc-100 py-2 z-20 overflow-hidden animate-in fade-in zoom-in duration-200">
                                                            <button 
                                                                className="w-full text-left px-6 py-3 text-[11px] font-black uppercase tracking-widest text-zinc-600 hover:bg-zinc-50 transition-colors"
                                                                onClick={() => {
                                                                    setEditingMember(member)
                                                                    setActiveDropdown(null)
                                                                }}
                                                            >
                                                                Quick Edit
                                                            </button>
                                                            <Link 
                                                                href={`/studio/schedule?staffId=${member.profile?.id}`}
                                                                className="block w-full text-left px-6 py-3 text-[11px] font-black uppercase tracking-widest text-zinc-600 hover:bg-zinc-50 transition-colors"
                                                            >
                                                                View Schedule
                                                            </Link>
                                                            <div className="h-px bg-zinc-50 my-1" />
                                                            <button 
                                                                className="w-full text-left px-6 py-3 text-[11px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 transition-colors"
                                                                onClick={() => handleRemoveMember(member.id)}
                                                            >
                                                                Remove
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    
                    {filteredMembers.length === 0 && (
                        <div className="py-24 text-center">
                            <User className="w-12 h-12 text-zinc-100 mx-auto mb-4" />
                            <p className="text-sm text-zinc-400 font-medium">No team members found.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Edit Modal */}
            {editingMember && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                    <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm" onClick={() => setEditingMember(null)} />
                    <div className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="p-10 space-y-8">
                            <div className="flex items-center gap-6">
                                <Avatar 
                                    src={editingMember.profile?.avatar_url} 
                                    fallbackName={editingMember.profile?.full_name} 
                                    className="w-16 h-16 rounded-[1.5rem]"
                                />
                                <div className="space-y-1">
                                    <h3 className="text-xl font-black text-zinc-900 tracking-tight">{editingMember.profile?.full_name}</h3>
                                    <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-widest">Update permissions</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Select Role</label>
                                <div className="grid gap-2">
                                    {(roles || []).map((role) => (
                                        <button
                                            key={role.id}
                                            onClick={() => handleUpdateRole(editingMember.id, role.id)}
                                            className={clsx(
                                                "w-full px-6 py-4 rounded-2xl border text-[11px] font-black uppercase tracking-widest transition-all text-left",
                                                editingMember.role === role.name ? "bg-[#2D3282] border-[#2D3282] text-white shadow-lg" : "bg-white border-zinc-100 text-zinc-600 hover:bg-zinc-50"
                                            )}
                                        >
                                            {role.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button 
                                onClick={() => setEditingMember(null)}
                                className="w-full py-4 text-[11px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-900 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
