'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Loader2, User, Building, Phone, Mail, Star, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
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
    url: string;
    is_founding_partner?: boolean;
    custom_fee_percentage?: number;
};

type ExpandedState = {
    is_founding_partner: boolean;
    custom_fee_percentage: number;
    saving: boolean;
};

export default function GlobalSearch() {
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
        const newVal = !current.is_founding_partner;
        setEditState(prev => ({ ...prev, [key]: { ...prev[key], is_founding_partner: newVal, saving: true } }));
        await updatePartnerFeeSettings(id, type, newVal, current.custom_fee_percentage);
        setEditState(prev => ({ ...prev, [key]: { ...prev[key], saving: false } }));
    };

    const handleChangeFee = async (key: string, id: string, type: 'profile' | 'studio', fee: string) => {
        const newFee = parseInt(fee) || 20;
        const current = editState[key];
        if (!current) return;
        setEditState(prev => ({ ...prev, [key]: { ...prev[key], custom_fee_percentage: newFee, saving: true } }));
        await updatePartnerFeeSettings(id, type, current.is_founding_partner, newFee);
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
                                            {/* Founder badge preview */}
                                            {state?.is_founding_partner && (
                                                <span className="shrink-0 flex items-center gap-1 bg-amber-100 text-amber-700 text-[10px] font-medium px-2 py-0.5 rounded-full border border-amber-200">
                                                    <Star className="w-2.5 h-2.5 fill-amber-500" /> Founding
                                                </span>
                                            )}
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
                                                    <button
                                                        onClick={() => handleTogglePartner(key, result.id, result.type)}
                                                        disabled={state.saving}
                                                        className={clsx(
                                                            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
                                                            state.is_founding_partner
                                                                ? "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200"
                                                                : "bg-white text-charcoal-600 border-cream-300 hover:bg-cream-100"
                                                        )}
                                                    >
                                                        <Star className={clsx("w-3.5 h-3.5", state.is_founding_partner ? "fill-amber-500" : "")} />
                                                        {state.is_founding_partner ? "Founding Partner ✓" : "Standard Partner"}
                                                    </button>

                                                    {/* Fee Selector */}
                                                    <div className="flex items-center gap-2">
                                                        <label className="text-xs text-charcoal-500">Fee:</label>
                                                        <select
                                                            disabled={!state.is_founding_partner || state.saving}
                                                            value={state.custom_fee_percentage}
                                                            onChange={(e) => handleChangeFee(key, result.id, result.type, e.target.value)}
                                                            className={clsx(
                                                                "border rounded-md text-xs px-2 py-1.5 outline-none focus:ring-1 focus:ring-charcoal-500",
                                                                !state.is_founding_partner
                                                                    ? "bg-cream-100 border-cream-200 text-charcoal-400 cursor-not-allowed"
                                                                    : "bg-white border-cream-300 text-charcoal-900"
                                                            )}
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
                                                {!state.is_founding_partner && (
                                                    <p className="text-[10px] text-charcoal-400 italic mt-2">Enable Founding Partner to set a custom fee.</p>
                                                )}
                                                <div className="mt-3 pt-3 border-t border-cream-200">
                                                    <Link
                                                        href={result.url}
                                                        onClick={() => { setIsOpen(false); setExpandedId(null); }}
                                                        className="inline-flex items-center gap-1.5 text-xs font-medium text-charcoal-600 hover:text-charcoal-900 transition-colors border border-cream-200 px-3 py-1.5 rounded-lg hover:bg-cream-50"
                                                    >
                                                        <ExternalLink className="w-3 h-3" />
                                                        View Profile
                                                    </Link>
                                                </div>
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
