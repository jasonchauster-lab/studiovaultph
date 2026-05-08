import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useScheduleState } from './useScheduleState'
import { WeekView } from './views/WeekView'
import { MonthView } from './views/MonthView'
import { ScheduleHeader } from './ScheduleHeader'
import { SlotEditModal } from './modals/SlotEditModal'
import { BookingDetailModal } from './modals/BookingDetailModal'
import AddScheduleModal from '@/components/studio/modals/AddScheduleModal'
import ScheduleManager from '../ScheduleManager'
import MobileScheduleCalendar from '../MobileScheduleCalendar'
import { createSlot, deleteSlot, updateSlot } from '@/app/(dashboard)/studio/slot-actions'
import { cancelBookingByStudio, approveManualBooking } from '@/app/(dashboard)/studio/booking-actions'
import { format, parseISO } from 'date-fns'
import { Plus } from 'lucide-react'

interface ScheduleViewManagerProps {
    studioId: string
    slots: any[]
    currentDate: Date
    availableEquipment: string[]
    services: any[]
    instructors: any[]
    outletId?: string
    outlets: any[]
    openingTime: string
    closingTime: string
    inventory?: Record<string, any>
    packagesCount?: number
    membershipsCount?: number
    marketplaceStatus?: string
}

export const ScheduleViewManager = (props: ScheduleViewManagerProps) => {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Filter slots based on active branch filter
    const filteredSlots = React.useMemo(() => {
        // We'll get activeBranchFilter from the hook below, but for memoization we need it.
        // Actually, let's put the filtering INSIDE the hook or just pass it back.
        return props.slots
    }, [props.slots])

    const state = useScheduleState(
        props.currentDate, 
        props.slots, 
        props.slots, 
        props.openingTime, 
        props.closingTime,
        props.studioId
    )

    // Overwrite filteredSlots with branch filter
    const actualFilteredSlots = React.useMemo(() => {
        if (!state.activeBranchFilter) return props.slots
        return props.slots.filter(s => s.outlet_id === state.activeBranchFilter)
    }, [props.slots, state.activeBranchFilter])

    // State for creating single slot
    const [singleDate, setSingleDate] = useState(format(props.currentDate, 'yyyy-MM-dd'))
    const [singleTime, setSingleTime] = useState('09:00')
    const [singleEndTime, setSingleEndTime] = useState('10:00')

    const handleCreateSingle = async (formData: FormData) => {
        setIsSubmitting(true)
        formData.append('studioId', props.studioId)
        if (props.outletId) formData.append('outletId', props.outletId)
        const result = await createSlot(formData)
        setIsSubmitting(false)
        if (result.success) {
            state.setIsAddModalOpen(false)
            router.refresh()
        }
        else alert(result.error)
    }

    const handleUpdate = async (formData: FormData) => {
        if (!state.editingSlot) return
        setIsSubmitting(true)
        if (props.outletId) formData.append('outletId', props.outletId)
        const result = await updateSlot(state.editingSlot.id, formData)
        setIsSubmitting(false)
        if (result.success) {
            state.setIsEditModalOpen(false)
            state.setEditingSlot(null)
            router.refresh()
        } else alert(result.error)
    }

    const handleDelete = async () => {
        if (!state.editingSlot) return
        if (!confirm('Are you sure you want to delete this slot?')) return
        setIsSubmitting(true)
        const result = await deleteSlot(state.editingSlot.id)
        setIsSubmitting(false)
        if (result.success) {
            state.setIsEditModalOpen(false)
            state.setEditingSlot(null)
            router.refresh()
        } else alert(result.error)
    }

    const handleCancelBooking = async (bookingId: string) => {
        const reason = prompt('Please enter a reason for cancellation:')
        if (!reason) return
        setIsSubmitting(true)
        const res = await cancelBookingByStudio(bookingId, reason)
        setIsSubmitting(false)
        if (res.success) router.refresh()
        else alert(res.error)
    }

    const handleApproveBooking = async (bookingId: string) => {
        if (!confirm('Approve this manual booking?')) return
        setIsSubmitting(true)
        const res = await approveManualBooking(bookingId)
        setIsSubmitting(false)
        if (res.success) router.refresh()
        else alert(res.error)
    }

    return (
        <div className="space-y-6">
            {/* Mobile View */}
            <div className="lg:hidden">
                <MobileScheduleCalendar 
                    currentDate={props.currentDate}
                    onAddSlot={(date) => {
                        setSingleDate(format(date, 'yyyy-MM-dd'))
                        state.setAddMode('single')
                        state.setIsAddModalOpen(true)
                    }}
                    onRecurringSchedule={() => { state.setAddMode('bulk'); state.setIsAddModalOpen(true); }}
                    onSlotClick={(session) => {
                        const key = session.id
                        const groupSlots = props.slots.filter(s => `${s.date}-${s.start_time}` === key)
                        if (groupSlots.length > 0) {
                            state.setBucketSlots(groupSlots)
                            const first = groupSlots[0]
                            const hour = parseInt(first.start_time.split(':')[0], 10)
                            state.setBucketTime({ date: parseISO(first.date), hour })
                            state.setIsBucketModalOpen(true)
                        }
                    }}
                    initialSessions={state.mobileSessions}
                />
            </div>

            {/* Desktop View */}
            <div className="hidden lg:block space-y-8">
                <ScheduleHeader 
                    currentDate={props.currentDate}
                    view={state.view}
                    outletId={props.outletId}
                    outlets={props.outlets}
                    activeBranchFilter={state.activeBranchFilter}
                    onPrev={state.handlePrev}
                    onNext={state.handleNext}
                    onToday={state.handleToday}
                    onDateChange={(d) => router.push(`?date=${d}`)}
                    onViewChange={state.setView}
                    onBranchFilterChange={state.setActiveBranchFilter}
                    onAddSlot={() => { state.setAddMode('single'); state.setIsAddModalOpen(true); }}
                    onBulkGenerate={() => { state.setAddMode('bulk'); state.setIsAddModalOpen(true); }}
                />

                <div className="bg-white border border-border-grey shadow-cloud overflow-hidden rounded-2xl">
                    <div className="overflow-x-auto">
                        {state.view !== 'month' ? (
                            <WeekView 
                                days={state.days}
                                hours={state.hours}
                                slotMap={state.slotMap}
                                view={state.view}
                                currentTimePosition={state.currentTimePosition}
                                outlets={props.outlets}
                                outletId={props.outletId}
                                cellMetadata={state.cellMetadata}
                                onAddClick={(d, h) => {
                                    setSingleDate(d)
                                    setSingleTime(`${h.toString().padStart(2, '0')}:00`)
                                    setSingleEndTime(`${(h + 1).toString().padStart(2, '0')}:00`)
                                    state.setAddMode('single')
                                    state.setIsAddModalOpen(true)
                                }}
                                onSlotClick={(s) => {
                                    state.setBucketSlots(s)
                                    const first = s[0]
                                    const h = parseInt(first.start_time.split(':')[0], 10)
                                    state.setBucketTime({ date: parseISO(first.date), hour: h })
                                    state.setIsBucketModalOpen(true)
                                }}
                            />
                        ) : (
                            <MonthView 
                                days={state.days}
                                slots={props.slots}
                                dateMap={state.dateMap}
                                currentDate={props.currentDate}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Modals */}
            <SlotEditModal 
                isOpen={state.isEditModalOpen}
                onClose={() => state.setIsEditModalOpen(false)}
                slot={state.editingSlot}
                instructors={props.instructors}
                services={props.services}
                availableEquipment={props.availableEquipment}
                marketplaceStatus={props.marketplaceStatus || ''}
                isSubmitting={isSubmitting}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                onCancelBooking={handleCancelBooking}
                onApproveBooking={handleApproveBooking}
            />

            <BookingDetailModal 
                isOpen={state.isBucketModalOpen}
                onClose={() => state.setIsBucketModalOpen(false)}
                slots={state.bucketSlots}
                time={state.bucketTime}
                outlets={props.outlets}
                onEditSlot={(s) => {
                    state.setEditingSlot(s)
                    state.setIsEditModalOpen(true)
                    state.setIsBucketModalOpen(false)
                }}
            />

            <AddScheduleModal 
                isOpen={state.isAddModalOpen && state.addMode === 'single'}
                onClose={() => state.setIsAddModalOpen(false)}
                onSubmit={handleCreateSingle}
                initialDate={singleDate}
                initialTime={singleTime}
                instructors={props.instructors}
                services={props.services}
                inventory={props.inventory}
                packagesCount={props.packagesCount}
                membershipsCount={props.membershipsCount}
                marketplaceStatus={props.marketplaceStatus}
                outletId={props.outletId}
                outlets={props.outlets}
            />

            {state.isAddModalOpen && state.addMode === 'bulk' && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-12">
                    <div className="absolute inset-0 bg-charcoal/60 backdrop-blur-md" onClick={() => state.setIsAddModalOpen(false)} />
                    <div className="relative bg-white w-full max-w-5xl max-h-[90vh] rounded-[4rem] shadow-2xl overflow-hidden flex flex-col">
                         <div className="p-10 border-b border-border-grey flex items-center justify-between bg-off-white/30">
                            <div className="space-y-1">
                                <h3 className="text-3xl font-serif font-black text-charcoal tracking-tighter">Bulk Schedule Manager</h3>
                            </div>
                            <button onClick={() => state.setIsAddModalOpen(false)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white hover:bg-charcoal hover:text-white text-slate border border-border-grey rotate-45">
                                <Plus className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                            <ScheduleManager 
                                studioId={props.studioId} 
                                availableEquipment={props.availableEquipment}
                                services={props.services}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
