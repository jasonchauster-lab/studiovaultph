'use client'

import React from 'react'
import { 
    CreditCard, Package, MoreHorizontal, Edit2, Trash2, Loader2 
} from 'lucide-react'
import { DropdownMenu } from '@/components/ui/DropdownMenu'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Tooltip } from '@/components/ui/Tooltip'
import { Membership, Package as PricingPackage } from '@/types/agency'

interface PricingItemRowProps {
    item: Membership | PricingPackage
    activeTab: 'memberships' | 'packages'
    isDeleting: boolean
    onEdit: (item: any) => void
    onDelete: (item: any) => void
}

function PricingItemRow({ 
    item, 
    activeTab, 
    isDeleting, 
    onEdit, 
    onDelete 
}: PricingItemRowProps) {
    
    const formatPrice = (price: any) => {
        const num = parseFloat(price)
        return isNaN(num) ? '0' : num.toLocaleString()
    }

    const dropdownItems = [
        {
            label: 'Edit Details',
            icon: Edit2,
            onClick: () => onEdit(item)
        },
        {
            label: 'Delete Item',
            icon: Trash2,
            variant: 'destructive' as const,
            onClick: () => onDelete(item)
        }
    ]

    return (
        <div 
            className="px-6 py-5 flex items-center justify-between hover:bg-zinc-50/50 transition-colors group relative border-b border-zinc-50 last:border-0 last:rounded-b-xl"
        >
            <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="hidden sm:flex w-10 h-10 bg-zinc-50 rounded-lg items-center justify-center text-zinc-400 group-hover:bg-white group-hover:shadow-sm transition-all shrink-0">
                    {isDeleting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <Tooltip content={activeTab === 'memberships' ? 'Membership' : 'Package'}>
                            <div className="flex items-center justify-center">
                                {activeTab === 'memberships' ? <CreditCard className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                            </div>
                        </Tooltip>
                    )}
                </div>
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <h4 className="text-[13px] font-black text-zinc-900 truncate tracking-tightest">{item.name}</h4>
                        <div className="md:hidden">
                            <Badge variant={item.is_private ? 'outline' : 'success'} size="sm" showDot>
                                {item.is_private ? "Prv" : "Live"}
                            </Badge>
                        </div>
                    </div>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest truncate">
                        {activeTab === 'memberships' 
                            ? `${(item as Membership).credits !== null && (item as Membership).credits !== undefined ? (item as Membership).credits : 'Unlimited'} Credits · ${(item as Membership).validity_days} Days`
                            : `${(item as PricingPackage).credits} Credits · Valid for ${(item as PricingPackage).validity_days} Days`
                        }
                    </p>
                    <div className="md:hidden mt-1">
                        <span className="text-[11px] font-black text-zinc-900">₱{formatPrice(item.price)}</span>
                    </div>
                </div>
                <div className="hidden md:flex flex-1 items-center gap-12">
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Price</span>
                        <span className="text-sm font-black text-zinc-900">₱{formatPrice(item.price)}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Visibility</span>
                        <Badge variant={item.is_private ? 'outline' : 'success'} showDot>
                            {item.is_private ? "Private" : "Storefront"}
                        </Badge>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <Tooltip content="Edit Details">
                    <Button variant="ghost" size="sm" onClick={() => onEdit(item)}>
                        <Edit2 className="w-4 h-4 text-zinc-400 hover:text-zinc-600" />
                    </Button>
                </Tooltip>

                <DropdownMenu 
                    trigger={
                        <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-5 h-5" />
                        </Button>
                    }
                    items={dropdownItems}
                />
            </div>
        </div>
    )
}

export default React.memo(PricingItemRow)
