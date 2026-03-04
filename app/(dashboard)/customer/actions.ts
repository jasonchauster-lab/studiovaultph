'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendEmail } from '@/lib/email'
import BookingNotificationEmail from '@/components/emails/BookingNotificationEmail'
import { autoCompleteBookings, unlockMaturedFunds } from '@/lib/wallet'
import { formatManilaDate, formatManilaTime, roundToISOString, formatManilaDateStr, formatTo12Hour, toManilaDateStr, getManilaTodayStr, normalizeTimeTo24h, toManilaTimeString } from '@/lib/timezone'

export async function requestBooking(
    slotId: string,
    instructorId: string,
    quantity: number = 1,
    equipment?: string,
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
        .select(`
            pricing, hourly_rate, id, is_founding_partner, custom_fee_percentage, location,
            profiles!owner_id(available_balance, is_suspended, full_name, email)
        `)
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

    // 2.1 Check Studio Owner's Status
    const studioOwnerProfile = Array.isArray(studio.profiles) ? studio.profiles[0] : studio.profiles;
    if (studioOwnerProfile?.is_suspended) {
        return { error: `The studio "${studioOwnerProfile.full_name || 'Partner Studio'}" is currently not accepting new bookings.` }
    }
    if (studioOwnerProfile && (studioOwnerProfile.available_balance ?? 0) < 0) {
        return { error: `The studio "${studioOwnerProfile.full_name || 'Partner Studio'}" is currently not accepting new bookings due to a pending balance settlement.` }
    }

    // Fetch Instructor Rates and Balance
    const { data: instructor } = await supabase
        .from('profiles')
        .select('full_name, rates, is_founding_partner, custom_fee_percentage, available_balance')
        .eq('id', instructorId)
        .single()

    if (instructor && (instructor.available_balance ?? 0) < 0) {
        return { error: `${instructor.full_name || 'The instructor'} is currently not accepting new bookings due to a pending balance settlement.` }
    }

    // --- EQUIPMENT DETERMINATION START ---
    let equipmentObj: Record<string, number> = {};
    if (slot.equipment && typeof slot.equipment === 'object') {
        if (Array.isArray(slot.equipment)) {
            slot.equipment.forEach((item: any) => {
                if (typeof item === 'string') {
                    equipmentObj[item.trim().toUpperCase()] = 1;
                }
            });
        } else {
            equipmentObj = slot.equipment as Record<string, number>;
        }
    }

    const requestedEqStripped = (equipment || '').trim().toLowerCase();
    const actualKey = Object.keys(equipmentObj).find(k => k.trim().toLowerCase() === requestedEqStripped)
        || Object.keys(equipmentObj)[0]
        || '';

    const selectedEquipment = actualKey;
    // --- EQUIPMENT DETERMINATION END ---

    // ✅ Derive date & day using the new date and start_time columns (pure strings)
    const manilaDateStr = slot.date;
    const tempDate = new Date(`${slot.date}T${slot.start_time}+08:00`);
    const manilaDayOfWeek = tempDate.getDay();
    // Normalize to HH:mm:ss for consistent instructor_availability comparison
    const timeStr = normalizeTimeTo24h(slot.start_time);

    // ✅ Run TWO separate queries instead of .or() to avoid PostgREST NULL ambiguity:
    // Both studio.location and instructor location_area are trimmed to avoid whitespace mismatch.
    const trimmedLocation = studio.location?.trim()

    // Query A: date-specific availability (instructor set a specific date)
    const { data: availByDate } = await supabase
        .from('instructor_availability')
        .select('id, group_id, location_area')
        .eq('instructor_id', instructorId)
        .eq('date', manilaDateStr)
        .lte('start_time', timeStr)
        .gt('end_time', timeStr);

    // Query B: weekly recurring availability (instructor set a day_of_week)
    const { data: availByDay } = await supabase
        .from('instructor_availability')
        .select('id, group_id, location_area')
        .eq('instructor_id', instructorId)
        .eq('day_of_week', manilaDayOfWeek)
        .is('date', null) // Only weekly-recurring entries (not date-specific)
        .lte('start_time', timeStr)
        .gt('end_time', timeStr);

    const matchingTimeBlocks = [...(availByDate || []), ...(availByDay || [])];

    // Fuzzy Location Match
    let isValidLocation = false;

    if (matchingTimeBlocks.length > 0) {
        const studioLocLower = (trimmedLocation || '').toLowerCase();
        isValidLocation = matchingTimeBlocks.some(block => {
            const blockLocLower = (block.location_area || '').toLowerCase();
            return !blockLocLower || studioLocLower.includes(blockLocLower) || blockLocLower.includes(studioLocLower);
        });

        if (!isValidLocation) {
            return { error: `${instructor?.full_name || 'The instructor'} is not available at ${trimmedLocation} during this time. (Location mismatch)` }
        }
    } else {
        // If there are no matching time blocks, check if they have ANY blocks globally
        const { count: globalBlockCount } = await supabase
            .from('instructor_availability')
            .select('*', { count: 'exact', head: true })
            .eq('instructor_id', instructorId);

        if (globalBlockCount && globalBlockCount > 0) {
            return { error: `${instructor?.full_name || 'The instructor'} is not available at this date and time.` }
        }
        // If 0 blocks globally, we allow the booking (fallback)
    }

    // --- DOUBLE BOOKING VALIDATION START ---
    const { data: overlappingBookings } = await supabase
        .from('bookings')
        .select('id, slots!inner(start_time, date)')
        .eq('instructor_id', instructorId)
        .in('status', ['pending', 'approved'])
        .eq('slots.date', slot.date)
        .eq('slots.start_time', slot.start_time);

    if (overlappingBookings && overlappingBookings.length > 0) {
        return { error: 'The instructor is already booked for this time slot.' }
    }
    // --- DOUBLE BOOKING VALIDATION END ---
    // --- AVAILABILITY VALIDATION END ---

    // --- PRICE CALCULATION START ---
    if (!selectedEquipment) {
        return { error: 'No equipment type could be determined for this slot. Please select an equipment type and try again.' }
    }

    if (!equipmentObj[selectedEquipment] || equipmentObj[selectedEquipment] <= 0) {
        const available = Object.keys(equipmentObj).join(', ') || 'none';
        return { error: `"${selectedEquipment}" is not available in this slot. Available equipment: ${available}.` }
    }

    // 2. Studio Price: Use the specific equipment rate, fallback to hourly_rate
    const studioPricing = studio.pricing as Record<string, number> | null;
    const sKey = Object.keys(studioPricing || {}).find(k => k.toLowerCase() === selectedEquipment.toLowerCase());
    const studioFee = sKey ? (studioPricing?.[sKey] || 0) : (Number(studio.hourly_rate) || 0);

    // 3. Instructor Price: Always use the REFORMER rate as their base fee
    const instructorRates = instructor?.rates as Record<string, number> | null;
    const instructorKey = Object.keys(instructorRates || {}).find(k => k.toUpperCase() === 'REFORMER');
    const instructorFee = instructorKey ? (instructorRates?.[instructorKey] || 0) : 0;

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

    const walletBalance = profile?.available_balance ?? 0;
    const deduction = Math.min(walletBalance, totalPrice);
    const finalPrice = totalPrice - deduction;
    // --- WALLET AUTO-DEDUCTION END ---

    const breakdown = {
        studio_fee: studioFee * quantity,
        instructor_fee: instructorFee * quantity,
        service_fee: serviceFee * quantity,
        equipment: selectedEquipment,
        quantity: quantity,
        wallet_deduction: deduction > 0 ? deduction : undefined,
        original_price: deduction > 0 ? totalPrice : undefined
    };

    // --- ATOMIC BOOKING VIA RPC START ---
    // 1. Resolve exact Key matching (case-insensitive) to prevent "REFORMER" vs "Reformer" mismatch
    const currentEquipment = equipmentObj;
    const exactDbKey = Object.keys(currentEquipment).find(
        key => key.trim().toUpperCase() === selectedEquipment.trim().toUpperCase()
    );

    if (!exactDbKey || (currentEquipment[exactDbKey] ?? 0) < quantity) {
        return { error: `Failed to extract equipment for booking. Requested: ${selectedEquipment}` };
    }

    // Prepare time parameters if it's a partial time booking
    let reqStartTime: string | null = null;
    let reqEndTime: string | null = null;

    if (bookingStart && bookingEnd) {
        const rStart = new Date(bookingStart + '+08:00');
        const rEnd = new Date(bookingEnd + '+08:00');
        // Extract just the HH:MM:SS for the RPC
        reqStartTime = toManilaTimeString(rStart);
        reqEndTime = toManilaTimeString(rEnd);
    }

    // 2. Execute Atomic RPC
    const { data: rpcResult, error: rpcError } = await supabase.rpc('book_slot_atomic', {
        p_slot_id: slotId,
        p_instructor_id: instructorId,
        p_client_id: user.id,
        p_equipment_key: exactDbKey,
        p_quantity: quantity,
        p_db_price: finalPrice,
        p_price_breakdown: breakdown,
        p_wallet_deduction: deduction,
        p_req_start_time: reqStartTime,
        p_req_end_time: reqEndTime
    });

    if (rpcError) {
        console.error('Atomic Booking RPC Error:', rpcError);
        return { error: `Booking failed. Please try again. (${rpcError.message})` };
    }

    if (!rpcResult?.success) {
        console.error('Atomic Booking RPC Error returned false:', rpcResult);
        return { error: `Booking failed. Please try again.` };
    }

    const { booking_id: actualBookingId } = rpcResult;
    // --- ATOMIC BOOKING VIA RPC END ---

    // Fetch the enriched booking to send emails
    const { data: booking, error: fetchBookingError } = await supabase
        .from('bookings')
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
        .eq('id', actualBookingId)
        .single();

    if (fetchBookingError || !booking) {
        console.error('Enriched Booking fetch error:', fetchBookingError);
        // We log and return success because the booking *actually* succeeded!
        // We just skip emails if this fails gracefully.
    }
    // --- First Come, First Served logic ---
    // Removed old deletion logic that wiped the instructor's recurring availability.
    // The overlap validation above + UI filtering prevents double bookings.

    // --- EMAIL NOTIFICATION START ---
    const clientEmail = user.email; // Auth email
    const clientName = 'Valued Client'; // We could fetch from profile if needed
    const studioName = booking.slots.studios.name;
    const studioAddress = booking.slots.studios.address;
    const instructorName = booking.profiles?.full_name || 'Instructor';
    const instructorEmail = booking.profiles?.email;
    const date = formatManilaDateStr(booking.slots.date);
    const time = formatTo12Hour(booking.slots.start_time);

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
    const studioOwner = studioOwnerProfile; // Use the profile we fetched earlier

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
    revalidatePath(`/instructors/${instructorId}`)
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

export async function submitTopUpPaymentProof(
    topUpId: string,
    proofUrl: string
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    console.log('[TopUpSubmission] Starting submission for:', { topUpId, userId: user?.id })

    if (!user) {
        console.error('[TopUpSubmission] Unauthorized access attempt')
        return { error: 'Unauthorized' }
    }

    // 1. Upload proof to Supabase Storage
    const fileName = `${topUpId}-${Date.now()}.jpg`
    const { data: uploadData, error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(fileName, Buffer.from(proofUrl.split(',')[1], 'base64'), {
            contentType: 'image/jpeg',
            cacheControl: '3600',
            upsert: true
        })

    if (uploadError) {
        console.error('[TopUpSubmission] Storage Upload Error:', uploadError)
        return { error: 'Failed to upload payment proof. Please try again.' }
    }

    // 2. Get Public URL
    const { data: { publicUrl } } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(fileName)

    console.log('[TopUpSubmission] Proof uploaded successfully:', publicUrl)

    // 3. Update the wallet_top_ups record
    const { data: updatedData, error: updateError, count } = await supabase
        .from('wallet_top_ups')
        .update({
            payment_proof_url: publicUrl,
            status: 'pending',
            updated_at: new Date().toISOString()
        })
        .eq('id', topUpId)
        .eq('user_id', user.id)
        .select()

    if (updateError) {
        console.error('[TopUpSubmission] Database Update Error:', updateError)
        return { error: `Failed to save request: ${updateError.message}` }
    }

    if (!updatedData || updatedData.length === 0) {
        console.error('[TopUpSubmission] No record found to update:', { topUpId, userId: user.id })
        return { error: 'Top-up record not found or you do not have permission to update it.' }
    }

    console.log('[TopUpSubmission] Record updated successfully:', updatedData[0].id)

    revalidatePath('/admin')
    revalidatePath('/customer/wallet')
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

    const normalizedTime = time.length === 5 ? time + ':00' : time;
    const startDateTime = new Date(`${date}T${normalizedTime}+08:00`)
    // We no longer rely on startISO for slot matching, but keep it for legacy if needed elsewhere
    // However, it's safer to just use strings now.

    // 0. Check Instructor Suspension & Balance
    const { data: instructorProfile } = await supabase
        .from('profiles')
        .select('is_suspended, available_balance, full_name, rates, is_founding_partner, custom_fee_percentage')
        .eq('id', instructorId)
        .single()

    if (instructorProfile?.is_suspended) {
        return { error: 'This instructor is not currently accepting bookings.' }
    }

    if (instructorProfile && (instructorProfile.available_balance ?? 0) < 0) {
        return { error: `${instructorProfile.full_name || 'The instructor'} is currently not accepting new bookings due to a pending balance settlement.` }
    }

    // Normalize time to HH:mm:ss for consistent instructor_availability comparison
    const manilaDateStr = date;
    const manilaDayOfWeek = startDateTime.getDay();
    const timeStr = normalizeTimeTo24h(time);
    const trimmedLocation = location?.trim();

    // Query A: date-specific availability
    const { data: availByDate } = await supabase
        .from('instructor_availability')
        .select('id, group_id, location_area') // Changed select to fetch location
        .eq('instructor_id', instructorId)
        .eq('date', manilaDateStr)
        .lte('start_time', timeStr)
        .gt('end_time', timeStr);

    // Query B: weekly recurring availability
    const { data: availByDay } = await supabase
        .from('instructor_availability')
        .select('id, group_id, location_area') // Changed select to fetch location
        .eq('instructor_id', instructorId)
        .eq('day_of_week', manilaDayOfWeek)
        .is('date', null)
        .lte('start_time', timeStr)
        .gt('end_time', timeStr);

    const matchingTimeBlocks = [...(availByDate || []), ...(availByDay || [])];

    let isValidLocation = false;

    if (matchingTimeBlocks.length > 0) {
        const studioLocLower = (trimmedLocation || '').toLowerCase();
        isValidLocation = matchingTimeBlocks.some(block => {
            const blockLocLower = (block.location_area || '').toLowerCase();
            return !blockLocLower || studioLocLower.includes(blockLocLower) || blockLocLower.includes(studioLocLower);
        });

        if (!isValidLocation) {
            return { error: `Instructor is not available at "${trimmedLocation}" during this time.` }
        }
    } else {
        // If there are no matching time blocks, check if they have ANY blocks globally
        const { count: globalBlockCount } = await supabase
            .from('instructor_availability')
            .select('*', { count: 'exact', head: true })
            .eq('instructor_id', instructorId);

        if (globalBlockCount && globalBlockCount > 0) {
            return { error: `Instructor is not available at this date and time.` }
        }
        // If 0 blocks globally, we allow the booking (fallback)
    }

    // --- DOUBLE BOOKING VALIDATION START ---
    const { data: overlappingBookings } = await supabase
        .from('bookings')
        .select('id, slots!inner(start_time, date)')
        .eq('instructor_id', instructorId)
        .in('status', ['pending', 'approved'])
        .eq('slots.date', date)
        .eq('slots.start_time', timeStr);

    if (overlappingBookings && overlappingBookings.length > 0) {
        return { error: 'The instructor is already booked for this time slot.' }
    }
    // --- DOUBLE BOOKING VALIDATION END ---

    // 2. Find Available Studio Slot
    // Criteria: Verified Studio, Location Match, Equipment Match, Time Match, IS AVAILABLE
    const { data: availableSlots, error: slotError } = await supabase
        .from('slots')
        .select(`
            *,
            studios!inner(*, profiles!owner_id(available_balance, is_suspended, full_name))
        `)
        .eq('is_available', true)
        .eq('date', date)
        .eq('start_time', timeStr) // Exact match for slot start
        //.eq('end_time', endDateTime.toISOString()) // Optional, if slots are strict 1 hour
        .eq('studios.verified', true)
    // We will filter location and equipment availability in JS for better case-insensitivity support

    if (slotError) {
        console.error('Slot search error:', slotError)
        return { error: 'Error searching for studios.' }
    }

    if (!availableSlots || availableSlots.length === 0) {
        return { error: 'No studio slots available with this equipment.' }
    }

    // 2.1 Filter by Location & Equipment (Case-Insensitive) & Studio Owner's Status
    const filteredSlots = availableSlots.filter((s: any) => {
        const studioLoc = (s.studios?.location ?? '').trim().toLowerCase();
        const inputLoc = trimmedLocation.toLowerCase();
        const locationMatch = studioLoc === inputLoc || studioLoc.includes(inputLoc) || inputLoc.includes(studioLoc);

        // Check equipment robustly
        const eqData = s.equipment || {};
        const equipmentKey = Object.keys(eqData).find(k => k.trim().toLowerCase() === equipment.trim().toLowerCase());
        const eqAvailable = equipmentKey ? (eqData[equipmentKey] ?? 0) >= 1 : false;

        if (!locationMatch || !eqAvailable) return false;

        const owner = Array.isArray(s.studios.profiles) ? s.studios.profiles[0] : s.studios.profiles;
        return !owner?.is_suspended && (owner?.available_balance ?? 0) >= 0;
    });

    if (filteredSlots.length === 0) {
        return { error: 'The available studios are currently not accepting new bookings.' }
    }

    // 3. Double-Booking Check & Selection
    // Even if is_available is true, double check `bookings` just in case (optional but requested)
    // We iterate to find the first truly free one.
    let selectedSlot = null;

    for (const slot of filteredSlots) {
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

    // --- ATOMIC BOOKING VIA RPC START ---
    let currentEquipment: Record<string, number> = {};
    if (selectedSlot.equipment && typeof selectedSlot.equipment === 'object') {
        if (Array.isArray(selectedSlot.equipment)) {
            selectedSlot.equipment.forEach((item: any) => {
                if (typeof item === 'string') {
                    currentEquipment[item.trim().toUpperCase()] = 1;
                }
            });
        } else {
            currentEquipment = selectedSlot.equipment as Record<string, number>;
        }
    }

    const exactDbKey = Object.keys(currentEquipment).find(
        k => k.trim().toUpperCase() === equipment.trim().toUpperCase()
    );

    if (!exactDbKey || (currentEquipment[exactDbKey] ?? 0) < 1) {
        return { error: 'Failed to extract equipment for booking.' };
    }

    // Determine the base fee & service fee dynamically for the RPC
    const studioPricing = selectedSlot.studios?.pricing as Record<string, number> | null;
    const sKey = Object.keys(studioPricing || {}).find(k => k.toLowerCase() === equipment.toLowerCase());
    const studioFee = sKey ? (studioPricing?.[sKey] || 0) : (Number(selectedSlot.studios?.hourly_rate) || 0);

    const instructorRates = instructorProfile?.rates as Record<string, number> | null;
    const instructorKey = Object.keys(instructorRates || {}).find(k => k.toUpperCase() === 'REFORMER');
    const instructorFee = instructorKey ? (instructorRates?.[instructorKey] || 0) : 0;

    const baseFee = studioFee + instructorFee;
    let feePercentage = 20;

    if (selectedSlot.studios?.is_founding_partner && selectedSlot.studios?.custom_fee_percentage !== undefined) {
        feePercentage = selectedSlot.studios.custom_fee_percentage;
    } else if (instructorProfile?.is_founding_partner && instructorProfile?.custom_fee_percentage !== undefined) {
        feePercentage = instructorProfile.custom_fee_percentage;
    }

    const calculatedServiceFee = baseFee * (feePercentage / 100);
    const serviceFee = Math.max(100, calculatedServiceFee);
    const totalPrice = baseFee + serviceFee;

    const breakdown = {
        studio_fee: studioFee,
        instructor_fee: instructorFee,
        service_fee: serviceFee,
        equipment: equipment,
        quantity: 1
    };

    const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);
    const reqStartTime = toManilaTimeString(startDateTime);
    const reqEndTime = toManilaTimeString(endDateTime);

    // Note: bookInstructorSession seems to create "approved" bookings for immediate sessions or direct matches
    // But we use the atomic RPC to ensure structure. We will default to RPC pending and immediately update to approved here,
    // or rely on the RPC logic. For full atomic safety, the booking is created pending.
    const { data: rpcResult, error: rpcError } = await supabase.rpc('book_slot_atomic', {
        p_slot_id: selectedSlot.id,
        p_instructor_id: instructorId,
        p_client_id: user.id,
        p_equipment_key: exactDbKey,
        p_quantity: 1,
        p_db_price: totalPrice,
        p_price_breakdown: breakdown,
        p_wallet_deduction: 0, // Assume no direct wallet hit here unless later processed
        p_req_start_time: reqStartTime,
        p_req_end_time: reqEndTime
    });

    if (rpcError) {
        console.error('Atomic Booking RPC Error:', rpcError);
        return { error: `Booking creation failed. (${rpcError.message})` };
    }

    if (!rpcResult?.success) {
        return { error: 'Failed to create booking securely.' };
    }

    const { booking_id: actualBookingId } = rpcResult;

    // Immediately mark as approved since this is a direct instructor session matching
    await supabase.from('bookings').update({ status: 'approved' }).eq('id', actualBookingId);

    const booking = { id: actualBookingId };
    // --- ATOMIC BOOKING VIA RPC END ---

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
                date,
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
            const dateStr = formatManilaDateStr(slots?.date);
            const timeStr = formatTo12Hour(slots?.start_time);

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
    revalidatePath(`/instructors/${instructorId}`)
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
            *,
            slots (
                start_time,
                date
            )
        `)
        .eq('id', bookingId)
        .single();

    if (fetchError || !booking) {
        return { error: 'Booking not found.' }
    }

    if (booking.client_id !== user.id) {
        return { error: 'Unauthorized to cancel this booking.' }
    }

    if (['cancelled_refunded', 'cancelled_charged'].includes(booking.status)) {
        return { error: 'Booking is already cancelled.' }
    }

    // Helper to safely extract from potential arrays
    const getFirst = (item: any) => Array.isArray(item) ? item[0] : item;
    const slotData = getFirst(booking.slots);

    if (!slotData?.start_time) {
        return { error: 'Invalid booking data (missing slot start time).' }
    }

    const startTime = new Date(`${slotData.date}T${slotData.start_time}+08:00`).getTime()
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

    let refundAmount = 0;
    const breakdown = booking.price_breakdown as any;
    const walletDeduction = Number(breakdown?.wallet_deduction || 0);
    const totalPrice = Number(booking.total_price || 0);

    if (hoursUntilStart >= 24) {
        // Only if the booking was approved (cash portion confirmed) do we refund total_price + wallet_deduction.
        // If it's pending/submitted/confirmed, we only return the amount actually deducted from their wallet.
        if (booking.status === 'approved') {
            refundAmount = totalPrice + walletDeduction;
        } else {
            refundAmount = walletDeduction;
        }
    }

    // 3. Update the database within a simulated transaction
    if (refundAmount > 0) {
        const { error: refundError } = await supabase.rpc('increment_available_balance', {
            user_id: user.id,
            amount: refundAmount
        })
        if (refundError) {
            console.error('Wallet increment error:', refundError)
            return { error: `Failed to process refund to wallet: ${refundError.message} (Code: ${refundError.code})` }
        }

        // Log the refund transaction
        await supabase.from('wallet_top_ups').insert({
            user_id: user.id,
            amount: refundAmount,
            status: 'approved', // instantly approved
            type: 'refund',
            admin_notes: `Refund for cancelled booking`
        })
    }

    // Preserve existing breakdown and add refunded_amount
    const currentBreakdown = typeof booking.price_breakdown === 'object' && booking.price_breakdown !== null
        ? booking.price_breakdown
        : {};

    // Mark as cancelled and release the slot(s)
    const newStatus = hoursUntilStart >= 24 ? 'cancelled_refunded' : 'cancelled_charged';

    const { error: updateError } = await supabase.from('bookings').update({
        status: newStatus,
        price_breakdown: {
            ...currentBreakdown,
            refunded_amount: refundAmount
        }
    }).eq('id', bookingId);

    if (updateError) {
        console.error('Booking cancel update error:', updateError);
        return { error: 'Failed to update booking status during cancellation.' };
    }

    // Release all associated slots
    const slotsToRelease = Array.isArray(booking.booked_slot_ids) && booking.booked_slot_ids.length > 0
        ? booking.booked_slot_ids
        : [booking.slot_id];

    await supabase.from('slots').update({ is_available: true }).in('id', slotsToRelease);

    // --- AUTO-REMOVAL OF AVAILABILITY START ---
    // If an instructor is cancelling their own studio rental, remove the auto-created availability
    if (booking.client_id === booking.instructor_id) {
        try {
            const startDateTime = new Date(`${slotData.date}T${slotData.start_time}+08:00`);
            const dateStr = toManilaDateStr(startDateTime);
            const timeStr = slotData.start_time.slice(0, 5);

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

    // Create a pending top-up record
    const { data, error } = await supabase
        .from('wallet_top_ups')
        .insert({
            user_id: user.id,
            amount,
            status: 'pending',
            type: 'top_up'
        })
        .select()
        .single()

    if (error) {
        console.error('[TopUpWallet] Error creating top-up request:', error)
        return { error: 'Failed to create top-up request.' }
    }

    console.log('[TopUpWallet] Created record successfully:', data.id)

    revalidatePath('/customer/wallet')
    return { success: true, topUpId: data.id }
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

    // Fetch top-ups and adjustments from wallet_top_ups table
    const { data: walletActions } = await supabase
        .from('wallet_top_ups')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    const transactions: any[] = [];

    const getFirst = (item: any) => Array.isArray(item) ? item[0] : item;

    walletActions?.forEach(wa => {
        if (wa.status === 'approved' || wa.type === 'admin_adjustment' || wa.type === 'refund') {
            transactions.push({
                id: wa.id,
                date: wa.updated_at || wa.created_at,
                type: wa.type === 'admin_adjustment' ? 'Direct Adjustment' : wa.type === 'refund' ? 'Booking Refund' : 'Wallet Top-Up',
                amount: wa.amount, // Could be negative for deductions in admin_adjustment
                status: 'completed',
                details: wa.admin_notes || (wa.type === 'admin_adjustment' ? 'Manual balance adjustment' : wa.type === 'refund' ? 'Refund for cancelled/declined booking' : 'Gcash/Bank Top-up')
            });
        }
    });

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
