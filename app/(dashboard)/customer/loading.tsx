import { Loader2 } from 'lucide-react'

export default function Loading() {
    return (
        <div className="min-h-screen bg-cream-50 p-4 sm:p-8">
            <div className="max-w-7xl mx-auto space-y-8 animate-pulse">

                {/* Header Skeleton */}
                <div>
                    <div className="h-10 w-48 bg-cream-200 rounded-lg mb-3"></div>
                    <div className="h-4 w-64 bg-cream-100 rounded-md"></div>
                </div>

                {/* Dashboard Metrics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white p-6 rounded-2xl border border-cream-200 shadow-sm h-36 flex flex-col justify-between">
                            <div className="flex justify-between items-start">
                                <div className="h-4 w-24 bg-cream-100 rounded-md"></div>
                                <div className="h-10 w-10 bg-cream-100 rounded-full"></div>
                            </div>
                            <div className="h-10 w-32 bg-cream-200 rounded-lg"></div>
                        </div>
                    ))}
                </div>

                {/* Main Content Area */}
                <div className="bg-white p-6 md:p-8 rounded-2xl border border-cream-200 shadow-sm h-[32rem]">
                    <div className="flex justify-between mb-8">
                        <div className="h-6 w-48 bg-cream-200 rounded-md"></div>
                        <div className="h-10 w-32 bg-cream-100 rounded-lg"></div>
                    </div>

                    <div className="space-y-4">
                        <div className="h-12 w-full bg-cream-100 rounded-xl"></div>
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-16 w-full bg-cream-50 rounded-xl border border-cream-100"></div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50">
                <Loader2 className="w-8 h-8 text-charcoal-300 animate-spin" />
            </div>
        </div>
    )
}
