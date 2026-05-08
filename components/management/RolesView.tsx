'use client'
import { useState, useTransition, useEffect } from 'react'
import { Plus, Info, Shield, User, Clock, Trash2, Loader2, X } from 'lucide-react'
import { clsx } from 'clsx'
import { createStudioRole, updateStudioRolePermissions } from '@/app/(dashboard)/studio/studio-actions'
import { useRouter } from 'next/navigation'

interface Role {
    id: string
    name: string
    type: 'system' | 'custom'
    created_on: string
    created_by_name?: string
    user_count: number
    permissions?: Record<string, boolean>
}

interface RolesViewProps {
    studioId: string
    initialRoles: Role[]
}

const AVAILABLE_PERMISSIONS = [
    { key: 'view_sales', label: 'View Sales & Earnings', description: 'Allows viewing of transaction history and studio revenue' },
    { key: 'view_payroll', label: 'View Instructor Payroll', description: 'Allows viewing of earnings and payout summaries' },
    { key: 'manage_payroll', label: 'Manage Payroll Config', description: 'Allows editing instructor base rates and commissions' },
    { key: 'view_crm', label: 'View Customer CRM', description: 'Access to the customer directory and profiles' },
    { key: 'manage_schedule', label: 'Manage Schedule', description: 'Allows adding, editing, and deleting classes/slots' },
    { key: 'manage_store', label: 'Manage Store & Pricing', description: 'Edit services, memberships, packages, and promo codes' },
    { key: 'manage_staff', label: 'Manage Staff', description: 'Allows adding/removing staff members' },
    { key: 'manage_roles', label: 'Manage Roles', description: 'Allows creating and editing roles' }
]

export default function RolesView({ studioId, initialRoles }: RolesViewProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [roles, setRoles] = useState(initialRoles)
    const [newName, setNewName] = useState('')
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [editingPermissionsRole, setEditingPermissionsRole] = useState<Role | null>(null)

    // Sync state when props change (after router.refresh())
    useEffect(() => {
        setRoles(initialRoles)
    }, [initialRoles])

    const handleAddRole = async () => {
        if (!newName) return
        
        startTransition(async () => {
            const formData = new FormData()
            formData.append('studioId', studioId)
            formData.append('name', newName)
            
            const res = await createStudioRole(formData)
            if (res.success) {
                setIsAddModalOpen(false)
                setNewName('')
                router.refresh()
            } else {
                alert(res.error)
            }
        })
    }

    const handleTogglePermission = async (roleId: string, permKey: string, currentVal: boolean) => {
        // Optimistic update
        setRoles(prev => prev.map(r => r.id === roleId ? {
            ...r,
            permissions: { ...(r.permissions || {}), [permKey]: !currentVal }
        } : r))

        const res = await updateStudioRolePermissions(roleId, {
            ...(roles.find(r => r.id === roleId)?.permissions || {}),
            [permKey]: !currentVal
        })
        
        if (res.success) {
            router.refresh()
        } else {
            // Revert on error
            setRoles(prev => prev.map(r => r.id === roleId ? {
                ...r,
                permissions: { ...(r.permissions || {}), [permKey]: currentVal }
            } : r))
            alert(res.error)
        }
    }

    return (
        <div className="space-y-10 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black text-zinc-900 tracking-tightest font-atelier text-6xl">Roles</h1>
                    <p className="text-sm font-bold text-zinc-400">Manage studio staff roles and their access permissions.</p>
                </div>
                <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="px-8 py-4 bg-[#2D3282] text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-zinc-200 flex items-center gap-3"
                >
                    <Plus className="w-4 h-4" />
                    Add Role
                </button>
            </div>

            {/* Table Area */}
            <div className="bg-white rounded-[2.5rem] border border-zinc-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-zinc-50">
                                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-[#2D3282]/40">Role</th>
                                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-[#2D3282]/40">Type</th>
                                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-[#2D3282]/40">Created by</th>
                                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-[#2D3282]/40 text-right">Permissions</th>
                                <th className="px-10 py-6 sr-only">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                            {roles.map((role) => (
                                <tr key={role.id} className="group hover:bg-zinc-50/50 transition-colors">
                                    <td className="px-10 py-8">
                                        <div className="flex items-center gap-4">
                                            <div className={clsx(
                                                "w-10 h-10 rounded-xl flex items-center justify-center",
                                                role.type === 'system' ? "bg-zinc-900 text-white" : "bg-[#2D3282]/10 text-[#2D3282]"
                                            )}>
                                                <Shield className="w-5 h-5" />
                                            </div>
                                            <span className="text-sm font-black text-zinc-900 tracking-tight">{role.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-10 py-8">
                                        <span className={clsx(
                                            "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border",
                                            role.type === 'system' 
                                                ? "bg-zinc-50 border-zinc-200 text-zinc-400" 
                                                : "bg-[#2D3282]/5 border-[#2D3282]/10 text-[#2D3282]"
                                        )}>
                                            {role.type}
                                        </span>
                                    </td>
                                    <td className="px-10 py-8">
                                        <span className="text-xs font-bold text-zinc-500">{role.created_by_name || 'System'}</span>
                                    </td>
                                    <td className="px-10 py-8 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {Object.keys(role.permissions || {}).filter(k => role.permissions?.[k]).map(k => (
                                                <span key={k} className="w-2 h-2 rounded-full bg-[#2D3282]" title={k} />
                                            ))}
                                            <span className="text-[10px] font-black text-[#2D3282] uppercase tracking-widest ml-2">
                                                {Object.values(role.permissions || {}).filter(Boolean).length} Active
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-10 py-8 text-right">
                                        <button 
                                            onClick={() => setEditingPermissionsRole(role)}
                                            className="p-2 text-zinc-300 hover:text-zinc-900 transition-colors"
                                        >
                                            <Info className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Permissions Modal */}
            {editingPermissionsRole && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm" onClick={() => setEditingPermissionsRole(null)} />
                    <div className="relative w-full max-w-xl bg-white rounded-[3rem] p-12 shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="mb-8">
                            <h2 className="text-2xl font-black text-zinc-900 tracking-tight font-atelier">Permissions: {editingPermissionsRole.name}</h2>
                            <p className="text-sm font-bold text-zinc-400 mt-2">Manage what users with this role can see and do.</p>
                        </div>
                        
                        {/* Get latest role from local state to reflect toggles */}
                        {(() => {
                            const currentRole = roles.find(r => r.id === editingPermissionsRole.id) || editingPermissionsRole;
                            return (
                                <div className="space-y-4">
                                    {AVAILABLE_PERMISSIONS.map((perm) => (
                                        <div key={perm.key} className="flex items-center justify-between p-6 bg-zinc-50 rounded-3xl border border-zinc-100">
                                            <div className="space-y-1">
                                                <h4 className="text-sm font-black text-zinc-900">{perm.label}</h4>
                                                <p className="text-[10px] font-bold text-zinc-400">{perm.description}</p>
                                            </div>
                                            <button 
                                                onClick={() => handleTogglePermission(currentRole.id, perm.key, !!currentRole.permissions?.[perm.key])}
                                                className={clsx(
                                                    "w-12 h-6 rounded-full transition-all relative",
                                                    currentRole.permissions?.[perm.key] ? "bg-[#2D3282]" : "bg-zinc-200"
                                                )}
                                            >
                                                <div className={clsx(
                                                    "absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm",
                                                    currentRole.permissions?.[perm.key] ? "left-7" : "left-1"
                                                )} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )
                        })()}
                        
                        <button 
                            onClick={() => setEditingPermissionsRole(null)}
                            className="w-full mt-8 py-5 bg-zinc-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* Add Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm" onClick={() => !isPending && setIsAddModalOpen(false)} />
                    <div className="relative w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300">
                        <button 
                            onClick={() => setIsAddModalOpen(false)}
                            className="absolute top-8 right-8 text-zinc-300 hover:text-zinc-900 transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                        <h2 className="text-2xl font-black text-zinc-900 tracking-tight font-atelier mb-8">Add new role</h2>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Role Name</label>
                                <input 
                                    type="text" 
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="e.g. SALES/ADMIN"
                                    className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-[13px] font-medium focus:bg-white focus:ring-4 focus:ring-zinc-100/50 transition-all outline-none"
                                />
                            </div>
                            <button 
                                onClick={handleAddRole}
                                disabled={isPending || !newName}
                                className={clsx(
                                    "w-full py-5 bg-[#2D3282] text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-[#2D3282]/20 flex items-center justify-center gap-3",
                                    (isPending || !newName) && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Role'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
