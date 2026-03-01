'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendEmail } from '@/lib/email'
import BookingNotificationEmail from '@/components/emails/BookingNotificationEmail'
import AccountFrozenEmail from '@/components/emails/AccountFrozenEmail'
import { formatManilaDate, formatManilaTime } from '@/lib/timezone'

export async function createSlot(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    // 0. Check Studio Owner's balance and suspension
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

    // Parse equipment JSON object and total quantity
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
        return { error: 'Please select at least one piece of equipment with a quantity greater than 0.' }
    }

    if (!studioId || !date || !startTimeStr || !endTimeStr) {
        return { error: 'All fields are required' }
    }

    // Force minutes to 00 just in case
    if (!startTimeStr.endsWith(':00') || !endTimeStr.endsWith(':00')) {
        return { error: 'Time must be on the hour (e.g. 8:00, 9:00)' }
    }

    const startDateTime = new Date(`${date}T${startTimeStr}:00+08:00`)
    const endDateTime = new Date(`${date}T${endTimeStr}:00+08:00`)

    // Loop through hours
    const slotsToInsert = []
    let current = new Date(startDateTime)

    while (current < endDateTime) {
        const nextHour = new Date(current)
        nextHour.setHours(current.getHours() + 1)

        // Stop if next hour exceeds end time
        if (nextHour > endDateTime) break;

        // Insert as ONE BUCKET record per hour
        slotsToInsert.push({
            studio_id: studioId,
            start_time: current.toISOString(),
            end_time: nextHour.toISOString(),
            is_available: true,
            equipment: Object.keys(equipment),
            equipment_inventory: equipment
        })

        // Move to next hour
        current = nextHour
    }

    if (slotsToInsert.length === 0) {
        return { error: 'Invalid time range. Minimum 1 hour required.' }
    }

    const { error } = await supabase
        .from('slots')
        .insert(slotsToInsert)

    if (error) {
        console.error('Error creating slots:', error)
        return { error: 'Failed to create slots' }
    }

    revalidatePath('/studio')
    return { success: true }
}

export async function deleteSlot(slotId: string) {
    const supabase = await createClient()

    // Check if slot has bookings
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
        console.error('Error deleting slot:', error)
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

    // Parse equipment JSON object and total quantity
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

    const { error } = await supabase
        .from('slots')
        .update({
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
            equipment: equipment,
            quantity: totalQuantity
        })
        .eq('id', slotId)

    if (error) {
        console.error('Error updating slot:', error)
        return { error: `Failed to update slot: ${error.message} (Code: ${error.code})` }
    }

    revalidatePath('/studio')
    return { success: true }
}

export async function createStudio(formData: FormData) {
    try {
        console.log('--- createStudio action started ---');
        console.log('FormData size:', Array.from(formData.keys()).length, 'keys');
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { error: 'Not authenticated' }

        // Check for existing studio to prevent duplicates
        const { data: existingStudio } = await supabase
            .from('studios')
            .select('id')
            .eq('owner_id', user.id)
            .limit(1)

        if (existingStudio && existingStudio.length > 0) {
            return { error: 'You have already registered a studio.' }
        }

        const name = formData.get('name') as string
        const location = formData.get('location') as string
        const contactNumber = formData.get('contactNumber') as string
        const dateOfBirth = formData.get('dateOfBirth') as string
        const address = formData.get('address') as string
        const googleMapsUrl = formData.get('googleMapsUrl') as string

        const birPath = formData.get('birCertificateUrl') as string
        const govIdPath = formData.get('govIdUrl') as string
        const insurancePath = formData.get('insuranceUrl') as string
        const spacePhotosUrls = formData.getAll('spacePhotosUrls') as string[]

        const birExpiry = null // No longer required
        const govIdExpiry = formData.get('govIdExpiry') as string
        const insuranceExpiry = formData.get('insuranceExpiry') as string

        if (!name || !location || !contactNumber || !dateOfBirth || !address || !birPath || !govIdPath || spacePhotosUrls.length === 0) {
            return { error: 'All fields and documents are required' }
        }


        // Parse equipment & inventory
        const equipment: string[] = []
        const inventory: Record<string, number> = {}
        let reformersCount = 0

        const allKeys = Array.from(formData.keys())

        // Support new generic checkbox names from onboarding
        allKeys.forEach(key => {
            // Check if it's one of the equipment checkboxes (Reformer, Cadillac, etc)
            if (['Reformer', 'Cadillac', 'Tower', 'Chair', 'Ladder Barrel', 'Mat'].includes(key)) {
                if (formData.get(key) === 'on') {
                    // Get its quantity
                    const qtyVal = parseInt(formData.get(`qty_${key}`) as string)

                    if (!isNaN(qtyVal) && qtyVal >= 0) {
                        inventory[key] = qtyVal
                        if (key === 'Reformer') {
                            reformersCount = qtyVal
                        }
                    } else {
                        // Default to 1 if checked but no qty provided
                        inventory[key] = 1
                        if (key === 'Reformer') {
                            reformersCount = 1
                        }
                    }

                    // ONLY add to equipment array if qty > 0
                    if (inventory[key] > 0) {
                        equipment.push(key)
                    }
                }
            }
        })

        const otherEquipment = formData.get('otherEquipment') as string
        if (otherEquipment) {
            otherEquipment.split(',').forEach(item => {
                if (item.trim()) equipment.push(item.trim())
            })
        }


        // Ensure profile exists (to satisfy FK constraint)
        // NOTE: Profiles table requires email and full_name by default.
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: user.id, // Ensure id is set for upsert
                full_name: user.user_metadata?.full_name || 'Studio Owner',
                email: user.email, // Required by profiles schema
                role: 'studio', // Ensure they have the studio role
                contact_number: contactNumber,
                date_of_birth: dateOfBirth,
                updated_at: new Date().toISOString()
            })
            .select()

        if (profileError) {
            console.error('Error ensuring profile exists:', profileError)
            return { error: 'Failed to initialize studio profile: ' + profileError.message }
        }

        // Parse pricing
        const pricing: Record<string, number> = {}
        allKeys.forEach(key => {
            if (key.startsWith('price_')) {
                const eq = key.replace('price_', '')
                const val = parseFloat(formData.get(key) as string)
                if (!isNaN(val) && val > 0) {
                    pricing[eq] = val
                }
            }
        })

        const { error } = await supabase
            .from('studios')
            .insert({
                owner_id: user.id,
                name,
                location,
                address,
                hourly_rate: 0,
                reformers_count: reformersCount,
                equipment: equipment,
                contact_number: contactNumber,
                bir_certificate_url: birPath,
                gov_id_url: govIdPath,
                insurance_url: insurancePath,
                bir_certificate_expiry: birExpiry || null,
                gov_id_expiry: govIdExpiry || null,
                insurance_expiry: insuranceExpiry || null,
                space_photos_urls: spacePhotosUrls,
                inventory: inventory,
                pricing: pricing,
                google_maps_url: googleMapsUrl || null,
                amenities: formData.getAll('amenities') as string[]
            })


        if (error) {
            console.error('Error creating studio:', error)
            return { error: `Failed to create studio: ${error.message} (Code: ${error.code})` }
        }

        revalidatePath('/studio')
        return { success: true }
    } catch (err: any) {
        console.error('CRITICAL ERROR inside createStudio:', err)
        return { error: `Server exception: ${err.message || 'Unknown processing error'}` }
    }
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

    // 0. Check Studio Owner's balance and suspension
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

    // Basic validation
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

    // Loop through each day in the range
    while (currentDay <= endOfDayEnd) {
        // Check if this day of week is selected (0=Sun, 1=Mon...)
        if (params.days.includes(currentDay.getDay())) {

            // Generate slots for this day
            const inventory: Record<string, number> = {}
            params.equipment?.forEach(eq => {
                inventory[eq] = quantity
            })

            const dayStr = currentDay.toISOString().split('T')[0];
            let slotStart = new Date(`${dayStr}T${params.startTime}:00+08:00`);
            const slotEnd = new Date(`${dayStr}T${params.endTime}:00+08:00`);

            while (slotStart < slotEnd) {
                const nextHour = new Date(slotStart);
                nextHour.setHours(slotStart.getHours() + 1);

                if (nextHour > slotEnd) break;

                // Insert as ONE BUCKET record per hour
                slotsToInsert.push({
                    studio_id: params.studioId,
                    start_time: slotStart.toISOString(),
                    end_time: nextHour.toISOString(),
                    is_available: true,
                    equipment: params.equipment || [],
                    equipment_inventory: inventory
                });

                slotStart = nextHour;
            }
        }


        // Move to next day
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

export async function updateStudio(formData: FormData) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const studioId = formData.get('studioId') as string
    const name = formData.get('name') as string
    const location = formData.get('location') as string
    const contactNumber = formData.get('contactNumber') as string
    const address = formData.get('address') as string
    const description = formData.get('description') as string

    // Parse equipment
    // Parse inventory quantities first to know the amounts
    const inventory: Record<string, number> = {}
    let reformersCount = 0

    // For generic eq_ prefixed checkboxes
    const allKeys = Array.from(formData.keys())
    allKeys.forEach(key => {
        if (key.startsWith('qty_')) {
            const eq = key.replace('qty_', '')
            const val = parseInt(formData.get(key) as string)
            if (!isNaN(val) && val >= 0) {
                inventory[eq] = val
                // maintain backward compatibility:
                if (eq === 'Reformer') {
                    reformersCount = val
                }
            }
        }
    })

    // Parse equipment
    const equipment: string[] = []

    // Support legacy/specific checkbox names from onboarding
    if (formData.get('reformer') === 'on' && (inventory['Reformer'] === undefined || inventory['Reformer'] > 0)) equipment.push('Reformer')
    if (formData.get('cadillac') === 'on' && (inventory['Cadillac'] === undefined || inventory['Cadillac'] > 0)) equipment.push('Cadillac')
    if (formData.get('tower') === 'on' && (inventory['Tower'] === undefined || inventory['Tower'] > 0)) equipment.push('Tower')
    if (formData.get('chair') === 'on' && (inventory['Chair'] === undefined || inventory['Chair'] > 0)) equipment.push('Chair')
    if (formData.get('ladderBarrel') === 'on' && (inventory['Ladder Barrel'] === undefined || inventory['Ladder Barrel'] > 0)) equipment.push('Ladder Barrel')
    if (formData.get('mat') === 'on' && (inventory['Mat'] === undefined || inventory['Mat'] > 0)) equipment.push('Mat')

    // Support generic eq_ prefixes (New Standard)
    allKeys.forEach(key => {
        if (key.startsWith('eq_') && formData.get(key) === 'on') {
            const eqName = key.replace('eq_', '')
            if (!equipment.includes(eqName)) { // Prevent duplicates
                // Only add if inventory count is greater than 0, or if not specified assume > 0
                if (inventory[eqName] === undefined || inventory[eqName] > 0) {
                    equipment.push(eqName)
                }
            }
        }
    })

    const otherEquipment = formData.get('otherEquipment') as string
    if (otherEquipment) {
        otherEquipment.split(',').forEach(item => {
            if (item.trim()) equipment.push(item.trim())
        })
    }

    // Parse pricing
    const pricing: Record<string, number> = {}
    allKeys.forEach(key => {
        if (key.startsWith('price_')) {
            const eq = key.replace('price_', '')
            const val = parseFloat(formData.get(key) as string)
            if (!isNaN(val) && val > 0) {
                pricing[eq] = val
            }
        }
    })

    // Pricing was parsed successfully via replaced block

    if (!studioId || !name || !location || !contactNumber) {
        return { error: 'All fields are required' }
    }

    const updateData: any = {
        name,
        location,
        address,
        description,
        bio: formData.get('bio') as string,
        equipment: equipment,
        contact_number: contactNumber,
        reformers_count: reformersCount,
        pricing: pricing,
        inventory: inventory,
        google_maps_url: formData.get('googleMapsUrl') as string || null,
        amenities: formData.getAll('amenities') as string[]
    }

    const logoUrl = formData.get('logoUrl') as string
    if (logoUrl) {
        updateData.logo_url = logoUrl
    }

    const spacePhotosJson = formData.get('spacePhotosUrls') as string
    if (spacePhotosJson) {
        updateData.space_photos_urls = JSON.parse(spacePhotosJson)
    }

    const { error } = await supabase
        .from('studios')
        .update(updateData)
        .eq('id', studioId)
        .eq('owner_id', user.id) // Security check

    if (error) {
        console.error('Error updating studio:', error)
        return { error: 'Failed to update studio' }
    }

    revalidatePath('/studio')
    return { success: true }
}

export async function cancelBookingByStudio(bookingId: string, reason: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    // 0. Check Studio Owner's balance and suspension
    const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('available_balance, is_suspended')
        .eq('id', user.id)
        .single()

    if (ownerProfile?.is_suspended) {
        return { error: 'Your account is currently suspended. You cannot cancel bookings.' }
    }

    if (ownerProfile && (ownerProfile.available_balance || 0) < 0) {
        return { error: 'You have a negative balance. Please settle your outstanding balance before cancelling bookings.' }
    }

    if (!reason?.trim()) return { error: 'Cancellation reason is required.' }

    // 1. Fetch booking and verify studio ownership
    const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .select(`
            *,
            client:profiles!client_id(full_name, email),
            instructor:profiles!instructor_id(full_name, email),
            slots!inner(
                start_time,
                end_time,
                studios!inner(id, name, owner_id, address)
            )
        `)
        .eq('id', bookingId)
        .single()

    if (fetchError || !booking) {
        console.error('Error fetching booking for cancellation:', fetchError)
        return { error: 'Booking not found.' }
    }

    const studio = (booking.slots as any)?.studios
    if (studio?.owner_id !== user.id) {
        return { error: 'Unauthorized to cancel this booking.' }
    }

    if (['cancelled_refunded', 'cancelled_charged', 'rejected'].includes(booking.status)) {
        return { error: 'Booking is already cancelled or rejected.' }
    }

    // 2. Process 100% Refund to Client
    const breakdown = booking.price_breakdown as any;
    const walletDeduction = Number(breakdown?.wallet_deduction || 0);
    const totalPrice = Number(booking.total_price || 0);
    const refundAmount = totalPrice + walletDeduction;

    if (refundAmount > 0) {
        const { error: refundError } = await supabase.rpc('increment_available_balance', {
            user_id: booking.client_id,
            amount: refundAmount
        })
        if (refundError) {
            console.error('Studio cancel refund error:', refundError)
            return { error: 'Failed to process refund to client.' }
        }
    }

    const startTimeStr = (booking.slots as any)?.start_time
    const approvedAtStr = booking.approved_at
    const sessionStart = new Date(startTimeStr)
    const now = new Date()

    const diffInHours = (sessionStart.getTime() - now.getTime()) / (1000 * 60 * 60)
    const isLateCancellation = diffInHours < 24

    // Phase 7: 15-minute grace period check (Strictly from approved_at)
    // If approvedAt is null, the grace period is inherently active (unlocked booking)
    const approvedAt = approvedAtStr ? new Date(approvedAtStr) : null
    const isWithinGracePeriod = !approvedAt || (now.getTime() - approvedAt.getTime() <= 15 * 60 * 1000)

    // 3. Displacement Fee & Strike logic (Studio Owner -> Instructor)
    let penaltyProcessed = false
    let penaltyAmount = 0
    let strikeLogged = false

    if (isLateCancellation && !isWithinGracePeriod) {
        penaltyAmount = Number(breakdown?.studio_fee || 0)
        if (penaltyAmount > 0 && booking.instructor_id) {
            const { error: penaltyError } = await supabase.rpc('transfer_balance', {
                p_from_id: user.id, // Studio Owner
                p_to_id: booking.instructor_id,
                p_amount: penaltyAmount
            })
            if (penaltyError) {
                console.error('Displacement fee transfer error:', penaltyError)
                return { error: 'Refund processed, but displacement fee transfer failed.' }
            }
            penaltyProcessed = true
        }

        // --- STRIKE SYSTEM START ---
        // 1. Log the strike
        const { error: strikeError } = await supabase.from('studio_strikes').insert({
            studio_id: studio.id,
            booking_id: bookingId
        })

        if (strikeError) {
            console.error('Error logging studio strike:', strikeError)
        } else {
            strikeLogged = true

            // 2. Check for cumulative strikes (last 30 days)
            const thirtyDaysAgo = new Date()
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

            const { count: strikeCount } = await supabase
                .from('studio_strikes')
                .select('*', { count: 'exact', head: true })
                .eq('studio_id', studio.id)
                .gte('created_at', thirtyDaysAgo.toISOString())

            if (strikeCount && strikeCount >= 3) {
                // 3. Auto-suspend
                await supabase.from('profiles').update({ is_suspended: true }).eq('id', user.id)

                // 4. Send "Account Frozen" email
                if (user.email) {
                    await sendEmail({
                        to: user.email,
                        subject: 'Action Required: Your Studio Vault PH Listing has been Suspended',
                        react: AccountFrozenEmail({
                            studioName: studio.name,
                        })
                    })
                }
            }
        }
        // --- STRIKE SYSTEM END ---
    }

    // 4. Update status and release slots
    const { error: updateError } = await supabase.from('bookings').update({
        status: 'cancelled_refunded',
        cancel_reason: reason,
        cancelled_by: user.id,
        price_breakdown: {
            ...breakdown,
            refunded_amount: refundAmount,
            penalty_amount: penaltyAmount,
            penalty_processed: penaltyProcessed,
            strike_logged: strikeLogged,
            refund_initiator: 'studio'
        }
    }).eq('id', bookingId)

    if (updateError) {
        console.error('Studio cancel update error:', updateError)
        return { error: 'Failed to update booking status.' }
    }

    const allSlotIds = [booking.slot_id, ...(booking.booked_slot_ids || [])].filter(Boolean)
    if (allSlotIds.length > 0) {
        await supabase.from('slots').update({ is_available: true }).in('id', allSlotIds)
    }

    // 4. Send Emails
    const client = booking.client
    const instructor = booking.instructor
    const startTime = (booking.slots as any)?.start_time
    const date = formatManilaDate(startTime)
    const time = formatManilaTime(startTime)

    // Notify Client
    if (client?.email) {
        await sendEmail({
            to: client.email,
            subject: `Session Cancelled by Studio: ${studio.name}`,
            react: BookingNotificationEmail({
                recipientName: client.full_name || 'Client',
                bookingType: 'Booking Cancelled',
                studioName: studio.name,
                date,
                time,
                cancellationReason: reason
            })
        })
    }

    // Notify Instructor
    if (instructor?.email && booking.instructor_id !== user.id) {
        await sendEmail({
            to: instructor.email,
            subject: `Studio Cancelled Session: ${studio.name}`,
            react: BookingNotificationEmail({
                recipientName: instructor.full_name || 'Instructor',
                bookingType: 'Booking Cancelled',
                studioName: studio.name,
                date,
                time,
                cancellationReason: reason
            })
        })
    }

    revalidatePath('/studio')
    return { success: true }
}
