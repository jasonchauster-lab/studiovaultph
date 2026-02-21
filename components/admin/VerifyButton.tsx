'use client'

import { useState } from 'react'
import { verifyStudio, approveCertification, rejectStudio, rejectCertification, confirmBooking, approvePayout, rejectPayout } from '@/app/(dashboard)/admin/actions'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

type ActionType = 'verifyStudio' | 'rejectStudio' | 'approveCert' | 'rejectCert' | 'confirmBooking' | 'approvePayout' | 'rejectPayout'

interface VerifyButtonProps {
    id: string
    action: ActionType
    label: string
    className?: string
}

export default function VerifyButton({ id, action, label, className }: VerifyButtonProps) {
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    const handleAction = async () => {
        setIsLoading(true)
        let result: any

        try {
            switch (action) {
                case 'verifyStudio':
                    result = await verifyStudio(id)
                    break
                case 'rejectStudio':
                    result = await rejectStudio(id)
                    break
                case 'approveCert':
                    result = await approveCertification(id)
                    break
                case 'rejectCert':
                    result = await rejectCertification(id)
                    break
                case 'confirmBooking':
                    result = await confirmBooking(id)
                    break
                case 'approvePayout':
                    result = await approvePayout(id)
                    break
                case 'rejectPayout':
                    result = await rejectPayout(id)
                    break
            }

            if (result?.error) {
                alert(result.error)
            } else {
                router.refresh()
            }
        } catch (error) {
            console.error(error)
            alert('An unexpected error occurred')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <button
            onClick={handleAction}
            disabled={isLoading}
            className={`flex items-center justify-center gap-2 ${className} disabled:opacity-50 disabled:cursor-not-allowed`}
        >
            {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
            {label}
        </button>
    )
}
