import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import PaymentForm from '@/components/customer/PaymentForm'
import ExpandableImage from '@/components/ui/ExpandableImage'
import { ArrowLeft, CreditCard } from 'lucide-react'
import Link from 'next/link'

export default async function InstructorPaymentPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

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

    // Fetch Booking
    // Ensure we fetch relationship for studio owner or just studio details
    // We are the CLIENT in this booking (as per the update in bookSlot)
    const { data: booking, error } = await supabase
        .from('bookings')
        .select(`
            *,
            slots (
                start_time,
                end_time,
                studios (
                    name,
                    contact_number,
                    address
                )
            )
        `)
        .eq('id', id)
        .eq('client_id', user.id) // This is now safe because we set client_id = instructor_id in bookSlot
        .single()

    if (error || !booking) {
        console.error('Payment Page Fetch Error:', error)
        return (
            <div className="min-h-screen bg-cream-50 p-8 flex items-center justify-center">
                <div className="text-center text-charcoal-600">
                    <h1 className="text-2xl font-bold mb-2">Booking Not Found</h1>
                    <p>Could not find booking with ID: {id}</p>
                    <p className="text-sm mt-2">{error?.message}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-cream-50 p-8">
            <div className="max-w-2xl mx-auto">
                <Link href="/instructor" className="inline-flex items-center text-charcoal-600 hover:text-charcoal-900 mb-6">
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
                            Please scan the QR code to pay the studio rental fee.
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
                                <span className="font-medium">Studio Rental ({booking.slots?.studios?.name})</span>
                            </div>
                            <div className="flex justify-between mt-1">
                                <span>1 Hour Slot</span>
                                <span>₱{booking.price_breakdown?.studio_fee || 0}</span>
                            </div>
                            <div className="flex justify-between mt-1">
                                <span>Service Fee</span>
                                <span>₱{booking.price_breakdown?.service_fee || 100}</span>
                            </div>
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

                    {/* Reusing PaymentForm - it should work because we set client_id = user.id */}
                    <PaymentForm booking={booking} existingParq={existingParq ?? null} userRole="instructor" />
                </div>
            </div>
        </div>
    )
}
