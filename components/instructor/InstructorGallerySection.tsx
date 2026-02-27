'use client'

import { useState, useRef } from 'react'
import { uploadGalleryImage, deleteGalleryImage } from '@/app/(dashboard)/customer/profile/actions'
import { Plus, X, Loader2, Image as ImageIcon } from 'lucide-react'
import Image from 'next/image'

interface InstructorGallerySectionProps {
    images: string[]
}

export default function InstructorGallerySection({ images }: InstructorGallerySectionProps) {
    const [isUploading, setIsUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploading(true)
        setError(null)

        const formData = new FormData()
        formData.append('file', file)

        const result = await uploadGalleryImage(formData)

        if (!result.success) {
            setError(result.error || 'Failed to upload image')
        }

        setIsUploading(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const handleDelete = async (url: string) => {
        if (!confirm('Are you sure you want to delete this photo?')) return

        const result = await deleteGalleryImage(url)
        if (!result.success) {
            alert(result.error || 'Failed to delete image')
        }
    }

    return (
        <div className="bg-white p-8 rounded-2xl border border-cream-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-cream-200 pb-4">
                <div>
                    <h2 className="text-xl font-serif text-charcoal-900">Teaching Gallery</h2>
                    <p className="text-sm text-charcoal-500">Showcase your teaching style and classes.</p>
                </div>
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex items-center gap-2 bg-white border border-cream-300 text-charcoal-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-cream-50 transition-colors disabled:opacity-50"
                >
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Add Photo
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    accept="image/*"
                />
            </div>

            {error && (
                <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>
            )}

            {images.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 bg-cream-50 rounded-xl border-2 border-dashed border-cream-200">
                    <ImageIcon className="w-12 h-12 text-charcoal-300 mb-3" />
                    <p className="text-charcoal-500 text-sm">No photos yet. Start sharing your teaching journey!</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {images.map((url, index) => (
                        <div key={index} className="relative group aspect-square rounded-xl overflow-hidden bg-cream-100 border border-cream-200">
                            <Image
                                src={url}
                                alt={`Teaching photo ${index + 1}`}
                                fill
                                className="object-cover transition-transform group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button
                                    onClick={() => handleDelete(url)}
                                    className="p-2 bg-white/20 hover:bg-white/40 text-white rounded-full transition-colors backdrop-blur-sm"
                                    title="Delete photo"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
