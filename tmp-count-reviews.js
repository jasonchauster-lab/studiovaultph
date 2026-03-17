
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMTUyODgsImV4cCI6MjA4Njc5MTI4OH0.BGxtSbYjz5_cNoJhHyigwY7Pqv0NAP2gz0uNHHFPqTU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function countReviews() {
  const ownerId = '909c5932-4410-415e-8743-26d5f3b4d8d4';
  const { count, error } = await supabase
    .from('reviews')
    .select('id', { count: 'exact', head: true })
    .eq('reviewee_id', ownerId);

  if (error) {
    console.error('Reviews error:', error);
  } else {
    console.log('Total Reviews for owner:', count);
  }
}

countReviews();
