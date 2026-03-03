
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBalances() {
    console.log('--- Checking Clubpilates PH ---');

    // 1. Find Studio
    const { data: studios, error: studioError } = await supabase
        .from('studios')
        .select('id, name, owner_id')
        .ilike('name', '%Clubpilates%');

    if (studioError) {
        console.error('Error fetching studio:', studioError);
        return;
    }

    if (!studios || studios.length === 0) {
        console.log('No studio found with name "Clubpilates"');
        return;
    }

    for (const studio of studios) {
        console.log(`\nStudio: ${studio.name} (${studio.id})`);
        console.log(`Owner ID: ${studio.owner_id}`);

        // 2. Check Owner Profile
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, email, available_balance, wallet_balance, pending_balance, is_suspended')
            .eq('id', studio.owner_id)
            .single();

        if (profileError) {
            console.error('Error fetching profile:', profileError);
            continue;
        }

        console.log('Profile Data:');
        console.log(`  Full Name: ${profile.full_name}`);
        console.log(`  Email: ${profile.email}`);
        console.log(`  Available Balance: ${profile.available_balance}`);
        console.log(`  Wallet Balance: ${profile.wallet_balance}`);
        console.log(`  Pending Balance: ${profile.pending_balance}`);
        console.log(`  Is Suspended: ${profile.is_suspended}`);

        if (profile.available_balance < 0) {
            console.log('  ⚠️ Available Balance is still NEGATIVE.');
        } else {
            console.log('  ✅ Available Balance is non-negative.');
        }
    }
}

checkBalances();
