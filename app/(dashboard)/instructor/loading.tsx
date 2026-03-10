import { Loader2 } from 'lucide-react'

export default function Loading() {
    return (
        <div className="min-h-screen bg-cream-50 p-4 sm:p-8">
            <div className="max-w-7xl mx-auto space-y-8 animate-pulse">

                {/* Header Skeleton */}
                <div className="flex justify-between items-end">
                    <div>
                        <div className="h-10 w-64 bg-cream-200 rounded-lg mb-3"></div>
                        <div className="h-4 w-96 bg-cream-100 rounded-md"></div>
                    </div>
                    <div className="h-10 w-32 bg-cream-200 rounded-full"></div>
                </div>

                {/* Dashboard Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="bg-white p-6 rounded-2xl border border-cream-200 shadow-sm h-32 flex flex-col justify-between">
                            <div className="flex justify-between items-start">
                                <div className="h-4 w-24 bg-cream-100 rounded-md"></div>
                                <div className="h-8 w-8 bg-cream-100 rounded-full"></div>
                            </div>
                            <div className="h-8 w-32 bg-cream-200 rounded-lg"></div>
                        </div>
                    ))}
                </div>

                {/* Main Content Area */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column (e.g. Calendar/Session List) */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white p-6 rounded-2xl border border-cream-200 shadow-sm h-96">
                            <div className="h-6 w-48 bg-cream-200 rounded-md mb-6"></div>
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-20 w-full bg-cream-50 rounded-xl border border-cream-100"></div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Column (e.g. Notifications/Upcoming) */}
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-2xl border border-cream-200 shadow-sm h-[28rem]">
                            <div className="h-6 w-32 bg-cream-200 rounded-md mb-6"></div>
                            <div className="space-y-4">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="flex gap-4 items-center" >
                                        <div className="h-12 w-12 bg-cream-100 rounded-full shrink-0"></div>
                                        <div className="space-y-2 flex-1">
                                            <div className="h-4 w-full bg-cream-100 rounded-md"></div>
                                            <div className="h-3 w-2/3 bg-cream-50 rounded-md"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Centered Spinner overlay */}
            <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50">
                <Loader2 className="w-8 h-8 text-charcoal-300 animate-spin" />
            </div>
        </div>
    )
}
