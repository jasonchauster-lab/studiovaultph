'use client'

import React, { useState } from 'react'
import { 
    Wallet, 
    ShieldCheck, 
    ArrowRight,
    Settings as SettingsIcon
} from 'lucide-react'
import { Switch } from '@/components/ui/Switch'
import { useToast } from '@/components/ui/Toast'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { toggleStudioWalletFeature } from './actions'

import { Studio } from '@/types/agency'

interface WalletSettingsClientProps {
    studio: Studio
}

export default function WalletSettingsClient({ studio }: WalletSettingsClientProps) {
    const { toast } = useToast()
    const [loading, setLoading] = useState(false)
    
    const config = studio.website_config || {}
    const isWalletEnabled = config.features?.wallet_enabled ?? true // Default to true if not set

    const handleToggle = async () => {
        setLoading(true)
        
        try {
            const result = await toggleStudioWalletFeature(studio.id, !isWalletEnabled)
            if (result.success) {
                toast(`Wallet feature ${!isWalletEnabled ? 'enabled' : 'disabled'} successfully.`, 'success')
            } else {
                toast(result.error || 'Failed to update setting', 'error')
            }
        } catch (err) {
            toast('An unexpected error occurred', 'error')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-4xl space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-700">
            {/* Hero Toggle Card */}
            <Card 
                className="p-10 relative overflow-hidden group"
                innerClassName="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-10"
            >
                {/* Decorative Icon */}
                <div className="absolute top-0 right-0 p-12 text-zinc-50 group-hover:text-primary/5 transition-colors duration-700 pointer-events-none">
                    <Wallet className="w-64 h-64 -mr-20 -mt-20" />
                </div>

                <div className="space-y-4 max-w-xl">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center">
                            <ShieldCheck className="w-6 h-6 text-primary" />
                        </div>
                        <h2 className="text-3xl font-black text-zinc-900 tracking-tight">Financial System</h2>
                    </div>
                    <p className="text-zinc-500 text-lg font-bold leading-relaxed">
                        Enable a digital wallet system for your studio, allowing customers to top up their balance and pay for services directly from their account.
                    </p>
                </div>

                <div className="flex flex-col items-center gap-4">
                    <Switch 
                        checked={isWalletEnabled}
                        onChange={handleToggle}
                        disabled={loading}
                    />
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300">
                        {isWalletEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                </div>
            </Card>

            {/* Feature Description Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card 
                    header={
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <SettingsIcon className="w-7 h-7" />
                            </div>
                            <h3 className="text-xl font-black text-zinc-900 tracking-tight">Secure Ecosystem</h3>
                        </div>
                    }
                    footer={
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-zinc-300">
                            <span>Status</span>
                            <span className={isWalletEnabled ? 'text-emerald-500' : 'text-zinc-400'}>
                                {isWalletEnabled ? 'Active' : 'Disabled'}
                            </span>
                        </div>
                    }
                >
                    <p className="text-zinc-500 text-sm font-bold leading-relaxed">
                        A dedicated wallet for your studio only. Money added here by your customers stays within your business ecosystem.
                    </p>
                </Card>

                <Card 
                    variant="dark"
                    className="relative overflow-hidden group"
                    header={
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-white">
                                <Wallet className="w-7 h-7" />
                            </div>
                            <h3 className="text-xl font-black text-white tracking-tight">Direct Adjustments</h3>
                        </div>
                    }
                    footer={
                        <div className="flex items-center justify-between relative z-10">
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Action</span>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                href="/studio/customers"
                                className="text-indigo-400 hover:text-indigo-300 hover:bg-transparent"
                            >
                                View Customers <ArrowRight className="w-3 h-3 ml-2" />
                            </Button>
                        </div>
                    }
                >
                    {/* Decorative gradient */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/20 to-transparent blur-3xl -mr-32 -mt-32 pointer-events-none" />
                    
                    <p className="text-zinc-400 text-sm font-bold leading-relaxed relative z-10">
                        Manually top up or deduct funds for specific customers directly from their profile in your customer directory.
                    </p>
                </Card>
            </div>
        </div>
    )
}
