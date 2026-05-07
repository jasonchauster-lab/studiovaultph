'use client'

import React, { useState, useCallback, memo } from 'react'
import { clsx } from 'clsx'
import StudioFormModal from '@/components/shared/StudioFormModal'
import { createService } from '@/app/(dashboard)/studio/services/actions'
import { Image as ImageIcon, Video, AlertCircle } from 'lucide-react'
import { Field } from '@/components/ui/Field'
import AIInputAssistant from '@/components/ai/AIInputAssistant'

interface ServiceFormProps {
    isOpen: boolean
    onClose: () => void
}

const TABS = [
    { id: 'details', label: 'Details' },
    { id: 'media', label: 'Upload Media' },
    { id: 'requirements', label: 'Requirements' }
]

// Memoized Form Content to isolate re-renders
const ServiceFormContent = memo(({ form, activeTab, onChange }: { 
    form: any, 
    activeTab: string, 
    onChange: (field: string, value: any) => void 
}) => {
    return (
        <div className="space-y-12">
            {activeTab === 'details' && (
                <div className="space-y-10">
                    <div className="flex items-center justify-between p-8 bg-zinc-50 rounded-[2.5rem] border border-zinc-100 mb-4">
                        <div className="space-y-1">
                            <h4 className="text-sm font-black text-zinc-900 tracking-tight">Show in Online Store</h4>
                            <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-widest">Toggle visibility on your public website</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => onChange('is_visible_in_store', !form.is_visible_in_store)}
                            className={clsx(
                                "w-14 h-8 rounded-full transition-all duration-500 p-1 flex items-center",
                                form.is_visible_in_store ? "bg-emerald-500 justify-end" : "bg-zinc-200 justify-start"
                            )}
                        >
                            <div className="w-6 h-6 bg-white rounded-full shadow-sm" />
                        </button>
                    </div>

                    <Field 
                        label="Class Name"
                        actions={
                            <AIInputAssistant 
                                fieldName="Class Name"
                                onApply={(val) => onChange('name', val)}
                                getContext={() => ({
                                    title: form.name,
                                    description: form.description
                                })}
                            />
                        }
                    >
                        <input
                            type="text"
                            value={form.name}
                            onChange={(e) => onChange('name', e.target.value)}
                            className="w-full px-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl text-sm font-bold text-zinc-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                            placeholder="e.g. Morning Flow Pilates"
                        />
                    </Field>

                    <Field 
                        label="Description"
                        actions={
                            <AIInputAssistant 
                                fieldName="Description"
                                onApply={(val) => onChange('description', val)}
                                getContext={() => ({
                                    title: form.name,
                                    description: form.description
                                })}
                            />
                        }
                    >
                        <textarea
                            value={form.description}
                            onChange={(e) => onChange('description', e.target.value)}
                            rows={5}
                            className="w-full px-8 py-6 bg-zinc-50 border border-zinc-100 rounded-[2rem] text-sm font-bold text-zinc-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all resize-none"
                            placeholder="Describe the experience..."
                        />
                    </Field>

                    <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Duration (Min)</label>
                            <input
                                type="number"
                                value={form.duration_minutes}
                                onChange={(e) => onChange('duration_minutes', e.target.value)}
                                className="w-full px-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl text-sm font-bold text-zinc-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Difficulty</label>
                            <select
                                value={form.difficulty}
                                onChange={(e) => onChange('difficulty', e.target.value)}
                                className="w-full px-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl text-sm font-bold text-zinc-900 appearance-none focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            >
                                <option>Beginner</option>
                                <option>Intermediate</option>
                                <option>Advanced</option>
                                <option>All Levels</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'media' && (
                <div className="space-y-12">
                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Class Images</label>
                        <div className="w-full aspect-video border-2 border-dashed border-zinc-100 rounded-[3rem] bg-zinc-50 flex flex-col items-center justify-center text-center p-12 group hover:border-emerald-500/50 transition-all cursor-pointer">
                            <div className="w-20 h-20 bg-white rounded-[2rem] shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <ImageIcon className="w-10 h-10 text-zinc-300 group-hover:text-emerald-500" />
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-sm font-black text-zinc-900 tracking-tight">Drop images here</h4>
                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">or click to browse library</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Video Preview (YouTube URL)</label>
                        <div className="relative">
                            <Video className="absolute left-8 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-300" />
                            <input
                                type="text"
                                value={form.video_url}
                                onChange={(e) => onChange('video_url', e.target.value)}
                                className="w-full pl-16 pr-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl text-sm font-bold text-zinc-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                                placeholder="https://youtube.com/watch?v=..."
                            />
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'requirements' && (
                <div className="space-y-8">
                    <div className="flex items-center gap-4 p-6 bg-amber-50 rounded-[2rem] border border-amber-100">
                        <AlertCircle className="w-6 h-6 text-amber-500 shrink-0" />
                        <p className="text-[11px] font-bold text-amber-700 leading-relaxed uppercase tracking-tight">
                            Help your clients prepare. These instructions will be sent in the booking confirmation email.
                        </p>
                    </div>

                    <Field 
                        label="What customer should bring"
                        actions={
                            <AIInputAssistant 
                                fieldName="Preparation Requirements"
                                onApply={(val) => onChange('requirements', val)}
                                getContext={() => ({
                                    title: form.name,
                                    description: form.description,
                                    intent: 'What to bring for class'
                                })}
                            />
                        }
                    >
                        <textarea
                            value={form.requirements}
                            onChange={(e) => onChange('requirements', e.target.value)}
                            rows={8}
                            className="w-full px-10 py-8 bg-zinc-50 border border-zinc-100 rounded-[3rem] text-sm font-bold text-zinc-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all resize-none"
                            placeholder="e.g. Grip socks, water bottle, workout towel..."
                        />
                    </Field>
                </div>
            )}
        </div>
    )
})
ServiceFormContent.displayName = 'ServiceFormContent'

export default function ServiceForm({ isOpen, onClose }: ServiceFormProps) {
    const [isSaving, setIsSaving] = useState(false)
    const [form, setForm] = useState({
        name: '',
        description: '',
        category: 'Classes',
        duration_minutes: '60',
        difficulty: 'All Levels',
        video_url: '',
        requirements: '',
        is_visible_in_store: true
    })

    const handleFormChange = useCallback((field: string, value: any) => {
        setForm(prev => ({ ...prev, [field]: value }))
    }, [])

    const handleSave = async () => {
        setIsSaving(true)
        try {
            await createService(form)
            onClose()
        } catch (err) {
            console.error(err)
            alert('Failed to create service. Please try again.')
        } finally {
            setIsSaving(false)
        }
    }

    const renderContent = useCallback((activeTab: string) => (
        <ServiceFormContent form={form} activeTab={activeTab} onChange={handleFormChange} />
    ), [form, handleFormChange])

    return (
        <StudioFormModal
            isOpen={isOpen}
            onClose={onClose}
            title="Add Class"
            tabs={TABS}
            onSave={handleSave}
            isSaving={isSaving}
            saveLabel="Create Class"
        >
            {renderContent}
        </StudioFormModal>
    )
}

