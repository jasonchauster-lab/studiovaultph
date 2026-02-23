import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email';
import DocumentExpiryEmail from '@/components/emails/DocumentExpiryEmail';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const in30Days = new Date(today);
    in30Days.setDate(today.getDate() + 30);
    const in30DaysStr = in30Days.toISOString().split('T')[0];

    const in7Days = new Date(today);
    in7Days.setDate(today.getDate() + 7);
    const in7DaysStr = in7Days.toISOString().split('T')[0];

    const todayStr = today.toISOString().split('T')[0];

    try {
        const { data: instructors, error } = await supabase
            .from('profiles')
            .select('id, email, full_name, gov_id_expiry, is_suspended')
            .eq('role', 'instructor')
            .not('gov_id_url', 'is', null);

        if (error) throw error;

        const results = {
            suspended: 0,
            reminders7: 0,
            reminders30: 0,
            errors: [] as any[]
        };

        for (const instructor of instructors || []) {
            if (!instructor.gov_id_expiry) continue;

            const expiryStr = instructor.gov_id_expiry;

            if (expiryStr < todayStr) {
                if (!instructor.is_suspended) {
                    await supabase.from('profiles').update({ is_suspended: true }).eq('id', instructor.id);
                    results.suspended++;

                    if (instructor.email) {
                        await sendEmail({
                            to: instructor.email,
                            subject: 'Action Required: Your Instructor Account has been Suspended',
                            react: DocumentExpiryEmail({
                                entityName: instructor.full_name || 'Instructor',
                                entityType: 'instructor',
                                type: 'suspended',
                                expiredDocuments: ['Valid Government ID'],
                                uploadUrl: 'https://studiovaultph.com/profile'
                            })
                        });
                    }
                }
            } else if (expiryStr === in7DaysStr) {
                results.reminders7++;
                if (instructor.email) {
                    await sendEmail({
                        to: instructor.email,
                        subject: 'Urgent: Government ID Expiring in 7 Days',
                        react: DocumentExpiryEmail({
                            entityName: instructor.full_name || 'Instructor',
                            entityType: 'instructor',
                            type: 'reminder_7',
                            expiredDocuments: ['Valid Government ID'],
                            uploadUrl: 'https://studiovaultph.com/profile'
                        })
                    });
                }
            } else if (expiryStr === in30DaysStr) {
                results.reminders30++;
                if (instructor.email) {
                    await sendEmail({
                        to: instructor.email,
                        subject: 'Reminder: Government ID Expiring in 30 Days',
                        react: DocumentExpiryEmail({
                            entityName: instructor.full_name || 'Instructor',
                            entityType: 'instructor',
                            type: 'reminder_30',
                            expiredDocuments: ['Valid Government ID'],
                            uploadUrl: 'https://studiovaultph.com/profile'
                        })
                    });
                }
            }
        }

        return NextResponse.json({ success: true, results });

    } catch (err: any) {
        console.error('Error in check-instructor-expiry cron:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
