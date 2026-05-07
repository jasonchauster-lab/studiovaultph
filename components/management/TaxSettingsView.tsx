'use client'

import { useState } from 'react'
import { Plus, Receipt, Percent, Info, Loader2, Trash2, Check, X } from 'lucide-react'
import { clsx } from 'clsx'
import { updateTaxSettings, addStudioTax, deleteStudioTax } from '@/app/(dashboard)/studio/management/actions'
import Modal from '@/components/shared/Modal'

interface TaxSettingsViewProps {
    studio: any
    taxes: any[]
}

export default function TaxSettingsView({ studio, taxes }: TaxSettingsViewProps) {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isUpdatingSettings, setIsUpdatingSettings] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    const handleToggleInclusive = async () => {
        setIsUpdatingSettings(true)
        setError(null)
        try {
            const result = await updateTaxSettings(studio.id, !studio.tax_inclusive)
            if (result?.error) {
                setError(result.error)
            } else {
                setSuccess('Tax settings updated.')
                setTimeout(() => setSuccess(null), 3000)
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred.')
        } finally {
            setIsUpdatingSettings(false)
        }
    }

    const handleAddTax = async (formData: FormData) => {
        setIsLoading(true)
        setError(null)
        try {
            const result = await addStudioTax(formData)
            if (result?.error) {
                setError(result.error)
            } else {
                setSuccess('Tax added successfully.')
                setIsAddModalOpen(false)
                setTimeout(() => setSuccess(null), 3000)
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred.')
        } finally {
            setIsLoading(false)
        }
    }

    const handleDeleteTax = async (taxId: string) => {
        if (!confirm('Are you sure you want to remove this tax?')) return
        
        setIsUpdatingSettings(true)
        try {
            const result = await deleteStudioTax(taxId)
            if (result?.error) {
                setError(result.error)
            }
        } finally {
            setIsUpdatingSettings(false)
        }
    }

    return (
        <div className="max-w-5xl mx-auto py-10 px-6 space-y-12 pb-32">
            <div className="space-y-1">
                <h1 className="text-3xl font-black text-zinc-900 tracking-tightest font-atelier">Tax settings</h1>
                <p className="text-sm text-zinc-500 font-medium tracking-tight">Manage how taxes are applied and collected for your studio.</p>
            </div>

            {/* Manage Sales Tax Collection */}
            <div className="bg-white rounded-[2.5rem] border border-zinc-100 p-10 shadow-sm space-y-8 group/section">
                <div className="space-y-2">
                    <h2 className="text-xl font-black text-zinc-900 tracking-tight">Manage sales tax collection</h2>
                    <p className="text-[13px] text-zinc-500 font-medium leading-relaxed max-w-2xl">
                        If you haven't already, create a tax in the region you're liable in. If you're unsure about where you're liable, check with a tax professional.
                    </p>
                </div>

                {taxes.length === 0 ? (
                    <div className="bg-zinc-50/50 border border-dashed border-zinc-200 rounded-[2rem] p-12 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="w-16 h-16 rounded-2xl bg-white border border-zinc-100 flex items-center justify-center text-3xl shadow-sm">
                            😕
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-lg font-black text-zinc-900 tracking-tight">You are not collecting tax.</h3>
                            <p className="text-sm text-zinc-500 font-medium">Collect tax in regions where your business has a tax obligation.</p>
                        </div>
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="text-indigo-600 font-black text-sm hover:text-indigo-700 transition-colors flex items-center gap-2"
                        >
                            Collect tax +
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {taxes.map((tax) => (
                            <div key={tax.id} className="flex items-center justify-between p-6 bg-zinc-50 border border-zinc-100 rounded-3xl hover:border-zinc-200 transition-all group/item">
                                <div className="flex items-center gap-5">
                                    <div className="w-12 h-12 rounded-2xl bg-white border border-zinc-100 flex items-center justify-center text-zinc-400 group-hover/item:text-zinc-900 transition-colors">
                                        <Receipt className="w-5 h-5" />
                                    </div>
                                    <div className="space-y-0.5">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-black text-zinc-900 tracking-tight">{tax.name}</h4>
                                            <span className="px-2 py-0.5 bg-zinc-200 text-zinc-600 rounded-full text-[10px] font-black uppercase tracking-widest leading-none">
                                                {tax.country}
                                            </span>
                                        </div>
                                        <p className="text-xs text-zinc-500 font-medium tracking-tight">
                                            {tax.percentage}% • {tax.registration_number || 'No registration number'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDeleteTax(tax.id)}
                                    className="p-3 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="w-full py-6 bg-white border border-dashed border-zinc-200 rounded-3xl text-zinc-400 hover:text-zinc-900 hover:border-zinc-300 hover:bg-zinc-50 transition-all flex items-center justify-center gap-2 font-black text-[11px] uppercase tracking-widest"
                        >
                            <Plus className="w-4 h-4" />
                            Add another tax
                        </button>
                    </div>
                )}
            </div>

            {/* Decide how tax is charged */}
            <div className="bg-white rounded-[2.5rem] border border-zinc-100 p-10 shadow-sm space-y-8 group/section">
                <div className="space-y-2">
                    <h2 className="text-xl font-black text-zinc-900 tracking-tight">Decide how tax is charged</h2>
                    <p className="text-[13px] text-zinc-500 font-medium leading-relaxed">
                        Manage how taxes are charged and shown in your store.
                    </p>
                </div>

                <div className="p-8 bg-zinc-50 border border-zinc-100 rounded-[2rem] hover:border-zinc-200 transition-all">
                    <button
                        onClick={handleToggleInclusive}
                        disabled={isUpdatingSettings}
                        className="flex items-start gap-4 w-full text-left group/toggle"
                    >
                        <div className={clsx(
                            "mt-1 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                            studio.tax_inclusive 
                                ? "bg-zinc-900 border-zinc-900 text-white" 
                                : "bg-white border-zinc-200 group-hover/toggle:border-zinc-300"
                        )}>
                            {studio.tax_inclusive && <Check className="w-4 h-4 stroke-[3px]" />}
                        </div>
                        <div className="space-y-1">
                            <h4 className="font-black text-zinc-900 tracking-tight">Include tax in prices</h4>
                            <p className="text-xs text-zinc-500 font-medium leading-relaxed max-w-xl">
                                Pricing plan prices will include tax. There will be no additional taxes charged on top of the listed price.
                            </p>
                        </div>
                        {isUpdatingSettings && <Loader2 className="w-4 h-4 animate-spin mt-1 ml-auto text-zinc-400" />}
                    </button>
                </div>
            </div>

            {/* Error/Success Feedback */}
            <div className="fixed bottom-10 right-10 z-[110] space-y-2">
                {error && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-[11px] font-bold uppercase tracking-widest shadow-2xl animate-in fade-in slide-in-from-right-4 flex items-center gap-3">
                        <Info className="w-4 h-4" />
                        {error}
                        <button onClick={() => setError(null)} className="ml-4 opacity-50 hover:opacity-100"><X className="w-3 h-3" /></button>
                    </div>
                )}
                {success && (
                    <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-white text-[11px] font-bold uppercase tracking-widest shadow-2xl animate-in fade-in slide-in-from-right-4 flex items-center gap-3">
                        <Check className="w-4 h-4" />
                        {success}
                    </div>
                )}
            </div>

            {/* Add Tax Modal */}
            <Modal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                className="max-w-md !rounded-[2.5rem]"
            >
                <form action={handleAddTax} className="space-y-8 p-4">
                    <input type="hidden" name="studioId" value={studio.id} />
                    
                    <div className="space-y-1">
                        <h3 className="text-2xl font-black text-zinc-900 tracking-tight">Add tax</h3>
                    </div>

                    <div className="space-y-6">
                        {/* Country - Locked */}
                        <div className="space-y-2.5">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Country</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    name="country"
                                    value={studio.business_country || 'Philippines'}
                                    readOnly
                                    className="w-full px-6 py-4 bg-zinc-100 border border-zinc-100 rounded-2xl text-zinc-500 font-medium text-[13px] cursor-not-allowed"
                                />
                                <div className="absolute right-6 top-1/2 -translate-y-1/2">
                                    <Info className="w-4 h-4 text-zinc-300" />
                                </div>
                            </div>
                        </div>

                        {/* Tax Name */}
                        <div className="space-y-2.5">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Tax name</label>
                            <input
                                type="text"
                                name="name"
                                required
                                placeholder="e.g. VAT, GST"
                                className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-zinc-900 focus:bg-white focus:ring-4 focus:ring-zinc-100/50 focus:border-zinc-200 transition-all font-medium text-[13px]"
                            />
                        </div>

                        {/* Tax Percentage */}
                        <div className="space-y-2.5">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Tax percentage</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    name="percentage"
                                    required
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    defaultValue="0"
                                    className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-zinc-900 focus:bg-white focus:ring-4 focus:ring-zinc-100/50 focus:border-zinc-200 transition-all font-medium text-[13px]"
                                />
                                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-zinc-400 font-medium">
                                    <Percent className="w-4 h-4" />
                                </div>
                            </div>
                        </div>

                        {/* Registration Number */}
                        <div className="space-y-2.5">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Tax registration number (Optional)</label>
                            <input
                                type="text"
                                name="registrationNumber"
                                placeholder="e.g. 200312345A"
                                className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-zinc-900 focus:bg-white focus:ring-4 focus:ring-zinc-100/50 focus:border-zinc-200 transition-all font-medium text-[13px]"
                            />
                            <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest ml-1">Accepted format: 200312345A</p>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={() => setIsAddModalOpen(false)}
                            className="flex-1 px-6 py-4 rounded-2xl bg-zinc-100 text-zinc-600 text-[11px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-all font-atelier whitespace-nowrap"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 px-6 py-4 rounded-2xl bg-zinc-900 text-white text-[11px] font-black uppercase tracking-widest hover:brightness-110 transition-all font-atelier whitespace-nowrap flex items-center justify-center gap-2"
                        >
                            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                            Save
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}
