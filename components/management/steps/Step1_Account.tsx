'use client'

import { Upload, Check, Info } from 'lucide-react'
import { clsx } from 'clsx'
import { useState } from 'react'

interface Step1Props {
    data: any
    roles: any[]
    updateData: (data: any) => void
}

export default function Step1_Account({ data, roles, updateData }: Step1Props) {
    return (
        <div className="space-y-12">
            <div className="space-y-2">
                <h2 className="text-2xl font-black text-zinc-900 tracking-tight font-atelier">Account details</h2>
                <p className="text-sm text-zinc-500 font-medium">Set up the basic login and identification info for this staff member.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">First Name</label>
                    <input 
                        type="text" 
                        value={data.first_name || ''}
                        onChange={(e) => updateData({ first_name: e.target.value })}
                        placeholder="e.g. Emma"
                        className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-[13px] font-medium focus:bg-white focus:ring-4 focus:ring-zinc-100/50 transition-all outline-none"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Last Name</label>
                    <input 
                        type="text" 
                        value={data.last_name || ''}
                        onChange={(e) => updateData({ last_name: e.target.value })}
                        placeholder="e.g. Miller"
                        className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-[13px] font-medium focus:bg-white focus:ring-4 focus:ring-zinc-100/50 transition-all outline-none"
                    />
                </div>
                <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Email address</label>
                    <input 
                        type="email" 
                        value={data.email || ''}
                        onChange={(e) => updateData({ email: e.target.value })}
                        placeholder="emma@studiovault.com"
                        className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-[13px] font-medium focus:bg-white focus:ring-4 focus:ring-zinc-100/50 transition-all outline-none"
                    />
                </div>
                
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Role</label>
                    <select 
                        value={data.role_id || ''}
                        onChange={(e) => updateData({ role_id: e.target.value })}
                        className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-[13px] font-medium focus:bg-white focus:ring-4 focus:ring-zinc-100/50 transition-all outline-none appearance-none"
                    >
                        <option value="">Please select</option>
                        {roles.map(role => (
                            <option key={role.id} value={role.id}>{role.name}</option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center justify-between p-6 bg-zinc-50 rounded-2xl border border-zinc-100">
                    <div className="space-y-0.5">
                        <p className="text-[11px] font-black uppercase tracking-widest text-zinc-900">Available for booking</p>
                        <p className="text-[10px] text-zinc-400 font-medium">Show in the calendar and store</p>
                    </div>
                    <button 
                        type="button"
                        onClick={() => updateData({ is_bookable: !data.is_bookable })}
                        className={clsx(
                            "w-12 h-6 rounded-full transition-all relative flex items-center px-1",
                            data.is_bookable ? "bg-forest shadow-inner" : "bg-zinc-200"
                        )}
                    >
                        <div className={clsx(
                            "w-4 h-4 rounded-full bg-white shadow-sm transition-all absolute",
                            data.is_bookable ? "right-1" : "left-1"
                        )} />
                    </button>
                </div>

                <div className="md:col-span-2 space-y-4 pt-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Account image</label>
                    <div className="flex items-center gap-8">
                        <div className="w-24 h-24 rounded-[2rem] bg-zinc-50 border border-dashed border-zinc-200 flex items-center justify-center relative overflow-hidden group">
                           {data.image_url ? (
                               <img src={data.image_url} alt="Profile" className="w-full h-full object-cover" />
                           ) : (
                               <Upload className="w-6 h-6 text-zinc-300 group-hover:text-zinc-900 transition-colors" />
                           )}
                        </div>
                        <div className="flex-1 space-y-2">
                             <button className="px-6 py-3 bg-[#2D3282] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-md active:scale-95">
                                Upload image
                             </button>
                             <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest opacity-60">File type: JPG, PNG or GIF • File size: &lt;500kb</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
