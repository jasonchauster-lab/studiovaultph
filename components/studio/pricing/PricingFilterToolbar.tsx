'use client'

import React from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'

interface PricingFilterToolbarProps {
    searchQuery: string
    onSearchChange: (value: string) => void
    statusFilter: 'all' | 'public' | 'private'
    onStatusChange: (status: 'all' | 'public' | 'private') => void
    categoryFilter: 'all' | string
    onCategoryChange: (catId: 'all' | string) => void
    categories: any[]
}

function PricingFilterToolbar({
    searchQuery,
    onSearchChange,
    statusFilter,
    onStatusChange,
    categoryFilter,
    onCategoryChange,
    categories,
}: PricingFilterToolbarProps) {
    const [localQuery, setLocalQuery] = React.useState(searchQuery)

    React.useEffect(() => {
        setLocalQuery(searchQuery)
    }, [searchQuery])

    const handleSearch = (val: string) => {
        setLocalQuery(val)
        onSearchChange(val)
    }
    const statusOptions = [
        { label: 'All Status', value: 'all' },
        { label: 'Public', value: 'public' },
        { label: 'Private', value: 'private' },
    ]

    const categoryOptions = [
        { label: 'All Categories', value: 'all' },
        { label: 'General (Uncategorized)', value: '' },
        ...categories.map(cat => ({
            label: cat.name,
            value: cat.id
        }))
    ]

    return (
        <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-1 w-full">
                <Input 
                    icon={Search}
                    placeholder="Search pricing items..."
                    value={localQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                />
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                <Select 
                    className="w-40"
                    value={statusFilter}
                    onValueChange={(val) => onStatusChange(val as any)}
                    options={statusOptions}
                />

                <Select 
                    className="w-56"
                    value={categoryFilter}
                    onValueChange={onCategoryChange}
                    options={categoryOptions}
                />
            </div>
        </div>
    )
}

export default React.memo(PricingFilterToolbar)
