
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPendingBookings() {
  const userId = '87cf6e4d-9057-431d-9db4-7c458c8728cb'; // jchau199@gmail.com
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('id, slot_id, status, booked_slot_ids')
    .eq('client_id', userId)
    .eq('status', 'pending');

  if (error) {
    console.error('Bookings error:', error);
  } else {
    console.log('Pending Bookings:', JSON.stringify(bookings, null, 2));
  }
}

checkPendingBookings();
