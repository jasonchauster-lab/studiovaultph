'use client'

import { Search, X } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'

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
        <form onSubmit={handleSearch} className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative min-w-[280px]">
                <input
                    type="text"
                    placeholder="Search by email or phone..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full bg-alabaster/50 border border-cream-100 rounded-2xl px-5 py-3 text-xs font-bold text-charcoal placeholder:text-charcoal/30 focus:outline-none focus:ring-2 focus:ring-sage/20 transition-all shadow-sm"
                />
                {query && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal/30 hover:text-charcoal transition-colors p-1"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>
            <button
                type="submit"
                className="bg-forest text-white px-6 py-3 rounded-2xl text-[10px] font-black tracking-[0.2em] hover:brightness-110 transition-all shadow-md flex items-center gap-2 shrink-0"
            >
                <Search className="w-4 h-4" />
                SEARCH
            </button>
        </form>
    )
}
