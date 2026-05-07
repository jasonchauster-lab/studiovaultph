'use client'

interface Step3Props {
    data: any
    updateData: (data: any) => void
}

export default function Step3_Personal({ data, updateData }: Step3Props) {
    return (
        <div className="space-y-12">
            <div className="space-y-2">
                <h2 className="text-2xl font-black text-zinc-900 tracking-tight font-atelier">Personal details</h2>
                <p className="text-sm text-zinc-500 font-medium">Extra personal information for HR and compliance.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Gender</label>
                    <select 
                        value={data.gender || ''}
                        onChange={(e) => updateData({ gender: e.target.value })}
                        className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-[13px] font-medium focus:bg-white outline-none appearance-none"
                    >
                        <option value="">Please select</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Date of Birth</label>
                    <input 
                        type="date" 
                        value={data.dob || ''}
                        onChange={(e) => updateData({ dob: e.target.value })}
                        className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-[13px] font-medium focus:bg-white outline-none"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Government ID Type</label>
                    <select 
                        value={data.id_type || ''}
                        onChange={(e) => updateData({ id_type: e.target.value })}
                        className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-[13px] font-medium focus:bg-white outline-none appearance-none"
                    >
                        <option value="">Please select</option>
                        <option value="Passport">Passport</option>
                        <option value="National ID">National ID</option>
                        <option value="Driver's License">Driver's License</option>
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">ID Number</label>
                    <input 
                        type="text" 
                        value={data.id_number || ''}
                        onChange={(e) => updateData({ id_number: e.target.value })}
                        placeholder="e.g. 123-456-789"
                        className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-[13px] font-medium focus:bg-white outline-none"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Country</label>
                    <select 
                        value={data.country || 'Philippines'}
                        onChange={(e) => updateData({ country: e.target.value })}
                        className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-[13px] font-medium focus:bg-white outline-none appearance-none"
                    >
                        <option value="Philippines">Philippines</option>
                        <option value="Singapore">Singapore</option>
                        <option value="USA">USA</option>
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Nationality</label>
                    <input 
                        type="text" 
                        value={data.nationality || ''}
                        onChange={(e) => updateData({ nationality: e.target.value })}
                        placeholder="e.g. Filipino"
                        className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-[13px] font-medium focus:bg-white outline-none"
                    />
                </div>

                <div className="space-y-2 md:col-span-2 pt-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Qualifications / Certifications</label>
                    <textarea 
                        rows={4}
                        value={data.qualifications || ''}
                        onChange={(e) => updateData({ qualifications: e.target.value })}
                        placeholder="e.g. Certified Pilates Instructor, First Aid Training"
                        className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-[13px] font-medium focus:bg-white outline-none resize-none"
                    />
                </div>
            </div>
        </div>
    )
}
