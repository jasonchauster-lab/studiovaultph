const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnostic() {
    const bookingId = '9012dd00-588a-425c-bb59-b0f984865747';
    const userId = '909c5932-4410-415e-8743-26d5f3b4d8d4'; // Clubpilates PH Owner

    console.log('--- DIAGNOSTIC: Studio Cancellation ---');
    console.log('Booking:', bookingId);
    console.log('User:', userId);

    try {
        console.log('\n[1] Fetching Booking...');
        const { data: booking, error: fetchError } = await supabase
            .from('bookings')
            .select(`
                *,
                client:profiles!client_id(full_name, email),
                instructor:profiles!instructor_id(full_name, email),
                slots!inner(
                    start_time,
                    end_time,
                    date,
                    studios!inner(id, name, owner_id, address)
                )
            `)
            .eq('id', bookingId)
            .single();

        if (fetchError || !booking) {
            console.error('Fetch Error:', fetchError);
            return;
        }
        console.log('Fetch Success.');

        const slotData = Array.isArray(booking.slots) ? booking.slots[0] : booking.slots;
        console.log('slotData present:', !!slotData, 'isArray:', Array.isArray(booking.slots));

        const studio = slotData ? slotData.studios : null;
        console.log('Studio ID:', studio ? studio.id : 'MISSING');
        console.log('Studio Owner:', studio ? studio.owner_id : 'MISSING');

        if (!studio || studio.owner_id !== userId) {
            console.error('Auth check failed: expected', userId, 'got', studio ? studio.owner_id : 'NULL');
            return;
        }

        console.log('\n[2] Calculating Refund...');
        const breakdown = booking.price_breakdown || {};
        const refundAmount = Number(booking.total_price || 0) + Number(breakdown.wallet_deduction || 0);
        console.log('Refund Amount:', refundAmount);

        console.log('\n[3] Testing transfer_balance RPC...');
        const penaltyAmount = Number(breakdown.studio_fee || 0);
        console.log('Penalty Amount:', penaltyAmount);

        // We simulate the transfer (even though we'll reverse it later if needed)
        // I won't actually run it here because I don't want to spam the balance if I don't have to,
        // but I'll check if the owner has balance to transfer JUST IN CASE.
        const { data: ownerProfile } = await supabase.from('profiles').select('available_balance').eq('id', userId).single();
        console.log('Owner Balance:', ownerProfile ? ownerProfile.available_balance : 'UNKNOWN');

        console.log('\n[4] Strike System - Insert Strike...');
        console.log('Inserting strike for studio:', studio.id);
        const { error: strikeError } = await supabase.from('studio_strikes').insert({
            studio_id: studio.id,
            booking_id: bookingId
        });
        if (strikeError) {
            console.error('Strike Insert Error:', strikeError);
        } else {
            console.log('Strike Inserted.');
        }

        console.log('\n[5] Strike System - Cumulative Check...');
        const { count: strikeCount } = await supabase
            .from('studio_strikes')
            .select('*', { count: 'exact', head: true })
            .eq('studio_id', studio.id);
        console.log('Cumulative Strikes:', strikeCount);

        console.log('\n[6] Booking Update...');
        // We'll actually TRY the update here to see if it works
        const { error: updateError } = await supabase.from('bookings').update({
            status: 'cancelled_refunded',
            cancel_reason: 'DIAGNOSTIC TEST SUCCESS',
            cancelled_by: userId
        }).eq('id', bookingId);

        if (updateError) {
            console.error('Booking Update Error:', updateError);
        } else {
            console.log('Booking Updated Successfully.');
        }

    } catch (err) {
        console.error('\nCRITICAL CRASH:', err);
    }
}

diagnostic();
