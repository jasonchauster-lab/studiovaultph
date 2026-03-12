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
        <div className="min-h-screen bg-off-white flex flex-col items-center justify-center p-4 sm:p-8 py-12">
            <div className="max-w-4xl w-full text-center mt-auto mb-auto flex flex-col gap-y-10">

                {/* Eyebrow */}
                <div className="flex flex-col items-center gap-y-3">
                    <h1 className="text-4xl md:text-5xl font-serif text-burgundy tracking-tight">
                        Welcome to Studio Vault PH
                    </h1>
                    <p className="text-muted-burgundy text-lg leading-relaxed max-w-md">
                        How will you be using the platform today?
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Instructor Card */}
                    <form action={async () => {
                        'use server'
                        await selectRole('instructor')
                    }}>
                        <button className="w-full h-full group bg-white p-8 rounded-2xl border-2 border-border-grey shadow-tight hover:shadow-card hover:border-burgundy/30 transition-all flex flex-col items-center gap-y-4">
                            <div className="w-14 h-14 bg-off-white rounded-full flex items-center justify-center group-hover:bg-burgundy transition-colors duration-300 border border-border-grey">
                                <User className="w-7 h-7 text-burgundy group-hover:text-white transition-colors duration-300" />
                            </div>
                            <div className="flex flex-col gap-y-1">
                                <h2 className="text-xl font-serif text-burgundy">I&apos;m an Instructor</h2>
                                <p className="text-sm text-muted-burgundy leading-relaxed">Find studios, book slots, and manage your bookings.</p>
                            </div>
                        </button>
                    </form>

                    {/* Studio Card */}
                    <form action={async () => {
                        'use server'
                        await selectRole('studio')
                    }}>
                        <button className="w-full h-full group bg-white p-8 rounded-2xl border-2 border-border-grey shadow-tight hover:shadow-card hover:border-burgundy/30 transition-all flex flex-col items-center gap-y-4">
                            <div className="w-14 h-14 bg-off-white rounded-full flex items-center justify-center group-hover:bg-burgundy transition-colors duration-300 border border-border-grey">
                                <Building2 className="w-7 h-7 text-burgundy group-hover:text-white transition-colors duration-300" />
                            </div>
                            <div className="flex flex-col gap-y-1">
                                <h2 className="text-xl font-serif text-burgundy">I own a Studio</h2>
                                <p className="text-sm text-muted-burgundy leading-relaxed">List your studio, manage availability, and get paid.</p>
                            </div>
                        </button>
                    </form>

                    {/* Customer Card — full width */}
                    <form
                        action={async () => {
                            'use server'
                            await selectRole('customer')
                        }}
                        className="md:col-span-2 mx-auto w-full max-w-md"
                    >
                        <button className="w-full h-full group bg-white p-8 rounded-2xl border-2 border-border-grey shadow-tight hover:shadow-card hover:border-burgundy/30 transition-all flex flex-col items-center gap-y-4">
                            <div className="w-14 h-14 bg-off-white rounded-full flex items-center justify-center group-hover:bg-burgundy transition-colors duration-300 border border-border-grey">
                                <User className="w-7 h-7 text-burgundy group-hover:text-white transition-colors duration-300" />
                            </div>
                            <div className="flex flex-col gap-y-1">
                                <h2 className="text-xl font-serif text-burgundy">I want to Train</h2>
                                <p className="text-sm text-muted-burgundy leading-relaxed">Find instructors, book classes, and manage your schedule.</p>
                            </div>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
