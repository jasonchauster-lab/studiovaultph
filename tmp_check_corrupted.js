const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function lookForCorruptedSlots() {
    console.log('Fetching slots with empty or null equipment...');

    // Check if there are slots with equipment = {} or no keys
    const { data: slots, error } = await supabase
        .from('slots')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error('Error fetching slots:', error);
        return;
    }

    const corrupted = slots.filter(s => {
        if (!s.equipment) return true;
        if (typeof s.equipment === 'object') {
            return Object.keys(s.equipment).length === 0;
        }
        return false;
    });

    console.log("Empty/Corrupted Equipment Slots:");
    corrupted.forEach(s => {
        console.log(`Slot ID: ${s.id} | Qty: ${s.quantity} | is_available: ${s.is_available}`);
        console.log(`Equipment:`, s.equipment);
        console.log(`Inventory:`, s.equipment_inventory);
    });

    console.log("\nA sample of non-corrupted slots:");
    slots.filter(s => !corrupted.includes(s)).slice(0, 3).forEach(s => {
        console.log(`Slot ID: ${s.id} | Qty: ${s.quantity} | Eq:`, JSON.stringify(s.equipment));
    });
}

lookForCorruptedSlots();
