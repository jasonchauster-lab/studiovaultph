'use client'

import { X } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import MultiSelectFilter from '@/components/shared/MultiSelectFilter'
import { STUDIO_AMENITIES } from '@/types'

interface FilterDrawerProps {
    isOpen: boolean
    onClose: () => void
    userRole?: string
    handleFilter: (name: string, value: string) => void
    handleMultiFilter: (name: string, values: string[]) => void
    getMultiValue: (name: string) => string[]
}

export default function FilterDrawer({
    isOpen,
    onClose,
    userRole,
    handleFilter,
    handleMultiFilter,
    getMultiValue
}: FilterDrawerProps) {
    const searchParams = useSearchParams()

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] lg:hidden">
            <div className="absolute inset-0 bg-burgundy/20 backdrop-blur-sm" onClick={onClose} />
            <div className="absolute inset-y-0 right-0 w-full max-w-sm bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                <div className="flex items-center justify-between p-6 border-b border-burgundy/5">
                    <h2 className="text-xl font-serif font-bold text-burgundy">Search Filters</h2>
                    <button onClick={onClose} className="p-2 hover:bg-walking-vinnie/10 rounded-full transition-colors text-burgundy/40">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {userRole !== 'instructor' && (
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-burgundy/40">Discovery Mode</label>
                            <select
                                onChange={(e) => handleFilter('type', e.target.value)}
                                value={searchParams.get('type') || 'all'}
                                className="w-full pl-5 pr-12 py-4 bg-off-white/50 border border-burgundy/5 rounded-2xl text-[11px] font-black uppercase tracking-widest text-burgundy appearance-none"
                            >
                                <option value="all">All Modes</option>
                                <option value="instructor">Instructors</option>
                                <option value="studio">Studios</option>
                            </select>
                        </div>
                    )}

                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-burgundy/40">Equipment</label>
                        <MultiSelectFilter
                            label="Equipment"
                            options={['Reformer', 'Cadillac', 'Tower', 'Chair', 'Ladder Barrel', 'Mat']}
                            value={getMultiValue('equipment')}
                            onChange={(vals) => handleMultiFilter('equipment', vals)}
                            className="w-full"
                        />
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-burgundy/40">Certification</label>
                        <MultiSelectFilter
                            label="Cert"
                            options={['STOTT', 'BASI', 'Balanced Body', 'Polestar', 'Classical']}
                            value={getMultiValue('certification')}
                            onChange={(vals) => handleMultiFilter('certification', vals)}
                            className="w-full"
                        />
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-burgundy/40">Amenities</label>
                        <MultiSelectFilter
                            label="Amenities"
                            options={[...STUDIO_AMENITIES]}
                            value={getMultiValue('amenity')}
                            onChange={(vals) => handleMultiFilter('amenity', vals)}
                            className="w-full"
                        />
                    </div>
                </div>

                <div className="p-6 border-t border-burgundy/5 bg-off-white/30">
                    <button 
                        onClick={onClose}
                        className="w-full py-4.5 rounded-2xl bg-burgundy text-white text-[11px] font-black uppercase tracking-[0.3em] shadow-xl shadow-burgundy/20 active:scale-95 transition-all"
                    >
                        Apply Filters
                    </button>
                </div>
            </div>
        </div>
    )
}
