'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendEmail } from '@/lib/email'
import BookingNotificationEmail from '@/components/emails/BookingNotificationEmail'
import { autoCompleteBookings, unlockMaturedFunds } from '@/lib/wallet'
import { formatManilaDate, formatManilaTime } from '@/lib/timezone'

export async function requestBooking(
    slotId: string,
    instructorId: string,
    quantity: number = 1,
    bookingStart?: string, // optional custom range
    bookingEnd?: string
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Unauthorized' }

    // 1. Fetch available slot (WITHOUT JOIN first to be safe)
    const { data: slot, error: slotError } = await supabase
        .from('slots')
        .select('*')
        .eq('id', slotId)
        .eq('is_available', true)
        .single()

    if (slotError || !slot) {
        console.error(`Slot fetch error. ID: ${slotId}`, slotError);
        return { error: `This slot is no longer available. (ID: ${slotId})` }
    }

    // 2. Fetch Studio Details
    const { data: studio, error: studioError } = await supabase
        .from('studios')
        .select('pricing, hourly_rate, id, is_founding_partner, custom_fee_percentage, location') // Select needed fields
        .eq('id', slot.studio_id)
        .single()

    // Note: If studio is missing/hidden, we might default pricing or fail
    if (studioError) {
        console.error('Studio fetch error:', studioError);
        return { error: `Database Error: ${studioError.message} (Code: ${studioError.code})` }
    }
    if (!studio) {
        console.error('Studio not found (after slot fetch). ID:', slot.studio_id);
        return { error: `Studio details not found. The studio might be deleted or permission is denied. (Studio ID: ${slot.studio_id})` }
    }

    // Fetch Instructor Rates
    const { data: instructor } = await supabase
        .from('profiles')
        .select('full_name, rates, is_founding_partner, custom_fee_percentage')
        .eq('id', instructorId)
        .single()

    // --- AVAILABILITY VALIDATION START ---
    const slotStart = new Date(slot.start_time);

    // ✅ Derive date & day using Manila timezone (not UTC) to avoid midnight-crossing bugs
    const manilaDateStr = slotStart.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }); // YYYY-MM-DD
    const manilaDayOfWeek = Number(
        slotStart.toLocaleDateString('en-US', { timeZone: 'Asia/Manila', weekday: 'short' }) === 'Sun' ? 0
            : slotStart.toLocaleDateString('en-US', { timeZone: 'Asia/Manila', weekday: 'short' }) === 'Mon' ? 1
                : slotStart.toLocaleDateString('en-US', { timeZone: 'Asia/Manila', weekday: 'short' }) === 'Tue' ? 2
                    : slotStart.toLocaleDateString('en-US', { timeZone: 'Asia/Manila', weekday: 'short' }) === 'Wed' ? 3
                        : slotStart.toLocaleDateString('en-US', { timeZone: 'Asia/Manila', weekday: 'short' }) === 'Thu' ? 4
                            : slotStart.toLocaleDateString('en-US', { timeZone: 'Asia/Manila', weekday: 'short' }) === 'Fri' ? 5 : 6
    );
    const timeStr = slotStart.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Manila' }) + ':00';

    // ✅ Run TWO separate queries instead of .or() to avoid PostgREST NULL ambiguity:
    // Query A: date-specific availability (instructor set a specific date)
    const { data: availByDate } = await supabase
        .from('instructor_availability')
        .select('id, group_id')
        .eq('instructor_id', instructorId)
        .eq('location_area', studio.location)
        .eq('date', manilaDateStr)
        .lte('start_time', timeStr)
        .gt('end_time', timeStr)
        .limit(1)
        .maybeSingle();

    // Query B: weekly recurring availability (instructor set a day_of_week)
    const { data: availByDay } = await supabase
        .from('instructor_availability')
        .select('id, group_id')
        .eq('instructor_id', instructorId)
        .eq('location_area', studio.location)
        .eq('day_of_week', manilaDayOfWeek)
        .is('date', null) // Only weekly-recurring entries (not date-specific)
        .lte('start_time', timeStr)
        .gt('end_time', timeStr)
        .limit(1)
        .maybeSingle();

    const avail = availByDate || availByDay;

    if (!avail) {
        return { error: `${instructor?.full_name || 'The instructor'} is not available at ${studio.location} during this time.` }
    }
    // --- AVAILABILITY VALIDATION END ---

    // --- PRICE CALCULATION START ---
    // 1. Determine Equipment (Default to first or Reformer)
    const equipment = slot.equipment?.[0] || 'Reformer';

    // 2. Studio Price
    const studioPricing = studio.pricing as Record<string, number> | null;
    const studioFee = studioPricing?.[equipment] || 0;

    // 3. Instructor Price
    const instructorRates = instructor?.rates as Record<string, number> | null;
    const instructorFee = instructorRates?.[equipment] || 0;

    // 4. Calculate Service Fee
    const baseFee = studioFee + instructorFee;

    // Determine the fee percentage
    let feePercentage = 20;
    if (studio?.is_founding_partner && studio?.custom_fee_percentage !== undefined) {
        feePercentage = studio.custom_fee_percentage;
    } else if (instructor?.is_founding_partner && instructor?.custom_fee_percentage !== undefined) {
        feePercentage = instructor.custom_fee_percentage;
    }

    const calculatedServiceFee = baseFee * (feePercentage / 100);
    const serviceFee = Math.max(100, calculatedServiceFee);

    const pricePerSlot = baseFee + serviceFee;
    const totalPrice = pricePerSlot * quantity;

    // --- WALLET AUTO-DEDUCTION START ---
    const { data: profile } = await supabase
        .from('profiles')
        .select('available_balance')
        .eq('id', user.id)
        .single();

    const walletBalance = profile?.available_balance || 0;
    const deduction = Math.min(walletBalance, totalPrice);
    const finalPrice = totalPrice - deduction;

    if (deduction > 0) {
        const { error: walletError } = await supabase.rpc('deduct_available_balance', {
            user_id: user.id,
            amount: deduction
        });

        if (walletError) {
            console.error('Wallet deduction error:', walletError);
            return { error: 'Failed to process wallet payment.' };
        }
    }
    // --- WALLET AUTO-DEDUCTION END ---

    const breakdown = {
        studio_fee: studioFee * quantity,
        instructor_fee: instructorFee * quantity,
        service_fee: serviceFee * quantity,
        equipment: equipment,
        quantity: quantity,
        wallet_deduction: deduction > 0 ? deduction : undefined,
        original_price: deduction > 0 ? totalPrice : undefined
    };
    // --- PRICE CALCULATION END ---

    // 2. Logic for Quantity & Partial Booking
    // We need to find X available slots that match the criteria
    // For now, let's assume if quantity > 1, we find other slots with same start/end/studio/equipment

    let allocatedSlotIds: string[] = [slotId];

    // Find additional slots if quantity > 1
    if (quantity > 1) {
        const needed = quantity - 1;
        const { data: additionalSlots } = await supabase
            .from('slots')
            .select('id')
            .eq('studio_id', slot.studio_id)
            .eq('start_time', slot.start_time) // Must match start
            .eq('is_available', true)
            .neq('id', slotId) // Exclude current
            .contains('equipment', [equipment]) // Ensure equipment matches
            .limit(needed);

        if (!additionalSlots || additionalSlots.length < needed) {
            return { error: `Not enough slots available. Requested: ${quantity}, Found: ${(additionalSlots?.length || 0) + 1}` }
        }

        allocatedSlotIds = [...allocatedSlotIds, ...additionalSlots.map(s => s.id)];
    }

    let finalSlotId = slotId; // This will be the "primary" slot ID stored in booking.slot_id

    // Iterate through all allocated slots and apply booking/splitting logic
    // If splitting is required, we do it for EACH slot. 
    // Complexity: If custom range (partial booking) is used with Quantity > 1, we must split X slots.

    const bookedSlotIdsForRecord: string[] = [];

    for (const currentId of allocatedSlotIds) {
        let actualBookedId = currentId;

        // Fetch current slot details to ensure we have start/end for splitting logic if needed
        // (Optimization: we could assume they are same as primary slot, but safe to fetch or reuse)
        const currentSlotStart = new Date(slot.start_time); // Assuming all have same start/end
        const currentSlotEnd = new Date(slot.end_time);

        if (bookingStart && bookingEnd) {
            const reqStart = new Date(bookingStart + '+08:00');
            const reqEnd = new Date(bookingEnd + '+08:00');

            // Validate range (already checked logic, assuming valid relative to slot)
            const isPartial = reqStart.getTime() > currentSlotStart.getTime() || reqEnd.getTime() < currentSlotEnd.getTime();

            if (isPartial) {
                // SPLIT LOGIC FOR EACH SLOT
                const { data: newSlot, error: createError } = await supabase
                    .from('slots')
                    .insert({
                        studio_id: slot.studio_id,
                        start_time: reqStart.toISOString(),
                        end_time: reqEnd.toISOString(),
                        is_available: true, // Created available, then locked
                        equipment: slot.equipment
                    })
                    .select()
                    .single();

                if (createError || !newSlot) {
                    console.error('Split error:', createError);
                    return { error: 'Failed to process partial booking.' };
                }

                actualBookedId = newSlot.id;

                // Adjust OLD slot
                if (reqStart.getTime() === currentSlotStart.getTime()) {
                    await supabase.from('slots').update({ start_time: reqEnd.toISOString() }).eq('id', currentId);
                } else if (reqEnd.getTime() === currentSlotEnd.getTime()) {
                    await supabase.from('slots').update({ end_time: reqStart.toISOString() }).eq('id', currentId);
                } else {
                    await supabase.from('slots').update({ end_time: reqStart.toISOString() }).eq('id', currentId);
                    await supabase.from('slots').insert({
                        studio_id: slot.studio_id,
                        start_time: reqEnd.toISOString(),
                        end_time: currentSlotEnd.toISOString(),
                        is_available: true,
                        equipment: slot.equipment
                    });
                }
            } else {
                // Full Booking
                await supabase.from('slots').update({ is_available: false }).eq('id', currentId);
            }
        } else {
            // Full Booking (No custom range)
            await supabase.from('slots').update({ is_available: false }).eq('id', currentId);
        }

        bookedSlotIdsForRecord.push(actualBookedId);
        // Mark the new split slot as unavailable if it was created
        if (actualBookedId !== currentId || (bookingStart && bookingEnd)) {
            await supabase.from('slots').update({ is_available: false }).eq('id', actualBookedId);
        }
    }

    // Primary ID is the first one
    finalSlotId = bookedSlotIdsForRecord[0];

    // 4. Create Booking linked to finalSlotId
    // Set expiry 15 minutes from now for unpaid bookings
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + 15)

    const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
            slot_id: finalSlotId,
            instructor_id: instructorId,
            client_id: user.id,
            status: 'pending',
            total_price: finalPrice,
            price_breakdown: breakdown,
            quantity: quantity,
            booked_slot_ids: bookedSlotIdsForRecord,
            expires_at: expiresAt.toISOString()
        })
        .select(`
            *,
            slots (
                start_time,
                end_time,
                studios (
                    name,
                    location,
                    address,
                    owner_id
                )
            ),
            profiles:instructor_id (
                full_name,
                email
            )
        `)
        .single()

    if (bookingError || !booking) {
        console.error('Booking error:', bookingError)
        return { error: `Failed to request booking. DB Error: ${bookingError?.message} (Code: ${bookingError?.code})` }
    }

    // --- First Come, First Served logic ---
    if (avail) {
        if (avail.group_id) {
            await supabase
                .from('instructor_availability')
                .delete()
                .eq('group_id', avail.group_id);
        } else {
            await supabase
                .from('instructor_availability')
                .delete()
                .eq('id', avail.id);
        }
    }

    // --- EMAIL NOTIFICATION START ---
    const clientEmail = user.email; // Auth email
    const clientName = 'Valued Client'; // We could fetch from profile if needed
    const studioName = booking.slots.studios.name;
    const studioAddress = booking.slots.studios.address;
    const instructorName = booking.profiles?.full_name || 'Instructor';
    const instructorEmail = booking.profiles?.email;
    const date = formatManilaDate(booking.slots.start_time);
    const time = formatManilaTime(booking.slots.start_time);

    // 1. Notify Client
    if (clientEmail) {
        await sendEmail({
            to: clientEmail,
            subject: `Booking Requested: ${studioName}`,
            react: BookingNotificationEmail({
                recipientName: clientName,
                bookingType: 'New Booking',
                studioName,
                address: studioAddress,
                instructorName,
                date,
                time
            })
        });
    }

    // 2. Notify Instructor (who is being booked)
    if (instructorEmail) {
        await sendEmail({
            to: instructorEmail,
            subject: `New Client Booking Request`,
            react: BookingNotificationEmail({
                recipientName: instructorName,
                bookingType: 'New Booking',
                studioName,
                clientName: 'A Client', // Privacy or use name
                date,
                time
            })
        });
    }

    // 3. Notify Studio (Optional? "send an email confirmation to an instructor and a studio")
    // If Customer books Instructor, Studio should probably know too.
    const studioOwnerId = booking.slots.studios.owner_id;
    const { data: studioOwner } = await supabase.from('profiles').select('email').eq('id', studioOwnerId).single();

    if (studioOwner?.email) {
        await sendEmail({
            to: studioOwner.email,
            subject: `New Session Booked at your Studio`,
            react: BookingNotificationEmail({
                recipientName: 'Studio Owner',
                bookingType: 'New Booking',
                studioName,
                instructorName,
                date,
                time
            })
        });
    }
    // --- EMAIL NOTIFICATION END ---

    revalidatePath('/customer')
    return { success: true, bookingId: booking.id }
}

export async function submitPaymentProof(
    bookingId: string,
    proofUrl: string,
    waiverAgreed: boolean = false,
    termsAgreed: boolean = false,
    parqAnswers: Record<string, boolean> = {},
    medicalClearanceAcknowledged: boolean = false
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Unauthorized' }

    const hasRiskFlags = Object.values(parqAnswers).some(v => v === true)

    // 1. Update booking with payment proof and agreement flags
    const { error } = await supabase
        .from('bookings')
        .update({
            payment_proof_url: proofUrl,
            payment_status: 'submitted',
            payment_submitted_at: new Date().toISOString(),
            waiver_agreed: waiverAgreed,
            terms_agreed: termsAgreed,
            expires_at: null // Clear expiry — payment submitted, slot is now permanently held
        })
        .eq('id', bookingId)
        .eq('client_id', user.id) // Ensure ownership

    if (error) {
        console.error('Payment proof submission error:', error)
        return { error: `DB Error: ${error.message} (Code: ${error.code})` }
    }

    // 2. Insert timestamped consent audit record
    const { error: consentError } = await supabase
        .from('waiver_consents')
        .insert({
            booking_id: bookingId,
            user_id: user.id,
            waiver_agreed: waiverAgreed,
            terms_agreed: termsAgreed,
            parq_answers: parqAnswers,
            has_risk_flags: hasRiskFlags,
            medical_clearance_acknowledged: medicalClearanceAcknowledged,
            waiver_version: '2026-02-19',
            agreed_at: new Date().toISOString()
        })

    if (consentError) {
        // Fatal - we must record consent for legal reasons
        console.error('Consent audit log error:', consentError)
        return { error: `Failed to save waiver consent. Please try again. (${consentError.message})` }
    }

    revalidatePath(`/customer/payment/${bookingId}`)
    return { success: true }
}

export async function bookInstructorSession(
    instructorId: string,
    date: string,
    time: string,
    location: string,
    equipment: string
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Unauthorized' }

    if (!date || !time || !location || !equipment) {
        return { error: 'Missing booking details. Please select Date, Time, Location and Equipment.' }
    }

    const startDateTime = new Date(`${date}T${time}+08:00`)
    // Assume 1 hour session for now as per "hourly slot" standard
    const endDateTime = new Date(startDateTime)
    endDateTime.setHours(startDateTime.getHours() + 1)

    // 0. Check Instructor Suspension
    const { data: instructorProfile } = await supabase
        .from('profiles')
        .select('is_suspended')
        .eq('id', instructorId)
        .single()

    if (instructorProfile?.is_suspended) {
        return { error: 'This instructor is not currently accepting bookings.' }
    }

    // 1. Validate Instructor Availability
    const manilaDateStr = date;
    const manilaDayOfWeek = startDateTime.getDay();
    const timeStr = time.length === 5 ? time + ':00' : time;

    // Query A: date-specific availability
    const { data: availByDate } = await supabase
        .from('instructor_availability')
        .select('id, group_id')
        .eq('instructor_id', instructorId)
        .eq('location_area', location)
        .eq('date', manilaDateStr)
        .lte('start_time', timeStr)
        .gt('end_time', timeStr)
        .limit(1)
        .maybeSingle();

    // Query B: weekly recurring availability
    const { data: availByDay } = await supabase
        .from('instructor_availability')
        .select('id, group_id')
        .eq('instructor_id', instructorId)
        .eq('location_area', location)
        .eq('day_of_week', manilaDayOfWeek)
        .is('date', null)
        .lte('start_time', timeStr)
        .gt('end_time', timeStr)
        .limit(1)
        .maybeSingle();

    const avail = availByDate || availByDay;

    if (!avail) {
        return { error: 'Instructor is not available at this time and location.' }
    }

    // 2. Find Available Studio Slot
    // Criteria: Verified Studio, Location Match, Equipment Match, Time Match, IS AVAILABLE
    const { data: availableSlots, error: slotError } = await supabase
        .from('slots')
        .select(`
            *,
            studios!inner(*)
        `)
        .eq('is_available', true)
        .eq('start_time', startDateTime.toISOString()) // Exact match for slot start
        //.eq('end_time', endDateTime.toISOString()) // Optional, if slots are strict 1 hour
        .eq('studios.location', location)
        .eq('studios.verified', true)
        .contains('equipment', [equipment])

    if (slotError) {
        console.error('Slot search error:', slotError)
        return { error: 'Error searching for studios.' }
    }

    if (!availableSlots || availableSlots.length === 0) {
        return { error: 'No studio slots available with this equipment.' }
    }

    // 3. Double-Booking Check & Selection
    // Even if is_available is true, double check `bookings` just in case (optional but requested)
    // We iterate to find the first truly free one.
    let selectedSlot = null;

    for (const slot of availableSlots) {
        const { count } = await supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('slot_id', slot.id)
            .neq('status', 'rejected') // Ignore rejected bookings

        if (count === 0) {
            selectedSlot = slot;
            break;
        }
    }

    if (!selectedSlot) {
        return { error: 'All matching slots are currently booked.' }
    }

    // 4. Create Booking
    const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
            slot_id: selectedSlot.id,
            instructor_id: instructorId,
            client_id: user.id,
            status: 'confirmed'
        })
        .select()
        .single()

    if (bookingError || !booking) {
        console.error('Booking creation error:', bookingError)
        return { error: 'Failed to create booking.' }
    }

    // 5. Update Slot Availability (Lock it)
    await supabase
        .from('slots')
        .update({ is_available: false })
        .eq('id', selectedSlot.id)

    // 5.5. Remove Instructor Availability for this booked slot
    if (avail.group_id) {
        await supabase
            .from('instructor_availability')
            .delete()
            .eq('group_id', avail.group_id);
    } else {
        await supabase
            .from('instructor_availability')
            .delete()
            .eq('id', avail.id);
    }

    // 6. Notifications
    // Helper to extract first item if array
    const first = (val: any) => Array.isArray(val) ? val[0] : val;

    // Fetch enriched booking details for email
    const { data: enrichedBooking } = await supabase
        .from('bookings')
        .select(`
            *,
            client:profiles!client_id(full_name, email),
            instructor:profiles!instructor_id(full_name, email),
            slots(
                start_time,
                studios(
                    name,
                    address,
                    owner_id
                )
            )
        `)
        .eq('id', booking.id)
        .single()

    if (enrichedBooking) {
        const client = first(enrichedBooking.client);
        const instructor = first(enrichedBooking.instructor);
        const slots = first(enrichedBooking.slots);
        const studios = first(slots?.studios);

        const clientEmail = client?.email;
        const clientName = client?.full_name || 'Valued Client';
        const instructorName = instructor?.full_name || 'Instructor';
        const instructorEmail = instructor?.email;
        const studioName = studios?.name;
        const studioAddress = studios?.address;

        if (clientEmail && slots?.start_time) {
            const dateStr = formatManilaDate(slots.start_time);
            const timeStr = formatManilaTime(slots.start_time);

            // Notify Client
            await sendEmail({
                to: clientEmail,
                subject: `Booking Confirmed: ${studioName}`,
                react: BookingNotificationEmail({
                    recipientName: clientName,
                    bookingType: 'Booking Confirmed',
                    studioName,
                    address: studioAddress,
                    instructorName,
                    date: dateStr,
                    time: timeStr
                })
            });

            // Notify Instructor
            if (instructorEmail) {
                await sendEmail({
                    to: instructorEmail,
                    subject: `New Session Confirmed with ${clientName}`,
                    react: BookingNotificationEmail({
                        recipientName: instructorName,
                        bookingType: 'Booking Confirmed',
                        studioName,
                        clientName,
                        date: dateStr,
                        time: timeStr
                    })
                });
            }

            // Notify Studio Owner
            const studioOwnerId = studios?.owner_id;
            if (studioOwnerId) {
                const { data: owner } = await supabase.from('profiles').select('email').eq('id', studioOwnerId).single();
                if (owner?.email) {
                    await sendEmail({
                        to: owner.email,
                        subject: `New Session Confirmed at ${studioName}`,
                        react: BookingNotificationEmail({
                            recipientName: 'Studio Owner',
                            bookingType: 'Booking Confirmed',
                            studioName,
                            instructorName,
                            clientName,
                            date: dateStr,
                            time: timeStr
                        })
                    });
                }
            }
        } else {
            console.warn('Missing data for direct booking confirmation emails:', { client, slots, studios });
        }
    }

    revalidatePath('/customer')
    return { success: true, studioName: selectedSlot.studios.name, bookingId: booking.id }
}

export async function cancelBooking(bookingId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Unauthorized' }

    // 1. Fetch booking with slot details
    const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .select(`
            id, 
            status, 
            total_price, 
            client_id,
            instructor_id,
            slot_id,
            price_breakdown,
            slots (start_time)
        `)
        .eq('id', bookingId)
        .single()

    if (fetchError || !booking) {
        return { error: 'Booking not found.' }
    }

    if (booking.client_id !== user.id) {
        return { error: 'Unauthorized to cancel this booking.' }
    }

    if (booking.status === 'cancelled') {
        return { error: 'Booking is already cancelled.' }
    }

    // Helper to safely extract from potential arrays
    const getFirst = (item: any) => Array.isArray(item) ? item[0] : item;
    const slotData = getFirst(booking.slots);

    if (!slotData?.start_time) {
        return { error: 'Invalid booking data (missing slot start time).' }
    }

    const startTime = new Date(slotData.start_time).getTime()
    const now = new Date().getTime()
    const hoursUntilStart = (startTime - now) / (1000 * 60 * 60)

    // Check user role for strict cancellation enforcement
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const isInstructor = profile?.role === 'instructor'

    // 2. Cancellation restriction and Refund logic
    if (hoursUntilStart < 24) {
        if (isInstructor) {
            return { error: 'As an instructor, you cannot cancel a booking less than 24 hours in advance.' }
        }
    }

    let refundAmount = 0
    if (hoursUntilStart >= 24) {
        // Refund the exact total_price paid by the customer, plus any portion they paid via wallet
        const breakdown = booking.price_breakdown as any;
        const walletDeduction = breakdown?.wallet_deduction || 0;
        refundAmount = Number(booking.total_price) + Number(walletDeduction);
    }

    // 3. Update the database within a simulated transaction
    if (refundAmount > 0) {
        await supabase.rpc('increment_available_balance', {
            user_id: user.id,
            amount: refundAmount
        })
    }

    // Mark as cancelled and release the slot
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', bookingId);
    await supabase.from('slots').update({ is_available: true }).eq('id', booking.slot_id);

    // --- AUTO-REMOVAL OF AVAILABILITY START ---
    // If an instructor is cancelling their own studio rental, remove the auto-created availability
    if (booking.client_id === booking.instructor_id) {
        try {
            const startDateTime = new Date(slotData.start_time);
            const dateStr = startDateTime.toISOString().split('T')[0];
            const timeStr = startDateTime.toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour12: false, hour: '2-digit', minute: '2-digit' });

            await supabase
                .from('instructor_availability')
                .delete()
                .eq('instructor_id', user.id)
                .eq('date', dateStr)
                .eq('start_time', timeStr);

            revalidatePath('/instructor/schedule');
        } catch (availError) {
            console.error('Failed to remove auto-availability:', availError);
        }
    }
    // --- AUTO-REMOVAL OF AVAILABILITY END ---

    revalidatePath('/customer')
    revalidatePath('/customer/bookings')
    revalidatePath('/customer/wallet')

    return { success: true, refunded: refundAmount > 0, refundAmount }
}

export async function topUpWallet(amount: number) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Unauthorized' }

    if (amount <= 0) return { error: 'Invalid amount' }

    const { error } = await supabase.rpc('increment_available_balance', {
        user_id: user.id,
        amount
    })

    if (error) {
        return { error: 'Failed to process top up.' }
    }

    revalidatePath('/customer/wallet')
    return { success: true }
}

export async function getCustomerWalletDetails() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Unauthorized' }

    // Run financial jobs lazily to ensure accurately unlocked/held balances
    await Promise.allSettled([
        autoCompleteBookings(),
        unlockMaturedFunds()
    ])

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (profileError) {
        console.error('Wallet profile fetch error:', profileError)
        return { error: 'Failed to fetch wallet balance.' }
    }

    const available = profile.available_balance ?? profile.wallet_balance ?? 0
    const pending = profile.pending_balance ?? 0

    // Fetch history (cancelled bookings and payouts)
    const { data: cancelledBookings } = await supabase
        .from('bookings')
        .select('id, created_at, total_price, price_breakdown, status, slots(studios(name))')
        .eq('client_id', user.id)
        .eq('status', 'cancelled')
        .order('created_at', { ascending: false });

    // Assuming we implement customer payout requests
    const { data: payouts } = await supabase
        .from('payout_requests')
        .select('created_at, amount, status, payment_method')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    const transactions: any[] = [];

    const getFirst = (item: any) => Array.isArray(item) ? item[0] : item;

    cancelledBookings?.forEach(b => {
        const breakdown = b.price_breakdown as any;
        const refundAmount = Number(b.total_price) + Number(breakdown?.wallet_deduction || 0);

        const slotData = getFirst(b.slots);
        const studioData = getFirst(slotData?.studios);

        // We assume all cancelled bookings resulted in a refund if they show here for now, 
        // to be perfectly accurate we would need a 'transactions' table.
        // For MVP, we'll mark them as refunded credits.
        transactions.push({
            id: b.id,
            date: b.created_at, // Ideally when it was cancelled, but created_at is fallback
            type: 'Refund (Cancellation)',
            amount: refundAmount,
            status: 'completed',
            details: `Booking at ${studioData?.name || 'Studio'}`
        });
    });

    payouts?.forEach(p => {
        transactions.push({
            id: p.amount + p.created_at,
            date: p.created_at,
            type: 'Payout Request',
            amount: -p.amount,
            status: p.status,
            details: `Via ${p.payment_method}`
        });
    });

    // We can't officially track top-ups and deductions accurately without a ledger/transactions table.
    // For MVP, we will only show balance and derived history.

    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
        available,
        pending,
        transactions
    };
}

export async function requestCustomerPayout(amount: number, method: string, details: any) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Unauthorized' }

    // 1. Verify Balance
    const { available, error: balanceError } = await getCustomerWalletDetails();

    if (balanceError || available === undefined) {
        return { error: 'Failed to verify balance.' }
    }

    if (amount <= 0) return { error: 'Invalid amount.' }

    if (amount > available) {
        return { error: `Insufficient funds. Available: ₱${available}` }
    }

    // 2. Deduct from profile right away
    const { error: deductError } = await supabase.rpc('deduct_available_balance', {
        user_id: user.id,
        amount
    })

    if (deductError) {
        return { error: 'Failed to process balance deduction.' };
    }

    // 3. Create Payout Request
    const { error: insertError } = await supabase
        .from('payout_requests')
        .insert({
            user_id: user.id,
            amount,
            payment_method: method,
            account_name: details.accountName,
            account_number: details.accountNumber,
            bank_name: method === 'bank' ? details.bankName : undefined,
            status: 'pending'
        })

    if (insertError) {
        // Rollback balance deduction
        await supabase.rpc('increment_available_balance', {
            user_id: user.id,
            amount
        })
        console.error('Payout request error:', insertError)
        return { error: `Failed to submit payout request: ${insertError.message}` }
    }

    revalidatePath('/customer/wallet')
    revalidatePath('/customer/payout')
    return { success: true }
}
