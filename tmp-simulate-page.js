
const { createClient } = require('@supabase/supabase-js');
const { startOfMonth, endOfMonth, format } = require('date-fns');

// Mocking some internal libs since we can't easily import TS files with relative paths in a simple node script
// We'll just copy the logic or assume it works as tested.

const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function simulatePage() {
  const id = 'e6a2d39e-b888-4b84-9c6d-5711a62c9920'; // Clubpilates PH
  const userId = '87cf6e4d-9057-431d-9db4-7c458c8728cb'; // jchau199@gmail.com

  console.log('Simulating Page Render...');

  try {
    // Round 1
    console.log('Round 1: Fetching Studio Data...');
    const { data: studio, error: sError } = await supabase
      .from('studios')
      .select('*, profiles!owner_id(available_balance, is_suspended, avatar_url, full_name)')
      .eq('id', id)
      .single();

    if (sError) throw sError;
    console.log('Studio fetched successfully');

    // Fetch instructors (simplified)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, rates, avatar_url, bio, instagram_handle, teaching_equipment')
      .eq('role', 'instructor')
      .not('rates', 'is', null);

    console.log(`Fetched ${profiles.length} instructor profiles`);

    const allInstructorIds = (profiles || []).map((p) => p.id);

    const [{ data: certsRaw }, { data: availabilityRaw }] = await Promise.all([
      supabase
        .from('certifications')
        .select('instructor_id, verified, certification_body, certification_name')
        .in('instructor_id', allInstructorIds)
        .eq('verified', true),
      supabase
        .from('instructor_availability')
        .select('instructor_id, day_of_week, date, start_time, end_time, location_area')
        .in('instructor_id', allInstructorIds),
    ]);

    console.log('Static data fetch simulation complete');

    // Round 2
    console.log('Round 2: Fetching pending bookings and reviews...');
    const [{ data: pendingBookings }, { data: reviewsRaw, error: rError }] = await Promise.all([
        supabase.from('bookings').select('id, slot_id, status, booked_slot_ids').eq('client_id', userId).eq('status', 'pending'),
        supabase.from('reviews').select('*, reviewer:profiles!reviewer_id (full_name, avatar_url, role)').eq('reviewee_id', studio.owner_id)
    ]);

    if (rError) throw rError;
    console.log(`Fetched ${reviewsRaw.length} reviews`);

    // Round 3
    console.log('Round 3: Fetching slots...');
    const nowTime = '12:00:00'; // Mocked
    const nowDate = '2026-03-17'; // Mocked
    const startDateStr = '2026-03-01';
    const endDateStr = '2026-03-31';

    const [availableSlotsRes, lockedSlotsRes] = await Promise.all([
        supabase
            .from('slots')
            .select('*')
            .eq('studio_id', id)
            .eq('is_available', true)
            .gte('date', startDateStr)
            .lte('date', endDateStr)
            .order('date', { ascending: true }),
        Promise.resolve({ data: [] })
    ]);

    console.log(`Fetched ${availableSlotsRes.data?.length || 0} slots`);

    // logic simulation
    console.log('Simulating filter logic...');
    const trimmedStudioLocation = studio.location?.trim() ?? ''
    const locationTokens = trimmedStudioLocation
        .split(/[\s\-\/,]+/)
        .map((t) => t.trim())
        .filter((t) => t.length > 1)

    const instructors = (profiles || []).map(p => ({
        ...p,
        certifications: (certsRaw || []).filter(c => c.instructor_id === p.id),
        instructor_availability: (availabilityRaw || []).filter(a => a.instructor_id === p.id)
    })).filter(i => {
        if (i.certifications.length === 0) return false
        const instrLocations = i.instructor_availability.map((a) => (a.location_area ?? '').trim().toLowerCase())
        return instrLocations.some(loc =>
            loc === trimmedStudioLocation.toLowerCase() ||
            locationTokens.some((token) => loc.includes(token.toLowerCase()) || loc.startsWith(token.toLowerCase()))
        )
    })

    console.log(`Filter simulation complete. Found ${instructors.length} instructors.`);
    console.log('SIMULATION SUCCESS!');

  } catch (err) {
    console.error('SIMULATION FAILED:', err);
  }
}

simulatePage();
