import type { ReactNode } from 'react'
import { ArrowUpRight } from 'lucide-react'
import Link from 'next/link'

interface IntroMetric {
    label: string
    value: string
}

interface IntroAction {
    label: string
    href: string
}

interface OnlineStorePageIntroProps {
    eyebrow: string
    title: string
    description: string
    metrics?: IntroMetric[]
    primaryAction?: IntroAction
    secondaryAction?: IntroAction
    aside?: ReactNode
}

export default function OnlineStorePageIntro({
    eyebrow,
    title,
    description,
    metrics = [],
    primaryAction,
    secondaryAction,
    aside,
}: OnlineStorePageIntroProps) {
    return (
        <section className="overflow-hidden rounded-[2.75rem] border border-zinc-200 bg-[radial-gradient(circle_at_top_left,_rgba(45,50,130,0.12),_transparent_36%),linear-gradient(180deg,_#ffffff,_#f8f5ef)] p-8 shadow-sm lg:p-10">
            <div className="grid gap-8 xl:grid-cols-[1.25fr_0.85fr] xl:items-start">
                <div className="space-y-6">
                    <div className="space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-zinc-400">{eyebrow}</p>
                        <h2 className="max-w-3xl text-4xl font-black tracking-tight text-zinc-900">{title}</h2>
                        <p className="max-w-2xl text-sm leading-relaxed text-zinc-500">{description}</p>
                    </div>

                    {(primaryAction || secondaryAction) && (
                        <div className="flex flex-wrap gap-3">
                            {primaryAction && (
                                <Link
                                    href={primaryAction.href}
                                    className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-white transition-all hover:bg-zinc-800"
                                >
                                    {primaryAction.label}
                                    <ArrowUpRight className="h-4 w-4" />
                                </Link>
                            )}
                            {secondaryAction && (
                                <Link
                                    href={secondaryAction.href}
                                    className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-zinc-700 transition-all hover:border-zinc-300"
                                >
                                    {secondaryAction.label}
                                </Link>
                            )}
                        </div>
                    )}

                     {metrics.length > 0 && (
                        <div className="flex flex-wrap gap-5">
                            {metrics.map((metric) => (
                                <div key={metric.label} className="flex-1 min-w-[300px] rounded-[2rem] border border-white/70 bg-white/80 p-8 shadow-sm backdrop-blur transition-all">
                                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-zinc-400">{metric.label}</p>
                                    <p className="mt-4 text-2xl font-black tracking-tight text-zinc-900 whitespace-nowrap">{metric.value}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {aside && (
                    <div className="rounded-[2.25rem] border border-white/70 bg-white/80 p-6 shadow-sm backdrop-blur">
                        {aside}
                    </div>
                )}
            </div>
        </section>
    )
}
