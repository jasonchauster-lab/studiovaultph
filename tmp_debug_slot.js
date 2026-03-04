const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSpecificSlots() {
    const slotId = '33149f24-fbd2-42db-8cea-f9b839b97b25'; // The cancelled_refunded one
    const { data: slot, error } = await supabase
        .from('slots')
        .select('*')
        .eq('id', slotId)
        .single();

    if (error) {
        console.error('Error fetching slot:', error);
        return;
    }

    console.log('Slot data:', slot);
}

checkSpecificSlots();
