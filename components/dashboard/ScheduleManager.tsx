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
        <div className="bg-white border border-cream-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-medium text-charcoal-900 mb-4 flex items-center gap-2">
                <Repeat className="w-5 h-5 text-charcoal-500" />
                Recurring Schedule Generator
            </h2>

            <p className="text-sm text-charcoal-600 mb-6">
                Bulk create available slots for your studio. Select a date range and the days of the week you are open.
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

                {/* Time Range */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-charcoal-700 mb-1">Open Time</label>
                        <select
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            className="w-full px-3 py-2 border border-cream-300 rounded-lg text-charcoal-900 outline-none bg-white"
                        >
                            {Array.from({ length: 24 }, (_, i) => i).map(hour => (
                                <option key={hour} value={`${hour.toString().padStart(2, '0')}:00`}>
                                    {hour > 12 ? `${hour - 12}:00 PM` : `${hour}:00 ${hour === 12 ? 'PM' : 'AM'}`}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-charcoal-700 mb-1">Close Time</label>
                        <select
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            className="w-full px-3 py-2 border border-cream-300 rounded-lg text-charcoal-900 outline-none bg-white"
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
                        <label className="block text-sm font-medium text-charcoal-700 mb-2">Equipment for these slots</label>
                        <div className="grid grid-cols-2 gap-2">
                            {availableEquipment.map(eq => (
                                <button
                                    key={eq}
                                    onClick={() => toggleEquipment(eq)}
                                    className={`flex items-center gap-2 p-2 border rounded-lg transition-colors text-left ${selectedEquipment.includes(eq)
                                        ? 'bg-charcoal-900 text-cream-50 border-charcoal-900'
                                        : 'bg-white text-charcoal-700 border-cream-200 hover:bg-cream-50'
                                        }`}
                                >
                                    <span className="text-sm">{eq}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="pt-4 border-t border-cream-100">
                    <button
                        onClick={handleGenerate}
                        disabled={isSubmitting}
                        className="w-full py-3 bg-charcoal-900 text-cream-50 rounded-lg font-medium hover:bg-charcoal-800 transition-colors flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Repeat className="w-5 h-5" />
                                Generate Schedule
                            </>
                        )}
                    </button>
                    <p className="text-xs text-charcoal-500 mt-2 text-center">
                        This will generate 1-hour slots for the selected range. Existing slots will be skipped to prevent duplicates.
                    </p>
                </div>
            </div>
        </div>
    );
}
