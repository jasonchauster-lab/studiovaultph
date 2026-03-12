const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = '';
let supabaseKey = '';

envFile.split('\n').forEach(line => {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim();
});

async function run() {
    console.log('URL:', supabaseUrl);

    // Sign in as instructor
    const signInRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
            'apikey': supabaseKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email: 'tracymeck35@gmail.com',
            password: 'MakingMoney123'
        })
    });

    const signInData = await signInRes.json();
    if (signInData.error || !signInData.access_token) {
        console.error('Sign-in failed:', JSON.stringify(signInData));
        process.exit(1);
    }

    const accessToken = signInData.access_token;
    const userId = signInData.user.id;
    console.log('Signed in as:', signInData.user.email, 'ID:', userId);

    // Check existing availability for 2026-03-13
    const checkRes = await fetch(`${supabaseUrl}/rest/v1/instructor_availability?instructor_id=eq.${userId}&date=eq.2026-03-13&select=*`, {
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${accessToken}`
        }
    });
    const existing = await checkRes.json();
    console.log('Existing availability for 2026-03-13:', JSON.stringify(existing, null, 2));

    // Insert availability for 2026-03-13 10:00-11:00 at QC - Fairview/Commonwealth
    // 2026-03-13 is a Friday (day_of_week = 5)
    const insertRes = await fetch(`${supabaseUrl}/rest/v1/instructor_availability`, {
        method: 'POST',
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify({
            instructor_id: userId,
            day_of_week: 5,
            date: '2026-03-13',
            start_time: '10:00',
            end_time: '11:00',
            location_area: 'QC - Fairview/Commonwealth',
            equipment: []
        })
    });

    const insertData = await insertRes.json();
    if (insertRes.ok) {
        console.log('Availability inserted successfully:', JSON.stringify(insertData, null, 2));
        // Write success file
        const result = {
            status: 'done',
            availability_set: true,
            inserted: insertData
        };
        fs.writeFileSync('test-data/instructor-done.json', JSON.stringify(result, null, 2));
        console.log('instructor-done.json written');
    } else {
        console.error('Insert failed:', JSON.stringify(insertData));
        const result = {
            status: 'done',
            availability_set: false,
            error: insertData
        };
        fs.writeFileSync('test-data/instructor-done.json', JSON.stringify(result, null, 2));
    }
}

run().catch(err => {
    console.error('Error:', err);
    fs.writeFileSync('test-data/instructor-done.json', JSON.stringify({
        status: 'done',
        availability_set: false,
        error: err.message
    }, null, 2));
    process.exit(1);
});
