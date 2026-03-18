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
        // Setting founding partner to true ensures the custom fee logic works, but we don't toggle it in UI anymore.
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
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" />
                <input
                    type="text"
                    placeholder="Search users, studios, emails, or phones..."
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        if (e.target.value.length >= 2) setIsOpen(true);
                    }}
                    onFocus={() => { if (query.length >= 2) setIsOpen(true); }}
                    className="w-full pl-9 pr-10 py-2 bg-cream-50 border border-cream-200 rounded-lg text-sm text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-charcoal-900 transition-shadow"
                />
                {isSearching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400 animate-spin" />
                )}
            </div>

            {isOpen && query.length >= 2 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white text-charcoal-900 border border-cream-200 rounded-xl shadow-lg max-h-[500px] overflow-y-auto z-50">
                    {results.length === 0 && !isSearching ? (
                        <div className="p-4 text-center text-sm text-charcoal-500">
                            No results found for "{query}"
                        </div>
                    ) : (
                        <ul className="py-2">
                            {results.map((result) => {
                                const key = `${result.type}-${result.id}`;
                                const state = editState[key];
                                const isExpanded = expandedId === key;

                                return (
                                    <li key={key} className="border-b border-cream-100 last:border-0">
                                        {/* Result Header Row */}
                                        <button
                                            onClick={() => toggleExpand(key)}
                                            className="w-full px-4 py-3 hover:bg-cream-50 transition-colors text-left flex items-center gap-3"
                                        >
                                            <div className={clsx(
                                                "p-2 rounded-lg shrink-0",
                                                result.type === 'studio' ? 'bg-orange-100 text-orange-700' :
                                                    result.role === 'instructor' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                                            )}>
                                                {result.type === 'studio' ? <Building className="w-4 h-4" /> : <User className="w-4 h-4" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-charcoal-900 truncate">{result.name}</p>
                                                <div className="flex flex-wrap gap-x-3 mt-1 text-xs text-charcoal-500">
                                                    {result.role && <span className="capitalize">{result.role}</span>}
                                                    {result.type === 'studio' && <span>Studio • {result.location}</span>}
                                                    {result.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{result.email}</span>}
                                                    {result.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{result.phone}</span>}
                                                </div>
                                            </div>
                                            <span className="shrink-0 text-charcoal-400">
                                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                            </span>
                                        </button>

                                        {/* Inline Edit Panel */}
                                        {isExpanded && state && (
                                            <div className="px-4 pb-4 pt-1 bg-cream-50/60 border-t border-cream-100">
                                                <p className="text-[10px] uppercase tracking-wider text-charcoal-400 mb-3 font-medium">Partner Settings</p>
                                                <div className="flex flex-wrap items-center gap-3">
                                                    {/* Founding Partner Toggle */}
                                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white text-charcoal-600 border border-cream-300">
                                                        <Star className="w-3.5 h-3.5 fill-gold/20" />
                                                        Partner
                                                    </div>

                                                    {/* Fee Selector */}
                                                    <div className="flex items-center gap-2">
                                                        <label className="text-xs text-charcoal-500">Fee:</label>
                                                        <select
                                                            disabled={state.saving}
                                                            value={state.custom_fee_percentage}
                                                            onChange={(e) => handleChangeFee(key, result.id, result.type, e.target.value)}
                                                            className="border rounded-md text-xs px-2 py-1.5 outline-none focus:ring-1 focus:ring-charcoal-500 bg-white border-cream-300 text-charcoal-900"
                                                        >
                                                            <option value="5">5%</option>
                                                            <option value="10">10%</option>
                                                            <option value="15">15%</option>
                                                            <option value="20">20%</option>
                                                        </select>
                                                    </div>

                                                    {state.saving && (
                                                        <span className="flex items-center gap-1 text-xs text-charcoal-400">
                                                            <Loader2 className="w-3 h-3 animate-spin" /> Saving...
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="mt-3 pt-3 border-t border-cream-200">
                                                    <Link
                                                        href={result.url || '#'}
                                                        onClick={() => { setIsOpen(false); setExpandedId(null); }}
                                                        className="inline-flex items-center gap-1.5 text-xs font-medium text-charcoal-600 hover:text-charcoal-900 transition-colors border border-cream-200 px-3 py-1.5 rounded-lg hover:bg-cream-50"
                                                    >
                                                        <ExternalLink className="w-3 h-3" />
                                                        View Profile
                                                    </Link>
                                                    <button
                                                        onClick={() => onOpenBookings(result.id, result.name, result.type)}
                                                        className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-gold hover:brightness-110 transition-colors border border-rose-gold/20 px-3 py-1.5 rounded-lg hover:bg-rose-gold/5"
                                                    >
                                                        <Calendar className="w-3 h-3" />
                                                        View Bookings
                                                    </button>
                                                </div>

                                                {/* Legal Documents Section (for Studios) */}
                                                {result.type === 'studio' && result.documents && (
                                                    <div className="mt-3 pt-3 border-t border-cream-200">
                                                        <p className="text-[10px] uppercase tracking-wider text-charcoal-400 mb-2 font-medium">Legal Documents</p>
                                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                            {[
                                                                { title: 'BIR Form 2303', url: result.documents.bir, expiry: result.documents.birExpiry },
                                                                { title: 'Gov ID', url: result.documents.govId, expiry: result.documents.govIdExpiry },
                                                                { title: "Mayor's Permit", url: result.documents.mayorsPermit, expiry: result.documents.mayorsPermitExpiry },
                                                                { title: "Secretary's Cert", url: result.documents.secretaryCert, expiry: result.documents.secretaryCertExpiry },
                                                                { title: 'Insurance', url: result.documents.insurance, expiry: result.documents.insuranceExpiry }
                                                            ].map((doc, idx) => (
                                                                <div key={idx} className="flex flex-col justify-between gap-1 p-2 bg-white border border-cream-100 rounded-lg text-xs">
                                                                    <div className="flex items-center justify-between gap-2">
                                                                        <span className="text-charcoal-600 font-medium truncate">{doc.title}</span>
                                                                        {doc.url ? (
                                                                            <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline text-[10px]">View</a>
                                                                        ) : (
                                                                            <span className="text-red-400 text-[10px]">Missing</span>
                                                                        )}
                                                                    </div>
                                                                    {doc.url && (
                                                                        <div className="text-[10px] text-charcoal-500 mt-0.5">
                                                                            {doc.expiry ? `Exp: ${new Date(doc.expiry).toLocaleDateString()}` : <span className="italic text-charcoal-400">No expiry provided</span>}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {result.documents.spacePhotos && result.documents.spacePhotos.length > 0 && (
                                                            <div className="mt-3">
                                                                <p className="text-[10px] uppercase tracking-wider text-charcoal-400 mb-2 font-medium">Space Photos</p>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {result.documents.spacePhotos.map((photo, i) => (
                                                                        <a key={i} href={photo} target="_blank" rel="noopener noreferrer" className="block w-10 h-10 rounded border border-cream-200 overflow-hidden hover:opacity-80 transition-opacity">
                                                                            <img src={photo} alt={`Space ${i + 1}`} className="w-full h-full object-cover" />
                                                                        </a>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Legal Documents Section (for Instructors) */}
                                                {result.role === 'instructor' && result.documents && (
                                                    <div className="mt-3 pt-3 border-t border-cream-200">
                                                        <p className="text-[10px] uppercase tracking-wider text-charcoal-400 mb-2 font-medium">Legal Documents</p>
                                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                            {[
                                                                { title: 'Certification', url: result.documents.certifications?.[0]?.url, expiry: result.documents.certifications?.[0]?.expiry },
                                                                { title: 'BIR Form 2303', url: result.documents.bir, expiry: result.documents.birExpiry },
                                                                { title: 'Gov ID', url: result.documents.govId, expiry: result.documents.govIdExpiry },
                                                            ].map((doc, idx) => (
                                                                <div key={idx} className="flex flex-col justify-between gap-1 p-2 bg-white border border-cream-100 rounded-lg text-xs">
                                                                    <div className="flex items-center justify-between gap-2">
                                                                        <span className="text-charcoal-600 font-medium truncate">{doc.title}</span>
                                                                        {doc.url ? (
                                                                            <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline text-[10px]">View</a>
                                                                        ) : (
                                                                            <span className="text-red-400 text-[10px]">Missing</span>
                                                                        )}
                                                                    </div>
                                                                    {doc.url && (
                                                                        <div className="text-[10px] text-charcoal-500 mt-0.5">
                                                                            {doc.expiry ? `Exp: ${new Date(doc.expiry).toLocaleDateString()}` : <span className="italic text-charcoal-400">No expiry provided</span>}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                            <div className="flex flex-col justify-center p-2 bg-white border border-cream-100 rounded-lg text-xs">
                                                                <span className="text-charcoal-500 text-[10px] uppercase tracking-tighter">TIN</span>
                                                                <span className="font-mono text-charcoal-900 truncate">{result.documents.tin || '—'}</span>
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
            )}
        </div>
    );
}
