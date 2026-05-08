'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Image as ImageIcon, Plus, Trash2, Loader2, Maximize2, X, Clock, User, Camera, Calendar } from 'lucide-react'
import { getClientProgressPhotos, addClientProgressPhoto, deleteClientProgressPhoto } from '@/app/(dashboard)/studio/customers/[id]/actions'
import { uploadStudioAsset } from '@/app/(dashboard)/studio/studio-actions'
import { format } from 'date-fns'
import { useToast } from '@/components/ui/Toast'
import { normalizeImageFile } from '@/lib/utils/image-utils'

interface GalleryTabProps {
    clientId: string
    studioId: string
}

export default function GalleryTab({ clientId, studioId }: GalleryTabProps) {
    const [photos, setPhotos] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isUploading, setIsUploading] = useState(false)
    const [selectedPhoto, setSelectedPhoto] = useState<any>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const { toast } = useToast()

    useEffect(() => {
        fetchPhotos()
    }, [clientId, studioId])

    const fetchPhotos = async () => {
        try {
            const data = await getClientProgressPhotos(clientId, studioId)
            setPhotos(data)
        } catch (err) {
            console.error('Error fetching photos:', err)
        } finally {
            setIsLoading(false)
        }
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploading(true)
        try {
            // 1. Normalize image
            const normalized = await normalizeImageFile(file, { maxWidth: 2000, quality: 0.8 })
            
            // 2. Upload to storage
            const formData = new FormData()
            formData.append('file', normalized)
            formData.append('studioId', studioId)
            formData.append('type', 'progress_photos')
            
            const uploadRes = await uploadStudioAsset(formData)
            if (!uploadRes.success || !uploadRes.data?.url) {
                throw new Error(uploadRes.error || 'Upload failed')
            }

            // 3. Save to DB
            await addClientProgressPhoto({
                clientId,
                studioId,
                photoUrl: uploadRes.data.url
            })

            fetchPhotos()
            toast('Photo added to gallery', 'success')
        } catch (err: any) {
            toast(err.message || 'Failed to upload photo', 'error')
        } finally {
            setIsUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const handleDelete = async (e: React.MouseEvent, photoId: string) => {
        e.stopPropagation()
        if (!confirm('Are you sure you want to delete this photo?')) return
        try {
            await deleteClientProgressPhoto(photoId, clientId)
            fetchPhotos()
            toast('Photo deleted', 'success')
        } catch (err) {
            toast('Failed to delete photo', 'error')
        }
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-black text-zinc-900 tracking-tight">Progress Gallery</h3>
                    <p className="text-sm font-bold text-zinc-400 mt-1">Visual tracking of customer results and posture improvements.</p>
                </div>
                
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="px-8 py-3 bg-[#2D3282] text-white rounded-full text-xs font-black shadow-lg shadow-[#2D3282]/10 uppercase tracking-widest flex items-center gap-2"
                >
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4 stroke-[3]" />}
                    {isUploading ? 'Uploading...' : 'Upload Photo'}
                </button>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept="image/*" 
                    className="hidden" 
                />
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-40 bg-white border border-zinc-100 rounded-[3rem] shadow-sm">
                    <Loader2 className="w-8 h-8 animate-spin text-zinc-200" />
                </div>
            ) : photos.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {photos.map((photo) => (
                        <div 
                            key={photo.id} 
                            onClick={() => setSelectedPhoto(photo)}
                            className="group relative aspect-[3/4] bg-zinc-100 rounded-[2rem] overflow-hidden border border-zinc-100 cursor-pointer hover:shadow-xl transition-all duration-500"
                        >
                            <img 
                                src={photo.photo_url} 
                                alt="" 
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                            />
                            
                            {/* Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-white/60 uppercase tracking-widest leading-none mb-1">
                                            {format(new Date(photo.created_at), 'dd MMM yyyy')}
                                        </span>
                                        <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest leading-none">
                                            By {photo.author?.full_name?.split(' ')[0] || 'Staff'}
                                        </span>
                                    </div>
                                    <button 
                                        onClick={(e) => handleDelete(e, photo.id)}
                                        className="p-2 bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-40 bg-white border border-zinc-100 rounded-[3rem] shadow-sm">
                    <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mb-6">
                        <ImageIcon className="w-8 h-8 text-zinc-200" />
                    </div>
                    <h3 className="text-lg font-black text-zinc-900 tracking-tight">No progress photos yet.</h3>
                    <p className="text-sm font-bold text-zinc-400 mt-2">Upload the first photo to start tracking progress.</p>
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-4 text-[#2D3282] text-sm font-black uppercase tracking-widest hover:underline underline-offset-4"
                    >
                        + Upload your first photo
                    </button>
                </div>
            )}

            {/* Lightbox */}
            {selectedPhoto && (
                <div 
                    className="fixed inset-0 z-[999999] bg-zinc-950/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-12 animate-in fade-in duration-300"
                    onClick={() => setSelectedPhoto(null)}
                >
                    <button className="absolute top-8 right-8 p-3 text-white/40 hover:text-white transition-colors">
                        <X className="w-8 h-8" />
                    </button>
                    
                    <div className="relative max-w-5xl w-full h-full flex flex-col md:flex-row gap-12 items-center justify-center" onClick={e => e.stopPropagation()}>
                        <div className="flex-1 h-full max-h-[80vh] bg-zinc-900 rounded-[3rem] overflow-hidden shadow-2xl ring-1 ring-white/10">
                            <img 
                                src={selectedPhoto.photo_url} 
                                alt="" 
                                className="w-full h-full object-contain" 
                            />
                        </div>
                        
                        <div className="w-full md:w-80 space-y-8 text-white">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <Calendar className="w-5 h-5 text-indigo-400" />
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Date Captured</span>
                                        <span className="text-lg font-black tracking-tight">{format(new Date(selectedPhoto.created_at), 'dd MMMM yyyy')}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <User className="w-5 h-5 text-emerald-400" />
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Captured By</span>
                                        <span className="text-lg font-black tracking-tight">{selectedPhoto.author?.full_name || 'Staff Member'}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <button 
                                onClick={(e) => {
                                    handleDelete(e, selectedPhoto.id);
                                    setSelectedPhoto(null);
                                }}
                                className="w-full py-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-rose-500 hover:text-white transition-all"
                            >
                                Delete Photo
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
