import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
    return (
        <div className="min-h-screen bg-surface p-4 sm:p-8">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header Skeleton */}
                <div className="flex justify-between items-end">
                    <div className="space-y-3">
                        <Skeleton className="h-10 w-64" />
                        <Skeleton className="h-4 w-96" />
                    </div>
                    <Skeleton className="h-10 w-32" variant="circle" />
                </div>

                {/* Dashboard Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="atelier-card h-32 flex flex-col justify-between">
                            <div className="flex justify-between items-start">
                                <Skeleton variant="text" className="w-24" />
                                <Skeleton className="h-8 w-8" variant="circle" />
                            </div>
                            <Skeleton className="h-8 w-32" />
                        </div>
                    ))}
                </div>

                {/* Main Content Area */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="atelier-card h-96">
                            <Skeleton variant="text" className="w-48 mb-6 h-6" />
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => (
                                    <Skeleton key={i} className="h-20 w-full" />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                        <div className="atelier-card h-[28rem]">
                            <Skeleton variant="text" className="w-32 mb-6 h-6" />
                            <div className="space-y-4">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="flex gap-4 items-center">
                                        <Skeleton className="h-12 w-12" variant="circle" />
                                        <div className="space-y-2 flex-1">
                                            <Skeleton variant="text" />
                                            <Skeleton variant="text" className="w-2/3 h-3" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    )
}
