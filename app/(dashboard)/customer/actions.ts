'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { uploadContentType } from '@/lib/utils/image-utils'
import { sendEmail } from '@/lib/email'
import BookingNotificationEmail from '@/components/emails/BookingNotificationEmail'
import { formatManilaDate, formatManilaTime, roundToISOString, formatManilaDateStr, formatTo12Hour, toManilaDateStr, getManilaTodayStr, normalizeTimeTo24h, toManilaTimeString } from '@/lib/timezone'

export async function requestBooking(
    slotId: string | null,
    instructorId: string,
    quantity: number = 1,
    equipment?: string,
    bookingStart?: string, // optional custom range
    bookingEnd?: string,
    bookingType: 'studio' | 'home' = 'studio',
    clientAddress?: string,
    clientLat?: number | null,
    clientLng?: number | null
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    let actualBookingId: string | null = null;
    let studioOwnerProfile: any = null;

    // --- CASE A: STUDIO BOOKING ---
    if (bookingType === 'studio') {
        if (!slotId) return { error: 'Slot ID is required for studio bookings.' };

        // 1. Fetch available slot
        const { data: slot, error: slotError } = await supabase
            .from('slots')
            .select('*, studios!inner(pricing, hourly_rate, id, is_founding_partner, custom_fee_percentage, location, profiles!owner_id(available_balance, is_suspended, full_name, email))')
            .eq('id', slotId)
            .eq('is_available', true)
            .single()

        if (slotError || !slot) return { error: `Slot no longer available.` }

        const studio = (slot as any)?.studios;
        studioOwnerProfile = Array.isArray(studio.profiles) ? studio.profiles[0] : studio.profiles;
        if (studioOwnerProfile?.is_suspended || (studioOwnerProfile?.available_balance ?? 0) < 0) {
            return { error: `Studio is not accepting new bookings.` }
        }

        // Fetch Instructor
        const { data: instructor } = await supabase.from('profiles').select('full_name, rates, is_founding_partner, custom_fee_percentage, available_balance').eq('id', instructorId).single()
        if (instructor && (instructor.available_balance ?? 0) < 0) return { error: `Instructor is not accepting bookings.` }

        // --- DOUBLE BOOKING CHECK ---
        const timeStr = normalizeTimeTo24h(slot.start_time);
        const { data: overlapping } = await supabase.from('bookings').select('id').eq('instructor_id', instructorId).in('status', ['pending', 'approved']).eq('booking_date', slot.date).eq('booking_start_time', timeStr);
        if (overlapping && overlapping.length > 0) return { error: 'Instructor already booked for this time.' }

        // --- PRICE CALCULATION ---
        const studioPricing = studio.pricing as Record<string, number> | null;
        const sKey = Object.keys(studioPricing || {}).find(k => k.toLowerCase() === (equipment || '').toLowerCase());
        const studioFee = sKey ? (studioPricing?.[sKey] || 0) : (Number(studio.hourly_rate) || 0);

        const instructorRates = instructor?.rates as Record<string, number> | null;
        const instructorKey = Object.keys(instructorRates || {}).find(k => k.toUpperCase() === 'REFORMER');
        const instructorFee = instructorKey ? (instructorRates?.[instructorKey] || 0) : 0;

        const baseFee = studioFee + instructorFee;
        let feePercentage = 20;
        if (studio?.custom_fee_percentage !== undefined) feePercentage = studio.custom_fee_percentage;
        else if (instructor?.custom_fee_percentage !== undefined) feePercentage = instructor.custom_fee_percentage;

        const calculatedServiceFee = baseFee * (feePercentage / 100);
        const serviceFee = Math.max(100, calculatedServiceFee);
        const totalPrice = (baseFee + serviceFee) * quantity;

        // --- WALLET DEDUCTION ---
        const { data: profile } = await supabase.from('profiles').select('available_balance').eq('id', user.id).single();
        const deduction = Math.min(profile?.available_balance ?? 0, totalPrice);
        const finalPrice = totalPrice - deduction;

        // --- ATOMIC RPC ---
        const { data: rpcResult, error: rpcError } = await supabase.rpc('book_slot_atomic', {
            p_slot_id: slotId, p_instructor_id: instructorId, p_client_id: user.id, p_equipment_key: equipment?.toUpperCase() || 'MAT',
            p_quantity: quantity, p_db_price: finalPrice, p_price_breakdown: { studio_fee: studioFee, instructor_fee: instructorFee, service_fee: serviceFee },
            p_wallet_deduction: deduction
        });

        if (rpcError || !rpcResult?.success) return { error: 'Booking failed.' };
        actualBookingId = rpcResult.booking_id;

        // Update home-specific columns for unified search
        await supabase.from('bookings').update({ 
            booking_date: slot.date, 
            booking_start_time: slot.start_time, 
            booking_end_time: slot.end_time 
        }).eq('id', actualBookingId);
    }
    // --- CASE B: HOME BOOKING ---
    else {
        // Fetch Instructor
        const { data: instructor } = await supabase.from('profiles').select('*').eq('id', instructorId).single();
        if (!instructor?.offers_home_sessions) return { error: 'Instructor does not offer home sessions.' };
        if (instructor.available_balance < 0) return { error: 'Instructor not accepting bookings.' };

        // Distance Check
        if (instructor.home_base_lat && instructor.home_base_lng && clientLat && clientLng) {
            const { calculateDistance } = await import('@/lib/utils/location');
            const dist = calculateDistance(Number(instructor.home_base_lat), Number(instructor.home_base_lng), clientLat, clientLng);
            if (dist > (instructor.max_travel_km || 10)) return { error: 'Outside of travel range.' };
        }

        // Availability (Basic check using date & time from strings)
        const dateStr = bookingStart?.split('T')[0];
        const timeStr = bookingStart?.split('T')[1]?.split('.')[0]; // HH:mm:ss
        if (!dateStr || !timeStr) return { error: 'Invalid date/time.' };

        // Double Booking Check
        const { data: overlapping } = await supabase.from('bookings').select('id').eq('instructor_id', instructorId).in('status', ['pending', 'approved']).eq('booking_date', dateStr).eq('booking_start_time', timeStr);
        if (overlapping && overlapping.length > 0) return { error: 'Instructor already booked for this time.' }

        // Price Calculation (Instructor Rate only)
        const instructorRates = (instructor?.rates as any) || {};
        const instructorFee = instructorRates['MAT'] || 1500;
        const serviceFee = Math.max(100, instructorFee * 0.2);
        const totalPrice = (instructorFee + serviceFee) * quantity;

        // Wallet Deduction logic (client-side calculation before atomic commit)
        const { data: profile } = await supabase.from('profiles').select('available_balance').eq('id', user.id).single();
        const deduction = Math.min(profile?.available_balance ?? 0, totalPrice);
        const finalPrice = totalPrice - deduction;

        // --- ATOMIC RPC ---
        const { data: rpcResult, error: rpcError } = await supabase.rpc('book_home_session_atomic', {
            p_instructor_id: instructorId,
            p_client_id: user.id,
            p_date: dateStr,
            p_start_time: timeStr,
            p_end_time: bookingEnd?.split('T')[1]?.split('.')[0],
            p_total_price: finalPrice,
            p_price_breakdown: { instructor_fee: instructorFee, service_fee: serviceFee, wallet_deduction: deduction },
            p_wallet_deduction: deduction,
            p_home_address: clientAddress,
            p_home_lat: clientLat,
            p_home_lng: clientLng
        });

        if (rpcError || !rpcResult?.success) return { error: rpcError?.message || 'Booking failed.' };
        actualBookingId = rpcResult.booking_id;
    }

    if (!actualBookingId) return { error: 'Booking failed.' };

    // --- ENRICHED BOOKING FETCH AND EMAILS ---
    const { data: booking, error: fetchBookingError } = await supabase
        .from('bookings')
        .select(`
            *,
            slots (
                date,
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

    if (booking && !fetchBookingError) {
        const clientEmail = user.email;
        const instructorEmail = (booking.profiles as any)?.email;
        const instructorName = (booking.profiles as any)?.full_name || 'Instructor';
        const studioName = (booking.slots as any)?.studios?.name || 'Home Session';
        const studioAddress = (booking.slots as any)?.studios?.address || booking.home_address;
        const date = formatManilaDateStr(booking.booking_date || (booking.slots as any)?.date);
        const time = formatTo12Hour(booking.booking_start_time || (booking.slots as any)?.start_time);

        if (clientEmail) {
            await sendEmail({
                to: clientEmail,
                subject: `Booking Requested: ${studioName}`,
                react: BookingNotificationEmail({
                    recipientName: 'Valued Client',
                    bookingType: 'New Booking',
                    studioName,
                    address: studioAddress,
                    instructorName,
                    date,
                    time,
                    equipment: (booking.price_breakdown as any)?.equipment || 'MAT',
                    quantity: (booking.price_breakdown as any)?.quantity || 1
                })
            });
        }

        if (instructorEmail) {
            await sendEmail({
                to: instructorEmail,
                subject: `New Client Booking Request`,
                react: BookingNotificationEmail({
                    recipientName: instructorName,
                    bookingType: 'New Booking',
                    studioName,
                    clientName: 'A Client',
                    date,
                    time,
                    equipment: (booking.price_breakdown as any)?.equipment || 'MAT',
                    quantity: (booking.price_breakdown as any)?.quantity || 1
                })
            });
        }

        if (studioOwnerProfile?.email) {
            await sendEmail({
                to: studioOwnerProfile.email,
                subject: `New Session Booked at your Studio`,
                react: BookingNotificationEmail({
                    recipientName: 'Studio Owner',
                    bookingType: 'New Booking',
                    studioName,
                    instructorName,
                    date,
                    time,
                    equipment: (booking.price_breakdown as any)?.equipment,
                    quantity: (booking.price_breakdown as any)?.quantity
                })
            });
        }
    }

    revalidatePath('/customer')
    revalidatePath(`/instructors/${instructorId}`)
    return { success: true, bookingId: actualBookingId }
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

    // --- ATOMIC RPC ---
    // Handles: Booking status update, Consent insertion, and Profile waiver_signed_at sync in 1 transaction
    const { data: rpcResult, error: rpcError } = await supabase.rpc('submit_payment_atomic', {
        p_booking_id: bookingId,
        p_client_id: user.id,
        p_proof_url: proofUrl,
        p_waiver_agreed: waiverAgreed,
        p_terms_agreed: termsAgreed,
        p_parq_answers: parqAnswers,
        p_has_risk_flags: hasRiskFlags,
        p_medical_clearance_acknowledged: medicalClearanceAcknowledged,
        p_waiver_version: '2026-03-22' // Updated version for the new atomic flow
    });

    if (rpcError || !rpcResult?.success) {
        console.error('Payment atomic submission error:', rpcError);
        return { error: rpcError?.message || 'Failed to submit payment securely.' };
    }

    revalidatePath(`/customer/payment/${bookingId}`)
    return { success: true }
}

export async function uploadTopUpProof(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const topUpId = formData.get('topUpId') as string
    const file = formData.get('file') as File

    if (!topUpId || !file) return { error: 'Missing required data' }

    // Upload via Admin Client to bypass RLS
    const adminSupabase = createAdminClient()
    const fileExt = file.name.split('.').pop()
    const fileName = `topup_${topUpId}_${Date.now()}.${fileExt}`
    const filePath = `${fileName}`

    const { error: uploadError } = await adminSupabase.storage
        .from('payment-proofs')
        .upload(filePath, file, { contentType: uploadContentType(file), upsert: false })

    if (uploadError) {
        console.error('[TopUpUpload] Storage Error:', uploadError)
        return { error: `Upload failed: ${uploadError.message}` }
    }

    // Reuse existing submission logic to update DB
    return await submitTopUpPaymentProof(topUpId, filePath)
}

export async function submitTopUpPaymentProof(
    topUpId: string,
    proofPath: string
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Unauthorized' }

    console.log('[TopUpSubmission] Received proof path:', proofPath)

    // Verify ownership first using user client (RLS-gated read)
    const { data: existing } = await supabase
        .from('wallet_top_ups')
        .select('id, status')
        .eq('id', topUpId)
        .eq('user_id', user.id)
        .single()

    if (!existing) {
        return { error: 'Top-up record not found or you do not have permission to update it.' }
    }

    if (existing.status !== 'pending') {
        return { error: 'This top-up has already been processed.' }
    }

    // Use admin client to bypass RLS for the update
    const adminSupabase = createAdminClient()
    const { data: updatedData, error: updateError } = await adminSupabase
        .from('wallet_top_ups')
        .update({
            payment_proof_url: proofPath,
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
    revalidatePath('/instructor/earnings')
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
        .select('id, group_id, location_area, equipment') // Changed select to fetch location and equipment
        .eq('instructor_id', instructorId)
        .eq('date', manilaDateStr)
        .lte('start_time', timeStr)
        .gt('end_time', timeStr);

    // Query B: weekly recurring availability
    const { data: availByDay } = await supabase
        .from('instructor_availability')
        .select('id, group_id, location_area, equipment') // Changed select to fetch location and equipment
        .eq('instructor_id', instructorId)
        .eq('day_of_week', manilaDayOfWeek)
        .is('date', null)
        .lte('start_time', timeStr)
        .gt('end_time', timeStr);

    const matchingTimeBlocks = [...(availByDate || []), ...(availByDay || [])];

    let isValidLocationAndEq = false;

    if (matchingTimeBlocks.length > 0) {
        const studioLocLower = (trimmedLocation || '').toLowerCase();
        const requestedEqLower = (equipment || '').toLowerCase();

        isValidLocationAndEq = matchingTimeBlocks.some(block => {
            const blockLocLower = (block.location_area || '').toLowerCase();
            const locationMatch = !blockLocLower || studioLocLower.includes(blockLocLower) || blockLocLower.includes(studioLocLower);

            // Equipment check (allow through if instructor hasn't specified equipment = old behavior)
            let equipmentMatch = true;
            if (block.equipment && Array.isArray(block.equipment) && block.equipment.length > 0) {
                equipmentMatch = block.equipment.some((eq: string) => eq.toLowerCase() === requestedEqLower);
            }

            return locationMatch && equipmentMatch;
        });

        if (!isValidLocationAndEq) {
            return { error: `Instructor is not available at "${trimmedLocation}" for "${equipment}" during this time.` }
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
    const filteredSlotIds = filteredSlots.map(s => s.id);
    const { data: activeBookings } = await supabase
        .from('bookings')
        .select('slot_id')
        .in('slot_id', filteredSlotIds)
        .neq('status', 'rejected');

    const bookedSlotIds = new Set(activeBookings?.map(b => b.slot_id) || []);
    let selectedSlot = filteredSlots.find(s => !bookedSlotIds.has(s.id)) || null;

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

    if (selectedSlot.studios?.custom_fee_percentage !== undefined) {
        feePercentage = selectedSlot.studios.custom_fee_percentage;
    } else if (instructorProfile?.custom_fee_percentage !== undefined) {
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
                    time: timeStr,
                    equipment: (enrichedBooking.price_breakdown as any)?.equipment,
                    quantity: (enrichedBooking.price_breakdown as any)?.quantity
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
                        time: timeStr,
                        equipment: (enrichedBooking.price_breakdown as any)?.equipment,
                        quantity: (enrichedBooking.price_breakdown as any)?.quantity
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
                            time: timeStr,
                            equipment: (enrichedBooking.price_breakdown as any)?.equipment,
                            quantity: (enrichedBooking.price_breakdown as any)?.quantity
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

export async function cancelBooking(bookingId: string, reason: string = 'Cancelled by client') {
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

    // 3. Mark as cancelled atomically to prevent double refunds
    const newStatus = hoursUntilStart >= 24 ? 'cancelled_refunded' : 'cancelled_charged';
    const currentBreakdown = typeof booking.price_breakdown === 'object' && booking.price_breakdown !== null
        ? booking.price_breakdown
        : {};

    const { data: updatedBooking, error: updateError } = await supabase.from('bookings').update({
        status: newStatus,
        cancel_reason: reason,
        cancelled_by: user.id,
        price_breakdown: {
            ...currentBreakdown,
            refunded_amount: refundAmount,
            refund_initiator: 'client'
        }
    })
        .eq('id', bookingId)
        .in('status', ['approved', 'pending'])
        .select('id')

    if (updateError) {
        console.error('Booking cancel update error:', updateError);
        return { error: 'Failed to update booking status during cancellation.' };
    }

    if (!updatedBooking || updatedBooking.length === 0) {
        return { error: 'Booking already cancelled or not eligible for cancellation.' }
    }

    // 4. Process Refund only if the atomic update was successful
    if (refundAmount > 0) {
        const { error: refundError } = await supabase.rpc('increment_available_balance', {
            user_id: user.id,
            amount: refundAmount
        })
        if (refundError) {
            console.error('Wallet increment error:', refundError)
            return { error: `Cancellation processed, but refund failed: ${refundError.message}` }
        }

        // Log the refund transaction
        await supabase.from('wallet_top_ups').insert({
            user_id: user.id,
            amount: refundAmount,
            status: 'approved',
            type: 'refund',
            admin_notes: `Refund for cancelled booking`
        })
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
    revalidatePath('/instructor/earnings')
    return { success: true, topUpId: data.id }
}

export async function getCustomerWalletDetails() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Unauthorized' }


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

    // Fetch bookings with wallet deductions
    const { data: walletBookings } = await supabase
        .from('bookings')
        .select(`
            id,
            created_at,
            status,
            price_breakdown,
            slots (
                date,
                start_time
            ),
            studios:studio_id (
                name
            )
        `)
        .eq('client_id', user.id)
        .not('price_breakdown', 'is', null);

    const transactions: any[] = [];

    const getFirst = (item: any) => Array.isArray(item) ? item[0] : item;

    // 1. Process Wallet Top-ups/Adjustments
    walletActions?.forEach(wa => {
        if (wa.status === 'approved' || wa.type === 'admin_adjustment' || wa.type === 'refund' || wa.type === 'referral_bonus') {
            const typeLabel = wa.type === 'admin_adjustment' ? 'Direct Adjustment'
                : wa.type === 'refund' ? 'Booking Refund'
                : wa.type === 'referral_bonus' ? 'Referral Bonus'
                : 'Wallet Top-Up'
            const detailsFallback = wa.type === 'admin_adjustment' ? 'Manual balance adjustment'
                : wa.type === 'refund' ? 'Refund for cancelled/declined booking'
                : wa.type === 'referral_bonus' ? 'Your friend completed their first booking'
                : 'Gcash/Bank Top-up'
            transactions.push({
                id: wa.id,
                date: wa.updated_at || wa.created_at,
                type: typeLabel,
                amount: wa.amount,
                status: 'completed',
                details: wa.admin_notes || detailsFallback
            });
        }
    });

    // 2. Process Booking Deductions
    walletBookings?.forEach(b => {
        const breakdown = b.price_breakdown as any;
        const deduction = Number(breakdown?.wallet_deduction || 0);

        if (deduction > 0) {
            const slot = getFirst(b.slots);
            const studio = getFirst(b.studios);
            const studioName = studio?.name || slot?.studios?.name || 'Studio';

            // Correct mapping for cancellation/rejection
            let displayStatus = b.status === 'pending' || b.status === 'submitted' ? 'pending'
                : b.status === 'approved' || b.status === 'completed' ? 'completed'
                    : b.status; // expired, rejected, cancelled, cancelled_refunded, cancelled_charged

            transactions.push({
                id: b.id,
                date: b.created_at,
                session_date: slot?.date,
                session_time: slot?.start_time,
                type: 'Booking Payment',
                amount: -deduction, // Negative for spending
                status: displayStatus,
                details: `Payment for booking at ${studioName}${b.status === 'cancelled_refunded' ? ' (Refunded)' : b.status === 'cancelled_charged' ? ' (No Refund)' : ''}`
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
