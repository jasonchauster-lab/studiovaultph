const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.resolve(__dirname, '.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value.length > 0) {
        env[key.trim()] = value.join('=').trim();
    }
});

const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
);

async function complete() {
    const bookingId = 'b9a7e6be-0a64-4a5c-be09-f47756b6f130';
    console.log(`Manually completing booking ${bookingId}...`);

    const { data: success, error: rpcError } = await supabase.rpc('process_booking_completion_atomic', {
        target_booking_id: bookingId
    });

    if (rpcError) {
        console.error('RPC Error:', rpcError);
        return;
    }

    if (success) {
        console.log('Successfully completed booking!');

        // Verify status
        const { data: booking } = await supabase
            .from('bookings')
            .select('id, status, completed_at')
            .eq('id', bookingId)
            .single();

        console.log('New Booking Status:', booking.status);
        console.log('Completed At:', booking.completed_at);
    } else {
        console.log('Booking not eligible or already completed.');
    }
}

complete();
