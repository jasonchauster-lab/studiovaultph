import { NextResponse } from 'next/server';
import { autoCompleteBookings, unlockMaturedFunds, expireAbandonedBookings } from '@/lib/wallet';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');

    // Security check via CRON_SECRET
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        console.log('CRON: Starting unified wallet processing...');

        // 1. Expire Abandoned Bookings (Unpaid for 15+ minutes)
        const expired = await expireAbandonedBookings();

        // 2. Auto-complete Bookings (Ended > 1 hour ago)
        const completed = await autoCompleteBookings();

        // 3. Unlock Matured Funds (Completed > 24 hours ago)
        const unlocked = await unlockMaturedFunds();

        return NextResponse.json({
            success: true,
            results: {
                expired: expired.count,
                completed: completed.count,
                unlocked: unlocked.count
            }
        });

    } catch (err: any) {
        console.error('CRON ERROR: Integrated wallet process failed:', err);
        return NextResponse.json({
            success: false,
            error: err.message
        }, { status: 500 });
    }
}
