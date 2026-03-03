
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTimothyFunds() {
    const email = 'tracymeck35@gmail.com';

    // 1. Get Profile
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, available_balance, security_hold, email')
        .eq('email', email)
        .single();

    if (profileError) {
        console.error("Error fetching profile:", profileError);
        return;
    }

    if (!profile) {
        console.log("Profile not found for email:", email);
        return;
    }

    console.log("Profile:", profile);

    const instructorId = profile.id;

    // 2. Get Bookings
    const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
            id, 
            status, 
            payment_status, 
            instructor_fee, 
            created_at, 
            slots(date, start_time, end_time)
        `)
        .eq('instructor_id', instructorId)
        .order('created_at', { ascending: false });

    if (bookingsError) {
        console.error("Error fetching bookings:", bookingsError);
    } else {
        console.log("Bookings Count:", bookings?.length);
        console.log("Recent Bookings:", JSON.stringify(bookings?.slice(0, 5), null, 2));
    }

    // 3. Get Transactions
    const { data: transactions, error: transError } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', instructorId)
        .order('created_at', { ascending: false })
        .limit(20);

    if (transError) {
        console.error("Error fetching transactions:", transError);
    } else {
        console.log("Recent Transactions:", JSON.stringify(transactions, null, 2));
    }
}

checkTimothyFunds();
