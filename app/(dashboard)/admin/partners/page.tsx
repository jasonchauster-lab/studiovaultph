import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import GlobalSearch from '@/components/admin/GlobalSearch';
import PartnerFeeClient from '@/components/admin/PartnerFeeClient';

export default async function AdminPartnersPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Re-verify Admin role
    if (!user) redirect('/login');
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') redirect('/login');

    // Fetch Instructors
    const { data: instructors } = await supabase
        .from('profiles')
        .select('id, full_name, role, is_founding_partner, custom_fee_percentage, email, contact_number')
        .eq('role', 'instructor')
        .order('full_name', { ascending: true });

    // Fetch Studios
    const { data: studiosRaw } = await supabase
        .from('studios')
        .select('id, name, location, is_founding_partner, custom_fee_percentage, contact_number, owner:profiles!owner_id(email), bir_certificate_url, gov_id_url, mayors_permit_url, secretary_certificate_url, space_photos_urls')
        .eq('verified', true)
        .order('name', { ascending: true });

    // Sign Studio Documents
    const studios = await Promise.all((studiosRaw || []).map(async (s: any) => {
        const pathsToSign = [];
        if (s.bir_certificate_url) pathsToSign.push(s.bir_certificate_url);
        if (s.gov_id_url) pathsToSign.push(s.gov_id_url);
        if (s.mayors_permit_url) pathsToSign.push(s.mayors_permit_url);
        if (s.secretary_certificate_url) pathsToSign.push(s.secretary_certificate_url);

        let signedUrlsMap: Record<string, string> = {};
        if (pathsToSign.length > 0) {
            const { data: signedData } = await supabase.storage.from('certifications').createSignedUrls(pathsToSign, 3600);
            if (signedData) {
                signedData.forEach(item => {
                    if (item.signedUrl && item.path) signedUrlsMap[item.path] = item.signedUrl;
                });
            }
        }

        return {
            ...s,
            documents: {
                bir: s.bir_certificate_url ? signedUrlsMap[s.bir_certificate_url] : null,
                govId: s.gov_id_url ? signedUrlsMap[s.gov_id_url] : null,
                mayorsPermit: s.mayors_permit_url ? signedUrlsMap[s.mayors_permit_url] : null,
                secretaryCert: s.secretary_certificate_url ? signedUrlsMap[s.secretary_certificate_url] : null,
                spacePhotos: s.space_photos_urls || []
            }
        };
    }));

    return (
        <div className="min-h-screen bg-cream-50 p-4 sm:p-8">
            <div className="max-w-6xl mx-auto">

                <div className="flex flex-col gap-4">
                    <div>
                        <h1 className="text-3xl font-serif text-charcoal-900 mb-1">Partner Management</h1>
                        <p className="text-charcoal-600 text-sm">Manage instructor and studio commission fees.</p>
                    </div>
                    <div className="w-full max-w-lg">
                        <GlobalSearch />
                    </div>
                </div>

                <div className="bg-white text-charcoal-900 rounded-2xl border border-cream-200 shadow-sm p-6 overflow-x-auto">
                    <PartnerFeeClient
                        instructors={instructors || []}
                        studios={studios || []}
                    />
                </div>
            </div>
        </div>
    );
}
