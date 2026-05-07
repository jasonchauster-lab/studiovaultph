const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugJaden() {
    // 1. Get the plan
    const { data: plan, error } = await supabase
        .from('customer_plans')
        .select('*')
        .eq('id', 'a74b28ec-1491-49f6-9525-50ec077f5210') // Jaden's ID from screenshot
        .single();

    if (error) {
        console.error('Error fetching plan:', error);
        return;
    }

    console.log('Jaden Plan DB Record:', {
        id: plan.id,
        status: plan.status,
        payment_proof_url: plan.payment_proof_url
    });

    if (plan.payment_proof_url) {
        // 2. Generate signed URL
        const { data, error: signedError } = await supabase.storage
            .from('payment-proofs')
            .createSignedUrl(plan.payment_proof_url, 3600);

        if (signedError) {
            console.error('Error generating signed URL:', signedError);
        } else {
            console.log('Generated Signed URL:', data.signedUrl);
        }
        
        // 3. Check if file actually exists via public URL (just in case)
        const publicUrl = supabase.storage.from('payment-proofs').getPublicUrl(plan.payment_proof_url).data.publicUrl;
        console.log('Public URL (for comparison):', publicUrl);
    }
}

debugJaden();
