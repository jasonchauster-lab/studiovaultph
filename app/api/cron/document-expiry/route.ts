import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';
import DocumentExpiryEmail from '@/components/emails/DocumentExpiryEmail';
import { getManilaTodayStr } from '@/lib/timezone';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use the shared createAdminClient helper — keeps credential logic in one place.
    const supabase = createAdminClient();

    const todayStr = getManilaTodayStr();
    const today = new Date(todayStr);
    today.setUTCHours(0, 0, 0, 0);

    const in30DaysStr = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const in7DaysStr = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const results = {
        instructors: { suspended: 0, reminders7: 0, reminders30: 0 },
        studios: { suspended: 0, reminders7: 0, reminders30: 0 },
        errors: [] as any[]
    };

    try {
        // --- 1. PROCESS INSTRUCTORS ---
        const { data: instructors, error: instError } = await supabase
            .from('profiles')
            .select('id, email, full_name, gov_id_expiry, is_suspended')
            .eq('role', 'instructor')
            .not('gov_id_url', 'is', null);

        if (instError) throw instError;

        for (const instructor of instructors || []) {
            if (!instructor.gov_id_expiry) continue;
            const expiryStr = instructor.gov_id_expiry;

            if (expiryStr < todayStr) {
                if (!instructor.is_suspended) {
                    await supabase.from('profiles').update({ is_suspended: true }).eq('id', instructor.id);
                    results.instructors.suspended++;
                    if (instructor.email) {
                        try {
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
                        } catch (e: any) { results.errors.push({ type: 'instructor', id: instructor.id, error: e.message }); }
                    }
                }
            } else if (expiryStr === in7DaysStr) {
                results.instructors.reminders7++;
                if (instructor.email) {
                    try {
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
                    } catch (e: any) { results.errors.push({ type: 'instructor', id: instructor.id, error: e.message }); }
                }
            } else if (expiryStr === in30DaysStr) {
                results.instructors.reminders30++;
                if (instructor.email) {
                    try {
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
                    } catch (e: any) { results.errors.push({ type: 'instructor', id: instructor.id, error: e.message }); }
                }
            }
        }

        // --- 2. PROCESS STUDIOS ---
        const { data: studios, error: studioError } = await supabase
            .from('studios')
            .select('id, name, owner_id, payout_lock, mayors_permit_expiry, secretary_certificate_expiry, bir_certificate_expiry, gov_id_expiry, insurance_expiry, profiles(email, full_name)');

        if (studioError) throw studioError;

        for (const studio of studios || []) {
            const expiredDocs: string[] = [];
            const reminder7Docs: string[] = [];
            const reminder30Docs: string[] = [];

            const checkDoc = (expiryStr: string | null, docName: string) => {
                if (!expiryStr) return;
                if (expiryStr < todayStr) expiredDocs.push(docName);
                else if (expiryStr === in7DaysStr) reminder7Docs.push(docName);
                else if (expiryStr === in30DaysStr) reminder30Docs.push(docName);
            };

            checkDoc(studio.mayors_permit_expiry, "Mayor's Permit");
            checkDoc(studio.secretary_certificate_expiry, "Secretary's Certificate");
            checkDoc(studio.bir_certificate_expiry, "BIR Form 2303");
            checkDoc(studio.gov_id_expiry, "Valid Government ID");
            checkDoc(studio.insurance_expiry, "Insurance Policy");

            const profile = Array.isArray(studio.profiles) ? studio.profiles[0] : studio.profiles;
            const ownerEmail = (profile as any)?.email;
            const ownerName = (profile as any)?.full_name;

            if (expiredDocs.length > 0) {
                if (!studio.payout_lock) {
                    await supabase.from('studios').update({ payout_lock: true }).eq('id', studio.id);
                    results.studios.suspended++;
                    if (ownerEmail) {
                        try {
                            await sendEmail({
                                to: ownerEmail,
                                subject: 'Action Required: Your Studio has been Suspended',
                                react: DocumentExpiryEmail({
                                    entityName: studio.name || ownerName || 'Your Studio',
                                    entityType: 'studio',
                                    type: 'suspended',
                                    expiredDocuments: expiredDocs,
                                    uploadUrl: 'https://studiovaultph.com/studio/settings'
                                })
                            });
                        } catch (e: any) { results.errors.push({ type: 'studio', id: studio.id, error: e.message }); }
                    }
                }
            } else if (reminder7Docs.length > 0) {
                results.studios.reminders7++;
                if (ownerEmail) {
                    try {
                        await sendEmail({
                            to: ownerEmail,
                            subject: 'Urgent: Studio Documents Expiring in 7 Days',
                            react: DocumentExpiryEmail({
                                entityName: studio.name || ownerName || 'Your Studio',
                                entityType: 'studio',
                                type: 'reminder_7',
                                expiredDocuments: reminder7Docs,
                                uploadUrl: 'https://studiovaultph.com/studio/settings'
                            })
                        });
                    } catch (e: any) { results.errors.push({ type: 'studio', id: studio.id, error: e.message }); }
                }
            } else if (reminder30Docs.length > 0) {
                results.studios.reminders30++;
                if (ownerEmail) {
                    try {
                        await sendEmail({
                            to: ownerEmail,
                            subject: 'Reminder: Studio Documents Expiring in 30 Days',
                            react: DocumentExpiryEmail({
                                entityName: studio.name || ownerName || 'Your Studio',
                                entityType: 'studio',
                                type: 'reminder_30',
                                expiredDocuments: reminder30Docs,
                                uploadUrl: 'https://studiovaultph.com/studio/settings'
                            })
                        });
                    } catch (e: any) { results.errors.push({ type: 'studio', id: studio.id, error: e.message }); }
                }
            }
        }

        return NextResponse.json({ success: true, results });

    } catch (err: any) {
        console.error('Error in unified-document-expiry cron:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
