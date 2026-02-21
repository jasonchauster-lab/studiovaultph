'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendEmail } from '@/lib/email'
import BookingNotificationEmail from '@/components/emails/BookingNotificationEmail'

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
            client:profiles!client_id(full_name),
            slots(studios(name))
        `)
        .eq('instructor_id', user.id)
        .eq('status', 'approved')

    if (startDate) bookingsQuery = bookingsQuery.gte('created_at', startDate)
    if (endDate) bookingsQuery = bookingsQuery.lte('created_at', endDate)

    const { data: bookings, error: bookingError } = await bookingsQuery

    if (bookingError) {
        console.error('Error fetching earnings (bookings):', bookingError)
        return { error: `Bookings Fetch Error: ${bookingError.message || JSON.stringify(bookingError)}` }
    }

    const first = (val: any) => Array.isArray(val) ? val[0] : val

    let totalEarned = 0;
    const recentTransactions: any[] = [];

    bookings?.forEach(booking => {
        const breakdown = booking.price_breakdown as any;
        const instructorFee = breakdown?.instructor_fee || 0;
        // Only count approved bookings towards actual earnings
        if (booking.status === 'approved') {
            totalEarned += instructorFee;
        }

        const studioName = first(booking.slots)?.studios?.name

        recentTransactions.push({
            date: booking.created_at,
            type: 'Booking',
            status: booking.status,
            client: (booking.client as any)?.full_name,
            studio: studioName,
            total_amount: instructorFee,
            details: `${breakdown?.quantity || 1} x ${breakdown?.equipment || 'Session'}`
        });
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
        if (payout.status === 'paid') {
            totalWithdrawn += payout.amount;
            recentTransactions.push({
                date: payout.created_at,
                type: 'Payout',
                status: 'paid',
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

    const availableBalance = profile?.available_balance || 0;
    const pendingBalance = profile?.pending_balance || 0;

    return {
        totalEarned,
        totalWithdrawn,
        pendingPayouts,
        availableBalance,
        pendingBalance,
        recentTransactions,
        bookingsCount: bookings?.length || 0
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
                custom_fee_percentage
            )
        `)
        .eq('id', slotId)
        .single();

    if (!slot) return { error: 'Slot not found.' }

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

    const { data: booking, error } = await supabase
        .from('bookings')
        .insert({
            slot_id: slotId,
            instructor_id: user.id,
            client_id: user.id, // Set client_id to instructor so they can pay/manage it as a "client" of the studio
            status: 'pending',
            equipment: equipment,
            total_price: finalPrice,
            price_breakdown: breakdown
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

    if (error) {
        console.error('Booking error:', error)
        return { error: 'Failed to request booking. You might have already requested this slot.' }
    }

    // --- SLOT LOCKING START ---
    // Mark the primary slot as unavailable
    await supabase.from('slots').update({ is_available: false }).eq('id', slotId);
    // --- SLOT LOCKING END ---

    // --- EMAIL NOTIFICATION START ---
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
    const date = new Date(slots?.start_time).toLocaleDateString();
    const time = new Date(slots?.start_time).toLocaleTimeString();

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
        const startTimeStr = start.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' });
        const endTimeStr = end.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' });

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
