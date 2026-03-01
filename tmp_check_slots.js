const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSlots() {
    const { data, error } = await supabase
        .from('slots')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching slot:', error);
        return;
    }

    console.log('Slot Columns:', Object.keys(data?.[0] || {}));
    if (data?.[0]) {
        console.log('Equipment Type:', typeof data[0].equipment);
        console.log('Equipment Value:', data[0].equipment);
    }
}

checkSlots();
