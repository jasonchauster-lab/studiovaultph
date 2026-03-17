
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkReviews() {
  const email = 'jchau199@gmail.com';
  console.log(`Checking reviews for user: ${email}`);

  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const user = authUsers.users.find(u => u.email === email);
  if (!user) return;

  const { data: reviews, error: rError } = await supabase
    .from('reviews')
    .select('*')
    .or(`reviewer_id.eq.${user.id},reviewee_id.eq.${user.id}`);

  if (rError) {
    console.error('Reviews error:', rError);
  } else {
    console.log(`Found ${reviews.length} reviews relating to this user`);
    console.log(JSON.stringify(reviews, null, 2));
  }
}

checkReviews();
