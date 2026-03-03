
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAvailability() {
    const studioId = 'e6a2d39e-b888-4b84-9c6d-5711a62c9920';
    const selectedDate = '2026-03-03';
    const selectedTime = '09:00:00';
    const selectedEnd = '10:00:00';
    const selectedEquipment = 'CHAIR';

    console.log(`--- Checking Availability for Studio: ${studioId} ---`);
    console.log(`Date: ${selectedDate}, Time: ${selectedTime}, Equipment: ${selectedEquipment}`);

    // 1. Get Studio
    const { data: studio } = await supabase
        .from('studios')
        .select('*')
        .eq('id', studioId)
        .single();

    if (!studio) {
        console.error('Studio not found');
        return;
    }

    const trimmedStudioLocation = studio.location?.trim() ?? '';
    console.log(`Studio Location: "${trimmedStudioLocation}"`);

    const locationTokens = trimmedStudioLocation
        .split(/[\s\-\/,]+/)
        .map(t => t.trim())
        .filter(t => t.length > 1);
    console.log(`Location Tokens: ${JSON.stringify(locationTokens)}`);

    // 2. Fetch Instructors (Page logic)
    const { data: instructorsRaw, error: instrError } = await supabase
        .from('profiles')
        .select(`
            id,
            full_name,
            rates,
            certifications!inner (
                verified
            ),
            instructor_availability!inner (
                location_area
            )
        `)
        .eq('role', 'instructor')
        .not('rates', 'is', null);

    if (instrError) {
        console.error('Instructor Query Error:', instrError);
        return;
    }

    if (!instructorsRaw) {
        console.log('No instructors found (null data)');
        return;
    }

    console.log(`Total instructors with availability entries: ${instructorsRaw.length}`);

    const instructors = (instructorsRaw || []).filter(i => {
        const verified = i.certifications && i.certifications.some(c => c.verified);
        if (!verified) return false;
        const instrLocations = Array.isArray(i.instructor_availability)
            ? i.instructor_availability.map(a => (a.location_area ?? '').trim().toLowerCase())
            : [];

        return instrLocations.some(loc =>
            loc === trimmedStudioLocation.toLowerCase() ||
            locationTokens.some(token => loc.includes(token.toLowerCase()) || loc.startsWith(token.toLowerCase()))
        );
    });

    console.log(`Instructors matching location: ${instructors.length} (${instructors.map(i => i.full_name).join(', ')})`);

    // 3. Fetch Availability Blocks (Page logic)
    const instructorIds = instructors.map(i => i.id);
    const { data: locationAvailabilityRaw } = instructorIds.length > 0
        ? await supabase
            .from('instructor_availability')
            .select('instructor_id, day_of_week, date, start_time, end_time, location_area')
            .in('instructor_id', instructorIds)
        : { data: [] };

    const locationAvailability = (locationAvailabilityRaw || []).filter(block => {
        const bLoc = (block.location_area ?? '').trim().toLowerCase();
        return bLoc === trimmedStudioLocation.toLowerCase() ||
            locationTokens.some(token => bLoc.includes(token.toLowerCase()) || bLoc.startsWith(token.toLowerCase()));
    });

    console.log(`Total availability blocks for this location: ${locationAvailability.length}`);

    // 4. BookingSection logic
    const normalizeTimeTo24h = (time) => {
        if (!time) return '';
        if (time.includes(':')) {
            const parts = time.split(':');
            return parts[0].padStart(2, '0') + ':' + parts[1].padStart(2, '0') + ':00';
        }
        return time;
    };

    const slotTimeNormalized = normalizeTimeTo24h(selectedTime);
    const studioLocLower = trimmedStudioLocation.toLowerCase();
    const dayOfWeek = new Date(selectedDate + "T00:00:00+08:00").getDay();

    const availableInstructors = instructors.filter((instructor) => {
        // Equipment Check
        const instructorRates = instructor.rates || {};
        const hasEquipment = Object.keys(instructorRates).some(
            (key) => key.toUpperCase() === selectedEquipment.toUpperCase()
        );
        if (!hasEquipment) {
            console.log(`- ${instructor.full_name}: Failed Equipment check (${JSON.stringify(instructorRates)})`);
            return false;
        }

        const instBlocks = locationAvailability.filter(b => b.instructor_id === instructor.id);
        if (instBlocks.length === 0) {
            console.log(`- ${instructor.full_name}: Fallback to AVAILABLE (no blocks for this location)`);
            return true;
        }

        const match = instBlocks.some((block) => {
            const blockTimeNormalized = normalizeTimeTo24h(block.start_time);
            const blockLocLower = (block.location_area || '').toLowerCase();

            const timeMatches = blockTimeNormalized <= slotTimeNormalized && normalizeTimeTo24h(block.end_time) > slotTimeNormalized;
            const locationMatches = !blockLocLower || studioLocLower.includes(blockLocLower);
            const dateMatches = block.date === selectedDate || (block.date === null && block.day_of_week === dayOfWeek);

            if (timeMatches && locationMatches && dateMatches) return true;
            return false;
        });

        if (!match) {
            console.log(`- ${instructor.full_name}: Failed Availability blocks check`);
            // Log details of blocks for debugging
            instBlocks.forEach(b => {
                console.log(`  Block: ${b.date || 'Recur'} Day:${b.day_of_week} ${b.start_time}-${b.end_time} Loc:${b.location_area}`);
            });
        }
        return match;
    });

    console.log(`\nFinal Available Instructors: ${availableInstructors.length}`);
    availableInstructors.forEach(i => console.log(`- ${i.full_name}`));
}

checkAvailability();
