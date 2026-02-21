'use client'

import { useState } from 'react'
import { updatePartnerFeeSettings } from '@/app/(dashboard)/admin/actions'
import { Star, Mail, Phone } from 'lucide-react'
import clsx from 'clsx'

type PartnerProps = {
    id: string
    type: 'profile' | 'studio'
    name: string
    role?: string
    location?: string
    is_founding_partner: boolean
    custom_fee_percentage: number
    email?: string
    phone?: string
}

export default function PartnerFeeClient({
    instructors,
    studios
}: {
    instructors: any[]
    studios: any[]
}) {
    const defaultData: PartnerProps[] = [
        ...instructors.map(i => ({
            id: i.id,
            type: 'profile' as const,
            name: i.full_name,
            role: i.role,
            is_founding_partner: i.is_founding_partner || false,
            custom_fee_percentage: i.custom_fee_percentage || 20,
            email: i.email,
            phone: i.contact_number
        })),
        ...studios.map(s => {
            const ownerObj = Array.isArray(s.owner) ? s.owner[0] : s.owner;
            return {
                id: s.id,
                type: 'studio' as const,
                name: s.name,
                location: s.location,
                is_founding_partner: s.is_founding_partner || false,
                custom_fee_percentage: s.custom_fee_percentage || 20,
                email: ownerObj?.email,
                phone: s.contact_number
            }
        })
    ]

    const [partners, setPartners] = useState<PartnerProps[]>(defaultData)

    const handleToggle = async (index: number) => {
        const p = partners[index]
        const newVal = !p.is_founding_partner
        const newPartners = [...partners]
        newPartners[index] = { ...newPartners[index], is_founding_partner: newVal }
        setPartners(newPartners)
        await updatePartnerFeeSettings(p.id, p.type, newVal, p.custom_fee_percentage)
    }

    const handleSaveFee = async (index: number, val: string) => {
        const p = partners[index]
        const newFee = parseInt(val) || 20
        const newPartners = [...partners]
        newPartners[index] = { ...newPartners[index], custom_fee_percentage: newFee }
        setPartners(newPartners)
        await updatePartnerFeeSettings(p.id, p.type, p.is_founding_partner, newFee)
    }

    const iList = partners.filter(p => p.type === 'profile')
    const sList = partners.filter(p => p.type === 'studio')

    const Card = ({ p }: { p: PartnerProps }) => {
        const trueIdx = partners.findIndex(x => x.id === p.id && x.type === p.type)
        return (
            <div className="border border-cream-100 rounded-xl p-4 hover:bg-cream-50/40 transition-colors">
                {/* Top: Name + badge */}
                <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-charcoal-900 truncate">{p.name || <span className="text-charcoal-400 italic">Unnamed</span>}</p>
                        <p className="text-xs text-charcoal-500 mt-0.5">
                            {p.type === 'studio' ? `Studio · ${p.location}` : 'Instructor'}
                        </p>
                    </div>
                    <button
                        onClick={() => handleToggle(trueIdx)}
                        className={clsx(
                            "shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors",
                            p.is_founding_partner
                                ? "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200"
                                : "bg-cream-100 text-charcoal-500 border-cream-200 hover:bg-cream-200"
                        )}
                    >
                        <Star className={clsx("w-3 h-3", p.is_founding_partner ? "fill-amber-500" : "")} />
                        {p.is_founding_partner ? "Founding" : "Standard"}
                    </button>
                </div>

                {/* Contact Info */}
                {(p.email || p.phone) && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-xs text-charcoal-500">
                        {p.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{p.email}</span>}
                        {p.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{p.phone}</span>}
                    </div>
                )}

                {/* Fee Selector */}
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-charcoal-500">Platform Fee:</span>
                    <select
                        disabled={!p.is_founding_partner}
                        value={p.custom_fee_percentage}
                        onChange={e => handleSaveFee(trueIdx, e.target.value)}
                        className={clsx(
                            "border rounded-md text-xs px-2 py-1.5 outline-none focus:ring-1 focus:ring-charcoal-500",
                            !p.is_founding_partner
                                ? "bg-cream-100 border-cream-200 text-charcoal-400 cursor-not-allowed"
                                : "bg-white border-cream-300 text-charcoal-900"
                        )}
                    >
                        <option value="5">5%</option>
                        <option value="10">10%</option>
                        <option value="15">15%</option>
                        <option value="20">20%</option>
                    </select>
                    {!p.is_founding_partner && (
                        <span className="text-[10px] text-charcoal-400 italic">Enable Founding Partner to edit</span>
                    )}
                </div>
            </div>
        )
    }

    const Section = ({ title, list }: { title: string; list: PartnerProps[] }) => (
        <div>
            <h3 className="text-lg font-serif text-charcoal-900 mb-4 border-b border-cream-200 pb-2">{title}</h3>
            {list.length === 0 ? (
                <p className="py-6 text-center text-sm text-charcoal-400">No {title.toLowerCase()} found.</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {list.map(p => <Card key={p.id} p={p} />)}
                </div>
            )}
        </div>
    )

    return (
        <div className="space-y-8">
            <Section title="Studios" list={sList} />
            <Section title="Instructors" list={iList} />
        </div>
    )
}
