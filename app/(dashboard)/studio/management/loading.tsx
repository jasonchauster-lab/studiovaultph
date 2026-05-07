import { Loader2 } from 'lucide-react'

export default function ManagementLoading() {
    return (
        <div className="max-w-6xl mx-auto py-10 px-6 min-h-[60vh] flex flex-col items-center justify-center space-y-4">
            <div className="relative">
                <div className="w-12 h-12 rounded-full border-4 border-zinc-100 border-t-[#2D3282] animate-spin" />
                <Loader2 className="w-5 h-5 text-[#2D3282] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400 animate-pulse">Loading Management...</p>
        </div>
    )
}
