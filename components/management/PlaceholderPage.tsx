export default function PlaceholderPage({ params }: { params: any }) {
    return (
        <div className="max-w-5xl mx-auto py-24 px-6 text-center space-y-4">
            <div className="w-20 h-20 bg-zinc-50 rounded-[2rem] border border-zinc-100 flex items-center justify-center mx-auto shadow-sm">
                 <div className="w-8 h-8 rounded-full border-4 border-zinc-200 border-t-zinc-900 border-r-zinc-900" />
            </div>
            <h1 className="text-3xl font-black text-zinc-900 tracking-tightest font-atelier pt-4">Feature under development</h1>
            <p className="text-sm text-zinc-400 font-medium max-w-sm mx-auto">We're working hard to bring this feature to your dashboard. Stay tuned for updates!</p>
        </div>
    )
}
