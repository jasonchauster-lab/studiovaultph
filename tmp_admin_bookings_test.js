import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectBookings() {
    console.log('Fetching recent bookings...');

    const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
      id,
      status,
      created_at,
      slots (
        id,
        instructor_id,
        profiles (
          first_name,
          last_name
        )
      )
    `)
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error fetching bookings:', error);
    } else {
        console.dir(bookings, { depth: null });
    }
}

inspectBookings();
