'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Loader2, User, Building, Phone, Mail, Star, ChevronDown, ChevronUp, ExternalLink, Calendar } from 'lucide-react';
import { searchAllUsers, updatePartnerFeeSettings } from '@/app/(dashboard)/admin/actions';
import Link from 'next/link';
import clsx from 'clsx';

export type SearchResult = {
    id: string;
    type: 'profile' | 'studio';
    name: string;
    email?: string;
    phone?: string;
    role?: string;
    location?: string;
    url?: string;
    is_founding_partner?: boolean;
    custom_fee_percentage?: number;
    documents?: {
        bir: string | null;
        birExpiry?: string | null;
        govId: string | null;
        govIdExpiry?: string | null;
        tin?: string | null;
        mayorsPermit?: string | null;
        mayorsPermitExpiry?: string | null;
        secretaryCert?: string | null;
        secretaryCertExpiry?: string | null;
        insurance?: string | null;
        insuranceExpiry?: string | null;
        spacePhotos?: string[];
        certifications?: {
            name: string;
            url: string | null;
            expiry: string | null;
        }[];
    };
};

type ExpandedState = {
    is_founding_partner: boolean;
    custom_fee_percentage: number;
    saving: boolean;
};

export default function GlobalSearch({ onOpenBookings }: { onOpenBookings: (id: string, name: string, type: 'profile' | 'studio') => void }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [editState, setEditState] = useState<Record<string, ExpandedState>>({});
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setExpandedId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const fetchResults = async () => {
            if (query.trim().length < 2) {
                setResults([]);
                return;
            }
            setIsSearching(true);
            try {
                const data = await searchAllUsers(query);
                setResults(data);
                setIsOpen(true);
                // Seed editState from fresh results
                const freshState: Record<string, ExpandedState> = {};
                data.forEach((r: SearchResult) => {
                    const key = `${r.type}-${r.id}`;
                    freshState[key] = {
                        is_founding_partner: r.is_founding_partner || false,
                        custom_fee_percentage: r.custom_fee_percentage ?? 20,
                        saving: false,
                    };
                });
                setEditState(freshState);
            } catch (error) {
                console.error('Search failed:', error);
                setResults([]);
            } finally {
                setIsSearching(false);
            }
        };

        const timeoutId = setTimeout(fetchResults, 300);
        return () => clearTimeout(timeoutId);
    }, [query]);

    const toggleExpand = (key: string) => {
        setExpandedId(prev => prev === key ? null : key);
    };

    const handleTogglePartner = async (key: string, id: string, type: 'profile' | 'studio') => {
        const current = editState[key];
        if (!current) return;
        setEditState(prev => ({ ...prev, [key]: { ...prev[key], is_founding_partner: true, saving: true } }));
        await updatePartnerFeeSettings(id, type, true, current.custom_fee_percentage);
        setEditState(prev => ({ ...prev, [key]: { ...prev[key], saving: false } }));
    };

    const handleChangeFee = async (key: string, id: string, type: 'profile' | 'studio', fee: string) => {
        const newFee = parseInt(fee) || 20;
        const current = editState[key];
        if (!current) return;
        setEditState(prev => ({ ...prev, [key]: { ...prev[key], custom_fee_percentage: newFee, is_founding_partner: true, saving: true } }));
        await updatePartnerFeeSettings(id, type, true, newFee);
        setEditState(prev => ({ ...prev, [key]: { ...prev[key], saving: false } }));
    };

    return (
        <div className="relative w-full" ref={dropdownRef}>
            <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-burgundy/40 group-focus-within:text-burgundy transition-colors" />
                <input
                    type="text"
                    placeholder="Search intelligence database..."
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        if (e.target.value.length >= 2) setIsOpen(true);
                    }}
                    onFocus={() => { if (query.length >= 2) setIsOpen(true); }}
                    className="w-full pl-11 pr-12 py-3 bg-stone-100/50 border border-stone-200 rounded-2xl text-[13px] font-medium text-burgundy placeholder:text-burgundy/30 focus:outline-none focus:ring-4 focus:ring-forest/5 focus:bg-white focus:border-forest/30 transition-all shadow-sm"
                />
                {isSearching && (
                    <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-forest animate-spin" />
                )}
            </div>

            {isOpen && query.length >= 2 && (
                <div className="absolute top-full left-0 right-0 mt-3 bg-white text-burgundy border border-stone-200 rounded-[24px] shadow-2xl max-h-[550px] overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="overflow-y-auto max-h-[550px] p-2">
                        {results.length === 0 && !isSearching ? (
                            <div className="p-8 text-center">
                                <Search className="w-10 h-10 text-stone-200 mx-auto mb-3" />
                                <p className="text-sm text-burgundy/50 italic font-serif">No records found for "{query}"</p>
                            </div>
                        ) : (
                            <ul className="space-y-1">
                                {results.map((result) => {
                                    const key = `${result.type}-${result.id}`;
                                    const state = editState[key];
                                    const isExpanded = expandedId === key;

                                    return (
                                        <li key={key} className={clsx(
                                            "rounded-xl transition-all duration-300",
                                            isExpanded ? "bg-stone-50 border border-stone-200 ring-4 ring-stone-50 shadow-sm" : "border border-transparent hover:bg-stone-50/80"
                                        )}>
                                            {/* Result Header Row */}
                                            <button
                                                onClick={() => toggleExpand(key)}
                                                className="w-full px-4 py-3 text-left flex items-center gap-4 group/item"
                                            >
                                                <div className={clsx(
                                                    "p-2.5 rounded-xl shrink-0 transition-all duration-300 shadow-sm",
                                                    result.type === 'studio' ? 'bg-amber-100 text-amber-700' :
                                                        result.role === 'instructor' ? 'bg-forest/10 text-forest' : 'bg-stone-100 text-burgundy/60'
                                                )}>
                                                    {result.type === 'studio' ? <Building className="w-4 h-4" /> : <User className="w-4 h-4" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[14px] font-serif font-medium text-burgundy leading-tight group-hover/item:translate-x-1 transition-transform">{result.name}</p>
                                                    <div className="flex flex-wrap items-center gap-x-3 mt-1.5 text-[10px] font-black text-burgundy/40 uppercase tracking-[0.1em]">
                                                        {result.role && <span className="text-forest/60 tracking-[0.2em]">{result.role}</span>}
                                                        {result.type === 'studio' && (
                                                            <span className="flex items-center gap-1">
                                                                <span className="w-1 h-1 bg-stone-200 rounded-full" />
                                                                {result.location}
                                                            </span>
                                                        )}
                                                        {result.email && (
                                                            <span className="flex items-center gap-1">
                                                                <span className="w-1 h-1 bg-stone-200 rounded-full" />
                                                                <Mail className="w-3 h-3 opacity-40 shrink-0" />
                                                                {result.email}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <span className={clsx("shrink-0 transition-transform duration-500", isExpanded ? "rotate-180 text-burgundy" : "text-stone-300")}>
                                                    <ChevronDown className="w-4 h-4" />
                                                </span>
                                            </button>

                                            {/* Inline Edit Panel */}
                                            {isExpanded && state && (
                                                <div className="px-4 pb-5 pt-1 animate-in fade-in slide-in-from-top-1 duration-500">
                                                    <div className="h-[1px] bg-stone-200 w-full mb-4" />
                                                    
                                                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-burgundy/30 mb-4 ml-1">Administrative Matrix</p>
                                                    
                                                    <div className="flex flex-wrap items-center gap-3 mb-6">
                                                        {/* Founding Partner Toggle */}
                                                        <div className="flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-400/10 text-amber-700 border border-amber-400/20 shadow-sm">
                                                            <Star className="w-3 h-3 fill-amber-500/20" />
                                                            Partner
                                                        </div>

                                                        {/* Fee Selector */}
                                                        <div className="flex items-center gap-3 pl-2">
                                                            <label className="text-[10px] font-black uppercase tracking-widest text-burgundy/40">Fee:</label>
                                                            <div className="relative">
                                                                <select
                                                                    disabled={state.saving}
                                                                    value={state.custom_fee_percentage}
                                                                    onChange={(e) => handleChangeFee(key, result.id, result.type, e.target.value)}
                                                                    className="appearance-none bg-white border border-stone-200 rounded-xl text-[11px] font-black px-4 py-2 pr-8 outline-none focus:ring-4 focus:ring-forest/5 focus:border-forest/20 text-burgundy shadow-sm transition-all cursor-pointer"
                                                                >
                                                                    <option value="5">5%</option>
                                                                    <option value="10">10%</option>
                                                                    <option value="15">15%</option>
                                                                    <option value="20">20%</option>
                                                                </select>
                                                                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-burgundy/30 pointer-events-none" />
                                                            </div>
                                                        </div>

                                                        {state.saving && (
                                                            <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-forest italic animate-pulse">
                                                                <Loader2 className="w-3 h-3 animate-spin" /> Synchronizing...
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="flex flex-wrap gap-2 mb-6">
                                                        <Link
                                                            href={result.url || '#'}
                                                            onClick={() => { setIsOpen(false); setExpandedId(null); }}
                                                            className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-burgundy/60 hover:text-burgundy transition-all border border-stone-200 px-5 py-2.5 rounded-xl hover:bg-white hover:shadow-md group/btn"
                                                        >
                                                            <ExternalLink className="w-3.5 h-3.5 opacity-40 group-hover/btn:scale-110 transition-transform" />
                                                            Inspect Profile
                                                        </Link>
                                                        <button
                                                            onClick={() => onOpenBookings(result.id, result.name, result.type)}
                                                            className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-forest text-white px-5 py-2.5 rounded-xl hover:brightness-110 shadow-lg shadow-forest/10 transition-all group/btn"
                                                        >
                                                            <Calendar className="w-3.5 h-3.5 text-amber-400 group-hover/btn:scale-110 transition-transform" />
                                                            Operational History
                                                        </button>
                                                    </div>

                                                    {/* Legal Documents Section (for Studios) */}
                                                    {result.type === 'studio' && result.documents && (
                                                        <div className="space-y-4">
                                                            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-burgundy/30 ml-1">Compliance Repository</p>
                                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                                {[
                                                                    { title: 'BIR Form 2303', url: result.documents.bir, expiry: result.documents.birExpiry },
                                                                    { title: 'Gov ID', url: result.documents.govId, expiry: result.documents.govIdExpiry },
                                                                    { title: "Mayor's Permit", url: result.documents.mayorsPermit, expiry: result.documents.mayorsPermitExpiry },
                                                                    { title: "Secretary's Cert", url: result.documents.secretaryCert, expiry: result.documents.secretaryCertExpiry },
                                                                    { title: 'Insurance', url: result.documents.insurance, expiry: result.documents.insuranceExpiry }
                                                                ].map((doc, idx) => (
                                                                    <div key={idx} className="flex flex-col p-3 bg-white border border-stone-100 rounded-xl shadow-sm hover:shadow-md transition-shadow group/doc">
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <span className="text-[10px] font-black uppercase tracking-widest text-burgundy/60 truncate">{doc.title}</span>
                                                                            {doc.url ? (
                                                                                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-[9px] font-black uppercase tracking-widest text-forest hover:underline decoration-2 underline-offset-4">Open</a>
                                                                            ) : (
                                                                                <span className="text-[9px] font-black uppercase tracking-widest text-red-400">Void</span>
                                                                            )}
                                                                        </div>
                                                                        {doc.url && (
                                                                            <p className={clsx(
                                                                                "text-[9px] font-medium tracking-tight",
                                                                                doc.expiry && new Date(doc.expiry) < new Date() ? "text-red-500" : "text-stone-400"
                                                                            )}>
                                                                                {doc.expiry ? `Exp: ${new Date(doc.expiry).toLocaleDateString()}` : <span className="italic">N/A</span>}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>

                                                            {result.documents.spacePhotos && result.documents.spacePhotos.length > 0 && (
                                                                <div className="pt-2">
                                                                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-burgundy/30 mb-3 ml-1">Site Imagery</p>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {result.documents.spacePhotos.map((photo, i) => (
                                                                            <a key={i} href={photo} target="_blank" rel="noopener noreferrer" className="block w-12 h-12 rounded-xl border border-stone-200 overflow-hidden hover:scale-105 transition-transform duration-300 shadow-sm group/photo">
                                                                                <img src={photo} alt={`Space ${i + 1}`} className="w-full h-full object-cover transition-transform group-hover/photo:scale-110" />
                                                                            </a>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Legal Documents Section (for Instructors) */}
                                                    {result.role === 'instructor' && result.documents && (
                                                        <div className="space-y-4">
                                                            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-burgundy/30 ml-1">Certification Repository</p>
                                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                                {[
                                                                    { title: 'Certification', url: result.documents.certifications?.[0]?.url, expiry: result.documents.certifications?.[0]?.expiry },
                                                                    { title: 'BIR Form 2303', url: result.documents.bir, expiry: result.documents.birExpiry },
                                                                    { title: 'Gov ID', url: result.documents.govId, expiry: result.documents.govIdExpiry },
                                                                ].map((doc, idx) => (
                                                                    <div key={idx} className="flex flex-col p-3 bg-white border border-stone-100 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <span className="text-[10px] font-black uppercase tracking-widest text-burgundy/60 truncate">{doc.title}</span>
                                                                            {doc.url ? (
                                                                                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-[9px] font-black uppercase tracking-widest text-forest hover:underline decoration-2 underline-offset-4">Open</a>
                                                                            ) : (
                                                                                <span className="text-[9px] font-black uppercase tracking-widest text-red-400">Void</span>
                                                                            )}
                                                                        </div>
                                                                        {doc.url && (
                                                                            <p className={clsx(
                                                                                "text-[9px] font-medium tracking-tight",
                                                                                doc.expiry && new Date(doc.expiry) < new Date() ? "text-red-500" : "text-stone-400"
                                                                            )}>
                                                                                {doc.expiry ? `Exp: ${new Date(doc.expiry).toLocaleDateString()}` : <span className="italic">N/A</span>}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                                <div className="flex flex-col justify-center p-3 bg-white border border-stone-100 rounded-xl shadow-sm">
                                                                    <span className="block text-[8px] font-black uppercase tracking-widest text-burgundy/30 mb-1">TIN Identifier</span>
                                                                    <span className="font-mono text-[11px] text-burgundy font-bold tracking-tight">{result.documents.tin || 'Unassigned'}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
