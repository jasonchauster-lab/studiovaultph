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
        const { data: studios, error } = await supabase
            .from('studios')
            .select('id, name, owner_id, payout_lock, mayors_permit_expiry, secretary_certificate_expiry, bir_certificate_expiry, gov_id_expiry, insurance_expiry, profiles(email, full_name)');

        if (error) throw error;

        const results = {
            suspended: 0,
            reminders7: 0,
            reminders30: 0,
            errors: [] as any[]
        };

        for (const studio of studios || []) {
            const expiredDocs: string[] = [];
            const reminder7Docs: string[] = [];
            const reminder30Docs: string[] = [];

            const checkDoc = (expiryStr: string | null, docName: string) => {
                if (!expiryStr) return;
                if (expiryStr < todayStr) {
                    expiredDocs.push(docName);
                } else if (expiryStr === in7DaysStr) {
                    reminder7Docs.push(docName);
                } else if (expiryStr === in30DaysStr) {
                    reminder30Docs.push(docName);
                }
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
                    results.suspended++;

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
                        } catch (e: any) {
                            results.errors.push({ id: studio.id, error: e.message });
                        }
                    }
                }
            } else if (reminder7Docs.length > 0) {
                results.reminders7++;
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
                    } catch (e: any) {
                        results.errors.push({ id: studio.id, error: e.message });
                    }
                }
            } else if (reminder30Docs.length > 0) {
                results.reminders30++;
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
                    } catch (e: any) {
                        results.errors.push({ id: studio.id, error: e.message });
                    }
                }
            }
        }

        return NextResponse.json({ success: true, results });

    } catch (err: any) {
        console.error('Error in check-studio-expiry cron:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
