const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.resolve(__dirname, '.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value.length > 0) {
        env[key.trim()] = value.join('=').trim();
    }
});

const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
);

async function inspect() {
    console.log('Fetching sample slots...');
    const { data, error } = await supabase
        .from('slots')
        .select('*')
        .limit(5);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Sample Slots:');
    console.log(JSON.stringify(data, null, 2));
}

inspect();
