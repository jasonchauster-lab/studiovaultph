'use client'

import { useState } from 'react'
import { updatePartnerFeeSettings } from '@/app/(dashboard)/admin/actions'
import { Star, Mail, Phone, Calendar, Percent, ChevronDown, ExternalLink } from 'lucide-react'
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

    const handleSaveFee = async (index: number, val: string) => {
        const p = partners[index]
        const newFee = parseInt(val) || 20
        const newPartners = [...partners]
        newPartners[index] = { ...newPartners[index], custom_fee_percentage: newFee, is_founding_partner: true }
        setPartners(newPartners)
        await updatePartnerFeeSettings(p.id, p.type, true, newFee)
    }

    const iList = partners.filter(p => p.type === 'profile')
    const sList = partners.filter(p => p.type === 'studio')

    const Card = ({ p }: { p: PartnerProps }) => {
        const trueIdx = partners.findIndex(x => x.id === p.id && x.type === p.type)
        return (
            <div className="atelier-card p-10 group hover:shadow-2xl transition-all duration-700 relative overflow-hidden bg-white border border-stone-100">
                {/* Decorative bloom */}
                <div className="absolute top-0 right-0 w-48 h-48 bg-amber-400/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-amber-400/10 transition-all duration-700 pointer-events-none" />

                {/* Top: Name + badge */}
                <div className="flex items-start justify-between gap-4 mb-8 relative z-10">
                    <div className="min-w-0">
                        <p className="text-3xl font-serif text-burgundy truncate group-hover:translate-x-1 transition-transform duration-700 tracking-tighter">
                            {p.name || <span className="text-burgundy/30 italic">Unidentified Entity</span>}
                        </p>
                        <div className="flex items-center gap-3 mt-2.5">
                            <p className="text-[10px] font-black text-forest uppercase tracking-[0.3em]">
                                {p.type === 'studio' ? 'Studio' : 'Instructor'}
                            </p>
                            {p.location && (
                                <>
                                    <span className="w-1 h-1 bg-stone-200 rounded-full" />
                                    <p className="text-[10px] font-black text-burgundy/40 uppercase tracking-[0.3em] truncate">{p.location}</p>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest border border-amber-400/20 bg-amber-400/5 text-amber-600 shadow-sm">
                        <Star className="w-3.5 h-3.5 fill-amber-500/10" />
                        Partner
                    </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-4 mb-10 relative z-10">
                    <div className="flex flex-wrap items-center justify-between gap-6">
                        <div className="space-y-2.5">
                            {p.email && (
                                <span className="flex items-center gap-4 text-[11px] font-black text-burgundy/50 uppercase tracking-[0.15em] hover:text-burgundy transition-colors group/link">
                                    <Mail className="w-4 h-4 text-forest/40 group-hover/link:text-forest group-hover/link:scale-110 transition-all" />
                                    {p.email}
                                </span>
                            )}
                            {p.phone && (
                                <span className="flex items-center gap-4 text-[11px] font-black text-burgundy/50 uppercase tracking-[0.15em] hover:text-burgundy transition-colors group/link">
                                    <Phone className="w-4 h-4 text-forest/40 group-hover/link:text-forest group-hover/link:scale-110 transition-all" />
                                    {p.phone}
                                </span>
                            )}
                        </div>

                        <button
                            onClick={() => onOpenBookings(p.id, p.name, p.type)}
                            className="bg-forest text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all flex items-center gap-3 shadow-xl shadow-forest/10 group/btn"
                        >
                            <Calendar className="w-4 h-4 text-amber-400 group-hover/btn:scale-110 transition-transform" />
                            Operational Log
                        </button>
                    </div>
                </div>

                {/* Fee selector block */}
                <div className="bg-stone-50 p-6 rounded-[24px] border border-stone-100 relative z-10 shadow-inner group/fee">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black text-burgundy/40 uppercase tracking-[0.3em] mb-1.5 ml-1">Commission Protocol</p>
                        </div>
                        <div className="relative">
                            <select
                                value={p.custom_fee_percentage}
                                onChange={e => handleSaveFee(trueIdx, e.target.value)}
                                className="px-5 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest outline-none transition-all duration-300 border appearance-none pr-12 min-w-[100px] text-center bg-white border-stone-200 text-burgundy shadow-sm focus:ring-8 focus:ring-forest/5 focus:border-forest/20 group-hover/fee:border-forest/30"
                            >
                                <option value="5">5%</option>
                                <option value="10">10%</option>
                                <option value="15">15%</option>
                                <option value="20">20%</option>
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-forest/40">
                                <ChevronDown className="w-4 h-4" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Documents section */}
                {p.documents && (
                    <div className="mt-10 pt-10 border-t border-stone-100 relative z-10">
                        <p className="text-[10px] font-black text-burgundy/30 uppercase tracking-[0.3em] mb-6 ml-1 flex items-center gap-3">
                            <span className="w-6 h-[1px] bg-stone-200" />
                            Repository
                        </p>
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            {(p.type === 'studio' ? [
                                { link: p.documents.bir, label: 'BIR 2303', expiry: p.documents.birExpiry },
                                { link: p.documents.govId, label: 'GOV ID', expiry: p.documents.govIdExpiry },
                                { link: p.documents.mayorsPermit, label: 'PERMIT', expiry: p.documents.mayorsPermitExpiry },
                                { link: p.documents.secretaryCert, label: 'CERTIFICATION' },
                                { link: p.documents.insurance, label: 'INSURANCE', expiry: p.documents.insuranceExpiry }
                            ] : [
                                { link: p.documents.govId, label: 'GOV ID', expiry: p.documents.govIdExpiry },
                                { link: p.documents.bir, label: 'BIR 2303', expiry: p.documents.birExpiry },
                                { link: p.documents.cert, label: 'CERT PROOF', expiry: p.documents.certExpiry }
                            ]).map((doc, i) => (
                                <div key={i} className="flex flex-col gap-1.5">
                                    {doc.link ? (
                                        <a
                                            href={doc.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-4 py-3 bg-white text-burgundy font-black text-[9px] uppercase tracking-widest rounded-xl border border-stone-200 hover:border-forest hover:text-forest transition-all shadow-sm text-center flex items-center justify-center gap-2 group/doc"
                                        >
                                            <ExternalLink className="w-3 h-3 opacity-0 group-hover/doc:opacity-100 transition-opacity" />
                                            {doc.label}
                                        </a>
                                    ) : (
                                        <div className="px-4 py-3 bg-stone-50/50 text-stone-300 font-black text-[9px] uppercase tracking-widest rounded-xl border border-stone-100 text-center cursor-not-allowed">
                                            {doc.label} (VOID)
                                        </div>
                                    )}
                                    {doc.expiry && (
                                        <p className={clsx(
                                            "text-[8px] font-black uppercase tracking-tighter text-center",
                                            new Date(doc.expiry) < new Date() ? "text-red-500" : "text-stone-400"
                                        )}>
                                            EXP: {doc.expiry}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>

                        {p.type === 'studio' && p.documents.spacePhotos && p.documents.spacePhotos.length > 0 && (
                            <div className="flex flex-wrap gap-2.5 pt-4">
                                {p.documents.spacePhotos.slice(0, 5).map((photo, i) => (
                                    <a key={i} href={photo} target="_blank" rel="noopener noreferrer" className="block w-12 h-12 rounded-xl border border-stone-200 overflow-hidden hover:scale-110 transition-all duration-500 group/photo relative shadow-sm">
                                        <img src={photo} alt={`Space ${i + 1}`} className="w-full h-full object-cover transition-transform group-hover/photo:scale-125 duration-700" />
                                        <div className="absolute inset-0 bg-forest/20 opacity-0 group-hover/photo:opacity-100 transition-opacity" />
                                    </a>
                                ))}
                                {p.documents.spacePhotos.length > 5 && (
                                    <div className="w-12 h-12 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center shadow-inner">
                                        <span className="text-[10px] font-black text-burgundy/40">+{p.documents.spacePhotos.length - 5}</span>
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
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="flex items-center gap-8 mb-16">
                <h3 className="text-4xl font-serif text-burgundy tracking-tighter">{title}</h3>
                <div className="h-[1px] flex-1 bg-gradient-to-r from-stone-200 via-stone-100 to-transparent" />
                <span className="text-[11px] font-black text-forest uppercase tracking-[0.5em]">{list.length} Intelligence Units</span>
            </div>
            {list.length === 0 ? (
                <div className="py-24 text-center atelier-card bg-stone-50/30 border-dashed border-stone-200">
                    <p className="text-[11px] font-black text-burgundy/20 uppercase tracking-[0.4em] italic">No active entities detected in this sector</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                    {list.map(p => <Card key={p.id} p={p} />)}
                </div>
            )}
        </div>
    )

    return (
        <div className="space-y-32 pb-32 max-w-7xl mx-auto">
            <Section title="Studio Partners" list={sList} />
            <Section title="Instructor Network" list={iList} />
        </div>
    )
}
