'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { addAvailability, deleteAvailability, generateRecurringAvailability } from '@/app/(dashboard)/instructor/schedule/actions'
import { Loader2, Plus, Trash2, Clock, MapPin, Repeat, CheckCircle, AlertCircle, Calendar, ChevronDown, ChevronUp } from 'lucide-react'
import { clsx } from 'clsx'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

interface ScheduleManagerProps {
    initialAvailability: any[];
    teachingEquipment: string[];
    instructorProfile: {
        home_base_address?: string | null;
    } | null;
}

export default function InstructorScheduleGenerator({ initialAvailability, teachingEquipment, instructorProfile }: ScheduleManagerProps) {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Form State
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedDays, setSelectedDays] = useState<number[]>([]);
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('17:00');

    const handleGenerate = async () => {
        if (!startDate || !endDate || selectedDays.length === 0) {
            setMessage({ type: 'error', text: 'Please fill in all fields before saving.' });
            return;
        }

        setIsSubmitting(true);
        setMessage(null);

        try {
            const result = await generateRecurringAvailability({
                startDate,
                endDate,
                days: selectedDays,
                startTime,
                endTime,
                locations: [instructorProfile?.home_base_address || ''],
                equipment: teachingEquipment
            });

            if (result.success) {
                setMessage({ type: 'success', text: `Successfully created ${result.count} availability slots.` });
                router.refresh();
            } else {
                setMessage({ type: 'error', text: result.error || 'Failed to generate schedule.' });
            }
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'Something went wrong. Please try again.' });
        } finally {
            setIsSubmitting(false);
        }
    }

    const toggleDay = (d: number) => {
        if (selectedDays.includes(d)) setSelectedDays(selectedDays.filter(x => x !== d));
        else setSelectedDays([...selectedDays, d]);
    }

    const daysOfWeek = [
        { id: 1, label: 'MON' },
        { id: 2, label: 'TUE' },
        { id: 3, label: 'WED' },
        { id: 4, label: 'THU' },
        { id: 5, label: 'FRI' },
        { id: 6, label: 'SAT' },
        { id: 0, label: 'SUN' },
    ];

    return (
        <div className="space-y-10">
            <div className="earth-card p-12 relative overflow-hidden bg-white shadow-tight">
                {/* Decorative Tint */}
                <div className="absolute top-0 right-0 w-80 h-80 bg-green-50 rounded-full -translate-y-1/2 translate-x-1/2 blur-[100px] pointer-events-none" />

                <div className="relative z-10">
                    <div className="flex items-center gap-6 mb-4">
                        <div className="p-4 bg-off-white rounded-lg border border-border-grey shadow-tight">
                            <Repeat className="w-7 h-7 text-forest" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-serif text-charcoal tracking-tighter">Weekly Schedule Generator</h2>
                            <p className="text-[10px] font-bold text-slate uppercase tracking-[0.4em] mt-1.5">Set up your recurring availability</p>
                        </div>
                    </div>

                    <p className="text-sm text-slate leading-relaxed mb-12 max-w-xl italic">
                        Set your available hours for multiple days at once. Choose a date range, pick the days you're free, and we'll add all the slots for you automatically.
                    </p>

                    {message && (
                        <div className={clsx(
                            "p-5 rounded-xl mb-10 border flex items-center gap-4 animate-in slide-in-from-top-4 duration-500",
                            message.type === 'success' ? "bg-green-50 border-green-100 text-green-800" : "bg-red-50 border-red-100 text-red-600"
                        )}>
                            {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                            <span className="text-[10px] font-bold uppercase tracking-widest leading-normal">{message.text}</span>
                        </div>
                    )}

                    <div className="space-y-10">
                        {/* Temporal Boundaries */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="earth-card p-6 space-y-6 bg-white border border-border-grey shadow-tight">
                                <h3 className="text-[10px] font-bold text-slate uppercase tracking-[0.3em] mb-1 px-2">Date Range</h3>
                                <div className="grid grid-cols-1 gap-8">
                                    <div className="relative">
                                        <label className="block text-[10px] font-bold text-slate uppercase tracking-[0.2em] mb-3 ml-6">Start Date</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate/40" />
                                            <input
                                                type="date"
                                                value={startDate}
                                                onChange={(e) => setStartDate(e.target.value)}
                                                className="w-full pl-12 pr-6 py-4 border border-border-grey rounded-lg bg-off-white text-charcoal font-bold text-[10px] outline-none focus:ring-1 focus:ring-forest transition-all uppercase tracking-[0.2em] cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <label className="block text-[10px] font-bold text-slate uppercase tracking-[0.2em] mb-3 ml-6">End Date</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate/40" />
                                            <input
                                                type="date"
                                                value={endDate}
                                                onChange={(e) => setEndDate(e.target.value)}
                                                className="w-full pl-12 pr-6 py-4 border border-border-grey rounded-lg bg-off-white text-charcoal font-bold text-[10px] outline-none focus:ring-1 focus:ring-forest transition-all uppercase tracking-[0.2em] cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="earth-card p-6 space-y-6 bg-white border border-border-grey shadow-tight">
                                <h3 className="text-[10px] font-bold text-slate uppercase tracking-[0.3em] mb-1 px-2">Repeat on Days</h3>
                                <div className="flex flex-wrap gap-3">
                                    {daysOfWeek.map(day => (
                                        <button
                                            key={day.id}
                                            onClick={() => toggleDay(day.id)}
                                            className={clsx(
                                                "w-12 h-12 rounded-lg text-[10px] font-bold transition-all duration-300 border flex items-center justify-center tracking-[0.2em]",
                                                selectedDays.includes(day.id)
                                                    ? "bg-forest text-white border-charcoal shadow-tight active:scale-95"
                                                    : "bg-off-white text-slate border-border-grey hover:border-forest hover:text-forest shadow-sm"
                                            )}
                                        >
                                            {day.label}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[9px] text-slate uppercase tracking-widest italic leading-relaxed px-2">
                                    Select which days to repeat your availability.
                                </p>
                            </div>
                        </div>

                        {/* Operational Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="earth-card p-6 space-y-6 bg-white border border-border-grey shadow-tight">
                                <div>
                                    <h3 className="text-[10px] font-bold text-slate uppercase tracking-[0.3em] mb-6 px-2">Session Hours</h3>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate uppercase tracking-[0.2em] mb-3 ml-6">Start Time</label>
                                            <select
                                                value={startTime}
                                                onChange={(e) => setStartTime(e.target.value)}
                                                className="w-full px-5 py-4 border border-border-grey rounded-lg bg-off-white text-charcoal font-bold text-[10px] outline-none focus:ring-1 focus:ring-forest transition-all uppercase tracking-[0.2em] cursor-pointer appearance-none shadow-sm min-w-[120px]"
                                            >
                                                {Array.from({ length: 24 }, (_, i) => i).map(hour => (
                                                    <option key={hour} value={`${hour.toString().padStart(2, '0')}:00`}>
                                                        {hour.toString().padStart(2, '0')}:00 {hour >= 12 ? 'PM' : 'AM'}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate uppercase tracking-[0.2em] mb-3 ml-6">End Time</label>
                                            <select
                                                value={endTime}
                                                onChange={(e) => setEndTime(e.target.value)}
                                                className="w-full px-5 py-4 border border-border-grey rounded-lg bg-off-white text-charcoal font-bold text-[10px] outline-none focus:ring-1 focus:ring-forest transition-all uppercase tracking-[0.2em] cursor-pointer appearance-none shadow-sm min-w-[120px]"
                                            >
                                                {Array.from({ length: 24 }, (_, i) => i).map(hour => (
                                                    <option key={hour} value={`${hour.toString().padStart(2, '0')}:00`}>
                                                        {hour.toString().padStart(2, '0')}:00 {hour >= 12 ? 'PM' : 'AM'}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Equipment picker removed - automatically uses profile equipment */}
                            </div>

                            <div className="earth-card p-8 flex flex-col bg-burgundy/5 border border-burgundy/10 rounded-2xl">
                                <div className="flex items-center gap-3 mb-3">
                                    <MapPin className="w-5 h-5 text-burgundy" />
                                    <span className="text-[10px] font-black text-burgundy uppercase tracking-widest">Service Area Address</span>
                                </div>
                                <p className="text-sm font-serif text-charcoal-700 leading-relaxed">
                                    {instructorProfile?.home_base_address || 'Address not set'}
                                </p>
                                <p className="text-[10px] text-charcoal/40 font-bold uppercase tracking-widest mt-4 italic border-t border-burgundy/5 pt-3">
                                    Recurring sessions will be generated for your verified service area.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-12 border-t border-border-grey">
                    <button
                        onClick={handleGenerate}
                        disabled={isSubmitting}
                        className="w-full py-6 bg-forest text-white rounded-xl text-[11px] font-bold uppercase tracking-[0.4em] hover:brightness-[1.2] transition-all shadow-tight active:scale-[0.98] flex items-center justify-center gap-6 disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin text-forest" />
                                SAVING SCHEDULE...
                            </>
                        ) : (
                            <>
                                <Repeat className="w-5 h-5 text-forest" />
                                SAVE RECURRING SCHEDULE
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}

