'use client'

import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import getCroppedImg from '@/lib/utils/crop-utils'
import Modal from './Modal'
import { Loader2, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'

interface ImageCropperProps {
    image: string
    aspectRatio: number
    isOpen: boolean
    onClose: () => void
    onCrop: (croppedFile: File) => void
    title?: string
}

export default function ImageCropper({
    image,
    aspectRatio,
    isOpen,
    onClose,
    onCrop,
    title = 'Adjust Your Image'
}: ImageCropperProps) {
    const [crop, setCrop] = useState({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)
    const [rotation, setRotation] = useState(0)
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)
    const [isProcessing, setIsProcessing] = useState(false)

    const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels)
    }, [])

    const handleCrop = async () => {
        if (!croppedAreaPixels) return

        setIsProcessing(true)
        try {
            const croppedBlob = await getCroppedImg(image, croppedAreaPixels, rotation)
            if (croppedBlob) {
                const file = new File([croppedBlob], 'cropped-image.jpg', { type: 'image/jpeg' })
                onCrop(file)
                onClose()
            }
        } catch (e) {
            console.error(e)
        } finally {
            setIsProcessing(false)
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} className="max-w-3xl">
            <div className="flex flex-col gap-6">
                <div className="relative w-full h-[300px] sm:h-[400px] bg-charcoal-900 rounded-2xl overflow-hidden shadow-inner border border-cream-100/20">
                    <Cropper
                        image={image}
                        crop={crop}
                        zoom={zoom}
                        rotation={rotation}
                        aspect={aspectRatio}
                        onCropChange={setCrop}
                        onCropComplete={onCropComplete}
                        onZoomChange={setZoom}
                        onRotationChange={setRotation}
                        classes={{
                            containerClassName: "bg-charcoal-900",
                            mediaClassName: "object-contain",
                            cropAreaClassName: "border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
                        }}
                    />
                </div>

                <div className="space-y-6 bg-cream-50/50 p-6 rounded-2xl border border-cream-100">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {/* Zoom Control */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-charcoal-400 flex items-center gap-2">
                                    <ZoomIn className="w-3 h-3" /> Zoom
                                </label>
                                <span className="text-[10px] font-bold text-charcoal-900">{Math.round(zoom * 100)}%</span>
                            </div>
                            <input
                                type="range"
                                value={zoom}
                                min={1}
                                max={3}
                                step={0.1}
                                aria-labelledby="Zoom"
                                onChange={(e) => setZoom(Number(e.target.value))}
                                className="w-full h-1.5 bg-cream-200 rounded-lg appearance-none cursor-pointer accent-forest"
                            />
                        </div>

                        {/* Rotation Control */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-charcoal-400 flex items-center gap-2">
                                    <RotateCcw className="w-3 h-3" /> Rotation
                                </label>
                                <span className="text-[10px] font-bold text-charcoal-900">{rotation}°</span>
                            </div>
                            <input
                                type="range"
                                value={rotation}
                                min={0}
                                max={360}
                                step={1}
                                aria-labelledby="Rotation"
                                onChange={(e) => setRotation(Number(e.target.value))}
                                className="w-full h-1.5 bg-cream-200 rounded-lg appearance-none cursor-pointer accent-forest"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 pt-4 border-t border-cream-100">
                    <button
                        onClick={onClose}
                        className="flex-1 px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-charcoal-400 hover:text-charcoal-900 hover:bg-cream-50 transition-all"
                    >
                        Discard
                    </button>
                    <button
                        onClick={handleCrop}
                        disabled={isProcessing}
                        className="flex-[2] px-8 py-4 bg-forest text-white rounded-xl text-[10px] font-black uppercase tracking-[0.3em] hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-forest/10 flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {isProcessing ? (
                            <Loader2 className="w-4 h-4 animate-spin text-gold" />
                        ) : null}
                        {isProcessing ? 'Processing' : 'Apply Crop'}
                    </button>
                </div>
            </div>
        </Modal>
    )
}
