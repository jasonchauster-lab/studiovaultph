'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { format, addDays, startOfWeek, isSameDay, eachDayOfInterval, startOfDay } from 'date-fns';
import { MapPin, Clock, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Sparkles, Plus } from 'lucide-react';
import { clsx } from 'clsx';

interface Session {
    id: string;
    start_time: string;
    end_time: string;
    date: string;
    type: string;
    location: string;
    is_booked: boolean;
    displayRatio?: string;
    displayTitle?: string;
}

interface MobileScheduleCalendarProps {
    initialSessions: Session[];
    currentDate?: Date;
    onAddSlot?: (date: Date) => void;
    onRecurringSchedule?: () => void;
    onSlotClick?: (session: Session) => void;
}

export default function MobileScheduleCalendar({
    initialSessions = [],
    currentDate = new Date(),
    onAddSlot,
    onRecurringSchedule,
    onSlotClick
}: MobileScheduleCalendarProps) {
    const [selectedDate, setSelectedDate] = useState(startOfDay(currentDate));
    const scrollRef = useRef<HTMLDivElement>(null);
    const agendaRef = useRef<HTMLDivElement>(null);

    // Generate current week for horizontal scroll
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const weekDays = useMemo(() =>
        eachDayOfInterval({
            start: weekStart,
            end: addDays(weekStart, 13) // Show 2 weeks for better scrolling behavior
        }), [weekStart]
    );

    // Filter and consolidate sessions for selected date
    const agendaSessions = useMemo(() => {
        const filtered = initialSessions.filter(s => isSameDay(new Date(s.date), selectedDate));

        // Group availability-only slots by time
        const consolidated: any[] = [];
        const availabilityGroups: Record<string, any> = {};

        filtered.forEach(s => {
            if (s.is_booked) {
                consolidated.push(s);
            } else {
                const key = `${s.start_time}-${s.end_time}`;
                const mainLoc = s.location?.split(' - ')[0] || s.location || 'Studio';

                if (!availabilityGroups[key]) {
                    availabilityGroups[key] = {
                        ...s,
                        locations: [mainLoc]
                    };
                } else {
                    if (!availabilityGroups[key].locations.includes(mainLoc)) {
                        availabilityGroups[key].locations.push(mainLoc);
                    }
                }
            }
        });

        // Add grouped availability to the list
        Object.values(availabilityGroups).forEach(group => {
            consolidated.push(group);
        });

        return consolidated.sort((a, b) => a.start_time.localeCompare(b.start_time));
    }, [initialSessions, selectedDate]);

    // Helper to check for dots
    const getDateStatus = (date: Date) => {
        const dateSessions = initialSessions.filter(s => isSameDay(new Date(s.date), date));
        if (dateSessions.length === 0) return null;
        const hasBooked = dateSessions.some(s => s.is_booked);
        const hasAvailable = dateSessions.some(s => !s.is_booked);
        return { hasBooked, hasAvailable };
    };

    const formatTo12Hour = (time: string) => {
        const [hour, minute] = time.split(':');
        const h = parseInt(hour);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const displayH = h % 12 || 12;
        return `${displayH}:${minute} ${ampm}`;
    };

    const currentTimeIndex = useMemo(() => {
        if (!isSameDay(selectedDate, new Date())) return -1;
        const nowStr = format(new Date(), 'HH:mm');
        const index = agendaSessions.findIndex(s => s.start_time > nowStr);
        return index === -1 ? agendaSessions.length : index;
    }, [agendaSessions, selectedDate]);

    // Auto-scroll logic for selected date (Weekly Strip)
    useEffect(() => {
        if (scrollRef.current) {
            const selectedIdx = weekDays.findIndex(day => isSameDay(day, selectedDate));
            if (selectedIdx !== -1) {
                const element = scrollRef.current.children[selectedIdx] as HTMLElement;
                if (element) {
                    scrollRef.current.scrollTo({
                        left: element.offsetLeft - (scrollRef.current.offsetWidth / 2) + (element.offsetWidth / 2),
                        behavior: 'smooth'
                    });
                }
            }
        }
    }, [selectedDate, weekDays]);

    // Agenda Auto-scroll logic
    useEffect(() => {
        if (agendaRef.current && isSameDay(selectedDate, new Date())) {
            const nowTime = format(new Date(), 'HH:mm');
            const targetSession = agendaSessions.find(s => s.start_time >= nowTime) || agendaSessions[0];

            if (targetSession) {
                const sessionElement = document.getElementById(`session-${targetSession.id}`);
                if (sessionElement) {
                    sessionElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        }
    }, [selectedDate, agendaSessions]);

    return (
        <div className="flex flex-col h-full bg-[#FAFAFA] font-sans antialiased text-burgundy">
            {/* Sticky Top Section: Weekly Strip */}
            <div className="sticky top-0 z-50 bg-white border-b border-[#E5E7EB] px-6 pt-8 pb-4 shadow-tight">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex flex-col">
                        <h2 className="text-2xl font-serif font-black tracking-tighter text-burgundy">
                            {format(selectedDate, 'MMMM yyyy')}
                        </h2>
                        <p className="text-[9px] font-black tracking-[0.3em] text-burgundy uppercase mt-1">Schedule View</p>
                    </div>
                <div className="flex bg-[#FAFAFA] rounded-full p-1 border border-[#E5E7EB]">
                        <button
                            onClick={() => setSelectedDate(addDays(selectedDate, -7))}
                            className="p-2 hover:bg-white rounded-full transition-all text-muted-burgundy border border-transparent hover:border-[#E5E7EB] hover:shadow-tight"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setSelectedDate(startOfDay(new Date()))}
                            className="px-4 py-1.5 text-[9px] font-black text-burgundy uppercase tracking-widest"
                        >
                            Today
                        </button>
                        <button
                            onClick={() => setSelectedDate(addDays(selectedDate, 7))}
                            className="p-2 hover:bg-white rounded-full transition-all text-muted-burgundy border border-transparent hover:border-[#E5E7EB] hover:shadow-tight"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Mobile Action Buttons */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                    <button
                        onClick={() => onAddSlot?.(selectedDate)}
                        className="flex items-center justify-center gap-2 py-3 bg-burgundy text-buttermilk rounded-xl text-[10px] font-black uppercase tracking-widest shadow-tight active:scale-95 transition-all"
                    >
                        <Plus className="w-4 h-4" /> Add Slot
                    </button>
                    {onRecurringSchedule && (
                        <button
                            onClick={() => onRecurringSchedule()}
                            className="flex items-center justify-center gap-2 py-3 bg-white text-burgundy border border-burgundy/20 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-tight active:scale-95 transition-all"
                        >
                            <CalendarIcon className="w-4 h-4" /> Recurring
                        </button>
                    )}
                </div>

                <div
                    ref={scrollRef}
                    className="flex overflow-x-auto no-scrollbar gap-8 pb-4 snap-x"
                >
                    {weekDays.map((day) => {
                        const isSelected = isSameDay(day, selectedDate);
                        const isToday = isSameDay(day, new Date());
                        const status = getDateStatus(day);

                        return (
                            <button
                                key={day.toISOString()}
                                onClick={() => setSelectedDate(day)}
                                className="flex flex-col items-center min-w-[32px] snap-center group focus:outline-none"
                            >
                                <span className={clsx(
                                    "text-[9px] font-black uppercase tracking-[0.2em] mb-4 transition-colors",
                                    isSelected ? "text-burgundy" : "text-muted-burgundy"
                                )}>
                                    {format(day, 'EEE')}
                                </span>
                                <div className={clsx(
                                    "w-10 h-10 flex items-center justify-center rounded-full text-[13px] font-black transition-all duration-300",
                                    isToday
                                        ? "bg-buttermilk text-burgundy shadow-tight scale-110 border-2 border-burgundy/20"
                                        : isSelected
                                            ? "border-2 border-burgundy text-burgundy bg-buttermilk/10 scale-110"
                                            : "text-burgundy hover:bg-[#FAFAFA] border border-transparent hover:border-[#E5E7EB]"
                                )}>
                                    {format(day, 'd')}
                                </div>
                                {/* Indicator Dots */}
                                <div className="flex gap-1 mt-3 h-1">
                                    {status?.hasBooked && (
                                        <div className="w-1.5 h-1.5 rounded-full bg-burgundy shadow-[0_0_8px_rgba(67,48,46,0.3)]" />
                                    )}
                                    {status?.hasAvailable && (
                                        <div className="w-1.5 h-1.5 rounded-full bg-burgundy/10 border border-burgundy/20" />
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Bottom Section: Agenda List */}
            <div ref={agendaRef} className="flex-1 overflow-y-auto px-6 py-10 space-y-10 scroll-smooth">
                <div className="flex items-center gap-4 mb-4">
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-[#E5E7EB]" />
                    <span className="text-[10px] font-black text-burgundy uppercase tracking-[0.4em] px-4">
                        {format(selectedDate, 'EEEE, MMM d')}
                    </span>
                    <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-[#E5E7EB]" />
                </div>

                {agendaSessions.length > 0 ? (
                    <div className="space-y-6">
                        {agendaSessions.map((session, index) => (
                            <React.Fragment key={session.id}>
                                {currentTimeIndex === index && (
                                    <div className="flex items-center gap-4 py-2 animate-in fade-in slide-in-from-left duration-700">
                                        <div className="w-3 h-3 rounded-full bg-burgundy shadow-[0_0_12px_rgba(67,48,46,0.4)] flex-shrink-0" />
                                        <div className="h-[3px] flex-1 bg-burgundy opacity-30" />
                                        <span className="text-[9px] font-black text-burgundy uppercase tracking-widest whitespace-nowrap">Now</span>
                                    </div>
                                )}
                                <div
                                    id={`session-${session.id}`}
                                    onClick={() => onSlotClick?.(session)}
                                    className={clsx(
                                        "w-full rounded-2xl p-6 sm:p-8 shadow-tight active:scale-[0.99] transition-all duration-300 flex flex-col gap-6 sm:gap-8 relative overflow-hidden group cursor-pointer border-l-4",
                                        session.is_booked
                                            ? "bg-[#43302E] border-[#2C1F1D]"
                                            : "bg-[#FDFBF7] border border-[#EADED7]"
                                    )}
                                >
                                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                        <div className="space-y-4 w-full">
                                            <div className={clsx("flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] w-full", session.is_booked ? "text-white/80" : "text-burgundy")}>
                                                <div className={clsx("px-3 py-1.5 rounded-lg border flex items-center gap-3 w-full sm:w-auto", session.is_booked ? "bg-white/20 border-white/40" : "bg-buttermilk/10 border-buttermilk/40")}>
                                                    <Clock className="w-3.5 h-3.5 shrink-0" />
                                                    <span className="truncate">{formatTo12Hour(session.start_time)} — {formatTo12Hour(session.end_time)}</span>
                                                </div>
                                            </div>
                                            <h3 className={clsx("text-xl font-serif font-bold tracking-tight pt-1", session.is_booked ? "text-[#F5F2E9]" : "text-burgundy")}>
                                                {session.displayTitle || (session.is_booked ? session.type : 'Availability')}
                                            </h3>
                                        </div>
                                        {session.displayRatio ? (
                                            <div className="bg-[#FFF1B5] text-[#43302E] px-3 py-1 rounded-full text-[9px] font-black tracking-widest shadow-sm w-fit">
                                                {session.displayRatio}
                                            </div>
                                        ) : session.is_booked ? (
                                            <div className="bg-[#FFF1B5] text-[#43302E] px-3 py-1 rounded-full text-[9px] font-black tracking-widest shadow-sm w-fit">
                                                1/1
                                            </div>
                                        ) : (
                                            <div className="bg-white text-muted-burgundy border border-[#E5E7EB] px-3 py-1 rounded-full text-[9px] font-black tracking-[0.1em] w-fit shadow-sm">
                                                OPEN
                                            </div>
                                        )}
                                    </div>

                                    <div className={clsx("flex flex-wrap items-center gap-3 pt-2 border-t", session.is_booked ? "border-white/10" : "border-[#EADED7]")}>
                                        {session.locations ? (
                                            session.locations.map((loc: string, idx: number) => (
                                                <a 
                                                    key={idx} 
                                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc)}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={(e) => e.stopPropagation()}
                                                    className={clsx(
                                                        "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all",
                                                        session.is_booked 
                                                            ? "text-white/90 bg-white/20 border-white/40 hover:bg-white hover:text-[#43302E]"
                                                            : "text-muted-burgundy bg-white/50 border-border-grey hover:bg-forest hover:text-white hover:border-forest"
                                                    )}
                                                >
                                                    <MapPin className={clsx("w-3.5 h-3.5", session.is_booked ? "text-white/40" : "text-burgundy/40")} />
                                                    <span className="font-bold uppercase tracking-wider text-[9px]">{loc}</span>
                                                </a>
                                            ))
                                        ) : (
                                            <a 
                                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(session.location)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className={clsx(
                                                    "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all",
                                                    session.is_booked 
                                                        ? "text-white/90 bg-white/20 border-white/40 hover:bg-white hover:text-[#43302E]" 
                                                        : "text-muted-burgundy bg-white/50 border-border-grey hover:bg-forest hover:text-white hover:border-forest"
                                                )}
                                            >
                                                <MapPin className={clsx("w-3.5 h-3.5", session.is_booked ? "text-white/40" : "text-burgundy/40")} />
                                                <span className="font-bold uppercase tracking-wider text-[9px]">{session.location?.split(' - ')[0] || session.location || 'Studio'}</span>
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </React.Fragment>
                        ))}
                        {currentTimeIndex === agendaSessions.length && (
                            <div className="flex items-center gap-4 py-2 animate-in fade-in slide-in-from-left duration-700">
                                <div className="w-3 h-3 rounded-full bg-burgundy shadow-[0_0_12px_rgba(67,48,46,0.4)] flex-shrink-0" />
                                <div className="h-[3px] flex-1 bg-burgundy opacity-30" />
                                <span className="text-[9px] font-black text-burgundy uppercase tracking-widest whitespace-nowrap">Now</span>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-24 text-center opacity-40">
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center border border-[#E5E7EB] shadow-tight mb-8">
                            <CalendarIcon className="w-8 h-8 text-muted-burgundy" />
                        </div>
                        <h3 className="text-[10px] font-black text-muted-burgundy uppercase tracking-[0.4em] mb-2">Rest Day</h3>
                        <p className="text-[8px] font-black text-muted-burgundy/60 uppercase tracking-[0.2em]">No sessions scheduled for this epoch.</p>
                    </div>
                )}
            </div>

            <style jsx>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
}
