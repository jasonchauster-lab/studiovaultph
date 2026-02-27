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

    const start = new Date(params.startDate);
    const end = new Date(params.endDate);
    const endOfDayEnd = new Date(end);
    endOfDayEnd.setHours(23, 59, 59, 999);

    if (start > end) {
        return { error: 'Start date must be before end date' };
    }

    const availabilitiesToInsert = [];
    let currentDay = new Date(start);

    // Crypto for group_id
    const { randomUUID } = await import('crypto');

    while (currentDay <= endOfDayEnd) {
        // Use local PHT day of week
        const dayOfWeek = new Date(currentDay.toISOString().split('T')[0] + "T00:00:00+08:00").getDay();
        if (params.days.includes(dayOfWeek)) {
            const groupId = randomUUID(); // Shared ID for this specific time slot across different locations

            for (const loc of params.locations) {
                availabilitiesToInsert.push({
                    instructor_id: user.id,
                    day_of_week: dayOfWeek,
                    date: currentDay.toISOString().split('T')[0], // Specific date
                    start_time: params.startTime,
                    end_time: params.endTime,
                    location_area: loc,
                    group_id: groupId
                });
            }
        }
        currentDay.setDate(currentDay.getDate() + 1);
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
