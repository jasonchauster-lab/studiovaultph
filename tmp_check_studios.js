const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStudios() {
    const { data, error } = await supabase
        .from('studios')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching studio:', error);
        return;
    }

    console.log('Studio Columns:', Object.keys(data?.[0] || {}));
    console.log('Sample Studio:', data?.[0]);
}

checkStudios();
