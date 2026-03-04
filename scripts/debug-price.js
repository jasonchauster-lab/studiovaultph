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
    console.log('\n--- Finding Recent Bookings for Emma Instructor ---');
    const resEmma = await fetch(`${supabaseUrl}/rest/v1/profiles?full_name=ilike.*emma*&role=eq.instructor`, {
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const emmas = await resEmma.json();

    if (emmas.length > 0) {
        const emmaId = emmas[0].id;
        console.log(`Emma ID: ${emmaId}`);

        const resBookings = await fetch(`${supabaseUrl}/rest/v1/bookings?instructor_id=eq.${emmaId}&order=created_at.desc&limit=5`, {
            headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
        });
        const bookings = await resBookings.json();
        console.log('Recent Bookings for Emma:', JSON.stringify(bookings, null, 2));
    } else {
        console.log('Emma Instructor not found.');
    }
}

run().catch(console.error);
