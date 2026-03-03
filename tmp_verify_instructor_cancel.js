const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
    const bookingId = '9012dd00-588a-425c-bb59-b0f984865747';
    const instructorId = 'f88938fc-eaa0-491a-8283-2972da96e24b';

    console.log('--- Verifying Instructor Cancellation Logic ---');
    console.log('Booking ID:', bookingId);
    console.log('Instructor ID:', instructorId);

    // 1. Fetch booking as the server action does
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
        .single();

    if (fetchError || !booking) {
        console.error('Error fetching booking:', fetchError);
        return;
    }

    console.log('\nStep 1: Fetching Booking Data... SUCCESS');
    console.log('Status:', booking.status);

    // 2. Auth Check
    if (booking.instructor_id !== instructorId) {
        console.error('Auth Check FAILED: Instructor mismatch');
        return;
    }
    console.log('Step 2: Instructor Auth Check... SUCCESS');

    // 3. Date Logic
    const slotData = Array.isArray(booking.slots) ? booking.slots[0] : booking.slots;
    const startTimeStr = slotData?.start_time;
    const dateStr = slotData?.date;
    const approvedAtStr = booking.approved_at;

    console.log('\nStep 3: Verifying Date Logic...');
    console.log('Date from Slot:', dateStr);
    console.log('Start Time from Slot:', startTimeStr);

    if (!dateStr || !startTimeStr) {
        console.error('FAILED: Missing date or start_time info in join!');
        return;
    }

    const sessionStart = new Date(`${dateStr}T${startTimeStr}+08:00`);
    const now = new Date();
    const diffInHours = (sessionStart.getTime() - now.getTime()) / (1000 * 60 * 60);
    const isLateCancellation = diffInHours < 24;

    console.log('Session Start (Manila):', sessionStart.toString());
    console.log('Now (Local):', now.toString());
    console.log('Hours until session:', diffInHours.toFixed(2));
    console.log('Is Late Cancellation:', isLateCancellation);

    // 4. Refund Logic
    const breakdown = booking.price_breakdown || {};
    const walletDeduction = Number(breakdown.wallet_deduction || 0);
    const totalPrice = Number(booking.total_price || 0);
    const refundAmount = totalPrice + walletDeduction;
    console.log('\nStep 4: Refund Calculation');
    console.log('Total Price:', totalPrice);
    console.log('Refund Amount to Client:', refundAmount);

    // 5. Penalty Logic
    let penaltyAmount = 0;
    if (isLateCancellation) {
        penaltyAmount = Number(breakdown.studio_fee || 0);
        console.log('\nStep 5: Penalty Logic');
        console.log('Penalty to Instructor (Transfer to Studio):', penaltyAmount);
        console.log('Studio Owner ID:', slotData.studios?.owner_id);
    }

    console.log('\n--- VERIFICATION COMPLETE ---');
    console.log('The logic appears sound and the joined data (date, start_time) is present.');
}

verify();
