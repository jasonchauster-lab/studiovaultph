'use client'

import { useState, useMemo, memo } from 'react'
import { format, addDays, startOfDay, isSameDay, parseISO } from 'date-fns'
import { ChevronLeft, ChevronRight, Filter, Users, Star, Clock, MapPin, Calendar } from 'lucide-react'
import clsx from 'clsx'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import supabaseLoader from '@/lib/utils/image-loader'

interface Slot {
    id: string
    date: string
    start_time: string
    end_time: string
    instructor_id?: string
    pax_capacity: number
    waitlist_pax_capacity: number
    calendar_color?: string
    display_name?: string
    location_name?: string
    facility_name?: string
    service: {
        id: string
        name: string
        difficulty: string
    }
    instructor?: {
        full_name: string
        avatar_url: string
    }
    bookings_count: number
}

interface StorefrontTimetableProps {
    studioName: string
    initialSlots: Slot[]
    slug: string
    branchSlug: string
    theme?: any
    isMobile?: boolean
}

function StorefrontTimetable({ studioName, initialSlots, slug, branchSlug, theme, isMobile = false }: StorefrontTimetableProps) {
    const router = useRouter()
    const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()))
    const [serviceFilter, setServiceFilter] = useState('all')
    const [instructorFilter, setInstructorFilter] = useState('all')
    const [difficultyFilter, setDifficultyFilter] = useState('all')

    // Generate next 14 days for horizontal scroller
    const dateTabs = useMemo(() => {
        return Array.from({ length: 14 }).map((_, i) => addDays(startOfDay(new Date()), i))
    }, [])

    // Unique options for filters
    const services = useMemo(() => {
        const set = new Set(initialSlots.map(s => s.service?.name).filter(Boolean))
        return Array.from(set) as string[]
    }, [initialSlots])

    const instructors = useMemo(() => {
        const set = new Set(initialSlots.map(s => s.instructor?.full_name).filter(Boolean))
        return Array.from(set) as string[]
    }, [initialSlots])

    // Filtered slots
    const filteredSlots = useMemo(() => {
        return initialSlots.filter(s => {
            const dateMatch = isSameDay(parseISO(s.date), selectedDate)
            const serviceMatch = serviceFilter === 'all' || s.service.name === serviceFilter
            const instructorMatch = instructorFilter === 'all' || s.instructor?.full_name === instructorFilter
            const difficultyMatch = difficultyFilter === 'all' || s.service.difficulty === difficultyFilter
            return dateMatch && serviceMatch && instructorMatch && difficultyMatch
        }).sort((a, b) => a.start_time.localeCompare(b.start_time))
    }, [initialSlots, selectedDate, serviceFilter, instructorFilter, difficultyFilter])
    
    const handleBookNow = (slot: any) => {
        console.log('[Storefront] Booking clicked for slot:', slot.id, 'slug:', slug, 'branch:', branchSlug)
        // Redirect to the dedicated class page
        const url = `/s/${slug}/${branchSlug}/class/${slot.id}`
        console.log('[Storefront] Navigating to:', url)
        router.push(url)
    }

    return (
        <div className={clsx(
            "max-w-7xl mx-auto py-12 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700",
            isMobile ? "px-4" : "px-6"
        )}>
            {/* Horizontal Date Scroller */}
            <div className="flex items-center gap-4 overflow-x-auto pb-4 no-scrollbar -mx-6 px-6">
                {dateTabs.map(date => (
                    <button
                        key={date.toISOString()}
                        onClick={() => setSelectedDate(date)}
                        className={clsx(
                            "flex flex-col items-center p-3 md:p-4 rounded-2xl transition-all border",
                            isMobile ? "min-w-[64px]" : "min-w-[72px] md:min-w-[80px]",
                            isSameDay(date, selectedDate)
                                ? "text-white shadow-lg -translate-y-1"
                                : "bg-white border-border-grey text-charcoal/40 hover:border-charcoal/20"
                        )}
                        style={{
                            backgroundColor: isSameDay(date, selectedDate) ? (theme?.primaryColor || '#1a1a1a') : '#ffffff',
                            borderColor: isSameDay(date, selectedDate) ? (theme?.primaryColor || '#1a1a1a') : '#e5e7eb',
                            fontFamily: theme?.bodyFont || 'inherit'
                        }}
                    >
                        <span className="text-[10px] font-black uppercase tracking-widest mb-1">{format(date, 'EEE')}</span>
                        <span className="text-xl font-bold">{format(date, 'd')}</span>
                    </button>
                ))}
            </div>

            {/* Filter Bar */}
            <div className={clsx(
                "flex items-center gap-4 bg-white border border-border-grey shadow-tight transition-all duration-500",
                isMobile ? "flex-col p-4 rounded-2xl" : "flex-wrap p-6 rounded-[2rem]"
            )}>
                <div className="flex items-center gap-3 text-charcoal/30">
                    <Filter className="w-5 h-5" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Filters</span>
                </div>

                <div className={clsx(
                    "flex items-center gap-4",
                    isMobile ? "flex-col w-full" : "flex-row flex-wrap"
                )}>
                    {/* Class Filter */}
                    <select 
                        value={serviceFilter}
                        onChange={(e) => setServiceFilter(e.target.value)}
                        className={clsx(
                            "bg-off-white border-none rounded-xl px-4 py-2.5 text-xs font-bold text-charcoal outline-none focus:ring-2 focus:ring-forest/20",
                            isMobile && "w-full"
                        )}
                    >
                        <option value="all">All Classes</option>
                        {services.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>

                    {/* Instructor Filter */}
                    <select 
                        value={instructorFilter}
                        onChange={(e) => setInstructorFilter(e.target.value)}
                        className={clsx(
                            "bg-off-white border-none rounded-xl px-4 py-2.5 text-xs font-bold text-charcoal outline-none focus:ring-2 focus:ring-forest/20",
                            isMobile && "w-full"
                        )}
                    >
                        <option value="all">All Instructors</option>
                        {instructors.map(i => <option key={i} value={i!}>{i}</option>)}
                    </select>

                    {/* Difficulty Filter */}
                    <select 
                        value={difficultyFilter}
                        onChange={(e) => setDifficultyFilter(e.target.value)}
                        className={clsx(
                            "bg-off-white border-none rounded-xl px-4 py-2.5 text-xs font-bold text-charcoal outline-none focus:ring-2 focus:ring-forest/20",
                            isMobile && "w-full"
                        )}
                    >
                        <option value="all">All Levels</option>
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                    </select>
                </div>
            </div>

            {/* Timetable List */}
            <div className="space-y-4">
                {filteredSlots.length > 0 ? (
                    filteredSlots.map(slot => {
                        const spotsLeft = slot.pax_capacity - slot.bookings_count
                        const isFull = spotsLeft <= 0

                        return (
                            <div 
                                key={slot.id}
                                className={clsx(
                                    "group bg-white border border-border-grey shadow-tight hover:shadow-ambient hover:border-forest/20 transition-all duration-500 flex flex-col relative overflow-hidden",
                                    isMobile ? "p-5 rounded-2xl gap-4" : "p-6 md:p-8 rounded-[2rem] gap-8",
                                    !isMobile && "md:flex-row md:items-center"
                                )}
                            >
                                {/* Left: Time */}
                                <div className={clsx(
                                    "flex items-center gap-6 shrink-0",
                                    !isMobile && "md:w-48"
                                )}>
                                    <div className="w-12 h-12 bg-off-white rounded-2xl flex items-center justify-center text-forest shadow-inner">
                                        <Clock className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-xl font-bold text-charcoal tracking-tight">{slot.start_time.slice(0, 5)}</p>
                                        <p className="text-[10px] font-black text-charcoal/30 uppercase tracking-[0.2em] mt-1">60 mins</p>
                                    </div>
                                </div>

                                {/* Center: Class Info */}
                                <div className="flex-1 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <h3 
                                            className={clsx(
                                                "font-serif tracking-tight",
                                                isMobile ? "text-xl" : "text-2xl"
                                            )}
                                            style={{ color: theme?.textColor || '#000000', fontFamily: theme?.headingFont || 'serif' }}
                                        >
                                            {slot.display_name || slot.service?.name || 'Class'}
                                        </h3>
                                        {slot.service?.difficulty && (
                                            <span className={clsx(
                                                "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest",
                                                slot.service.difficulty === 'Beginner' ? "bg-green-50 text-green-700" :
                                                slot.service.difficulty === 'Advanced' ? "bg-red-50 text-red-700" :
                                                "bg-blue-50 text-blue-700"
                                            )}>
                                                {slot.service.difficulty}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-6">
                                        {slot.instructor && (
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg overflow-hidden border border-border-grey shadow-tight bg-off-white relative">
                                                    {slot.instructor.avatar_url ? (
                                                        <Image 
                                                            loader={supabaseLoader}
                                                            src={slot.instructor.avatar_url} 
                                                            alt={slot.instructor.full_name} 
                                                            fill 
                                                            className="object-cover" 
                                                            sizes="32px"
                                                        />
                                                    ) : (
                                                        <Users className="w-4 h-4 m-2 text-charcoal/30" />
                                                    )}
                                                </div>
                                                <span className="text-sm font-bold text-charcoal/60 underline decoration-charcoal/10 underline-offset-4">{slot.instructor.full_name}</span>
                                            </div>
                                        )}
                                        {slot.location_name && (
                                            <div className="flex items-center gap-2 text-charcoal/40">
                                                <MapPin className="w-4 h-4" />
                                                <span className="text-xs font-bold">{slot.location_name}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Right: Booking Action */}
                                <div className={clsx(
                                    "flex items-center justify-between gap-8 pt-6 border-t border-border-grey/50",
                                    !isMobile && "md:justify-end md:pt-0 md:border-t-0"
                                )}>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-charcoal tracking-tight">
                                            {isFull ? (
                                                <span className="text-red-500 uppercase tracking-widest text-[10px]">Fully Booked</span>
                                            ) : (
                                                <span className="text-forest uppercase tracking-widest text-[10px]">{spotsLeft} slots left</span>
                                            )}
                                        </p>
                                        <div className="w-32 h-1.5 bg-off-white rounded-full mt-2 overflow-hidden">
                                            <div 
                                                className={clsx(
                                                    "h-full transition-all duration-1000",
                                                    isFull ? "bg-red-500" : "bg-forest"
                                                )}
                                                style={{ width: `${(slot.bookings_count / slot.pax_capacity) * 100}%` }}
                                            />
                                        </div>
                                    </div>

                                    <Link 
                                        href={`/s/${slug}/${branchSlug}/class/${slot.id}`}
                                        className={clsx(
                                            "px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-card active:scale-95 flex items-center justify-center",
                                            isFull 
                                                ? (slot.waitlist_pax_capacity > 0 ? "bg-charcoal text-white hover:brightness-110" : "bg-off-white text-charcoal/30 cursor-not-allowed pointer-events-none")
                                                : "text-white hover:brightness-110"
                                        )}
                                        style={{
                                            backgroundColor: isFull ? (slot.waitlist_pax_capacity > 0 ? (theme?.primaryColor || '#1a1a1a') : '#f5f5f5') : (theme?.primaryColor || '#1a1a1a'),
                                            borderRadius: theme?.buttonRadius || '12px',
                                            fontFamily: theme?.bodyFont || 'inherit'
                                        }}
                                    >
                                        {isFull ? (slot.waitlist_pax_capacity > 0 ? 'Join Waitlist' : 'Full') : 'Book Now'}
                                    </Link>
                                </div>
                            </div>
                        )
                    })
                ) : (
                    <div className={clsx(
                        "p-20 text-center bg-off-white/50 border-2 border-dashed border-border-grey space-y-4",
                        isMobile ? "rounded-3xl" : "rounded-[3rem]"
                    )}>
                        <Calendar className="w-12 h-12 text-charcoal/10 mx-auto" />
                        <h4 className="text-2xl font-serif text-charcoal/40 italic">No classes found for this date.</h4>
                        <button 
                            onClick={() => setSelectedDate(startOfDay(new Date()))}
                            className="text-[10px] font-black text-forest uppercase tracking-widest hover:underline underline-offset-4"
                        >
                            Reset to Today
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

export default memo(StorefrontTimetable)
