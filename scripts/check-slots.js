const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = '';
let supabaseKey = '';

envFile.split('\n').forEach(line => {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim();
    if (!supabaseKey && line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim();
});

async function run() {
    console.log('--- Inspecting Slots for Potential Shared Records ---');
    // Fetch slots from a specific studio that might have many equipments
    const res = await fetch(`${supabaseUrl}/rest/v1/slots?select=id,studio_id,start_time,equipment,is_available&order=start_time.desc&limit=50`, {
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const slots = await res.json();

    // Group by (studio_id, start_time)
    const groups = {};
    slots.forEach(s => {
        const key = `${s.studio_id}_${s.start_time}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(s);
    });

    console.log('Duplicate Check (Studio + StartTime):');
    Object.entries(groups).forEach(([key, list]) => {
        if (list.length > 0) {
            console.log(`\nKey: ${key}`);
            list.forEach(item => {
                console.log(`  - ID: ${item.id}, Equipment: ${JSON.stringify(item.equipment)}, Available: ${item.is_available}`);
            });
        }
    });

    if (Object.keys(groups).length === slots.length) {
        console.log('\nCONCLUSION: Each (Studio, Time) has exactly ONE slot record in this sample.');
        console.log('If a studio has 4 reformers, they seem to be grouped into ONE record.');
    } else {
        console.log('\nCONCLUSION: Multiple slot records found for the same (Studio, Time).');
    }
}

run().catch(console.error);
