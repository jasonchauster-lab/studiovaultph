'use client'

import Link from 'next/link'
import { 
    Receipt, 
    Wallet, 
    Globe,
    ChevronRight
} from 'lucide-react'
import { clsx } from 'clsx'

interface SettingsItem {
    id: string;
    label: string;
    href: string;
    icon: any;
    color: string;
    description?: string;
}

const SETTINGS_ITEMS: SettingsItem[] = [
    { 
        id: 'billing', 
        label: 'Billing & Plan', 
        href: '/studio/settings/billing', 
        icon: Receipt, 
        color: 'bg-indigo-50 text-indigo-600 border-indigo-100', 
        description: 'Manage your CMS subscription plan' 
    },
    { 
        id: 'wallet', 
        label: 'Studio Wallet', 
        href: '/studio/settings/wallet', 
        icon: Wallet, 
        color: 'bg-amber-50 text-amber-600 border-amber-100', 
        description: 'Studio wallet & balance' 
    },
    { 
        id: 'marketplace', 
        label: 'Marketplace', 
        href: '/studio/settings/marketplace', 
        icon: Globe, 
        color: 'bg-indigo-50 text-indigo-600 border-indigo-100', 
        description: 'Public listing & verification' 
    },
]

export default function SettingsGrid() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {SETTINGS_ITEMS.map((item) => (
                <Link 
                    key={item.id} 
                    href={item.href}
                    className="group bg-white border border-zinc-100 hover:border-indigo-600/20 p-8 rounded-[2.5rem] transition-all duration-500 hover:shadow-xl hover:shadow-indigo-500/5 active:scale-[0.98] flex flex-col items-start gap-10"
                >
                    <div className={clsx(
                        "w-16 h-16 rounded-2xl flex items-center justify-center border transition-all duration-500 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-current/10",
                        item.color
                    )}>
                        <item.icon className="w-8 h-8" strokeWidth={1.5} />
                    </div>
                    
                    <div className="space-y-2 flex-1">
                        <h3 className="text-xl font-black text-zinc-900 tracking-tight transition-colors group-hover:text-indigo-600">
                            {item.label}
                        </h3>
                        {item.description && (
                            <p className="text-xs text-zinc-400 font-medium leading-relaxed">
                                {item.description}
                            </p>
                        )}
                    </div>

                    <div className="w-full flex items-center justify-between pt-6 border-t border-zinc-50">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300 group-hover:text-indigo-600 transition-colors">
                            Configure Settings
                        </span>
                        <ChevronRight className="w-5 h-5 text-zinc-200 transition-transform duration-500 group-hover:translate-x-1 group-hover:text-indigo-600" />
                    </div>
                </Link>
            ))}
        </div>
    )
}
