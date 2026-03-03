
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkInstructorWallet() {
    const instructorId = 'f88938fc-eaa0-491a-8283-2972da96e24b';

    // 1. Get Profile Balances
    const { data: profile, error: pError } = await supabase
        .from('profiles')
        .select('id, full_name, available_balance, pending_balance')
        .eq('id', instructorId)
        .single();

    if (pError) console.error("Profile Error:", pError);
    else console.log("Profile Balances:", profile);

    // 2. Get Bookings
    const { data: bookings, error: bError } = await supabase
        .from('bookings')
        .select(`
            id, 
            status, 
            payment_status, 
            created_at, 
            completed_at,
            funds_unlocked,
            price_breakdown,
            slots(date, start_time, end_time)
        `)
        .eq('instructor_id', instructorId);

    if (bError) console.error("Bookings Error:", bError);
    else {
        console.log("\nBookings Summary:");
        bookings.forEach(b => {
            console.log(`- ID: ${b.id}`);
            console.log(`  Status: ${b.status}, Payment: ${b.payment_status}`);
            console.log(`  Date: ${b.slots?.date} ${b.slots?.start_time}`);
            console.log(`  Instructor Fee: ${b.price_breakdown?.instructor_fee}`);
            console.log(`  Completed At: ${b.completed_at}, Unlocked: ${b.funds_unlocked}`);
        });
    }

    // 3. Get Top-ups/Adjustments
    const { data: adjustments, error: aError } = await supabase
        .from('wallet_top_ups')
        .select('*')
        .eq('user_id', instructorId)
        .order('created_at', { ascending: false });

    if (aError) console.error("Adjustments Error:", aError);
    else {
        console.log("\nRecent wallet_top_ups (Adjustments):");
        console.log(JSON.stringify(adjustments, null, 2));
    }
}

checkInstructorWallet();
