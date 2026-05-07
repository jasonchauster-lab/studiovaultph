const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBuckets() {
    const { data, error } = await supabase.storage.listBuckets();
    if (error) {
        console.error('Error listing buckets:', error);
        return;
    }
    console.log('Available buckets:', data.map(b => ({ name: b.name, public: b.public })));
    
    // Check if payment-proofs exists and list its contents
    const proofsBucket = data.find(b => b.name === 'payment-proofs' || b.name === 'payments' || b.name === 'proofs');
    if (proofsBucket) {
        console.log(`Found bucket: ${proofsBucket.name}`);
        const { data: files, error: filesError } = await supabase.storage.from(proofsBucket.name).list('plan-proofs', { limit: 10 });
        if (filesError) {
            console.error(`Error listing files in ${proofsBucket.name}:`, filesError);
        } else {
            console.log(`Files in ${proofsBucket.name}/plan-proofs:`, files.map(f => f.name));
        }
    } else {
        console.log('No payment-related bucket found!');
    }
}

checkBuckets();
