'use client'

import { useState, useRef } from 'react'
import { uploadGalleryImage, deleteGalleryImage } from '@/app/(dashboard)/customer/profile/actions'
import { Plus, X, Loader2, Image as ImageIcon, Camera } from 'lucide-react'
import Image from 'next/image'
import { clsx } from 'clsx'
import { normalizeImageFile } from '@/lib/utils/image-utils'
import ImageCropper from '@/components/shared/ImageCropper'

interface InstructorGallerySectionProps {
    images: string[]
}

export default function InstructorGallerySection({ images }: InstructorGallerySectionProps) {
    const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null)
    const [error, setError] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Cropper State
    const [cropperConfig, setCropperConfig] = useState<{
        isOpen: boolean;
        image: string;
        aspectRatio: number;
        onCrop: (file: File) => void;
        title: string;
    } | null>(null)

    const isUploading = uploadProgress !== null

    const uploadFile = async (file: File, current: number, total: number) => {
        setUploadProgress({ current, total })
        try {
            const formData = new FormData()
            formData.append('file', file)
            const result = await uploadGalleryImage(formData)
            if (result.error) {
                const simpleError = result.error.includes('Payload Too Large')
                    ? 'Image is too large.'
                    : result.error
                setError(prev => prev ? `${prev} • ${file.name}: ${simpleError}` : `${file.name}: ${simpleError}`)
            }
        } catch (err) {
            console.error('Upload error:', err)
            setError(prev => prev ? `${prev} • ${file.name}: Upload failed` : `${file.name}: Upload failed`)
        }
    }

    const processNextInQueue = async (queue: File[], completed: number, total: number) => {
        if (queue.length === 0) {
            setUploadProgress(null)
            if (fileInputRef.current) fileInputRef.current.value = ''
            return
        }

        const [nextFile, ...remaining] = queue
        const url = URL.createObjectURL(nextFile)

        setCropperConfig({
            isOpen: true,
            image: url,
            aspectRatio: 4 / 5,
            title: `Crop Photo (${completed + 1} of ${total})`,
            onCrop: async (croppedFile) => {
                await uploadFile(croppedFile, completed + 1, total)
                processNextInQueue(remaining, completed + 1, total)
            }
        })
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        if (files.length === 0) return

        setError(null)
        const validFiles: File[] = []

        for (const file of files) {
            try {
                const normalized = await normalizeImageFile(file)
                validFiles.push(normalized)
            } catch (err) {
                console.error('File processing error:', err)
            }
        }

        if (validFiles.length > 0) {
            processNextInQueue(validFiles, 0, validFiles.length)
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
                        <p className="text-[10px] font-black text-charcoal/40 uppercase tracking-[0.4em]">Visual Documentation of Movement Sequences</p>
                    </div>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="flex items-center gap-3 bg-forest text-white px-8 py-4 rounded-[20px] text-[10px] font-black uppercase tracking-[0.3em] hover:brightness-[1.2] transition-all shadow-cloud active:scale-95 disabled:opacity-50"
                    >
                        {isUploading ? (
                            <Loader2 className="w-4 h-4 animate-spin text-gold" />
                        ) : (
                            <Plus className="w-4 h-4 text-gold stroke-[3px]" />
                        )}
                        {uploadProgress
                            ? `UPLOADING ${uploadProgress.current} / ${uploadProgress.total}...`
                            : 'ADD PHOTOGRAPHS'}
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                        accept="image/*,.heic,.heif"
                        multiple
                    />
                </div>

                {error && (
                    <div className="p-4 bg-red-50/50 border border-red-100 text-red-600 rounded-[20px] text-[10px] font-black uppercase tracking-widest mb-8 animate-in slide-in-from-top-2">
                        {error}
                    </div>
                )}

                {images.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 bg-white/40 rounded-[3rem] border-2 border-dashed border-white/60 group hover:border-gold/30 transition-all duration-1000">
                        <div className="p-8 bg-white/60 rounded-full mb-8 group-hover:scale-110 group-hover:rotate-12 transition-all duration-700 shadow-sm">
                            <ImageIcon className="w-16 h-16 text-charcoal/10" />
                        </div>
                        <p className="text-charcoal/40 text-[10px] font-black uppercase tracking-[0.5em] italic">No visual records captured yet</p>
                    </div>
                ) : (
                    <div className="relative group/gallery">
                        <div className="flex sm:grid overflow-x-auto sm:overflow-x-visible snap-x snap-mandatory sm:snap-none no-scrollbar pb-10 sm:pb-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 -mx-4 px-4 sm:mx-0 sm:px-0">
                            {images.map((url, index) => (
                                <div key={index} className="relative group aspect-[4/5] rounded-[3rem] overflow-hidden bg-white/40 border-2 border-white/60 shadow-sm transition-all duration-1000 hover:shadow-2xl hover:shadow-gold/10 hover:-translate-y-2 shrink-0 w-[300px] sm:w-auto snap-center">
                                    <Image
                                        src={url}
                                        alt={`Teaching photo ${index + 1}`}
                                        fill
                                        quality={95}
                                        sizes="(max-width: 640px) 300px, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                        className="object-cover transition-transform duration-[2s] cubic-bezier(0.2, 0, 0, 1) group-hover:scale-110"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-charcoal/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-700">
                                        <button
                                            onClick={() => handleDelete(url)}
                                            className="absolute top-6 right-6 p-4 bg-white/60 hover:bg-white text-charcoal rounded-full transition-all duration-500 backdrop-blur-md shadow-xl scale-75 group-hover:scale-100 active:scale-95 z-20"
                                            title="Delete photo"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                        <div className="absolute bottom-8 left-8">
                                            <p className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Frame {String(index + 1).padStart(2, '0')}</p>
                                        </div>
                                    </div>
                                    {/* Glass reflection effect */}
                                    <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
                                </div>
                            ))}
                        </div>
                        
                        {/* Mobile Scroll Indicator Cues */}
                        <div className="flex sm:hidden items-center justify-center gap-1.5 mt-2">
                            {images.map((_, i) => (
                                <div 
                                    key={i}
                                    className="w-1.5 h-1.5 rounded-full bg-gold/20"
                                />
                            ))}
                        </div>
                        <div className="sm:hidden absolute -bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 text-[8px] font-black text-gold/40 uppercase tracking-[0.3em] animate-pulse">
                            <span>Swipe to explore</span>
                        </div>
                    </div>
                )}
            </div>

            {cropperConfig && (
                <ImageCropper
                    isOpen={cropperConfig.isOpen}
                    image={cropperConfig.image}
                    aspectRatio={cropperConfig.aspectRatio}
                    title={cropperConfig.title}
                    onClose={() => {
                        setCropperConfig(null)
                        setUploadProgress(null)
                        if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                    onCrop={(file) => {
                        cropperConfig.onCrop(file)
                        setCropperConfig(null)
                    }}
                />
            )}
        </div>
    )
}
