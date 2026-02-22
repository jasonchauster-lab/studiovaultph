import Link from 'next/link'
import { User, Building2 } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { selectRole } from './actions'

export default async function WelcomePage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role === 'admin') {
            redirect('/admin')
        }
    }
    return (
        <div className="min-h-screen bg-cream-50 flex flex-col items-center justify-center p-4 sm:p-8 py-12">
            <div className="max-w-4xl w-full text-center mt-auto mb-auto">
                <h1 className="text-4xl font-serif text-charcoal-900 mb-4">Welcome to StudioVaultPH</h1>
                <p className="text-charcoal-600 mb-12 text-lg">How will you be using the platform?</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Instructor Card */}
                    <form action={async () => {
                        'use server'
                        await selectRole('instructor')
                    }}>
                        <button className="w-full h-full group bg-white p-6 sm:p-8 rounded-2xl border border-cream-200 shadow-sm hover:shadow-md hover:border-charcoal-200 transition-all flex flex-col items-center">
                            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-cream-100 rounded-full flex items-center justify-center mb-4 sm:mb-6 group-hover:bg-charcoal-900 group-hover:text-cream-50 transition-colors">
                                <User className="w-6 h-6 sm:w-8 sm:h-8 text-charcoal-900 group-hover:text-cream-50" />
                            </div>
                            <h2 className="text-xl sm:text-2xl font-serif text-charcoal-900 mb-2">I'm an Instructor</h2>
                            <p className="text-sm sm:text-base text-charcoal-500">Find studios, book slots, and manage your bookings.</p>
                        </button>
                    </form>

                    {/* Studio Card */}
                    <form action={async () => {
                        'use server'
                        await selectRole('studio')
                    }}>
                        <button className="w-full h-full group bg-white p-6 sm:p-8 rounded-2xl border border-cream-200 shadow-sm hover:shadow-md hover:border-charcoal-200 transition-all flex flex-col items-center">
                            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-cream-100 rounded-full flex items-center justify-center mb-4 sm:mb-6 group-hover:bg-charcoal-900 group-hover:text-cream-50 transition-colors">
                                <Building2 className="w-6 h-6 sm:w-8 sm:h-8 text-charcoal-900 group-hover:text-cream-50" />
                            </div>
                            <h2 className="text-xl sm:text-2xl font-serif text-charcoal-900 mb-2">I own a Studio</h2>
                            <p className="text-sm sm:text-base text-charcoal-500">List your studio, manage availability, and get paid.</p>
                        </button>
                    </form>

                    {/* Customer Card */}
                    <form action={async () => {
                        'use server'
                        await selectRole('customer')
                    }} className="md:col-span-2 lg:col-span-1 lg:col-start-1 lg:col-end-3 mx-auto w-full max-w-md">
                        <button className="w-full h-full group bg-white p-6 sm:p-8 rounded-2xl border border-cream-200 shadow-sm hover:shadow-md hover:border-charcoal-200 transition-all flex flex-col items-center">
                            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-cream-100 rounded-full flex items-center justify-center mb-4 sm:mb-6 group-hover:bg-charcoal-900 group-hover:text-cream-50 transition-colors">
                                <User className="w-6 h-6 sm:w-8 sm:h-8 text-charcoal-900 group-hover:text-cream-50" />
                            </div>
                            <h2 className="text-xl sm:text-2xl font-serif text-charcoal-900 mb-2">I want to Train</h2>
                            <p className="text-sm sm:text-base text-charcoal-500">Find instructors, book classes, and manage your schedule.</p>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
