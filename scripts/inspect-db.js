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
    console.log('URL:', supabaseUrl);

    console.log('\n--- Finding Emma Instructor ---');
    const resEmma = await fetch(`${supabaseUrl}/rest/v1/profiles?full_name=ilike.*emma*&role=eq.instructor`, {
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const emmas = await resEmma.json();
    console.log('Emmas:', JSON.stringify(emmas, null, 2));

    if (emmas.length > 0) {
        const emmaId = emmas[0].id;
        console.log(`\n--- Bookings for Emma (${emmaId}) ---`);
        const resEmmaBookings = await fetch(`${supabaseUrl}/rest/v1/bookings?instructor_id=eq.${emmaId}&select=id,status,created_at,slots(start_time)&order=created_at.desc`, {
            headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
        });
        const emmaBookings = await resEmmaBookings.json();
        console.log('Emma Bookings:', JSON.stringify(emmaBookings, null, 2));
    }

    console.log('\n--- Recent 10 Bookings in System ---');
    const resRecent = await fetch(`${supabaseUrl}/rest/v1/bookings?select=id,status,created_at,instructor_id&order=created_at.desc&limit=10`, {
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const recent = await resRecent.json();
    console.log('Recent Bookings:', JSON.stringify(recent, null, 2));
}

run().catch(console.error);
