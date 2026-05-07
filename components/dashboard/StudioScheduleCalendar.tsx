'use client'

import React from 'react'
import { ScheduleViewManager } from './schedule/ScheduleViewManager'

interface StudioScheduleCalendarProps {
    studioId: string
    slots: any[]
    currentDate: Date
    dayStrings?: string[]
    availableEquipment: string[]
    inventory?: Record<string, any>
    services: any[]
    instructors: any[]
    outletId?: string
    outlets?: any[]
    openingTime?: string
    closingTime?: string
    packagesCount?: number
    membershipsCount?: number
    marketplaceStatus?: string
}

export default function StudioScheduleCalendar(props: StudioScheduleCalendarProps) {
    return (
        <ScheduleViewManager 
            studioId={props.studioId}
            slots={props.slots}
            currentDate={props.currentDate}
            availableEquipment={props.availableEquipment}
            inventory={props.inventory}
            services={props.services}
            instructors={props.instructors}
            outletId={props.outletId}
            outlets={props.outlets || []}
            openingTime={props.openingTime || '06:00:00'}
            closingTime={props.closingTime || '22:00:00'}
            packagesCount={props.packagesCount}
            membershipsCount={props.membershipsCount}
            marketplaceStatus={props.marketplaceStatus}
        />
    )
}
