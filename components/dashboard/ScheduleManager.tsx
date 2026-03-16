'use client';

import { useState } from 'react';
import { Loader2, Calendar, Clock, Repeat, CheckCircle, AlertCircle } from 'lucide-react';
import { generateRecurringSlots } from '@/app/(dashboard)/studio/actions';

interface ScheduleManagerProps {
    studioId: string;
    availableEquipment: string[];
}

export default function ScheduleManager({ studioId, availableEquipment }: ScheduleManagerProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedDays, setSelectedDays] = useState<number[]>([]); // 0=Sun, 1=Mon, etc.
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('17:00');
    const [quantity, setQuantity] = useState(1);
    const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);

    const daysOfWeek = [
        { id: 1, label: 'Mon' },
        { id: 2, label: 'Tue' },
        { id: 3, label: 'Wed' },
        { id: 4, label: 'Thu' },
        { id: 5, label: 'Fri' },
        { id: 6, label: 'Sat' },
        { id: 0, label: 'Sun' },
    ];

    const toggleDay = (dayId: number) => {
        if (selectedDays.includes(dayId)) {
            setSelectedDays(selectedDays.filter(d => d !== dayId));
        } else {
            setSelectedDays([...selectedDays, dayId]);
        }
    };

    const toggleEquipment = (eq: string) => {
        if (selectedEquipment.includes(eq)) {
            setSelectedEquipment(selectedEquipment.filter(item => item !== eq));
        } else {
            setSelectedEquipment([...selectedEquipment, eq]);
        }
    };

    const handleGenerate = async () => {
        if (!startDate || !endDate || selectedDays.length === 0) {
            setMessage({ type: 'error', text: 'Please fill in all fields (Start/End Date and Days).' });
            return;
        }

        if (availableEquipment.length > 0 && selectedEquipment.length === 0) {
            setMessage({ type: 'error', text: 'Please select at least one piece of equipment.' });
            return;
        }

        setIsSubmitting(true);
        setMessage(null);

        try {
            const result = await generateRecurringSlots({
                studioId,
                startDate,
                endDate,
                days: selectedDays,
                startTime,
                endTime,
                equipment: selectedEquipment,
                quantity: quantity
            });

            if (result.success) {
                setMessage({ type: 'success', text: `Successfully generated ${result.count} slots!` });
                // Reset form potentially?
            } else {
                setMessage({ type: 'error', text: result.error || 'Failed to generate slots.' });
            }
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'An unexpected error occurred.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white border border-border-grey rounded-lg p-10 shadow-tight">
            <h2 className="text-2xl font-serif text-charcoal mb-4 flex items-center gap-3">
                <Repeat className="w-6 h-6 text-forest" />
                Schedule Generator
            </h2>

            <p className="text-[10px] text-slate font-bold uppercase tracking-[0.2em] mb-10">
                BULK CREATE AVAILABLE SESSIONS ACROSS DATE RANGES
            </p>

            {message && (
                <div className={`p-4 rounded-lg mb-6 flex items-center gap-2 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    {message.text}
                </div>
            )}

            <div className="space-y-6">
                {/* Date Range */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-[10px] font-bold text-slate uppercase tracking-[0.2em] mb-3 ml-2">Start Date</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-5 py-4 border border-border-grey rounded-lg text-charcoal font-bold text-[10px] outline-none focus:ring-1 focus:ring-forest transition-all uppercase tracking-widest cursor-pointer"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate uppercase tracking-[0.2em] mb-3 ml-2">End Date</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full px-5 py-4 border border-border-grey rounded-lg text-charcoal font-bold text-[10px] outline-none focus:ring-1 focus:ring-forest transition-all uppercase tracking-widest cursor-pointer"
                        />
                    </div>
                </div>

                {/* Days of Week */}
                <div>
                    <label className="block text-[10px] font-bold text-slate uppercase tracking-[0.2em] mb-4 ml-2">Days of Week</label>
                    <div className="flex flex-wrap gap-3">
                        {daysOfWeek.map(day => (
                            <button
                                key={day.id}
                                onClick={() => toggleDay(day.id)}
                                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg text-[11px] font-bold transition-all border ${selectedDays.includes(day.id)
                                    ? 'bg-forest text-white border-forest shadow-tight'
                                    : 'bg-white text-slate border-border-grey hover:border-forest/50'
                                    }`}
                            >
                                {day.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Time Range */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-[10px] font-bold text-slate uppercase tracking-[0.2em] mb-3 ml-2">Open Time</label>
                        <select
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            className="w-full px-5 py-4 border border-border-grey rounded-lg text-charcoal font-bold text-[10px] outline-none bg-white focus:ring-1 focus:ring-forest cursor-pointer uppercase tracking-widest"
                        >
                            {Array.from({ length: 24 }, (_, i) => i).map(hour => (
                                <option key={hour} value={`${hour.toString().padStart(2, '0')}:00`}>
                                    {hour > 12 ? `${hour - 12}:00 PM` : `${hour}:00 ${hour === 12 ? 'PM' : 'AM'}`}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate uppercase tracking-[0.2em] mb-3 ml-2">Close Time</label>
                        <select
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            className="w-full px-5 py-4 border border-border-grey rounded-lg text-charcoal font-bold text-[10px] outline-none bg-white focus:ring-1 focus:ring-forest cursor-pointer uppercase tracking-widest"
                        >
                            {Array.from({ length: 24 }, (_, i) => i).map(hour => (
                                <option key={hour} value={`${hour.toString().padStart(2, '0')}:00`}>
                                    {hour > 12 ? `${hour - 12}:00 PM` : `${hour}:00 ${hour === 12 ? 'PM' : 'AM'}`}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Equipment Selection */}
                {availableEquipment.length > 0 && (
                    <div>
                        <label className="block text-[10px] font-bold text-slate uppercase tracking-[0.2em] mb-4 ml-2">Equipment Selection</label>
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                            {availableEquipment.map(eq => (
                                <button
                                    key={eq}
                                    onClick={() => toggleEquipment(eq)}
                                    className={`flex items-center gap-3 p-4 border rounded-lg transition-all text-left ${selectedEquipment.includes(eq)
                                        ? 'bg-forest text-white border-forest shadow-tight font-bold'
                                        : 'bg-off-white text-slate border-border-grey hover:bg-white'
                                        }`}
                                >
                                    <span className="text-[10px] uppercase font-bold tracking-widest">{eq}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="pt-10 border-t border-border-grey space-y-4">
                    <button
                        onClick={handleGenerate}
                        disabled={isSubmitting}
                        className="w-full py-5 bg-forest text-white rounded-lg text-[10px] font-bold uppercase tracking-[0.3em] hover:brightness-[1.2] transition-all shadow-tight active:scale-95 disabled:opacity-50 flex items-center justify-center gap-4"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                PROCESSING...
                            </>
                        ) : (
                            <>
                                <Repeat className="w-5 h-5" />
                                GENERATE SCHEDULE
                            </>
                        )}
                    </button>
                    <p className="text-[9px] text-slate font-bold uppercase tracking-[0.1em] text-center max-w-sm mx-auto leading-relaxed">
                        system will generate 1-hour sessions for the selected range. existing sessions will be preserved to prevent duplicates.
                    </p>
                </div>
            </div>
        </div>
    );
}
