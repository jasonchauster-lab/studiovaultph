'use client'

import React, { useState } from 'react'
import { 
    Plus, ChevronDown, Filter, ChevronRight,
    Users, Calendar, Mail, Phone, Search as SearchIcon
} from 'lucide-react'
import Link from 'next/link'
import { clsx } from 'clsx'
import Avatar from '@/components/shared/Avatar'
import { format } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { useSearchParams } from 'next/navigation'
import { ClientProfile } from '@/types/agency'

interface CustomersClientProps {
    customers: ClientProfile[]
}

export default function CustomersClient({ customers: initialCustomers }: CustomersClientProps) {
    const searchParams = useSearchParams()
    const [searchQuery, setSearchQuery] = useState('')
    const [itemsPerPage, setItemsPerPage] = useState('50')
    const [statusFilter, setStatusFilter] = useState('all')

    // Contextual Intel: Auto-apply search from URL
    React.useEffect(() => {
        const search = searchParams.get('search')
        if (search) {
            setSearchQuery(search)
        }
    }, [searchParams])

    const filteredCustomers = initialCustomers.filter(customer => {
        const query = searchQuery.toLowerCase()
        return (
            customer.full_name?.toLowerCase().includes(query) ||
            customer.email?.toLowerCase().includes(query) ||
            customer.phone?.toLowerCase().includes(query)
        )
    })

    return (
        <div className="space-y-8">
            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-6 bg-white p-4 rounded-[2.5rem] border border-zinc-100 shadow-sm w-full lg:w-fit">
                <div className="min-w-[300px]">
                    <Input 
                        placeholder="Search directory..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        icon={SearchIcon}
                        variant="atelier"
                    />
                </div>

                <div className="flex items-center gap-4">
                    <Select 
                        value={statusFilter}
                        onValueChange={setStatusFilter}
                        options={[
                            { label: 'All Status', value: 'all' },
                            { label: 'Active', value: 'active' },
                            { label: 'Inactive', value: 'inactive' }
                        ]}
                        className="w-40"
                    />

                    <div className="hidden sm:flex items-center gap-4 pl-6 border-l border-zinc-100">
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">View</span>
                        <Select 
                            value={itemsPerPage}
                            onValueChange={setItemsPerPage}
                            options={[
                                { label: '25 per page', value: '25' },
                                { label: '50 per page', value: '50' },
                                { label: '100 per page', value: '100' }
                            ]}
                            className="w-32"
                        />
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="space-y-4">
                {/* Desktop Header */}
                <div className="hidden lg:grid grid-cols-12 px-10 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] border-b border-zinc-50 bg-zinc-50/50 rounded-t-[2.5rem]">
                    <div className="col-span-3">Client Profile</div>
                    <div className="col-span-2">Joined Studio</div>
                    <div className="col-span-2">Contact Intelligence</div>
                    <div className="col-span-1 text-center">Visits</div>
                    <div className="col-span-1 text-center">Referrals</div>
                    <div className="col-span-2">Last Interaction</div>
                    <div className="col-span-1"></div>
                </div>

                {/* Main List */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:block gap-4 lg:space-y-3">
                    <AnimatePresence mode="popLayout">
                        {filteredCustomers.length > 0 ? (
                            filteredCustomers.map((customer, index) => (
                                <motion.div
                                    key={customer.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.3, delay: index * 0.01 }}
                                >
                                    <Link 
                                        href={`/studio/customers/${customer.id}`}
                                        className="group block bg-white hover:bg-zinc-50/30 border border-zinc-100 rounded-[2.5rem] p-6 lg:px-10 lg:py-6 transition-all hover:shadow-2xl hover:shadow-primary/5 relative overflow-hidden h-full"
                                    >
                                        <div className="flex flex-col lg:grid lg:grid-cols-12 lg:items-center gap-6">
                                            {/* Profile Area */}
                                            <div className="col-span-3 flex items-center gap-5 min-w-0">
                                                <div className="relative flex-shrink-0">
                                                    <Avatar 
                                                        src={customer.avatar_url} 
                                                        fallbackName={customer.full_name} 
                                                        size={56}
                                                        className="rounded-2xl ring-1 ring-zinc-100 shadow-sm group-hover:scale-105 transition-transform"
                                                    />
                                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full" />
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-base lg:text-sm font-black text-zinc-900 truncate tracking-tightest group-hover:text-primary transition-colors">{customer.full_name}</span>
                                                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1">ID: {customer.id.slice(0, 8)}</span>
                                                </div>
                                            </div>

                                            {/* Mobile-Only Contact Badges */}
                                            <div className="flex lg:hidden flex-wrap gap-2">
                                                <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-50 rounded-lg border border-zinc-100">
                                                    <Mail className="w-3 h-3 text-zinc-400" />
                                                    <span className="text-[9px] font-black text-zinc-600 truncate max-w-[120px]">{customer.email}</span>
                                                </div>
                                                <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-50 rounded-lg border border-zinc-100">
                                                    <Phone className="w-3 h-3 text-zinc-400" />
                                                    <span className="text-[9px] font-black text-zinc-600 uppercase">{customer.phone || 'N/A'}</span>
                                                </div>
                                            </div>

                                            {/* Table Columns */}
                                            <div className="hidden lg:col-span-2 lg:flex flex-col">
                                                <span className="text-xs font-black text-zinc-900 tracking-tightest">
                                                    {customer.joined_date ? format(new Date(customer.joined_date), 'dd MMM yyyy') : '—'}
                                                </span>
                                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                                                    Joined Studio
                                                </span>
                                            </div>

                                            <div className="hidden lg:col-span-2 lg:flex flex-col gap-1 min-w-0">
                                                <span className="text-xs font-black text-zinc-500 truncate block lowercase tracking-tight">{customer.email}</span>
                                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest truncate">{customer.phone || 'no phone'}</span>
                                            </div>

                                            {/* Stats Area */}
                                            <div className="flex lg:grid lg:col-span-2 lg:grid-cols-2 items-center gap-8 lg:gap-4 border-t lg:border-none pt-6 lg:pt-0">
                                                <div className="flex-1 lg:text-center space-y-1">
                                                    <span className="block lg:hidden text-[9px] font-black text-zinc-400 uppercase tracking-widest">Total Visits</span>
                                                    <div className="inline-flex items-center justify-center px-4 py-2 bg-zinc-50 rounded-xl border border-zinc-100 text-xs font-black text-zinc-900 group-hover:bg-primary/5 group-hover:border-primary/20 group-hover:text-primary transition-all">
                                                        {customer.total_bookings || 0}
                                                    </div>
                                                </div>
                                                <div className="flex-1 lg:text-center space-y-1">
                                                    <span className="block lg:hidden text-[9px] font-black text-zinc-400 uppercase tracking-widest">Referrals</span>
                                                    <span className="text-xs font-black text-primary block">
                                                        {customer.referral_count || 0}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="col-span-2 flex flex-col pt-6 lg:pt-0 border-t lg:border-none">
                                                <span className="block lg:hidden text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Last Interaction</span>
                                                <span className="text-xs font-black text-zinc-900 tracking-tightest">
                                                    {customer.last_visit ? format(new Date(customer.last_visit), 'dd MMM yyyy') : 'Never visited'}
                                                </span>
                                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                                                    {customer.last_visit ? format(new Date(customer.last_visit), 'hh:mm aa') : 'No history yet'}
                                                </span>
                                            </div>

                                            {/* Action Icon */}
                                            <div className="hidden lg:col-span-1 lg:flex justify-end">
                                                <div className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-50 text-zinc-300 group-hover:bg-zinc-900 group-hover:text-white transition-all active:scale-90 shadow-sm border border-zinc-100">
                                                    <ChevronRight className="w-5 h-5" /> 
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                </motion.div>
                            ))
                        ) : (
                            <div className="col-span-full">
                                <EmptyState 
                                    title="No customers found"
                                    description="Try adjusting your search or filters to find what you're looking for."
                                    icon={SearchIcon}
                                />
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    )
}
