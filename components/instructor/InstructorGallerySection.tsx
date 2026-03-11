'use client'

import { useState, useRef } from 'react'
import { uploadGalleryImage, deleteGalleryImage } from '@/app/(dashboard)/customer/profile/actions'
import { Plus, X, Loader2, Image as ImageIcon, Camera } from 'lucide-react'
import Image from 'next/image'
import { clsx } from 'clsx'
import { isHeicFile, ensureJpegFile } from '@/lib/utils/image-utils'

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

        try {
            let processedFile = file
            if (isHeicFile(file)) {
                processedFile = await ensureJpegFile(file)
            }

            const formData = new FormData()
            formData.append('file', processedFile)

            const result = await uploadGalleryImage(formData)

            if (!result.success) {
                setError(result.error || 'Failed to upload image')
            }
        } catch (err) {
            console.error('File processing error:', err)
            setError('Failed to process image. Please try a different format.')
        } finally {
            setIsUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const handleDelete = async (url: string) => {
        if (!confirm('Are you sure you want to delete this photo?')) return

        const result = await deleteGalleryImage(url)
        if (!result.success) {
            alert(result.error || 'Failed to delete image')
        }
    }

    return (
        <div className="glass-card p-12 relative overflow-hidden">
            {/* Decorative Bloom */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-rose/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-[100px] pointer-events-none" />

            <div className="relative z-10">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-white/60 pb-8 mb-10 gap-6">
                    <div>
                        <div className="flex items-center gap-4 mb-2">
                            <Camera className="w-6 h-6 text-gold" />
                            <h2 className="text-3xl font-serif text-charcoal tracking-tighter">Teaching Gallery</h2>
                        </div>
                        <p className="text-[10px] font-black text-charcoal/20 uppercase tracking-[0.4em]">Visual Documentation of Movement Sequences</p>
                    </div>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="flex items-center gap-3 bg-charcoal text-white px-8 py-4 rounded-[20px] text-[10px] font-black uppercase tracking-[0.3em] hover:brightness-[1.2] transition-all shadow-cloud active:scale-95 disabled:opacity-50"
                    >
                        {isUploading ? (
                            <Loader2 className="w-4 h-4 animate-spin text-gold" />
                        ) : (
                            <Plus className="w-4 h-4 text-gold stroke-[3px]" />
                        )}
                        {isUploading ? 'UPLOADING...' : 'ADD PHOTOGRAPH'}
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                        accept="image/*,.heic,.heif"
                    />
                </div>

                {error && (
                    <div className="p-4 bg-red-50/50 border border-red-100 text-red-600 rounded-[20px] text-[10px] font-black uppercase tracking-widest mb-8 animate-in slide-in-from-top-2">
                        {error}
                    </div>
                )}

                {images.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 bg-white/40 rounded-[2.5rem] border-2 border-dashed border-white/60 group hover:border-gold/30 transition-all duration-700">
                        <div className="p-6 bg-white/60 rounded-full mb-6 group-hover:scale-110 transition-transform duration-700 shadow-sm">
                            <ImageIcon className="w-12 h-12 text-charcoal/5" />
                        </div>
                        <p className="text-charcoal/20 text-[10px] font-black uppercase tracking-[0.4em] italic">No visual records captured yet</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {images.map((url, index) => (
                            <div key={index} className="relative group aspect-[4/5] rounded-[2.5rem] overflow-hidden bg-white/40 border border-white/60 shadow-sm transition-all duration-700 hover:shadow-cloud hover:-translate-y-1">
                                <Image
                                    src={url}
                                    alt={`Teaching photo ${index + 1}`}
                                    fill
                                    className="object-cover transition-transform duration-[1.5s] ease-out group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-charcoal/20 opacity-0 group-hover:opacity-100 transition-all duration-700 backdrop-blur-[2px] flex items-center justify-center">
                                    <button
                                        onClick={() => handleDelete(url)}
                                        className="p-5 bg-white/40 hover:bg-white text-charcoal rounded-full transition-all duration-500 backdrop-blur-md shadow-lg scale-90 group-hover:scale-100"
                                        title="Delete photo"
                                    >
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>
                                {/* Subtle overlay gradient */}
                                <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-charcoal/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
