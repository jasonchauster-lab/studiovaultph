
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMTUyODgsImV4cCI6MjA4Njc5MTI4OH0.BGxtSbYjz5_cNoJhHyigwY7Pqv0NAP2gz0uNHHFPqTU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOwner() {
  const { data: studio, error: sError } = await supabase
    .from('studios')
    .select('id, name, owner_id, pricing, hourly_rate')
    .eq('id', 'e6a2d39e-b888-4b84-9c6d-5711a62c9920')
    .single();

  if (sError) {
    console.error('Studio error:', sError);
  } else {
    console.log('Studio Data:', JSON.stringify(studio, null, 2));
  }
}

checkOwner();
