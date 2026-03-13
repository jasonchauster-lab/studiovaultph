import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import PartnersManagementContent from './PartnersManagementContent';

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

    // Sign Studio Documents — batch all paths in one request instead of one per studio
    const allPathsToSign: string[] = [];
    for (const s of (studiosRaw || [])) {
        if (s.bir_certificate_url) allPathsToSign.push(s.bir_certificate_url);
        if (s.gov_id_url) allPathsToSign.push(s.gov_id_url);
        if (s.mayors_permit_url) allPathsToSign.push(s.mayors_permit_url);
        if (s.secretary_certificate_url) allPathsToSign.push(s.secretary_certificate_url);
    }

    const globalSignedUrlsMap: Record<string, string> = {};
    if (allPathsToSign.length > 0) {
        const { data: signedData } = await supabase.storage.from('certifications').createSignedUrls(allPathsToSign, 3600);
        signedData?.forEach(item => {
            if (item.signedUrl && item.path) globalSignedUrlsMap[item.path] = item.signedUrl;
        });
    }

    const studios = (studiosRaw || []).map((s: any) => ({
        ...s,
        documents: {
            bir: s.bir_certificate_url ? globalSignedUrlsMap[s.bir_certificate_url] : null,
            govId: s.gov_id_url ? globalSignedUrlsMap[s.gov_id_url] : null,
            mayorsPermit: s.mayors_permit_url ? globalSignedUrlsMap[s.mayors_permit_url] : null,
            secretaryCert: s.secretary_certificate_url ? globalSignedUrlsMap[s.secretary_certificate_url] : null,
            spacePhotos: s.space_photos_urls || []
        }
    }));

    return (
        <div className="min-h-screen bg-cream-50 p-4 sm:p-8">
            <div className="max-w-6xl mx-auto">
                <PartnersManagementContent
                    instructors={instructors || []}
                    studios={studios || []}
                />
            </div>
        </div>
    );
}
