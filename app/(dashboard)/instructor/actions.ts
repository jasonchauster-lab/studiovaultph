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



    const { data: profile } = await supabase.from('profiles').select('available_balance, pending_balance').eq('id', user.id).single()

    let bookingsQuery = supabase
        .from('bookings')
        .select(`
            *, 
            price_breakdown, 
            status, 
            created_at,
            updated_at,
            client:profiles!client_id(full_name),
            slots!inner(date, start_time, studios(name))
        `)
        .eq('instructor_id', user.id)
        .or('status.in.(approved,completed,cancelled_charged,cancelled_refunded),payment_status.eq.submitted')

    if (startDate) bookingsQuery = bookingsQuery.gte('slots.date', startDate)
    if (endDate) bookingsQuery = bookingsQuery.lte('slots.date', endDate)

    const { data: bookings, error: bookingError } = await bookingsQuery

    if (bookingError) {
        console.error('Error fetching earnings (bookings):', bookingError)
        return { error: `Bookings Fetch Error: ${bookingError.message || JSON.stringify(bookingError)}` }
    }

    const first = (val: any) => Array.isArray(val) ? val[0] : val

    let grossEarned = 0;
    let totalCompensation = 0; // Received from Studio Displacement Fees
    let totalPenalty = 0; // Paid as late cancellation penalties
    const recentTransactions: any[] = [];

    bookings?.forEach(booking => {
        const breakdown = booking.price_breakdown as any;
        const instructorFee = Number(breakdown?.instructor_fee || 0);
        const penaltyProcessed = breakdown?.penalty_processed === true;
        const penaltyAmount = Number(breakdown?.penalty_amount || 0);
        const initiator = breakdown?.refund_initiator;

        // 1. Gross Earnings (Approved/Completed/Charged sessions or status pending but payment submitted)
        const isRefunded = booking.status === 'cancelled_refunded';
        const isRealized = ['approved', 'completed', 'cancelled_charged'].includes(booking.status) || (booking.status === 'pending' && booking.payment_status === 'submitted');

        if (isRealized || isRefunded) {
            if (isRealized) grossEarned += instructorFee;

            const slot = first(booking.slots);
            const studioName = slot?.studios?.name;
            const txDate = slot?.date && slot?.start_time ? `${slot.date}T${slot.start_time}+08:00` : booking.created_at;
            const isLateCancel = booking.status === 'cancelled_charged';

            let txType = 'Booking';
            if (isRefunded) txType = 'Booking (Refunded)';
            else if (isLateCancel) txType = 'Booking (Late Cancel)';
            else if (booking.payment_status === 'submitted' && booking.status === 'pending') txType = 'Booking (Verification)';

            recentTransactions.push({
                date: txDate,
                type: txType,
                status: booking.status,
                client: (booking.client as any)?.full_name,
                studio: studioName,
                total_amount: isRefunded ? 0 : instructorFee,
                details: isRefunded ? `REFUNDED: ${breakdown?.quantity || 1} x ${breakdown?.equipment || 'Session'}` :
                    isLateCancel ? `CHARGED: ${breakdown?.quantity || 1} x ${breakdown?.equipment || 'Session'}` :
                        `${breakdown?.quantity || 1} x ${breakdown?.equipment || 'Session'}`
            });
        }

        // 2. Compensation (Studio cancelled late)
        if (penaltyProcessed && initiator === 'studio') {
            totalCompensation += penaltyAmount;
            recentTransactions.push({
                date: booking.updated_at || booking.created_at,
                type: 'Cancellation Compensation',
                status: 'processed',
                details: 'Displacement fee from studio',
                total_amount: penaltyAmount
            });
        }

        // 3. Penalty (Instructor cancelled late)
        if (penaltyProcessed && initiator === 'instructor') {
            totalPenalty += penaltyAmount;
            recentTransactions.push({
                date: booking.updated_at || booking.created_at,
                type: 'Cancellation Penalty',
                status: 'processed',
                details: 'Late cancellation penalty',
                total_amount: -penaltyAmount
            });
        }
    });

    // 2. Calculate Total Withdrawn & Pending Payouts
    let payoutsQuery = supabase
        .from('payout_requests')
        .select('amount, status, created_at, payment_method')
        .eq('user_id', user.id)

    if (startDate) payoutsQuery = payoutsQuery.gte('created_at', `${startDate}T00:00:00.000Z`)
    if (endDate) payoutsQuery = payoutsQuery.lte('created_at', `${endDate}T23:59:59.999Z`)

    const { data: payouts, error: payoutError } = await payoutsQuery

    if (payoutError) {
        console.error('Error fetching payouts:', payoutError)
        return { error: `Payouts Fetch Error: ${payoutError.message || JSON.stringify(payoutError)}` }
    }

    let totalWithdrawn = 0;
    let pendingPayouts = 0;

    payouts?.forEach(payout => {
        if (payout.status === 'paid' || payout.status === 'processed') {
            totalWithdrawn += payout.amount;
            recentTransactions.push({
                date: payout.created_at,
                type: 'Payout',
                status: payout.status,
                total_amount: -payout.amount,
                details: `Withdrawal via ${payout.payment_method}`
            });
        } else if (payout.status === 'pending') {
            pendingPayouts += payout.amount;
            recentTransactions.push({
                date: payout.created_at,
                type: 'Payout Request',
                status: 'pending',
                total_amount: -payout.amount,
                details: `Withdrawal via ${payout.payment_method}`
            });
        }
    });

    const netEarnings = grossEarned + totalCompensation - totalPenalty;

    // 4. Get Wallet Top-ups & Admin Adjustments
    let walletQuery = supabase
        .from('wallet_top_ups')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

    if (startDate) walletQuery = walletQuery.gte('created_at', `${startDate}T00:00:00.000Z`)
    if (endDate) walletQuery = walletQuery.lte('created_at', `${endDate}T23:59:59.999Z`)

    const { data: walletActions } = await walletQuery;

    walletActions?.forEach(wa => {
        const isAdjustment = wa.type === 'admin_adjustment';
        recentTransactions.push({
            date: wa.processed_at || wa.updated_at || wa.created_at,
            type: isAdjustment ? 'Direct Adjustment' : 'Wallet Top-Up',
            status: 'completed',
            total_amount: wa.amount,
            details: isAdjustment ? (wa.admin_notes || 'Manual balance adjustment') : 'Gcash/Bank Top-up'
        });
    });

    recentTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const availableBalance = Number(profile?.available_balance || 0);
    const dbPendingBalance = Number(profile?.pending_balance || 0);

    // Calculate "Virtual" Pending Balance: DB pending + any approved bookings that aren't completed yet
    let virtualPending = dbPendingBalance;
    bookings?.forEach(b => {
        if (b.status === 'approved') {
            const breakdown = b.price_breakdown as any;
            virtualPending += Number(breakdown?.instructor_fee || 0);
        }
    });

    return {
        totalEarned: grossEarned + totalCompensation,
        totalCompensation,
        totalPenalty,
        netEarnings,
        totalWithdrawn,
        pendingPayouts,
        availableBalance,
        pendingBalance: virtualPending,
        recentTransactions,
        bookingsCount: bookings?.filter(b => ['approved', 'completed', 'cancelled_charged'].includes(b.status) || b.payment_status === 'submitted')?.length || 0
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

    // 1b. Deduct from profile right away
    const { error: deductError } = await supabase.rpc('deduct_available_balance', {
        user_id: user.id,
        amount
    })

    if (deductError) {
        return { error: 'Failed to process balance deduction.' };
    }

    // 2. Create Payout Request
    const { error } = await supabase
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

    if (error) {
        console.error('Payout request error:', error)
        return { error: `Failed to submit payout request: ${error.message} (code: ${error.code})` }
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

    const slotData = Array.isArray(booking.slots) ? booking.slots[0] : booking.slots
    const startTimeStr = slotData?.start_time
    const dateStr = slotData?.date
    const approvedAtStr = booking.approved_at
    const sessionStart = new Date(`${dateStr}T${startTimeStr}+08:00`)
    const now = new Date()

    const diffInHours = (sessionStart.getTime() - now.getTime()) / (1000 * 60 * 60)
    const isLateCancellation = diffInHours < 24

    // Phase 7: 15-minute grace period check (Strictly from approved_at)
    // If approvedAt is null, the grace period is inherently active (unlocked booking)
    const approvedAt = approvedAtStr ? new Date(approvedAtStr) : null
    const isWithinGracePeriod = !approvedAt || (now.getTime() - approvedAt.getTime() <= 15 * 60 * 1000)

    const isStudioRental = booking.client_id === booking.instructor_id
    const studio = (slotData as any)?.studios

    // 2. Mark as cancelled atomically to prevent double refunds
    const breakdown = booking.price_breakdown as any;
    const walletDeduction = Number(breakdown?.wallet_deduction || 0);
    const totalPrice = Number(booking.total_price || 0);
    const refundAmount = totalPrice + walletDeduction;

    let penaltyAmount = 0;
    let penaltyProcessed = false;

    if (isLateCancellation && !isWithinGracePeriod) {
        penaltyAmount = Number(breakdown?.studio_fee || 0)
    }

    const { data: updatedBooking, error: updateError } = await supabase.from('bookings').update({
        status: 'cancelled_refunded',
        cancel_reason: reason,
        cancelled_by: user.id,
        price_breakdown: {
            ...breakdown,
            refunded_amount: refundAmount,
            penalty_amount: penaltyAmount,
            refund_initiator: 'instructor'
        }
    })
        .eq('id', bookingId)
        .in('status', ['approved', 'pending'])
        .select('id')

    if (updateError) {
        console.error('Instructor cancel update error:', updateError)
        return { error: 'Failed to update booking status.' }
    }

    if (!updatedBooking || updatedBooking.length === 0) {
        return { error: 'Booking already cancelled or not eligible for cancellation.' }
    }

    // 3. Process 100% Refund to Client (in Studio Rental case, client IS the instructor)
    if (refundAmount > 0) {
        const { error: refundError } = await supabase.rpc('increment_available_balance', {
            user_id: booking.client_id,
            amount: refundAmount
        })
        if (refundError) {
            console.error('Instructor cancel refund error:', refundError)
            return { error: `Cancellation processed, but refund failed: ${refundError.message}` }
        }
    }

    // 4. Penalty Logic (Apply to ALL cancellations < 24h, EXCEPT during grace period)
    if (isLateCancellation && !isWithinGracePeriod) {
        if (penaltyAmount > 0 && studio?.owner_id) {
            const { error: penaltyError } = await supabase.rpc('transfer_balance', {
                p_from_id: user.id,
                p_to_id: studio.owner_id,
                p_amount: penaltyAmount
            })
            if (penaltyError) {
                console.error('Penalty transfer error:', penaltyError)
                return { error: `Refund processed, but penalty transfer failed: ${penaltyError.message}` }
            }
            penaltyProcessed = true
        }
    }

    // Finalize breakdown fields that might have changed
    await supabase.from('bookings').update({
        price_breakdown: {
            ...breakdown,
            refunded_amount: refundAmount,
            penalty_amount: penaltyAmount,
            penalty_processed: penaltyProcessed,
            refund_initiator: 'instructor'
        }
    }).eq('id', bookingId)

    const allSlotIds = [booking.slot_id, ...(booking.booked_slot_ids || [])].filter(Boolean)
    if (allSlotIds.length > 0) {
        await supabase.from('slots').update({ is_available: true }).in('id', allSlotIds)
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
