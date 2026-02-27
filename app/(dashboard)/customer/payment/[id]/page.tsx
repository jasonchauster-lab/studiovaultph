import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import PaymentForm from '@/components/customer/PaymentForm'
import ExpandableImage from '@/components/ui/ExpandableImage'
import { ArrowLeft, CreditCard, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

export default async function PaymentPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    // Lazily expire any abandoned bookings
    const { expireAbandonedBookings } = await import('@/lib/wallet')
    await expireAbandonedBookings().catch(() => { })

    // Check for a valid PAR-Q on file (within the last 365 days)
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

    const { data: existingParq } = await supabase
        .from('waiver_consents')
        .select('parq_answers, has_risk_flags, agreed_at')
        .eq('user_id', user.id)
        .gte('agreed_at', oneYearAgo.toISOString())
        .order('agreed_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    // Fetch Booking with explicit relationship for profiles (instructor)
    const { data: booking, error } = await supabase
        .from('bookings')
        .select(`
            *,
            slots (
                start_time,
                end_time,
                studios (
                    name,
                    location,
                    address,
                    contact_number
                )
            ),
            instructor: profiles!instructor_id (
                full_name
            )
        `)
        .eq('id', id)
        .eq('client_id', user.id)
        .single()

    if (error) {
        console.error('Payment Page Fetch Error:', error)
        return (
            <div className="min-h-screen bg-cream-50 p-8 flex items-center justify-center">
                <div className="text-center text-red-600">
                    <h1 className="text-2xl font-bold mb-2">Error Loading Booking</h1>
                    <p>{error.message}</p>
                    <p className="text-sm mt-2">Code: {error.code}</p>
                </div>
            </div>
        )
    }

    if (!booking) {
        console.error('Payment Page: Booking not found or access denied', { id, userId: user.id })
        return (
            <div className="min-h-screen bg-cream-50 p-8 flex items-center justify-center">
                <div className="text-center text-charcoal-600">
                    <h1 className="text-2xl font-bold mb-2">Booking Not Found</h1>
                    <p>Could not find booking with ID: {id}</p>
                </div>
            </div>
        )
    }

    // Check if booking has expired
    if (booking.status === 'expired') {
        return (
            <div className="min-h-screen bg-cream-50 p-8 flex items-center justify-center">
                <div className="max-w-md text-center bg-white rounded-2xl border border-cream-200 shadow-sm p-8">
                    <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="w-8 h-8 text-amber-600" />
                    </div>
                    <h1 className="text-2xl font-serif text-charcoal-900 mb-2">Booking Expired</h1>
                    <p className="text-charcoal-600 mb-6">
                        This booking has expired because payment was not submitted within 15 minutes.
                        The slot has been released and any wallet deduction has been refunded.
                    </p>
                    <Link
                        href="/customer"
                        className="inline-block bg-charcoal-900 text-cream-50 px-6 py-3 rounded-xl font-medium hover:bg-charcoal-800 transition-colors"
                    >
                        Browse Studios
                    </Link>
                </div>
            </div>
        )
    }

    // Fetch user role for specialized terms/flow
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    return (
        <div className="min-h-screen bg-cream-50 p-8">
            <div className="max-w-2xl mx-auto">
                <Link href="/customer" className="inline-flex items-center text-charcoal-600 hover:text-charcoal-900 mb-6">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Dashboard
                </Link>

                <div className="bg-white rounded-2xl border border-cream-200 shadow-sm p-8">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-charcoal-900 text-cream-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CreditCard className="w-8 h-8" />
                        </div>
                        <h1 className="text-3xl font-serif text-charcoal-900 mb-2">Complete Payment</h1>
                        <p className="text-charcoal-600">
                            Please scan the QR code to pay via GCash or BPI.
                        </p>
                    </div>

                    <div className="bg-cream-50 p-6 rounded-xl border border-cream-200 mb-8 max-w-sm mx-auto">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-charcoal-600">Total Amount</span>
                            <span className="text-2xl font-serif text-charcoal-900">
                                ₱{booking.total_price?.toLocaleString() || '0.00'}
                            </span>
                        </div>
                        <div className="border-t border-cream-200 my-2 pt-2 text-sm text-charcoal-500">
                            <div className="flex justify-between">
                                {/* Use booking.instructor (aliased) instead of booking.profiles */}
                                <span>Session with {booking.instructor?.full_name || 'Instructor'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>at {booking.slots?.studios?.name || 'Studio'}</span>
                            </div>
                            {booking.slots?.studios?.address && (
                                <div className="text-xs text-charcoal-400 mt-1 whitespace-pre-wrap">
                                    {booking.slots.studios.address}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* QR Codes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className="text-center">
                            <p className="font-medium text-charcoal-900 mb-2">GCash</p>
                            <div className="bg-white p-2 rounded-lg border border-cream-200 shadow-sm inline-block">
                                <ExpandableImage
                                    src="/gcash-qr.jpg"
                                    alt="GCash QR Code"
                                    className="w-48 h-48"
                                />
                                <p className="text-xs text-charcoal-500 mt-2">Scan to pay</p>
                            </div>
                        </div>
                        <div className="text-center mt-4 md:mt-0">
                            <p className="font-medium text-charcoal-900 mb-2">BPI</p>
                            <div className="bg-white p-2 rounded-lg border border-cream-200 shadow-sm inline-block">
                                <ExpandableImage
                                    src="/bpi-qr.jpg"
                                    alt="BPI QR Code"
                                    className="w-48 h-48"
                                />
                                <p className="text-xs text-charcoal-500 mt-2">Scan to pay</p>
                            </div>
                        </div>
                    </div>

                    <PaymentForm
                        booking={booking}
                        existingParq={existingParq ?? null}
                        userRole={profile?.role || 'customer'}
                        expiresAt={booking.expires_at || null}
                    />
                </div>
            </div>
        </div>
    )
}
