'use client'

import { Search, X } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import clsx from 'clsx'

export default function UserSearchBar() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [query, setQuery] = useState(searchParams.get('search') || '')

    // Update local state if URL changes (e.g., from browser back button)
    useEffect(() => {
        setQuery(searchParams.get('search') || '')
    }, [searchParams])

    const handleSearch = (e?: React.FormEvent) => {
        e?.preventDefault()
        const params = new URLSearchParams(searchParams.toString())
        if (query.trim()) {
            params.set('search', query.trim())
        } else {
            params.delete('search')
        }
        params.set('tab', 'customers') // Ensure we stay on the customers tab
        router.push(`/admin?${params.toString()}`)
    }

    const handleClear = () => {
        setQuery('')
        const params = new URLSearchParams(searchParams.toString())
        params.delete('search')
        params.set('tab', 'customers')
        router.push(`/admin?${params.toString()}`)
    }

    return (
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full">
            <div className="relative flex-1 group">
                <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                    <Search className="w-4 h-4 text-burgundy/30 group-focus-within:text-forest transition-colors" />
                </div>
                <input
                    type="text"
                    placeholder="Search intelligence database (email, phone...)"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full bg-white border border-stone-200 rounded-[20px] pl-12 pr-12 py-3.5 text-[13px] font-medium text-burgundy placeholder:text-burgundy/20 outline-none transition-all duration-500 focus:ring-8 focus:ring-forest/5 focus:border-forest/30 shadow-sm group-hover:border-stone-300"
                />
                {query && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-300 hover:text-burgundy transition-colors p-1"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>
            <button
                type="submit"
                className="bg-forest text-white px-8 py-3.5 rounded-[20px] text-[10px] font-black tracking-[0.2em] hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-forest/10 flex items-center justify-center gap-3 shrink-0 uppercase"
            >
                <Search className="w-4 h-4 text-amber-400" />
                Refine View
            </button>
        </form>
    )
}
