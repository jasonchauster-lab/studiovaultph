const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://wzacmyemiljzpdskyvie.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMTUyODgsImV4cCI6MjA4Njc5MTI4OH0.BGxtSbYjz5_cNoJhHyigwY7Pqv0NAP2gz0uNHHFPqTU');

async function checkSchema() {
    const tables = [
        'profiles', 'studios', 'outlets', 'services', 'slots', 'bookings',
        'studio_members', 'certifications', 'instructor_availability',
        'memberships', 'packages', 'service_categories', 'promo_codes',
        'tags', 'profile_tags', 'support_tickets', 'support_messages',
        'pricing_groups', 'waivers', 'waiver_consents', 'attendance'
    ];
    
    console.log('Final Schema Audit Check...');
    const results = { exists: [], missing: [] };

    for (const table of tables) {
        let { error } = await supabase.from(table).select('*').limit(1);
        if (error) {
            if (error.message.includes('Could not find the table')) {
                results.missing.push(table);
            } else {
                results.exists.push(`${table} (Error: ${error.message})`);
            }
        } else {
            results.exists.push(table);
        }
    }

    console.log('\n--- EXISTS ---');
    results.exists.forEach(t => console.log('✅ ' + t));

    console.log('\n--- MISSING ---');
    results.missing.forEach(t => console.log('❌ ' + t));
}

checkSchema();
