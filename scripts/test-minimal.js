const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function testMinimal() {
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

    const testId = '6614de26-a32a-44d3-96bc-2f9d8ccaba7a';
    
    console.log("--- Testing Minimal Profile Upsert ---");
    const { error } = await supabase.from('profiles').upsert({
        id: testId
        // Omit everything else
    });

    if (error) {
        console.log("Error:", error.message);
    } else {
        console.log("Upsert succeeded with only ID!");
    }
}

testMinimal();
