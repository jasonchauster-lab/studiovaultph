
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkClubPilatesProfile() {
  const { data: studio, error: sError } = await supabase
    .from('studios')
    .select('id, name, owner_id, profiles!owner_id(available_balance, is_suspended, avatar_url, full_name)')
    .eq('id', 'e6a2d39e-b888-4b84-9c6d-5711a62c9920')
    .single();

  if (sError) {
    console.error('Studio error:', sError);
  } else {
    console.log('Studio Data with Profile:', JSON.stringify(studio, null, 2));
  }
}

checkClubPilatesProfile();
