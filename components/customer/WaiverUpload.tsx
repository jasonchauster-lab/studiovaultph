'use client'

import { useState } from 'react'
import { uploadWaiver } from '@/app/(dashboard)/customer/profile/actions'
import { Upload, FileText, Check, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function WaiverUpload({ initialUrl }: { initialUrl?: string }) {
    const [isUploading, setIsUploading] = useState(false)
    const [fileUrl, setFileUrl] = useState<string | null>(initialUrl || null)

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return

        const file = e.target.files[0]
        setIsUploading(true)

        const formData = new FormData()
        formData.append('file', file)

        try {
            const result = await uploadWaiver(formData)
            if (result.success && result.url) {
                setFileUrl(result.url)
            } else {
                alert('Upload failed')
            }
        } catch (error) {
            console.error(error)
            alert('Upload error')
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <div className="space-y-4">
            {fileUrl ? (
                <div className="flex items-center gap-4 bg-cream-50 p-4 rounded-xl border border-cream-200">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-cream-200">
                        <FileText className="w-5 h-5 text-charcoal-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-charcoal-900 truncate">waiver-document.pdf</p>
                        <p className="text-xs text-charcoal-500">Uploaded on {new Date().toLocaleDateString()}</p>
                    </div>
                    <Link
                        href={fileUrl}
                        target="_blank"
                        className="text-sm text-charcoal-600 hover:text-charcoal-900 underline"
                    >
                        View
                    </Link>
                </div>
            ) : (
                <div className="border-2 border-dashed border-cream-300 rounded-xl p-8 text-center transition-colors hover:border-charcoal-300 bg-cream-50/50">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-4 border border-cream-200">
                        <Upload className="w-6 h-6 text-charcoal-400" />
                    </div>
                    <p className="text-sm font-medium text-charcoal-900 mb-1">
                        Upload your signed waiver
                    </p>
                    <p className="text-xs text-charcoal-500 mb-4">
                        PDF or Image files up to 5MB
                    </p>
                    <div className="relative inline-block">
                        <input
                            type="file"
                            accept=".pdf,image/*"
                            onChange={handleUpload}
                            disabled={isUploading}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <button
                            disabled={isUploading}
                            className="bg-white border border-cream-300 text-charcoal-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-cream-50 transition-colors flex items-center gap-2"
                        >
                            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Select File'}
                        </button>
                    </div>
                </div>
            )}

            <div className="text-xs text-charcoal-400 mt-2">
                <p>By uploading, you acknowledge that you have read and agreed to the terms.</p>
            </div>
        </div>
    )
}
