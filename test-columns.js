const { createClient } = require('@supabase/supabase-js');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function test() {
    const { data, error } = await supabase
        .from('studios')
        .select('logo_url, bio, description, equipment, website_config, waiver_content, waiver_form, manual_payment_methods, is_public')
        .limit(1);
    console.log("Error:", error);
}
test();
