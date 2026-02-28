'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addAvailability(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Unauthorized' }

    const day = parseInt(formData.get('day') as string)
    const startTime = formData.get('startTime') as string
    const endTime = formData.get('endTime') as string
    const location = formData.get('location') as string

    // Validate
    if (startTime >= endTime) {
        return { error: 'End time must be after start time' }
    }

    const { error } = await supabase
        .from('instructor_availability')
        .insert({
            instructor_id: user.id,
            day_of_week: day,
            start_time: startTime,
            end_time: endTime,
            location_area: location
        })

    if (error) {
        console.error('Add Availability Error:', JSON.stringify(error, null, 2))
        return { error: 'Failed to add availability. ' + error.message }
    }

    revalidatePath('/instructor/schedule')
    return { success: true }
}

export async function deleteAvailability(id: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // RLS handles auth check but explicit check is good
    if (!user) return { error: 'Unauthorized' }

    const { error } = await supabase
        .from('instructor_availability')
        .delete()
        .eq('id', id)
        .eq('instructor_id', user.id) // Double check ownership

    if (error) {
        return { error: 'Failed' }
    }

    revalidatePath('/instructor/schedule')
    return { success: true }
}

export async function updateAvailability(id: string, formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Unauthorized' }

    const startTime = formData.get('startTime') as string
    const endTime = formData.get('endTime') as string
    const location = formData.get('location') as string
    const date = formData.get('date') as string

    // Validate
    if (startTime >= endTime) {
        return { error: 'End time must be after start time' }
    }

    const updateData: any = {
        start_time: startTime,
        end_time: endTime,
        location_area: location
    }

    // Only update date if it's provided (for specific date slots)
    // If it was a weekly slot, we might want to keep it weekly OR convert to date specific?
    // For now let's assume if the form sends a date, we update it.
    if (date) {
        updateData.date = date
        // Update day_of_week to match the new date
        updateData.day_of_week = new Date(date + "T00:00:00+08:00").getDay()
    }

    const { error } = await supabase
        .from('instructor_availability')
        .update(updateData)
        .eq('id', id)
        .eq('instructor_id', user.id)

    if (error) {
        console.error('Update Availability Error:', error)
        return { error: 'Failed to update availability' }
    }

    revalidatePath('/instructor/schedule')
    return { success: true }
}
interface GenerateAvailabilityParams {
    startDate: string;
    endDate: string;
    days: number[];
    startTime: string;
    endTime: string;
    locations: string[];
}

export async function generateRecurringAvailability(params: GenerateAvailabilityParams) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: 'Unauthorized' };

    // Parse dates purely as date strings (no timezone shift) by using noon UTC
    // to avoid any day boundary issues when calling .getDay()
    const parseDateStr = (str: string) => new Date(str + 'T12:00:00Z');

    const start = parseDateStr(params.startDate);
    const end = parseDateStr(params.endDate);

    if (start > end) {
        return { error: 'Start date must be before end date' };
    }

    const availabilitiesToInsert = [];

    // Crypto for group_id
    const { randomUUID } = await import('crypto');

    // Iterate day-by-day using date strings to avoid timezone drift
    let currentDateStr = params.startDate;
    while (currentDateStr <= params.endDate) {
        // Use noon UTC to get a stable .getDay() that matches the calendar date
        const dayOfWeek = parseDateStr(currentDateStr).getDay();

        if (params.days.includes(dayOfWeek)) {
            const groupId = randomUUID(); // Shared ID for this time slot across locations

            for (const loc of params.locations) {
                availabilitiesToInsert.push({
                    instructor_id: user.id,
                    day_of_week: dayOfWeek,
                    date: currentDateStr, // Specific date
                    start_time: params.startTime,
                    end_time: params.endTime,
                    location_area: loc,
                    group_id: groupId
                });
            }
        }

        // Advance to next day by incrementing the date string
        const nextDay = parseDateStr(currentDateStr);
        nextDay.setUTCDate(nextDay.getUTCDate() + 1);
        currentDateStr = nextDay.toISOString().split('T')[0];
    }

    if (availabilitiesToInsert.length === 0) {
        return { error: 'No dates matched your criteria.' };
    }

    const { data, error } = await supabase
        .from('instructor_availability')
        .insert(availabilitiesToInsert)
        .select();

    if (error) {
        console.error('Bulk generate error:', error);
        return { error: 'Failed to generate availability. ' + (error.message || JSON.stringify(error)) };
    }

    revalidatePath('/instructor/schedule');
    return { success: true, count: data.length };
}
