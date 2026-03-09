'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { addAvailability, deleteAvailability, generateRecurringAvailability } from '@/app/(dashboard)/instructor/schedule/actions'
import { Loader2, Plus, Trash2, Clock, MapPin, Repeat, CheckCircle, AlertCircle, Calendar } from 'lucide-react'
import { clsx } from 'clsx'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const LOCATIONS = [
    'Alabang - Madrigal/Ayala Alabang', 'Alabang - Filinvest City', 'Alabang - Alabang Town Center Area', 'Alabang - Others',
    'BGC - High Street', 'BGC - Central Square/Uptown', 'BGC - Forbes Town', 'BGC - Others',
    'Ortigas - Ortigas Center', 'Ortigas - Greenhills', 'Ortigas - San Juan', 'Ortigas - Others',
    'Makati - CBD/Ayala', 'Makati - Poblacion/Rockwell', 'Makati - San Antonio/Gil Puyat', 'Makati - Others',
    'Mandaluyong - Ortigas South', 'Mandaluyong - Greenfield/Shaw', 'Mandaluyong - Boni/Pioneer',
    'QC - Tomas Morato', 'QC - Katipunan', 'QC - Eastwood', 'QC - Cubao', 'QC - Fairview/Commonwealth', 'QC - Novaliches', 'QC - Diliman', 'QC - Maginhawa/UP Village',
    'Paranaque - BF Homes', 'Paranaque - Moonwalk / Merville', 'Paranaque - Bicutan / Sucat', 'Paranaque - Others'
]

const GROUPED_LOCATIONS = LOCATIONS.reduce((acc, loc) => {
    const city = loc.split(' - ')[0];
    if (!acc[city]) acc[city] = [];
    acc[city].push(loc);
    return acc;
}, {} as Record<string, string[]>);

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
    const [locations, setLocations] = useState<string[]>(['BGC - High Street']);
    const [equipment, setEquipment] = useState<string[]>(['Reformer']);

    const toggleLocation = (loc: string) => {
        setLocations(prev =>
            prev.includes(loc)
                ? prev.filter(l => l !== loc)
                : [...prev, loc]
        );
    }

    const toggleEquipment = (eq: string) => {
        setEquipment(prev =>
            prev.includes(eq)
                ? prev.filter(e => e !== eq)
                : [...prev, eq]
        );
    }

    const toggleCityGroup = (cityLocations: string[]) => {
        const allSelected = cityLocations.every(loc => locations.includes(loc));
        if (allSelected) {
            setLocations(prev => prev.filter(l => !cityLocations.includes(l)));
        } else {
            setLocations(prev => {
                const newSelections = cityLocations.filter(loc => !prev.includes(loc));
                return [...prev, ...newSelections];
            });
        }
    }

    const handleGenerate = async () => {
        if (!startDate || !endDate || selectedDays.length === 0 || locations.length === 0 || equipment.length === 0) {
            setMessage({ type: 'error', text: 'All spectral parameters must be defined before commit.' });
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
                locations: locations,
                equipment: equipment
            });

            if (result.success) {
                setMessage({ type: 'success', text: `Successfully manifested ${result.count} temporal slots.` });
                router.refresh();
            } else {
                setMessage({ type: 'error', text: result.error || 'Sequence generation failed.' });
            }
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'An anomaly occurred during generation.' });
        } finally {
            setIsSubmitting(false);
        }
    };

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
            <div className="glass-card p-12 relative overflow-hidden">
                {/* Decorative Bloom */}
                <div className="absolute top-0 right-0 w-80 h-80 bg-gold/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-[100px] pointer-events-none" />

                <div className="relative z-10">
                    <div className="flex items-center gap-6 mb-4">
                        <div className="p-4 bg-white/40 rounded-[20px] border border-white/60 shadow-sm">
                            <Repeat className="w-7 h-7 text-gold" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-serif text-charcoal tracking-tighter">Temporal Grid Generator</h2>
                            <p className="text-[10px] font-black text-charcoal/20 uppercase tracking-[0.4em] mt-1.5">Automated Recursive Availability Matrix</p>
                        </div>
                    </div>

                    <p className="text-sm text-charcoal/40 leading-relaxed mb-12 max-w-xl italic">
                        Define high-frequency availability sequences. The system will propagate these constraints across the specified temporal boundaries with ethereal precision.
                    </p>

                    {message && (
                        <div className={clsx(
                            "p-5 rounded-[2rem] mb-10 border flex items-center gap-4 animate-in slide-in-from-top-4 duration-500",
                            message.type === 'success' ? "bg-sage/5 border-sage/20 text-sage" : "bg-red-50/50 border-red-100 text-red-600"
                        )}>
                            {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                            <span className="text-[10px] font-black uppercase tracking-widest leading-normal">{message.text}</span>
                        </div>
                    )}

                    <div className="space-y-10">
                        {/* Temporal Boundaries */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="glass-card p-10 space-y-8">
                                <h3 className="text-[10px] font-black text-charcoal/20 uppercase tracking-[0.3em] mb-2 px-2">Temporal Window</h3>
                                <div className="grid grid-cols-1 gap-8">
                                    <div className="relative">
                                        <label className="block text-[10px] font-black text-charcoal/20 uppercase tracking-[0.2em] mb-3 ml-6">Sequence Start</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal/20" />
                                            <input
                                                type="date"
                                                value={startDate}
                                                onChange={(e) => setStartDate(e.target.value)}
                                                className="w-full pl-14 pr-8 py-5 border border-white/60 rounded-[20px] bg-white/40 text-charcoal font-black text-[10px] outline-none focus:ring-4 focus:ring-gold/10 focus:bg-white focus:border-gold/30 transition-all uppercase tracking-[0.2em] cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <label className="block text-[10px] font-black text-charcoal/20 uppercase tracking-[0.2em] mb-3 ml-6">Sequence Termination</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal/20" />
                                            <input
                                                type="date"
                                                value={endDate}
                                                onChange={(e) => setEndDate(e.target.value)}
                                                className="w-full pl-14 pr-8 py-5 border border-white/60 rounded-[20px] bg-white/40 text-charcoal font-black text-[10px] outline-none focus:ring-4 focus:ring-gold/10 focus:bg-white focus:border-gold/30 transition-all uppercase tracking-[0.2em] cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="glass-card p-10 space-y-8">
                                <h3 className="text-[10px] font-black text-charcoal/20 uppercase tracking-[0.3em] mb-2 px-2">Cyclical Recurrence</h3>
                                <div className="flex flex-wrap gap-4">
                                    {daysOfWeek.map(day => (
                                        <button
                                            key={day.id}
                                            onClick={() => toggleDay(day.id)}
                                            className={clsx(
                                                "w-14 h-14 rounded-[20px] text-[10px] font-black transition-all duration-700 border flex items-center justify-center tracking-[0.2em]",
                                                selectedDays.includes(day.id)
                                                    ? "bg-charcoal text-white border-charcoal shadow-cloud active:scale-95"
                                                    : "bg-white/40 text-charcoal/20 border-white/60 hover:border-gold/30 hover:text-charcoal"
                                            )}
                                        >
                                            {day.label}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[9px] text-charcoal/30 uppercase tracking-widest italic leading-relaxed px-2">
                                    Select days to manifest recurrence across windows.
                                </p>
                            </div>
                        </div>

                        {/* Operational Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="glass-card p-8 space-y-8">
                                <div>
                                    <h3 className="text-[10px] font-black text-charcoal/20 uppercase tracking-[0.3em] mb-8 px-2">Temporal Shift</h3>
                                    <div className="grid grid-cols-2 gap-8">
                                        <div>
                                            <label className="block text-[10px] font-black text-charcoal/20 uppercase tracking-[0.2em] mb-3 ml-6">Evolution Start</label>
                                            <select
                                                value={startTime}
                                                onChange={(e) => setStartTime(e.target.value)}
                                                className="w-full px-8 py-5 border border-white/60 rounded-[20px] bg-white/40 text-charcoal font-black text-[10px] outline-none focus:ring-4 focus:ring-gold/10 focus:bg-white focus:border-gold/30 transition-all uppercase tracking-[0.2em] cursor-pointer appearance-none shadow-sm"
                                            >
                                                {Array.from({ length: 24 }, (_, i) => i).map(hour => (
                                                    <option key={hour} value={`${hour.toString().padStart(2, '0')}:00`}>
                                                        {hour.toString().padStart(2, '0')}:00 {hour >= 12 ? 'PM' : 'AM'}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-charcoal/20 uppercase tracking-[0.2em] mb-3 ml-6">Evolution End</label>
                                            <select
                                                value={endTime}
                                                onChange={(e) => setEndTime(e.target.value)}
                                                className="w-full px-8 py-5 border border-white/60 rounded-[20px] bg-white/40 text-charcoal font-black text-[10px] outline-none focus:ring-4 focus:ring-gold/10 focus:bg-white focus:border-gold/30 transition-all uppercase tracking-[0.2em] cursor-pointer appearance-none shadow-sm"
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

                                <div>
                                    <h3 className="text-[10px] font-black text-charcoal/20 uppercase tracking-[0.3em] mb-8 px-2">Apparatus Matrix</h3>
                                    <div className="flex flex-wrap gap-3 p-6 bg-white/40 rounded-[2.5rem] border border-white/60 shadow-sm">
                                        {['Reformer', 'Tower', 'Cadillac', 'Chair', 'Mat', 'Barre'].map(eq => {
                                            const isSelected = equipment.includes(eq);
                                            return (
                                                <button
                                                    key={eq}
                                                    type="button"
                                                    onClick={() => toggleEquipment(eq)}
                                                    className={clsx(
                                                        "px-6 py-3 rounded-[20px] text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-700 border",
                                                        isSelected
                                                            ? "bg-sage text-charcoal border-sage shadow-cloud active:scale-95"
                                                            : "bg-white/40 text-charcoal/20 border-white/60 hover:border-sage/30 hover:text-charcoal"
                                                    )}
                                                >
                                                    {eq}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>

                            <div className="glass-card p-8 flex flex-col">
                                <h3 className="text-[10px] font-black text-charcoal/40 uppercase tracking-[0.2em] mb-6 px-2">Geographic Nodes</h3>
                                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-3 custom-scrollbar flex-1">
                                    {Object.entries(GROUPED_LOCATIONS).map(([city, cityLocations]) => {
                                        const allSelected = cityLocations.every(loc => locations.includes(loc));
                                        return (
                                            <div key={city} className="p-6 bg-white/40 rounded-[2rem] border border-white/60 shadow-sm space-y-6">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[11px] font-black text-charcoal uppercase tracking-[0.2em]">{city}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleCityGroup(cityLocations)}
                                                        className="text-[10px] font-black text-gold hover:text-charcoal transition-colors uppercase tracking-[0.22em] underline decoration-gold/20 underline-offset-8"
                                                    >
                                                        {allSelected ? 'DEACTIVATE' : 'MANIFEST ALL'}
                                                    </button>
                                                </div>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {cityLocations.map(l => {
                                                        const isSelected = locations.includes(l);
                                                        const displayName = l.split(' - ')[1] || l;
                                                        return (
                                                            <button
                                                                key={l}
                                                                type="button"
                                                                onClick={() => toggleLocation(l)}
                                                                className={clsx(
                                                                    "px-4 py-2 rounded-[20px] text-[9px] font-black uppercase tracking-[0.2em] transition-all duration-700 border",
                                                                    isSelected
                                                                        ? "bg-gold text-white border-gold shadow-cloud"
                                                                        : "bg-white/40 text-charcoal/20 border-white/60 hover:border-gold/30 hover:text-charcoal"
                                                                )}
                                                            >
                                                                {displayName}
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="pt-12 border-t border-white/60">
                            <button
                                onClick={handleGenerate}
                                disabled={isSubmitting}
                                className="w-full py-6 bg-charcoal text-white rounded-[2.5rem] text-[11px] font-black uppercase tracking-[0.4em] hover:brightness-[1.2] transition-all shadow-cloud active:scale-[0.98] flex items-center justify-center gap-6 disabled:opacity-50"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin text-gold" />
                                        SYNCHRONIZING SEQUENCE...
                                    </>
                                ) : (
                                    <>
                                        <Repeat className="w-5 h-5 text-gold" />
                                        COMMIT TEMPORAL MATRIX
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

