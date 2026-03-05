const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function getEnv() {
    const envPath = path.join(process.cwd(), '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const env = {};
    envContent.split('\n').forEach(line => {
        const [key, ...value] = line.split('=');
        if (key && value) {
            env[key.trim()] = value.join('=').trim();
        }
    });
    return env;
}

const env = getEnv();
const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkProfilesSchema() {
    // Select one row and get keys to see columns
    const { data, error } = await supabase.from('profiles').select('*').limit(1);
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Columns in profiles:', Object.keys(data[0] || {}));
    }
}

checkProfilesSchema();
