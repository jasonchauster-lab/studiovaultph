import Link from 'next/link'
import { CheckCircle } from 'lucide-react'

export default function VerifiedPage() {
    return (
        <div className="min-h-screen bg-cream-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-white p-8 rounded-2xl border border-cream-200 shadow-sm text-center">
                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-10 h-10 text-green-600" />
                    </div>
                </div>

                <h1 className="text-2xl font-serif text-charcoal-900 mb-2">Email Verified!</h1>
                <p className="text-charcoal-600 mb-8">
                    Your account has been successfully verified. You can now log in to StudioVaultPH and start booking.
                </p>

                <Link
                    href="/login"
                    className="block w-full bg-charcoal-900 text-cream-50 py-3 rounded-xl font-medium hover:bg-charcoal-800 transition-colors"
                >
                    Log In Now
                </Link>
            </div>
        </div>
    )
}
