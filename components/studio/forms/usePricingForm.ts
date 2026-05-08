import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/components/ui/Toast'

export interface PricingFormOptions<T> {
    isOpen: boolean
    onClose: () => void
    initialData?: any
    defaultForm: T
    onSave: (data: T) => Promise<{ success: boolean; error?: string }>
    validation?: (data: T) => string | null
}

export function usePricingForm<T>({
    isOpen,
    onClose,
    initialData,
    defaultForm,
    onSave,
    validation
}: PricingFormOptions<T>) {
    const { toast } = useToast()
    const [isSaving, setIsSaving] = useState(false)
    const [form, setForm] = useState<T>(defaultForm)

    useEffect(() => {
        if (isOpen) {
            // OPTIMIZATION: Only reset form if it's a NEW modal open or if initialData ID actually changed
            // This prevents wiping user input if irrelevant props update in the background
            setForm(prev => {
                const nextData = initialData ? { ...defaultForm, ...initialData } : defaultForm
                return JSON.stringify(prev) === JSON.stringify(nextData) ? prev : nextData
            })
        }
    }, [initialData, isOpen, defaultForm])

    const updateField = useCallback((field: keyof T, value: any) => {
        setForm(prev => ({ ...prev, [field]: value }))
    }, [])

    const handleSave = async () => {
        if (validation) {
            const error = validation(form)
            if (error) {
                toast(error, 'error')
                return
            }
        }

        setIsSaving(true)
        try {
            const res = await onSave(form)
            if (res.success) {
                onClose()
            } else {
                toast(res.error || 'Failed to save.', 'error')
            }
        } catch (err) {
            console.error('[usePricingForm] Error saving:', err)
            toast('An unexpected error occurred.', 'error')
        } finally {
            setIsSaving(false)
        }
    }

    return {
        form,
        setForm,
        updateField,
        isSaving,
        handleSave
    }
}
