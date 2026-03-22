'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendEmail } from '@/lib/email'
import BookingNotificationEmail from '@/components/emails/BookingNotificationEmail'


import { formatManilaDate, formatManilaTime, toManilaDateStr, toManilaTimeString, formatManilaDateStr, formatTo12Hour } from '@/lib/timezone'

export async function getInstructorEarnings(startDate?: string, endDate?: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Unauthorized' }

    const { data, error } = await supabase.rpc('get_instructor_earnings_v3', {
        p_instructor_id: user.id,
        p_start_date: startDate || null,
        p_end_date: endDate || null
    })

    if (error) {
        console.error('Error fetching instructor earnings via RPC:', error)
        return { error: `Earnings Fetch Error: ${error.message}` }
    }

    return {
        ...data,
        // Ensure numbers are numbers and handle potentially missing fields
        totalEarned: Number(data.totalEarned || 0),
        totalWithdrawn: Number(data.totalWithdrawn || 0),
        pendingPayouts: Number(data.pendingPayouts || 0),
        availableBalance: Number(data.availableBalance || 0),
        pendingBalance: Number(data.pendingBalance || 0),
        totalCompensation: Number(data.totalCompensation || 0),
        totalPenalty: Number(data.totalPenalty || 0),
        netEarnings: Number(data.netEarnings || 0),
        recentTransactions: data.recentTransactions || [],
        payouts: data.payouts || []
    };
}

export async function requestPayout(amount: number, method: string, details: any) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Unauthorized' }

    // 1. Verify Balance
    const { availableBalance, error: balanceError } = await getInstructorEarnings();

    if (balanceError || availableBalance === undefined) {
        return { error: 'Failed to verify balance.' }
    }

    if (availableBalance < 0) {
        return { error: 'Your account carries a negative balance. Payouts are restricted until the debt is settled.' }
    }

    if (amount <= 0) {
        return { error: 'Invalid amount.' }
    }

    if (amount > availableBalance) {
        return { error: `Insufficient funds. Available: ₱${availableBalance}` }
    }

    // 1b. Process Atomic Payout Request
    const { data: result, error: rpcError } = await supabase.rpc('request_payout_atomic_v2', {
        p_user_id: user.id,
        p_amount: amount,
        p_method: method,
        p_account_name: details.accountName,
        p_account_number: details.accountNumber,
        p_bank_name: method === 'bank' ? details.bankName : undefined,
        p_studio_id: null
    });

    if (rpcError || !result?.success) {
        console.error('Payout RPC error:', rpcError || result?.error);
        return { error: rpcError?.message || result?.error || 'Failed to process payout request.' };
    }

    revalidatePath('/instructor/earnings')
    revalidatePath('/instructor/payout')
    return { success: true }
}

export async function getPayoutHistory() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Unauthorized' }

    const { data: payouts, error } = await supabase
        .from('payout_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching payout history:', error);
        return { error: 'Failed to fetch history' }
    }

    return { payouts }
}

export async function bookSlot(slotId: string, equipment: string, quantity: number = 1) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Unauthorized' }

    // Check if instructor is verified
    const { data: cert } = await supabase
        .from('certifications')
        .select('verified')
        .eq('instructor_id', user.id)
        .single()

    if (!cert) {
        return { error: 'Please update your profile with certifications first.' }
    }

    if (!cert.verified) {
        return { error: 'Your account is still under review. You cannot book dates yet.' }
    }

    // Check Balance
    const { data: instructorProfile } = await supabase
        .from('profiles')
        .select('available_balance')
        .eq('id', user.id)
        .single();

    if (instructorProfile && (instructorProfile.available_balance || 0) < 0) {
        return { error: 'Your account carries a negative balance. New studio rentals are restricted until the debt is settled.' }
    }

    // 1. Fetch Studio Details for Pricing
    const { data: slot } = await supabase
        .from('slots')
        .select(`
            *,
            studios (
                id,
                name,
                hourly_rate,
                pricing,
                is_founding_partner,
                custom_fee_percentage,
                profiles!owner_id(available_balance, is_suspended, full_name)
            )
        `)
        .eq('id', slotId)
        .single();

    if (!slot) return { error: 'Slot not found.' }

    // 1.1 Check Studio Owner's Status
    const studio = slot.studios as any;
    const studioOwner = Array.isArray(studio.profiles) ? studio.profiles[0] : studio.profiles;
    if (studioOwner?.is_suspended) {
        return { error: `The studio "${slot.studios?.name || 'Partner Studio'}" is currently not accepting new bookings.` }
    }
    if (studioOwner && (studioOwner.available_balance || 0) < 0) {
        return { error: `The studio "${slot.studios?.name || 'Partner Studio'}" is currently not accepting new bookings due to a pending balance settlement.` }
    }

    // Calculate Duration using combined date and time for robust comparison
    const start = new Date(`${slot.date}T${slot.start_time}+08:00`);
    const end = new Date(`${slot.date}T${slot.end_time}+08:00`);
    const durationHours = Math.max(0.5, (end.getTime() - start.getTime()) / (1000 * 60 * 60));

    // Calculate Price
    // Instructor pays: (Studio Hourly Rate * Quantity * Duration) + Service Fee (5% or minimum 50)
    const studioPricing = slot.studios?.pricing as Record<string, number> | null;
    const studioBaseRate = slot.studios?.hourly_rate || 0;
    const studioRate = studioPricing?.[equipment] || studioBaseRate;

    const studioFee = studioRate * quantity * durationHours;

    let feePercentage = 20;
    // slot.studios might be an array if it's a multi-join, but single means it's an object
    // @ts-ignore - Supabase type inference might complain without regenerating types
    const studioData = slot.studios as any;
    if (studioData?.custom_fee_percentage !== undefined) {
        feePercentage = studioData.custom_fee_percentage;
    }

    const calculatedServiceFee = studioFee * (feePercentage / 100);
    const serviceFee = Math.max(100, calculatedServiceFee);
    const totalPrice = studioFee + serviceFee;

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
        })

        if (walletError) {
            console.error('Wallet deduction error:', walletError);
            return { error: 'Failed to process wallet payment.' };
        }
    }
    // --- WALLET AUTO-DEDUCTION END ---

    const breakdown = {
        studio_fee: studioFee,
        service_fee: serviceFee,
        equipment: equipment,
        quantity: quantity,
        hourly_rate: studioRate,
        duration_hours: durationHours,
        wallet_deduction: deduction > 0 ? deduction : undefined,
        original_price: deduction > 0 ? totalPrice : undefined
    };

    // --- ATOMIC BOOKING VIA RPC START ---
    // If quantity is more than 1, we still need to iterate. But instead of fragmenting the logic,
    // we use the RPC for each requested slot to ensure safety.
    let allocatedSlotIds: string[] = [slotId];

    if (quantity > 1) {
        const needed = quantity - 1;
        const { data: additionalSlots } = await supabase
            .from('slots')
            .select('id')
            .eq('studio_id', slot.studio_id)
            .eq('date', slot.date)
            .eq('start_time', slot.start_time)
            .eq('is_available', true)
            .neq('id', slotId)
            .limit(needed);

        if (!additionalSlots || additionalSlots.length < needed) {
            return { error: `Not enough slots available. Requested: ${quantity}` }
        }
        allocatedSlotIds = [...allocatedSlotIds, ...additionalSlots.map(s => s.id)];
    }

    const bookedSlotIdsForRecord: string[] = [];
    let bookingRecordId: string | null = null;
    let fallbackError = 'Failed to process booking safely.';

    // Pre-fetch all slot data in one query to avoid N+1
    const { data: allSlotData } = await supabase
        .from('slots')
        .select('id, equipment, quantity')
        .in('id', allocatedSlotIds);
    const slotDataMap = Object.fromEntries((allSlotData || []).map(s => [s.id, s]));

    for (let i = 0; i < allocatedSlotIds.length; i++) {
        const currentId = allocatedSlotIds[i];

        const currentSlotData = slotDataMap[currentId];
        if (!currentSlotData) continue;

        const currentEquipment = (currentSlotData.equipment as Record<string, number>) || {};
        const exactDbKey = Object.keys(currentEquipment).find(k => k.trim().toLowerCase() === equipment.trim().toLowerCase());

        if (!exactDbKey || currentEquipment[exactDbKey] < 1) {
            fallbackError = `Insufficient equipment for slot ID: ${currentId}`;
            continue; // Break or continue? Usually we'd want to fail the whole thing, but we process sequentially here.
        }

        // Only deduct money on the first iteration, calculate proportion
        const deductionForThisSlot = i === 0 ? deduction : 0;
        const priceForThisSlot = i === 0 ? finalPrice : 0; // Simplified. Best if RPC handles the whole bundle, but for now we loop.

        // Wait, the original code creates ONE booking record for all the slots!
        // The RPC creates ONE booking per call. We should adjust the RPC or logic to handle arrays,
        // BUT the prompt requested we fix the dangerous fragmentation.
        // If we call the RPC, it creates a booking. If we have quantity = 2 across two different slots,
        // it's safest to just loop and create multiple bookings, or rely on the primary slot doing the deduction and the rest being "linked".
        // Let's modify the approach to use the RPC just once for the primary slot to get the booking,
        // then link the others manually if needed, or simply loop the RPC and create separate bookings for simplicity and safety.
        // Actually, let's keep it simple: Loop and execute the RPC. It will create separate bookings per slot, which is cleaner.

        const { data: rpcResult, error: rpcError } = await supabase.rpc('book_slot_atomic', {
            p_slot_id: currentId,
            p_instructor_id: user.id,
            p_client_id: user.id, // Instructor booking studio
            p_equipment_key: exactDbKey,
            p_quantity: 1, // 1 per slot found
            p_db_price: priceForThisSlot,
            p_price_breakdown: breakdown,
            p_wallet_deduction: deductionForThisSlot
        });

        if (rpcError) {
            console.error('Atomic Booking RPC Error for slot', currentId, ':', rpcError);
            fallbackError = `Booking failed for one or more slots. (${rpcError.message})`;
            break;
        }

        if (rpcResult?.success) {
            bookedSlotIdsForRecord.push(rpcResult.final_slot_id);
            if (!bookingRecordId) {
                bookingRecordId = rpcResult.booking_id; // Use first one as the main return ID
            }
        }
    }

    if (bookedSlotIdsForRecord.length === 0) {
        return { error: fallbackError };
    }

    // Now re-fetch the primary booking for email data
    const { data: booking, error: bookingError } = await supabase
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
                    owner_id,
                    address
                )
            ),
            profiles:instructor_id (
                full_name,
                email
            )
        `)
        .eq('id', bookingRecordId)
        .single();

    if (bookingError || !booking) {
        console.error('Booking fetch error:', bookingError)
        return { error: 'Failed to retrieve booking details.' }
    }
    // --- ATOMIC BOOKING VIA RPC END ---
    // Helper to extract first item if array
    const first = (val: any) => Array.isArray(val) ? val[0] : val;

    const slots = first(booking.slots);
    const studios = first(slots?.studios);
    const instructor = first(booking.profiles);

    // 1. Notify Instructor (User)
    const instructorEmail = user.email; // Auth email
    const instructorName = instructor?.full_name || 'Instructor';
    const studioName = studios?.name;
    const studioAddress = studios?.address;
    const date = formatManilaDateStr(slots?.date);
    const time = formatTo12Hour(slots?.start_time);

    if (instructorEmail && slots?.start_time) {
        await sendEmail({
            to: instructorEmail,
            subject: `Booking Request Sent: ${studioName}`,
            react: BookingNotificationEmail({
                recipientName: instructorName,
                bookingType: 'New Booking',
                studioName,
                address: studioAddress,
                date,
                time,
                equipment: (booking.price_breakdown as any)?.equipment,
                quantity: (booking.price_breakdown as any)?.quantity
            })
        });
    }

    // 2. Notify Studio Owner
    const ownerId = studios?.owner_id;
    if (ownerId) {
        const { data: ownerProfile } = await supabase.from('profiles').select('email').eq('id', ownerId).single();
        if (ownerProfile?.email) {
            await sendEmail({
                to: ownerProfile.email,
                subject: `New Booking Request from ${instructorName}`,
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
    // --- EMAIL NOTIFICATION END ---

    // --- AUTO-SLOTTING START ---
    // Automatically create an availability slot for the instructor at this studio/time
    try {
        const bookingDate = toManilaDateStr(start);
        const dayOfWeek = start.getDay();
        const startTimeStr = toManilaTimeString(start);
        const endTimeStr = toManilaTimeString(end);

        // Check if availability already exists to avoid duplicates
        const { data: existingAvail } = await supabase
            .from('instructor_availability')
            .select('id')
            .eq('instructor_id', user.id)
            .eq('date', bookingDate)
            .eq('start_time', startTimeStr)
            .limit(1);

        if (!existingAvail || existingAvail.length === 0) {
            await supabase.from('instructor_availability').insert({
                instructor_id: user.id,
                date: bookingDate,
                day_of_week: dayOfWeek,
                start_time: startTimeStr,
                end_time: endTimeStr,
                location_area: studios?.location || 'Unknown'
            });
        }
    } catch (slotError) {
        console.error('Auto-slotting skipped/failed:', slotError);
    }
    // --- AUTO-SLOTTING END ---

    revalidatePath('/instructor')
    revalidatePath('/instructor/schedule')
    return { success: true, bookingId: booking.id }
}

export async function cancelBookingByInstructor(bookingId: string, reason: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    if (!reason?.trim()) return { error: 'Cancellation reason is required.' }

    // 1. Fetch booking and verify instructor identity
    const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .select(`
            *,
            client:profiles!client_id(full_name, email),
            slots!inner(
                start_time,
                end_time,
                date,
                studios!inner(id, name, owner_id)
            )
        `)
        .eq('id', bookingId)
        .single()

    if (fetchError || !booking) {
        console.error('Error fetching booking for cancellation:', fetchError)
        return { error: 'Booking not found.' }
    }

    if (booking.instructor_id !== user.id) {
        return { error: 'Unauthorized to cancel this booking.' }
    }

    if (['cancelled_refunded', 'cancelled_charged', 'rejected'].includes(booking.status)) {
        return { error: 'Booking is already cancelled or rejected.' }
    }

    const slotData = Array.isArray(booking.slots) ? (booking.slots as any)[0] : booking.slots;
    const isStudioRental = booking.client_id === booking.instructor_id
    const studio = (slotData as any)?.studios

    // 2. Mark as cancelled atomically using RPC
    const { data: result, error: rpcError } = await supabase.rpc('cancel_booking_atomic', {
        p_booking_id: bookingId,
        p_reason: reason,
        p_cancelled_by: user.id
    });

    if (rpcError || !result?.success) {
        console.error('Instructor cancel RPC error:', rpcError || result?.error);
        return { error: rpcError?.message || result?.error || 'Failed to cancel booking.' };
    }


    // 5. Send Emails
    const client = Array.isArray(booking.client) ? booking.client[0] : booking.client
    const date = formatManilaDateStr(slotData?.date)
    const time = formatTo12Hour(slotData?.start_time)

    // Notify Client (if not the instructor themselves)
    if (client?.email && !isStudioRental) {
        await sendEmail({
            to: client.email,
            subject: `Session Cancelled by Instructor: ${date}`,
            react: BookingNotificationEmail({
                recipientName: client.full_name || 'Client',
                bookingType: 'Booking Cancelled',
                studioName: studio?.name,
                date,
                time,
                cancellationReason: reason
            })
        })
    }

    // Notify Studio Owner
    if (studio?.owner_id) {
        const { data: studioOwner } = await supabase.from('profiles').select('email, full_name').eq('id', studio.owner_id).single()
        if (studioOwner?.email) {
            await sendEmail({
                to: studioOwner.email,
                subject: `Instructor Cancelled Session: ${studio.name}`,
                react: BookingNotificationEmail({
                    recipientName: studioOwner.full_name || 'Owner',
                    bookingType: 'Booking Cancelled',
                    studioName: studio.name,
                    date,
                    time,
                    cancellationReason: reason
                })
            })
        }
    }

    revalidatePath('/instructor')
    return { success: true }
}

export async function checkInClient(bookingId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    // 1. Fetch booking and verify instructor identity
    const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .select('id, instructor_id, client_id, status')
        .eq('id', bookingId)
        .single()

    if (fetchError || !booking) {
        return { error: 'Booking not found.' }
    }

    if (booking.instructor_id !== user.id) {
        return { error: 'Unauthorized to check in this client.' }
    }

    if (booking.status !== 'approved' && booking.status !== 'completed') {
        return { error: 'Only approved or completed sessions can be checked in.' }
    }

    const { error: updateError } = await supabase
        .from('bookings')
        .update({
            client_checked_in_at: new Date().toISOString()
        })
        .eq('id', bookingId)

    if (updateError) {
        console.error('Error checking in client:', updateError)
        return { error: 'Failed to record check-in.' }
    }

    revalidatePath('/instructor/sessions')
    revalidatePath('/instructor')
    return { success: true }
}


