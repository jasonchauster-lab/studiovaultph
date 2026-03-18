const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkBuckets() {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) {
        console.error('Error listing buckets:', error);
        return;
    }
    console.log('Buckets found:');
    buckets.forEach(b => console.log(`- ${b.id} (${b.name})` ));
    
    const paymentBucket = buckets.find(b => b.id === 'payment-proofs');
    if (paymentBucket) {
        console.log('\nFound payment-proofs bucket.');
        const { data: files, error: filesError } = await supabase.storage.from('payment-proofs').list('', { limit: 5 });
        if (filesError) {
            console.error('Error listing files in payment-proofs:', filesError);
        } else {
            console.log('Files in payment-proofs (first 5):');
            files.forEach(f => console.log(`- ${f.name}`));
        }
    } else {
        console.log('\nBucket "payment-proofs" NOT FOUND.');
    }
}

checkBuckets();
