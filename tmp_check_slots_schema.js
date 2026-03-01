const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    const { data, error } = await supabase
        .from('slots')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching slot:', error);
        return;
    }

    console.log('Sample Slot Data:', JSON.stringify(data?.[0], null, 2));

    // To get column details, we can try to insert a dummy and see error or use RPC if available
    // But usually looking at one record is enough to see columns.
}

checkSchema();
