'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { addAvailability, deleteAvailability, generateRecurringAvailability } from '@/app/(dashboard)/instructor/schedule/actions'
import { Loader2, Plus, Trash2, Clock, MapPin, Repeat, CheckCircle, AlertCircle, Calendar } from 'lucide-react'
import { clsx } from 'clsx'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const LOCATIONS = ['Alabang', 'BGC', 'Ortigas', 'Makati - CBD/Ayala', 'Makati - Poblacion/Rockwell', 'Makati - San Antonio/Gil Puyat', 'Makati - Others', 'Mandaluyong - Ortigas South', 'Mandaluyong - Greenfield/Shaw', 'Mandaluyong - Boni/Pioneer', 'QC - Tomas Morato', 'QC - Katipunan', 'QC - Eastwood', 'QC - Cubao', 'QC - Fairview/Commonwealth', 'QC - Novaliches', 'QC - Diliman', 'QC - Maginhawa/UP Village', 'Paranaque - BF Homes', 'Paranaque - Moonwalk / Merville', 'Paranaque - Bicutan / Sucat', 'Paranaque - Others']

interface ScheduleManagerProps {
    initialAvailability: any[];
}

export default function InstructorScheduleGenerator({ initialAvailability }: ScheduleManagerProps) {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Form State
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedDays, setSelectedDays] = useState<number[]>([]);
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('17:00');
    const [locations, setLocations] = useState<string[]>(['BGC']);

    const toggleLocation = (loc: string) => {
        setLocations(prev =>
            prev.includes(loc)
                ? prev.filter(l => l !== loc)
                : [...prev, loc]
        );
    }

    const handleGenerate = async () => {
        if (!startDate || !endDate || selectedDays.length === 0 || locations.length === 0) {
            setMessage({ type: 'error', text: 'Please fill in all fields (Start/End Date, Days, and at least one Location).' });
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
                locations: locations
            });

            if (result.success) {
                setMessage({ type: 'success', text: `Successfully generated ${result.count} slots!` });
                router.refresh();
            } else {
                setMessage({ type: 'error', text: result.error || 'Failed.' });
            }
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'An error occurred.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Remove this availability?')) return
        const result = await deleteAvailability(id)
        if (result.success) {
            router.refresh()
        }
    }

    const toggleDay = (d: number) => {
        if (selectedDays.includes(d)) setSelectedDays(selectedDays.filter(x => x !== d));
        else setSelectedDays([...selectedDays, d]);
    }

    const daysOfWeek = [
        { id: 1, label: 'Mon' },
        { id: 2, label: 'Tue' },
        { id: 3, label: 'Wed' },
        { id: 4, label: 'Thu' },
        { id: 5, label: 'Fri' },
        { id: 6, label: 'Sat' },
        { id: 0, label: 'Sun' },
    ];

    return (
        <div className="space-y-8">
            {/* Recurring Generator - Matching Studio Style */}
            <div className="bg-white border border-cream-200 rounded-xl p-6 shadow-sm">
                <h2 className="text-xl font-medium text-charcoal-900 mb-4 flex items-center gap-2">
                    <Repeat className="w-5 h-5 text-charcoal-500" />
                    Recurring Availability Generator
                </h2>

                <p className="text-sm text-charcoal-600 mb-6">
                    Bulk create availability for your schedule. Select a date range, days of the week, and location.
                </p>

                {message && (
                    <div className={`p-4 rounded-lg mb-6 flex items-center gap-2 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                        {message.text}
                    </div>
                )}

                <div className="space-y-6">
                    {/* Date Range */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-charcoal-700 mb-1">Start Date</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-3 py-2 border border-cream-300 rounded-lg text-charcoal-900 focus:ring-2 focus:ring-charcoal-900 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-charcoal-700 mb-1">End Date</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full px-3 py-2 border border-cream-300 rounded-lg text-charcoal-900 focus:ring-2 focus:ring-charcoal-900 outline-none"
                            />
                        </div>
                    </div>

                    {/* Days of Week */}
                    <div>
                        <label className="block text-sm font-medium text-charcoal-700 mb-2">Days of Week</label>
                        <div className="flex flex-wrap gap-2">
                            {daysOfWeek.map(day => (
                                <button
                                    key={day.id}
                                    onClick={() => toggleDay(day.id)}
                                    className={`w-10 h-10 rounded-full text-sm font-medium transition-colors border ${selectedDays.includes(day.id)
                                        ? 'bg-charcoal-900 text-cream-50 border-charcoal-900'
                                        : 'bg-white text-charcoal-600 border-cream-300 hover:border-charcoal-500'
                                        }`}
                                >
                                    {day.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Time & Locations */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-charcoal-700 mb-2">Start Time</label>
                                <select
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    className="w-full px-4 py-2 border border-cream-300 rounded-xl text-charcoal-900 outline-none bg-white focus:ring-2 focus:ring-rose-gold/20 focus:border-rose-gold transition-all"
                                >
                                    {Array.from({ length: 24 }, (_, i) => i).map(hour => (
                                        <option key={hour} value={`${hour.toString().padStart(2, '0')}:00`}>
                                            {hour > 12 ? `${hour - 12}:00 PM` : `${hour}:00 ${hour === 12 ? 'PM' : 'AM'}`}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-charcoal-700 mb-2">End Time</label>
                                <select
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    className="w-full px-4 py-2 border border-cream-300 rounded-xl text-charcoal-900 outline-none bg-white focus:ring-2 focus:ring-rose-gold/20 focus:border-rose-gold transition-all"
                                >
                                    {Array.from({ length: 24 }, (_, i) => i).map(hour => (
                                        <option key={hour} value={`${hour.toString().padStart(2, '0')}:00`}>
                                            {hour > 12 ? `${hour - 12}:00 PM` : `${hour}:00 ${hour === 12 ? 'PM' : 'AM'}`}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-charcoal-700 mb-3">Locations (Multi-Select)</label>
                            <div className="flex flex-wrap gap-2">
                                {LOCATIONS.map(l => {
                                    const isSelected = locations.includes(l);
                                    return (
                                        <button
                                            key={l}
                                            type="button"
                                            onClick={() => toggleLocation(l)}
                                            className={clsx(
                                                "px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
                                                isSelected
                                                    ? "bg-rose-gold text-white border-rose-gold shadow-sm"
                                                    : "bg-white text-charcoal-600 border-cream-200 hover:border-rose-gold"
                                            )}
                                        >
                                            {l}
                                        </button>
                                    )
                                })}
                            </div>
                            <p className="text-[11px] text-charcoal-500 mt-4 italic">
                                Note: Availability will be removed across all selected locations once a booking is confirmed.
                            </p>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-cream-100">
                        <button
                            onClick={handleGenerate}
                            disabled={isSubmitting}
                            className="w-full py-3 bg-rose-gold text-white rounded-xl font-bold hover:brightness-110 transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Repeat className="w-5 h-5" />
                                    Generate Availability
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

        </div>
    )
}
