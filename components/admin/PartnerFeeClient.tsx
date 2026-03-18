'use client'

import { useState } from 'react'
import { updatePartnerFeeSettings } from '@/app/(dashboard)/admin/actions'
import { Star, Mail, Phone, Calendar, Percent } from 'lucide-react'
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
    documents?: {
        bir: string | null;
        birExpiry?: string | null;
        govId: string | null;
        govIdExpiry?: string | null;
        mayorsPermit: string | null;
        mayorsPermitExpiry?: string | null;
        secretaryCert: string | null;
        cert?: string | null;
        certExpiry?: string | null;
        insurance?: string | null;
        insuranceExpiry?: string | null;
        spacePhotos: string[];
    };
}

export default function PartnerFeeClient({
    instructors,
    studios,
    onOpenBookings
}: {
    instructors: any[]
    studios: any[]
    onOpenBookings: (id: string, name: string, type: 'profile' | 'studio') => void
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
            phone: i.contact_number,
            documents: i.documents
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
                phone: s.contact_number,
                documents: s.documents
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
        // We set is_founding_partner to true to ensure the backend logic recognizes the custom fee,
        // but we hide this status from the UI as requested.
        newPartners[index] = { ...newPartners[index], custom_fee_percentage: newFee, is_founding_partner: true }
        setPartners(newPartners)
        await updatePartnerFeeSettings(p.id, p.type, true, newFee)
    }

    const iList = partners.filter(p => p.type === 'profile')
    const sList = partners.filter(p => p.type === 'studio')

    const Card = ({ p }: { p: PartnerProps }) => {
        const trueIdx = partners.findIndex(x => x.id === p.id && x.type === p.type)
        return (
            <div className="glass-card p-10 group hover:border-white transition-all duration-700 relative overflow-hidden">
                {/* Decorative bloom */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-gold/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-gold/10 transition-colors duration-700 pointer-events-none" />

                {/* Top: Name + badge */}
                <div className="flex items-start justify-between gap-4 mb-6 relative z-10">
                    <div className="min-w-0">
                        <p className="text-2xl font-serif text-charcoal truncate group-hover:translate-x-1 transition-transform duration-700 tracking-tighter">
                            {p.name || <span className="text-charcoal/50 italic">Unnamed</span>}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                            <p className="text-[10px] font-black text-charcoal/50 uppercase tracking-[0.3em]">
                                {p.type === 'studio' ? 'Studio' : 'Instructor'}
                            </p>
                            {p.location && (
                                <>
                                    <span className="w-1 h-1 bg-charcoal/10 rounded-full" />
                                    <p className="text-[10px] font-black text-charcoal/50 uppercase tracking-[0.3em] truncate">{p.location}</p>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest border bg-alabaster/50 text-charcoal/50 border-cream-100">
                        <Star className="w-3 h-3 fill-charcoal/10" />
                        Partner
                    </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-3 mb-8 relative z-10">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        {(p.email || p.phone) && (
                            <div className="space-y-1.5">
                                {p.email && (
                                    <span className="flex items-center gap-3 text-[10px] font-black text-charcoal/50 uppercase tracking-[0.2em] hover:text-charcoal transition-colors">
                                        <Mail className="w-4 h-4 opacity-30" />
                                        {p.email}
                                    </span>
                                )}
                                {p.phone && (
                                    <span className="flex items-center gap-3 text-[10px] font-black text-charcoal/50 uppercase tracking-[0.2em] hover:text-charcoal transition-colors">
                                        <Phone className="w-4 h-4 opacity-30" />
                                        {p.phone}
                                    </span>
                                )}
                            </div>
                        )}

                        <button
                            onClick={() => onOpenBookings(p.id, p.name, p.type)}
                            className="bg-forest text-white px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:brightness-110 transition-all flex items-center gap-2 shadow-xl shadow-charcoal/10 group/btn"
                        >
                            <Calendar className="w-3.5 h-3.5 text-gold group-hover/btn:scale-110 transition-transform" />
                            View Bookings
                        </button>
                    </div>
                </div>

                {/* Fee selector block */}
                <div className="bg-alabaster/30 p-5 rounded-2xl border border-cream-100 relative z-10">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[9px] font-black text-charcoal/50 uppercase tracking-[0.3em] mb-1">Commission Fee</p>
                        </div>
                        <div className="relative">
                            <select
                                value={p.custom_fee_percentage}
                                onChange={e => handleSaveFee(trueIdx, e.target.value)}
                                className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none transition-all duration-300 border appearance-none pr-10 min-w-[80px] text-center bg-white border-cream-100 text-charcoal shadow-sm focus:ring-4 focus:ring-gold/10 focus:border-gold/30"
                            >
                                <option value="5">5%</option>
                                <option value="10">10%</option>
                                <option value="15">15%</option>
                                <option value="20">20%</option>
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gold">
                                <Percent className="w-3 h-3" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Documents section */}
                {p.documents && (
                    <div className="mt-8 pt-8 border-t border-cream-100 relative z-10">
                        <p className="text-[9px] font-black text-charcoal/40 uppercase tracking-[0.2em] mb-4 ml-1">
                            {p.type === 'studio' ? 'Studio Documents' : 'Instructor Documents'}
                        </p>
                        <div className="grid grid-cols-2 gap-2 mb-4">
                            {(p.type === 'studio' ? [
                                { link: p.documents.bir, label: 'BIR 2303', expiry: p.documents.birExpiry },
                                { link: p.documents.govId, label: 'GOV ID', expiry: p.documents.govIdExpiry },
                                { link: p.documents.mayorsPermit, label: 'PERMIT', expiry: p.documents.mayorsPermitExpiry },
                                { link: p.documents.secretaryCert, label: 'CERT' },
                                { link: p.documents.insurance, label: 'INSURANCE', expiry: p.documents.insuranceExpiry }
                            ] : [
                                { link: p.documents.govId, label: 'GOV ID', expiry: p.documents.govIdExpiry },
                                { link: p.documents.bir, label: 'BIR 2303', expiry: p.documents.birExpiry },
                                { link: p.documents.cert, label: 'CERT PROOF', expiry: p.documents.certExpiry }
                            ]).map((doc, i) => (
                                <div key={i} className="flex flex-col gap-1">
                                    {doc.link ? (
                                        <a
                                            href={doc.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-3 py-2 bg-white text-charcoal font-black text-[8px] uppercase tracking-widest rounded-lg border border-cream-100 hover:border-gold/30 hover:text-gold transition-all shadow-sm text-center"
                                        >
                                            {doc.label}
                                        </a>
                                    ) : (
                                        <div className="px-3 py-2 bg-red-50/10 text-red-600/30 font-black text-[8px] uppercase tracking-widest rounded-lg border border-red-100/20 text-center cursor-not-allowed">
                                            N/A
                                        </div>
                                    )}
                                    {doc.expiry && (
                                        <p className={clsx(
                                            "text-[7px] font-black uppercase tracking-tighter text-center",
                                            new Date(doc.expiry) < new Date() ? "text-red-500" : "text-charcoal/30"
                                        )}>
                                            EXP: {doc.expiry}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>

                        {p.type === 'studio' && p.documents.spacePhotos && p.documents.spacePhotos.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-2">
                                {p.documents.spacePhotos.slice(0, 5).map((photo, i) => (
                                    <a key={i} href={photo} target="_blank" rel="noopener noreferrer" className="block w-10 h-10 rounded-xl border border-cream-100 overflow-hidden hover:scale-110 transition-transform duration-300 group/photo relative shadow-sm">
                                        <img src={photo} alt={`Space ${i + 1}`} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-gold/20 opacity-0 group-hover/photo:opacity-100 transition-opacity" />
                                    </a>
                                ))}
                                {p.documents.spacePhotos.length > 5 && (
                                    <div className="w-10 h-10 rounded-xl bg-alabaster/50 border border-cream-100 flex items-center justify-center">
                                        <span className="text-[8px] font-black text-charcoal/40">+{p.documents.spacePhotos.length - 5}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        )
    }

    const Section = ({ title, list }: { title: string; list: PartnerProps[] }) => (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="flex items-center gap-6 mb-12">
                <h3 className="text-3xl font-serif text-charcoal tracking-tighter">{title}</h3>
                <div className="h-[1px] flex-1 bg-gradient-to-r from-charcoal/5 to-transparent" />
                <span className="text-[10px] font-black text-charcoal/10 uppercase tracking-[0.4em]">{list.length} Records</span>
            </div>
            {list.length === 0 ? (
                <div className="py-20 text-center glass-card border-dashed">
                    <p className="text-[10px] font-black text-charcoal/50 uppercase tracking-widest italic">No entities detected in this sector</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {list.map(p => <Card key={p.id} p={p} />)}
                </div>
            )}
        </div>
    )

    return (
        <div className="space-y-20 pb-20">
            <Section title="Studios" list={sList} />
            <Section title="Instructors" list={iList} />
        </div>
    )
}
