'use client'

import React, { useState } from 'react'
import StudioDashboardShell from '@/components/dashboard/StudioDashboardShell'
import { 
    Clock, Calendar, ShieldCheck, Users, Info, Plus, 
    Trash2, Save, ChevronRight, Settings2, Sparkles,
    Eye, EyeOff, LayoutGrid, CheckCircle2, History,
    AlertTriangle, Timer, Loader2
} from 'lucide-react'
import { clsx } from 'clsx'
import { updateStudioSettings } from '../actions'
import { updateCancellationRulesAction } from '@/app/(dashboard)/studio/online-store/policies/actions'

interface ServiceSettingsProps {
    studio: any
}

export default function ServiceSettingsClient({ studio }: ServiceSettingsProps) {
    const [activeTab, setActiveTab] = useState<'classes' | 'appointments'>('classes')
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Late cancellation rules state
    const [lateCancelHours, setLateCancelHours] = useState(studio.late_cancel_hours ?? 12)
    const [noShowPenalty, setNoShowPenalty] = useState(studio.no_show_penalty ?? true)
    const [rulesChanged, setRulesChanged] = useState(false)
    const [rulesSaving, setRulesSaving] = useState(false)
    const [rulesSaved, setRulesSaved] = useState(false)

    const handleSaveCancellationRules = async () => {
        setRulesSaving(true)
        setRulesSaved(false)
        try {
            const result = await updateCancellationRulesAction(studio.id, lateCancelHours, noShowPenalty)
            if (result?.error) {
                alert(result.error)
            } else {
                setRulesChanged(false)
                setRulesSaved(true)
                setTimeout(() => setRulesSaved(false), 3000)
            }
        } catch (error) {
            alert('Failed to save cancellation rules')
        } finally {
            setRulesSaving(false)
        }
    }

    // Form State (Mocking structure based on screenshots)
    const [settings, setSettings] = useState(studio.service_settings || {
        classes: {
            timetable: {
                weeksToShow: 2,
                showSlotsLeft: true,
                showSlotsMode: 'always', // 'always', 'low', 'capacity'
                startDate: 'today'
            },
            levels: ['Beginner', 'Intermediate', 'Advanced', 'Open to all'],
            booking: {
                earliestTime: { value: 1, unit: 'hours', enabled: false },
                latestTime: { value: 1, unit: 'hours', enabled: false }
            },
            cancellation: {
                window: 1,
                windowUnit: 'hours',
                penaltyStrike: false
            },
            waitlist: { enabled: true },
            classpass: { enabled: false }
        },
        appointments: {
            bufferTime: 15,
            leadTime: 24,
            leadTimeUnit: 'hours',
            increment: 15
        }
    })

    const handleSave = async () => {
        setIsSubmitting(true)
        try {
            await updateStudioSettings(studio.id, settings)
            alert('Settings saved successfully!')
        } catch (error) {
            console.error(error)
            alert('Failed to save settings')
        } finally {
            setIsSubmitting(false)
        }
    }

    const updateNestedSetting = (path: string, value: any) => {
        const keys = path.split('.')
        setSettings((prev: any) => {
            const next = { ...prev }
            let current = next
            for (let i = 0; i < keys.length - 1; i++) {
                current[keys[i]] = { ...current[keys[i]] }
                current = current[keys[i]]
            }
            current[keys[keys.length - 1]] = value
            return next
        })
    }

    return (
        <StudioDashboardShell 
            title="Service Settings"
            breadcrumbs={[
                { label: 'Services', href: '/studio/services' },
                { label: 'Settings' }
            ]}
            actions={
                <button 
                    onClick={handleSave}
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-8 py-2.5 bg-[#2D3282] rounded-lg text-[11px] font-bold uppercase tracking-widest text-white hover:bg-indigo-900 transition-all shadow-md disabled:opacity-50"
                >
                    <Save className="w-4 h-4" />
                    {isSubmitting ? 'Saving...' : 'Save Settings'}
                </button>
            }
        >
            <div className="max-w-5xl">
                {/* Tabs */}
                <div className="flex items-center gap-12 border-b border-zinc-100 mb-12">
                    <button 
                        onClick={() => setActiveTab('classes')}
                        className={clsx(
                            "pb-4 text-[13px] font-bold transition-all relative",
                            activeTab === 'classes' ? "text-zinc-900" : "text-zinc-400 hover:text-zinc-600"
                        )}
                    >
                        Classes
                        {activeTab === 'classes' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2D3282]" />}
                    </button>
                    <button 
                        onClick={() => setActiveTab('appointments')}
                        className={clsx(
                            "pb-4 text-[13px] font-bold transition-all relative",
                            activeTab === 'appointments' ? "text-zinc-900" : "text-zinc-400 hover:text-zinc-600"
                        )}
                    >
                        Appointments
                        {activeTab === 'appointments' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2D3282]" />}
                    </button>
                </div>

                {activeTab === 'classes' ? (
                    <div className="space-y-16 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {/* Timetable Section */}
                        <section className="space-y-8">
                            <div>
                                <h3 className="text-lg font-serif font-bold text-zinc-900 mb-2 whitespace-nowrap overflow-hidden">Timetable displays</h3>
                                <p className="text-xs text-zinc-500">Configure how your class schedule appears to clients.</p>
                            </div>

                            <div className="flex items-center gap-8 p-6 bg-zinc-50/50 rounded-2xl border border-zinc-100">
                                <div className="flex items-center gap-4 bg-white p-2 border border-zinc-200 rounded-xl shadow-sm">
                                    <button 
                                        onClick={() => updateNestedSetting('classes.timetable.weeksToShow', Math.max(1, settings.classes.timetable.weeksToShow - 1))}
                                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 text-zinc-600"
                                    >-</button>
                                    <span className="w-8 text-center text-sm font-bold text-zinc-900">{settings.classes.timetable.weeksToShow}</span>
                                    <button 
                                        onClick={() => updateNestedSetting('classes.timetable.weeksToShow', settings.classes.timetable.weeksToShow + 1)}
                                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 text-zinc-600"
                                    >+</button>
                                </div>
                                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest whitespcae-nowrap overflow-hidden">Weeks of classes shown</span>
                            </div>

                            <div className="space-y-4">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div 
                                        onClick={() => updateNestedSetting('classes.timetable.showSlotsLeft', !settings.classes.timetable.showSlotsLeft)}
                                        className={clsx(
                                            "w-10 h-5 rounded-full p-1 transition-all duration-300",
                                            settings.classes.timetable.showSlotsLeft ? "bg-forest" : "bg-zinc-200"
                                        )}
                                    >
                                        <div className={clsx("bg-white w-3 h-3 rounded-full transition-all shadow-sm", settings.classes.timetable.showSlotsLeft ? "translate-x-5" : "translate-x-0")} />
                                    </div>
                                    <span className="text-sm font-bold text-zinc-900">Show slots left display on timetable</span>
                                </label>

                                {settings.classes.timetable.showSlotsLeft && (
                                    <div className="ml-13 pl-8 border-l-2 border-zinc-100 space-y-4 mt-4">
                                        <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">When should slots be shown?</p>
                                        {[
                                            { id: 'always', label: 'Always show slots left' },
                                            { id: 'low', label: 'Show only when slots are low' },
                                            { id: 'capacity', label: 'Show with total capacity' }
                                        ].map((opt) => (
                                            <label key={opt.id} className="flex items-center gap-3 cursor-pointer group">
                                                <input 
                                                    type="radio" 
                                                    name="showSlotsMode" 
                                                    checked={settings.classes.timetable.showSlotsMode === opt.id}
                                                    onChange={() => updateNestedSetting('classes.timetable.showSlotsMode', opt.id)}
                                                    className="w-4 h-4 text-[#2D3282] focus:ring-[#2D3282] border-zinc-300"
                                                />
                                                <span className="text-sm text-zinc-600 group-hover:text-zinc-900 transition-colors">{opt.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </section>

                        <hr className="border-zinc-100" />

                        {/* Class Level Section */}
                        <section className="space-y-8">
                            <div>
                                <h3 className="text-lg font-serif font-bold text-zinc-900 mb-2 whitespcae-nowrap overflow-hidden">Class level</h3>
                                <p className="text-xs text-zinc-500">Define the difficulty benchmarks for your studio.</p>
                            </div>

                            <div className="space-y-3">
                                {settings.classes.levels.map((level: string, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between p-4 bg-white border border-zinc-100 rounded-xl hover:border-zinc-300 hover:shadow-sm transition-all group">
                                        <div className="flex items-center gap-4">
                                            <LayoutGrid className="w-4 h-4 text-zinc-300 group-hover:text-zinc-400 transition-colors cursor-grab" />
                                            <span className="text-sm font-medium text-zinc-700">{level}</span>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                const newLevels = settings.classes.levels.filter((_: any, i: number) => i !== idx)
                                                updateNestedSetting('classes.levels', newLevels)
                                            }}
                                            className="p-2 text-zinc-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                <button 
                                    onClick={() => {
                                        const name = prompt('Enter new class level name:')
                                        if (name) updateNestedSetting('classes.levels', [...settings.classes.levels, name])
                                    }}
                                    className="w-full py-4 border-2 border-dashed border-zinc-100 rounded-xl text-zinc-400 hover:border-zinc-200 hover:text-[#2D3282] transition-all flex items-center justify-center gap-2 group"
                                >
                                    <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                    <span className="text-[11px] font-bold uppercase tracking-widest">Add Class Level</span>
                                </button>
                            </div>
                        </section>

                        <hr className="border-zinc-100" />

                        {/* Booking Window Section */}
                        <section className="space-y-8">
                            <div>
                                <h3 className="text-lg font-serif font-bold text-zinc-900 mb-2 whitespace-nowrap overflow-hidden">Booking window</h3>
                                <p className="text-xs text-zinc-500">Set the time constraints for when customers can book.</p>
                            </div>

                            <div className="space-y-12">
                                <div className="space-y-6">
                                    <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Earliest Booking</h4>
                                    <div className="flex flex-col gap-4">
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <input type="radio" checked={!settings.classes.booking.earliestTime.enabled} onChange={() => updateNestedSetting('classes.booking.earliestTime.enabled', false)} className="w-4 h-4 text-[#2D3282]" />
                                            <span className="text-sm text-zinc-700">Anytime</span>
                                        </label>
                                        <div className="flex items-center gap-4">
                                            <input type="radio" checked={settings.classes.booking.earliestTime.enabled} onChange={() => updateNestedSetting('classes.booking.earliestTime.enabled', true)} className="w-4 h-4 text-[#2D3282]" />
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="number" 
                                                    value={settings.classes.booking.earliestTime.value}
                                                    onChange={(e) => updateNestedSetting('classes.booking.earliestTime.value', parseInt(e.target.value))}
                                                    disabled={!settings.classes.booking.earliestTime.enabled}
                                                    className="w-16 px-3 py-1.5 border border-zinc-200 rounded-lg text-sm bg-white disabled:bg-zinc-50"
                                                />
                                                <select 
                                                    value={settings.classes.booking.earliestTime.unit}
                                                    disabled={!settings.classes.booking.earliestTime.enabled}
                                                    className="px-3 py-1.5 border border-zinc-200 rounded-lg text-sm bg-white disabled:bg-zinc-50"
                                                >
                                                    <option>hours</option>
                                                    <option>days</option>
                                                </select>
                                                <span className="text-sm text-zinc-500">before it begins</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Latest Booking</h4>
                                    <div className="flex flex-col gap-4">
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <input type="radio" checked={!settings.classes.booking.latestTime.enabled} onChange={() => updateNestedSetting('classes.booking.latestTime.enabled', false)} className="w-4 h-4 text-[#2D3282]" />
                                            <span className="text-sm text-zinc-700">Anytime</span>
                                        </label>
                                        <div className="flex items-center gap-4">
                                            <input type="radio" checked={settings.classes.booking.latestTime.enabled} onChange={() => updateNestedSetting('classes.booking.latestTime.enabled', true)} className="w-4 h-4 text-[#2D3282]" />
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="number" 
                                                    value={settings.classes.booking.latestTime.value}
                                                    onChange={(e) => updateNestedSetting('classes.booking.latestTime.value', parseInt(e.target.value))}
                                                    disabled={!settings.classes.booking.latestTime.enabled}
                                                    className="w-16 px-3 py-1.5 border border-zinc-200 rounded-lg text-sm bg-white disabled:bg-zinc-50"
                                                />
                                                <select 
                                                    value={settings.classes.booking.latestTime.unit}
                                                    disabled={!settings.classes.booking.latestTime.enabled}
                                                    className="px-3 py-1.5 border border-zinc-200 rounded-lg text-sm bg-white disabled:bg-zinc-50"
                                                >
                                                    <option>hours</option>
                                                    <option>minutes</option>
                                                </select>
                                                <span className="text-sm text-zinc-500">before it begins</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <hr className="border-zinc-100" />

                        {/* Late Cancellation Rules */}
                        <section className="space-y-8">
                            <div>
                                <h3 className="text-lg font-serif font-bold text-zinc-900 mb-2 flex items-center gap-3">
                                    <Timer className="w-5 h-5 text-[#2D3282]" />
                                    Late Cancellation Rules
                                </h3>
                                <p className="text-xs text-zinc-500">Set how many hours before a class a client must cancel to receive a full credit refund.</p>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                        <Clock className="w-3.5 h-3.5" />
                                        Cancellation Window
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="number"
                                            min={1}
                                            max={72}
                                            value={lateCancelHours}
                                            onChange={(e) => { setLateCancelHours(Number(e.target.value) || 1); setRulesChanged(true) }}
                                            className="w-20 px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#2D3282]/10 focus:border-[#2D3282] transition-all text-center"
                                        />
                                        <span className="text-sm text-zinc-500 font-medium">hours before class</span>
                                    </div>
                                    <p className="text-xs text-zinc-400 flex items-center gap-2 bg-amber-50 px-4 py-3 rounded-xl border border-amber-100">
                                        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                        <span>
                                            Clients who cancel <strong className="text-zinc-700">less than {lateCancelHours} hour{lateCancelHours !== 1 ? 's' : ''}</strong> before the class will <strong className="text-zinc-700">not</strong> receive a credit refund.
                                        </span>
                                    </p>
                                </div>

                                <div className="flex items-center justify-between py-4 border-t border-zinc-100">
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold text-zinc-900">No-Show Penalty</p>
                                        <p className="text-xs text-zinc-400">Deduct credits for clients who don't show up to their booked class.</p>
                                    </div>
                                    <button 
                                        type="button" 
                                        onClick={() => { setNoShowPenalty(!noShowPenalty); setRulesChanged(true) }}
                                        className={clsx(
                                            "w-10 h-5 rounded-full p-1 transition-all relative flex-shrink-0",
                                            noShowPenalty ? "bg-[#2D3282]" : "bg-zinc-200"
                                        )}
                                    >
                                        <div className={clsx(
                                            "w-3 h-3 bg-white rounded-full transition-all shadow-sm",
                                            noShowPenalty ? "translate-x-5" : "translate-x-0"
                                        )} />
                                    </button>
                                </div>

                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={handleSaveCancellationRules}
                                        disabled={!rulesChanged || rulesSaving}
                                        className={clsx(
                                            "flex items-center gap-2 px-6 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all",
                                            rulesChanged 
                                                ? "bg-[#2D3282] text-white hover:bg-indigo-900 shadow-md" 
                                                : "bg-zinc-100 text-zinc-400 cursor-default"
                                        )}
                                    >
                                        {rulesSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        {rulesSaving ? 'Saving...' : 'Save Rules'}
                                    </button>
                                    {rulesSaved && (
                                        <span className="text-xs font-bold text-green-600 flex items-center gap-1.5 animate-in fade-in">
                                            <CheckCircle2 className="w-4 h-4" /> Saved
                                        </span>
                                    )}
                                </div>
                            </div>
                        </section>
                    </div>
                ) : (
                    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <section className="space-y-8">
                            <div>
                                <h3 className="text-lg font-serif font-bold text-zinc-900 mb-2 whitespace-nowrap overflow-hidden">Appointment Logic</h3>
                                <p className="text-xs text-zinc-500">Configuration for private 1-on-1 sessions.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="p-6 bg-white border border-zinc-100 rounded-2xl shadow-tight space-y-4">
                                    <div className="flex items-center gap-3 text-[#2D3282]">
                                        <Clock className="w-5 h-5" />
                                        <span className="text-[11px] font-bold uppercase tracking-widest">Buffer Times</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <input 
                                            type="number" 
                                            value={settings.appointments.bufferTime}
                                            onChange={(e) => updateNestedSetting('appointments.bufferTime', parseInt(e.target.value))}
                                            className="w-20 px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm"
                                        />
                                        <span className="text-xs text-zinc-500 font-medium">Minutes between appointments</span>
                                    </div>
                                </div>

                                <div className="p-6 bg-white border border-zinc-100 rounded-2xl shadow-tight space-y-4">
                                    <div className="flex items-center gap-3 text-[#2D3282]">
                                        <History className="w-5 h-5" />
                                        <span className="text-[11px] font-bold uppercase tracking-widest">Scheduling Increments</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <select 
                                            value={settings.appointments.increment}
                                            onChange={(e) => updateNestedSetting('appointments.increment', parseInt(e.target.value))}
                                            className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm"
                                        >
                                            <option value={15}>Every 15 minutes</option>
                                            <option value={30}>Every 30 minutes</option>
                                            <option value={60}>Every 1 hour</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                )}
            </div>
        </StudioDashboardShell>
    )
}

