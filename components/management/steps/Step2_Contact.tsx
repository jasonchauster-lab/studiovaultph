'use client'

import { Mail, Phone, MapPin, Heart } from 'lucide-react'

interface Step2Props {
    data: any
    updateData: (data: any) => void
}

export default function Step2_Contact({ data, updateData }: Step2Props) {
    return (
        <div className="space-y-12">
            <div className="space-y-2">
                <h2 className="text-2xl font-black text-zinc-900 tracking-tight font-atelier">Contact details</h2>
                <p className="text-sm text-zinc-500 font-medium">How can we reach this staff member? (Internal use only)</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Mobile number</label>
                    <div className="flex gap-2">
                        <select className="w-24 px-3 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-[13px] font-medium focus:bg-white outline-none">
                            <option value="+63">+63</option>
                            <option value="+1">+1</option>
                            <option value="+65">+65</option>
                        </select>
                        <input 
                            type="tel" 
                            value={data.mobile_number || ''}
                            onChange={(e) => updateData({ mobile_number: e.target.value })}
                            placeholder="912 345 6789"
                            className="flex-1 px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-[13px] font-medium focus:bg-white focus:ring-4 focus:ring-zinc-100/50 transition-all outline-none"
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Personal Email</label>
                    <input 
                        type="email" 
                        value={data.personal_email || ''}
                        readOnly
                        placeholder="e.g. emma.personal@gmail.com"
                        className="w-full px-6 py-4 bg-zinc-100 border border-zinc-100 rounded-2xl text-[13px] font-medium cursor-not-allowed outline-none opacity-60"
                    />
                    <p className="text-[9px] font-bold text-[#2D3282] ml-1 uppercase tracking-widest">Linked to Account Email</p>
                </div>

                <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Address line 1</label>
                    <input 
                        type="text" 
                        value={data.address_1 || ''}
                        onChange={(e) => updateData({ address_1: e.target.value })}
                        className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-[13px] font-medium focus:bg-white focus:ring-4 focus:ring-zinc-100/50 transition-all outline-none"
                    />
                </div>
                <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Address line 2 (Optional)</label>
                    <input 
                        type="text" 
                        value={data.address_2 || ''}
                        onChange={(e) => updateData({ address_2: e.target.value })}
                        className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-[13px] font-medium focus:bg-white focus:ring-4 focus:ring-zinc-100/50 transition-all outline-none"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">City / Town</label>
                    <input 
                        type="text" 
                        value={data.city || ''}
                        onChange={(e) => updateData({ city: e.target.value })}
                        className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-[13px] font-medium focus:bg-white focus:ring-4 focus:ring-zinc-100/50 transition-all outline-none"
                    />
                </div>
                <div className="space-y-2 text-left">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">State</label>
                           <input type="text" value={data.state || ''} onChange={(e) => updateData({ state: e.target.value })} className="w-full px-4 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-[13px] font-medium focus:bg-white outline-none" />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Zip</label>
                           <input type="text" value={data.zip || ''} onChange={(e) => updateData({ zip: e.target.value })} className="w-full px-4 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-[13px] font-medium focus:bg-white outline-none" />
                        </div>
                    </div>
                </div>

                <div className="md:col-span-2 pt-8 border-t border-zinc-50 space-y-8">
                    <div className="flex items-center gap-3">
                        <Heart className="w-4 h-4 text-zinc-900" />
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-900 leading-none">Emergency Contact</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Name</label>
                            <input 
                                type="text" 
                                value={data.emergency_contact_name || ''}
                                onChange={(e) => updateData({ emergency_contact_name: e.target.value })}
                                className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-[13px] font-medium focus:bg-white outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Relationship</label>
                            <input 
                                type="text" 
                                value={data.emergency_contact_relationship || ''}
                                onChange={(e) => updateData({ emergency_contact_relationship: e.target.value })}
                                placeholder="e.g. Spouse, Parent"
                                className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-[13px] font-medium focus:bg-white outline-none"
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Contact number</label>
                            <input 
                                type="tel" 
                                value={data.emergency_contact_number || ''}
                                onChange={(e) => updateData({ emergency_contact_number: e.target.value })}
                                className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-[13px] font-medium focus:bg-white outline-none"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
