const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function testUpsert() {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const env = {};
    envContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
            env[key.trim()] = valueParts.join('=').trim().replace(/^"(.*)"$/, '$1');
        }
    });

    const supabase = createClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY
    );

    const testId = '6614de26-a32a-44d3-96bc-2f9d8ccaba7a'; // John Ca
    
    console.log("--- Testing Upsert OMITTING last_name ---");
    const { error } = await supabase.from('profiles').upsert({
        id: testId,
        email: 'johnca932@gmail.com',
        full_name: 'John Ca Test',
        first_name: 'John',
        last_name: null, // Testing if NULL is allowed
        role: 'customer'
    });

    if (error) {
        console.error("Upsert failed:", error.message);
        console.error("Error details:", error.details);
    } else {
        console.log("Upsert succeeded! NULL last_name is allowed.");
    }
}

testUpsert();
