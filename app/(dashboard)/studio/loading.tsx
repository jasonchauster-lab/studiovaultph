import { Loader2 } from 'lucide-react'

export default function Loading() {
    return (
        <div className="space-y-12 pb-20 p-4 sm:p-8">
            <div className="max-w-[1600px] mx-auto space-y-12 animate-pulse">

                {/* Header Skeleton */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                    <div>
                        <div className="h-12 w-80 bg-cream-200 rounded-lg mb-6"></div>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-cream-200 shrink-0"></div>
                            <div className="space-y-2 text-left">
                                <div className="h-5 w-48 bg-cream-200 rounded-md"></div>
                                <div className="h-3 w-32 bg-cream-100 rounded-md"></div>
                            </div>
                        </div>
                    </div>
                    <div className="h-10 w-36 bg-cream-200 rounded-full"></div>
                </div>

                {/* Studio Metrics Grid */}
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
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
                    <div className="xl:col-span-2 space-y-6">
                        <div className="bg-white p-6 rounded-2xl border border-cream-200 shadow-sm h-[40rem]">
                            <div className="h-8 w-48 bg-cream-200 rounded-lg mb-8"></div>
                            <div className="grid grid-cols-7 gap-4">
                                {[1, 2, 3, 4, 5, 6, 7].map(i => (
                                    <div key={i} className="h-96 bg-cream-50 rounded-xl border border-cream-100"></div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div className="bg-white rounded-2xl border border-cream-200 shadow-sm overflow-hidden h-[30rem]">
                            <div className="h-14 w-full bg-cream-200"></div>
                            <div className="p-6 space-y-4">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="h-20 w-full bg-cream-50 rounded-xl border border-cream-100"></div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50">
                <Loader2 className="w-8 h-8 text-charcoal-300 animate-spin" />
            </div>
        </div>
    )
}
