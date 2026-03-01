'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendEmail } from '@/lib/email'
import BookingNotificationEmail from '@/components/emails/BookingNotificationEmail'

import { autoCompleteBookings, unlockMaturedFunds } from '@/lib/wallet'
import { formatManilaDate, formatManilaTime } from '@/lib/timezone'

export async function getInstructorEarnings(startDate?: string, endDate?: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    // 0. Auto-process background tasks to ensure balances are fresh
    await autoCompleteBookings()
    await unlockMaturedFunds()

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
            slots!inner(start_time, studios(name))
        `)
        .eq('instructor_id', user.id)
        .in('status', ['approved', 'completed', 'cancelled_charged', 'cancelled_refunded'])

    if (startDate) bookingsQuery = bookingsQuery.gte('slots.start_time', startDate)
    if (endDate) bookingsQuery = bookingsQuery.lte('slots.start_time', endDate)

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

        // 1. Gross Earnings (Approved/Completed/Charged sessions)
        if (['approved', 'completed', 'cancelled_charged'].includes(booking.status)) {
            grossEarned += instructorFee;

            const studioName = first(booking.slots)?.studios?.name
            recentTransactions.push({
                date: first(booking.slots)?.start_time || booking.created_at,
                type: 'Booking',
                status: booking.status,
                client: (booking.client as any)?.full_name,
                studio: studioName,
                total_amount: instructorFee,
                details: `${breakdown?.quantity || 1} x ${breakdown?.equipment || 'Session'}`
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

    if (startDate) payoutsQuery = payoutsQuery.gte('created_at', startDate)
    if (endDate) payoutsQuery = payoutsQuery.lte('created_at', endDate)

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
    const { data: walletActions } = await supabase
        .from('wallet_top_ups')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

    walletActions?.forEach(wa => {
        const isAdjustment = wa.type === 'admin_adjustment';
        recentTransactions.push({
            date: wa.processed_at || wa.updated_at || wa.created_at,
            type: isAdjustment ? 'Direct Adjustment' : 'Wallet Top-Up',
            status: 'completed',
            total_amount: wa.amount, // Signed amount
            details: wa.admin_notes || (isAdjustment ? 'Manual balance adjustment' : 'Gcash/Bank Top-up')
        });
    });

    recentTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const availableBalance = profile?.available_balance || 0;
    const pendingBalance = profile?.pending_balance || 0;

    return {
        totalEarned: grossEarned,
        totalCompensation,
        totalPenalty,
        netEarnings,
        totalWithdrawn,
        pendingPayouts,
        availableBalance,
        pendingBalance,
        recentTransactions,
        bookingsCount: bookings?.filter(b => ['approved', 'completed', 'cancelled_charged'].includes(b.status))?.length || 0
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

    // Calculate Duration
    const start = new Date(slot.start_time);
    const end = new Date(slot.end_time);
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
    if (studioData?.is_founding_partner && studioData?.custom_fee_percentage !== undefined) {
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

    // 2. Logic for Quantity & Partial Booking
    // Find X available slots that match the criteria
    let allocatedSlotIds: string[] = [slotId];

    if (quantity > 1) {
        const needed = quantity - 1;
        const { data: additionalSlots } = await supabase
            .from('slots')
            .select('id')
            .eq('studio_id', slot.studio_id)
            .eq('start_time', slot.start_time)
            .eq('is_available', true)
            .neq('id', slotId)
            .contains('equipment', [equipment])
            .limit(needed);

        if (!additionalSlots || additionalSlots.length < needed) {
            return { error: `Not enough slots available. Requested: ${quantity}` }
        }
        allocatedSlotIds = [...allocatedSlotIds, ...additionalSlots.map(s => s.id)];
    }

    const bookedSlotIdsForRecord: string[] = [];

    for (const currentId of allocatedSlotIds) {
        let actualBookedId = currentId;

        // Fetch current slot details for extraction/splitting
        // Note: We need the most up-to-date data for each iteration if multiple quantity
        const { data: currentSlotData } = await supabase.from('slots').select('*').eq('id', currentId).single();
        if (!currentSlotData) continue;

        const currentEquipment = (currentSlotData.equipment as Record<string, number>) || {};
        const currentTotalQty = currentSlotData.quantity || 0;

        // --- EQUIPMENT EXTRACTION START (Refined for JSONB) ---
        // 1. Decrement the selected equipment in the PARENT slot
        const newEquipment = { ...currentEquipment };
        newEquipment[equipment] = (newEquipment[equipment] || 0) - 1; // Instructor books 1 by 1 in this loop

        // Remove key if 0
        if (newEquipment[equipment] <= 0) {
            delete newEquipment[equipment];
        }

        const newTotalQty = Math.max(0, currentTotalQty - 1);
        const isStillAvailable = newTotalQty > 0;

        await supabase.from('slots').update({
            equipment: newEquipment,
            equipment_inventory: newEquipment,
            quantity: newTotalQty,
            is_available: isStillAvailable
        }).eq('id', currentId);

        // 2. Create a NEW "Extracted" slot record with ONLY the booked equipment
        const { data: extractedSlot, error: extractionError } = await supabase
            .from('slots')
            .insert({
                studio_id: currentSlotData.studio_id,
                start_time: currentSlotData.start_time,
                end_time: currentSlotData.end_time,
                is_available: false, // Locked immediately
                equipment: { [equipment]: 1 },
                equipment_inventory: { [equipment]: 1 },
                quantity: 1
            })
            .select()
            .single();

        if (extractionError || !extractedSlot) {
            console.error('Extraction error:', extractionError);
            return { error: 'Failed to extract equipment for booking.' };
        }

        actualBookedId = extractedSlot.id;
        // --- EQUIPMENT EXTRACTION END ---

        bookedSlotIdsForRecord.push(actualBookedId);
    }

    const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
            slot_id: bookedSlotIdsForRecord[0],
            instructor_id: user.id,
            client_id: user.id, // Set client_id to instructor so they can pay/manage it as a "client" of the studio
            status: 'pending',
            equipment: equipment,
            total_price: finalPrice,
            price_breakdown: breakdown,
            booked_slot_ids: bookedSlotIdsForRecord,
            quantity: quantity
        })
        .select(`
            *,
            slots (
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
        .single()

    if (bookingError || !booking) {
        console.error('Booking error:', bookingError)
        return { error: 'Failed to request booking. You might have already requested this slot.' }
    }
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
    const date = formatManilaDate(slots?.start_time);
    const time = formatManilaTime(slots?.start_time);

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
                time
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
                    time
                })
            });
        }
    }
    // --- EMAIL NOTIFICATION END ---

    // --- AUTO-SLOTTING START ---
    // Automatically create an availability slot for the instructor at this studio/time
    try {
        const bookingDate = start.toISOString().split('T')[0];
        const dayOfWeek = start.getDay();
        const startTimeStr = start.toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour12: false, hour: '2-digit', minute: '2-digit' });
        const endTimeStr = end.toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour12: false, hour: '2-digit', minute: '2-digit' });

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

    const isStudioRental = booking.client_id === booking.instructor_id
    const studio = (booking.slots as any)?.studios

    // 2. Process 100% Refund to Client (in Studio Rental case, client IS the instructor)
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
            console.error('Instructor cancel refund error:', refundError)
            return { error: 'Failed to process refund to client.' }
        }
    }

    // 3. Penalty Logic (Apply to ALL cancellations < 24h, EXCEPT during grace period)
    let penaltyProcessed = false
    let penaltyAmount = 0
    if (isLateCancellation && !isWithinGracePeriod) {
        penaltyAmount = Number(breakdown?.studio_fee || 0)
        if (penaltyAmount > 0 && studio?.owner_id) {
            const { error: penaltyError } = await supabase.rpc('transfer_balance', {
                p_from_id: user.id,
                p_to_id: studio.owner_id,
                p_amount: penaltyAmount
            })
            if (penaltyError) {
                console.error('Penalty transfer error:', penaltyError)
                return { error: 'Refund processed, but penalty transfer failed.' }
            }
            penaltyProcessed = true
        }
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
            refund_initiator: 'instructor'
        }
    }).eq('id', bookingId)

    if (updateError) {
        console.error('Instructor cancel update error:', updateError)
        return { error: 'Failed to update booking status.' }
    }

    const allSlotIds = [booking.slot_id, ...(booking.booked_slot_ids || [])].filter(Boolean)
    if (allSlotIds.length > 0) {
        await supabase.from('slots').update({ is_available: true }).in('id', allSlotIds)
    }

    // 5. Send Emails
    const client = booking.client
    const date = formatManilaDate(startTimeStr)
    const time = formatManilaTime(startTimeStr)

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
