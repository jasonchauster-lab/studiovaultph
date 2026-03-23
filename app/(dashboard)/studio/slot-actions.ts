'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { toManilaTimeString, toManilaDateStr } from '@/lib/timezone'

export async function createSlot(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    // Check Studio Owner's balance and suspension
    const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('available_balance, is_suspended')
        .eq('id', user.id)
        .single()

    if (ownerProfile?.is_suspended) {
        return { error: 'Your account is currently suspended. You cannot create new slots.' }
    }

    if (ownerProfile && (ownerProfile.available_balance || 0) < 0) {
        return { error: 'You have a negative balance. Please settle your outstanding balance before creating new slots.' }
    }

    const studioId = formData.get('studioId') as string
    const date = formData.get('date') as string
    const startTimeStr = formData.get('startTime') as string
    const endTimeStr = formData.get('endTime') as string
    const quantity = parseInt(formData.get('quantity') as string) || 1

    const equipment: Record<string, number> = {}
    let totalQuantity = 0
    const allKeys = Array.from(formData.keys())

    allKeys.forEach(key => {
        if (key.startsWith('eq_') && formData.get(key) === 'on') {
            const eqName = key.replace('eq_', '')
            const qty = parseInt(formData.get(`qty_${eqName}`) as string) || 0
            if (qty > 0) {
                equipment[eqName] = qty
                totalQuantity += qty
            }
        }
    })

    if (Object.keys(equipment).length === 0) {
        const { data: studio } = await supabase
            .from('studios')
            .select('equipment')
            .eq('id', studioId)
            .single()

        if (studio?.equipment && studio.equipment.length > 0) {
            const primaryEq = studio.equipment[0]
            equipment[primaryEq.toUpperCase()] = 1
            totalQuantity = 1
        } else {
            return { error: 'Please select at least one piece of equipment with a quantity greater than 0.' }
        }
    }

    if (!studioId || !date || !startTimeStr || !endTimeStr) {
        return { error: 'All fields are required' }
    }

    if (!startTimeStr.endsWith(':00') || !endTimeStr.endsWith(':00')) {
        return { error: 'Time must be on the hour (e.g. 8:00, 9:00)' }
    }

    const startDateTime = new Date(`${date}T${startTimeStr}:00+08:00`)
    const endDateTime = new Date(`${date}T${endTimeStr}:00+08:00`)

    const slotsToInsert = []
    let current = new Date(startDateTime)

    while (current < endDateTime) {
        const nextHour = new Date(current)
        nextHour.setHours(current.getHours() + 1)

        if (nextHour > endDateTime) break;

        const standardizedEquipment: Record<string, number> = {}
        Object.entries(equipment).forEach(([k, v]) => {
            standardizedEquipment[k.toUpperCase()] = v
        })

        slotsToInsert.push({
            studio_id: studioId,
            date: date,
            start_time: toManilaTimeString(current),
            end_time: toManilaTimeString(nextHour),
            is_available: true,
            equipment: standardizedEquipment,
            equipment_inventory: standardizedEquipment,
            quantity: totalQuantity
        })

        current = nextHour
    }

    if (slotsToInsert.length === 0) {
        return { error: 'Invalid time range. Minimum 1 hour required.' }
    }

    const { error } = await supabase
        .from('slots')
        .insert(slotsToInsert)

    if (error) {
        return { error: 'Failed to create slots' }
    }

    revalidatePath('/studio')
    return { success: true }
}

export async function deleteSlot(slotId: string) {
    const supabase = await createClient()

    const { count } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('slot_id', slotId)

    if (count && count > 0) {
        return { error: 'Cannot delete this slot because it has existing bookings.' }
    }

    const { error } = await supabase
        .from('slots')
        .delete()
        .eq('id', slotId)

    if (error) {
        return { error: 'Failed to delete slot.' }
    }

    revalidatePath('/studio')
    return { success: true }
}

export async function updateSlot(slotId: string, formData: FormData) {
    const supabase = await createClient()

    const startTimeStr = formData.get('startTime') as string
    const endTimeStr = formData.get('endTime') as string
    const date = formData.get('date') as string

    const equipment: Record<string, number> = {}
    let totalQuantity = 0
    const allKeys = Array.from(formData.keys())

    allKeys.forEach(key => {
        if (key.startsWith('eq_') && formData.get(key) === 'on') {
            const eqName = key.replace('eq_', '')
            const qty = parseInt(formData.get(`qty_${eqName}`) as string) || 0
            if (qty > 0) {
                equipment[eqName] = qty
                totalQuantity += qty
            }
        }
    })

    if (!startTimeStr || !endTimeStr || !date) {
        return { error: 'Time fields are required' }
    }

    const startDateTime = new Date(`${date}T${startTimeStr}:00+08:00`)
    const endDateTime = new Date(`${date}T${endTimeStr}:00+08:00`)

    const standardizedEquipment: Record<string, number> = {}
    Object.entries(equipment).forEach(([k, v]) => {
        standardizedEquipment[k.toUpperCase()] = v
    })

    const { error } = await supabase
        .from('slots')
        .update({
            date: date,
            start_time: toManilaTimeString(startDateTime),
            end_time: toManilaTimeString(endDateTime),
            equipment: standardizedEquipment,
            equipment_inventory: standardizedEquipment,
            quantity: totalQuantity
        })
        .eq('id', slotId)

    if (error) {
        return { error: `Failed to update slot: ${error.message} (Code: ${error.code})` }
    }

    revalidatePath('/studio')
    return { success: true }
}

interface GenerateSlotsParams {
    studioId: string;
    startDate: string;
    endDate: string;
    days: number[];
    startTime: string;
    endTime: string;
    equipment?: string[];
    quantity?: number;
}

export async function generateRecurringSlots(params: GenerateSlotsParams) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    // Check Studio Owner's balance and suspension
    const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('available_balance, is_suspended')
        .eq('id', user.id)
        .single()

    if (ownerProfile?.is_suspended) {
        return { error: 'Your account is currently suspended. You cannot generate recurring slots.' }
    }

    if (ownerProfile && (ownerProfile.available_balance || 0) < 0) {
        return { error: 'You have a negative balance. Please settle your outstanding balance before generating recurring slots.' }
    }

    if (!params.studioId || !params.startDate || !params.endDate || !params.startTime || !params.endTime) {
        return { error: 'Missing required parameters' };
    }

    if (!params.equipment || params.equipment.length === 0) {
        return { error: 'Please select at least one piece of equipment.' };
    }

    const start = new Date(params.startDate + "T00:00:00+08:00");
    const end = new Date(params.endDate + "T23:59:59+08:00");
    const endOfDayEnd = new Date(end);
    const quantity = params.quantity || 1;

    if (start > end) {
        return { error: 'Start date must be before end date' };
    }

    const slotsToInsert = [];
    let currentDay = new Date(start);

    while (currentDay <= endOfDayEnd) {
        if (params.days.includes(currentDay.getDay())) {
            const dayStr = toManilaDateStr(currentDay);
            let slotStart = new Date(`${dayStr}T${params.startTime}:00+08:00`);
            const slotEnd = new Date(`${dayStr}T${params.endTime}:00+08:00`);

            while (slotStart < slotEnd) {
                const nextHour = new Date(slotStart);
                nextHour.setHours(slotStart.getHours() + 1);

                if (nextHour > slotEnd) break;

                const standardizedEquipment: Record<string, number> = {}
                params.equipment?.forEach(eq => {
                    standardizedEquipment[eq.toUpperCase()] = quantity
                })

                slotsToInsert.push({
                    studio_id: params.studioId,
                    date: dayStr,
                    start_time: toManilaTimeString(slotStart),
                    end_time: toManilaTimeString(nextHour),
                    is_available: true,
                    equipment: standardizedEquipment,
                    equipment_inventory: standardizedEquipment,
                    quantity: quantity * (params.equipment?.length || 1)
                });

                slotStart = nextHour;
            }
        }
        currentDay.setDate(currentDay.getDate() + 1);
    }

    if (slotsToInsert.length === 0) {
        return { error: 'No slots matched your criteria.' };
    }

    const { data, error } = await supabase
        .from('slots')
        .insert(slotsToInsert)
        .select();

    if (error) {
        console.error('Bulk generate error:', error);
        return { error: 'Failed to generate slots (some might overlap).' };
    }

    revalidatePath('/studio')
    return { success: true, count: data.length };
}
