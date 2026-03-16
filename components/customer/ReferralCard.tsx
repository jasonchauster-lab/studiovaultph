'use client'

import { useState } from 'react'
import { Copy, Check, Gift } from 'lucide-react'

interface ReferralCardProps {
    referralCode: string
    origin: string
}

export default function ReferralCard({ referralCode, origin }: ReferralCardProps) {
    const [copied, setCopied] = useState(false)

    const referralUrl = `${origin}/login?ref=${referralCode}`

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(referralUrl)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            // Fallback for browsers that block clipboard without interaction
            const el = document.createElement('textarea')
            el.value = referralUrl
            document.body.appendChild(el)
            el.select()
            document.execCommand('copy')
            document.body.removeChild(el)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    return (
        <div className="earth-card p-6 flex flex-col gap-y-5 bg-white">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-buttermilk rounded-xl flex items-center justify-center border border-burgundy/10 flex-shrink-0">
                    <Gift className="w-5 h-5 text-burgundy" />
                </div>
                <div>
                    <h3 className="text-lg font-serif font-bold text-burgundy leading-tight">Refer a Friend</h3>
                    <p className="text-[10px] font-bold text-muted-burgundy uppercase tracking-[0.3em]">Earn ₱50 per referral</p>
                </div>
            </div>

            <p className="text-sm text-muted-burgundy leading-relaxed">
                Share your link. When your friend completes their <span className="font-semibold text-burgundy">first booking</span>, ₱50 is credited directly to your wallet — no limits on how many friends you refer.
            </p>

            <div className="flex items-center gap-2 bg-off-white rounded-lg border border-border-grey p-1 pl-4">
                <span className="text-xs font-medium text-burgundy/50 flex-1 truncate min-w-0">{referralUrl}</span>
                <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 bg-forest text-white px-4 py-2.5 rounded-md text-[10px] font-bold uppercase tracking-wider hover:brightness-110 transition-all flex-shrink-0"
                >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied!' : 'Copy Link'}
                </button>
            </div>

            <p className="text-[9px] font-bold text-muted-burgundy/50 uppercase tracking-widest">
                Your code: {referralCode}
            </p>
        </div>
    )
}
