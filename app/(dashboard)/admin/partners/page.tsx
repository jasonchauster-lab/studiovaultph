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
    const { data: instructorsRaw } = await supabase
        .from('profiles')
        .select(`
            id, 
            full_name, 
            role, 
            is_founding_partner, 
            custom_fee_percentage, 
            email, 
            contact_number,
            gov_id_url,
            gov_id_expiry,
            bir_url,
            bir_expiry,
            certifications(proof_url, expiry_date)
        `)
        .eq('role', 'instructor')
        .order('full_name', { ascending: true });

    // Fetch Studios
    const { data: studiosRaw } = await supabase
        .from('studios')
        .select('id, name, location, is_founding_partner, custom_fee_percentage, contact_number, owner:profiles!owner_id(email), bir_certificate_url, bir_certificate_expiry, gov_id_url, mayors_permit_url, mayors_permit_expiry, secretary_certificate_url, space_photos_urls, insurance_url, insurance_expiry')
        .eq('verified', true)
        .order('name', { ascending: true });

    // Sign Documents — batch all paths in one request
    const allPathsToSign: string[] = [];
    
    // Studio paths
    for (const s of (studiosRaw || [])) {
        if (s.bir_certificate_url) allPathsToSign.push(s.bir_certificate_url);
        if (s.gov_id_url) allPathsToSign.push(s.gov_id_url);
        if (s.mayors_permit_url) allPathsToSign.push(s.mayors_permit_url);
        if (s.secretary_certificate_url) allPathsToSign.push(s.secretary_certificate_url);
        if (s.insurance_url) allPathsToSign.push(s.insurance_url);
    }

    // Instructor paths
    for (const i of (instructorsRaw || [])) {
        if (i.gov_id_url) allPathsToSign.push(i.gov_id_url);
        if (i.bir_url) allPathsToSign.push(i.bir_url);
        const cert = Array.isArray(i.certifications) ? i.certifications[0] : i.certifications;
        if (cert?.proof_url) allPathsToSign.push(cert.proof_url);
    }

    const globalSignedUrlsMap: Record<string, string> = {};
    if (allPathsToSign.length > 0) {
        const { data: signedData } = await supabase.storage.from('certifications').createSignedUrls(allPathsToSign, 3600);
        signedData?.forEach(item => {
            if (item.signedUrl && item.path) globalSignedUrlsMap[item.path] = item.signedUrl;
        });
    }

    const instructors = (instructorsRaw || []).map((i: any) => {
        const cert = Array.isArray(i.certifications) ? i.certifications[0] : i.certifications;
        return {
            ...i,
            documents: {
                bir: i.bir_url ? globalSignedUrlsMap[i.bir_url] : null,
                birExpiry: i.bir_expiry,
                govId: i.gov_id_url ? globalSignedUrlsMap[i.gov_id_url] : null,
                govIdExpiry: i.gov_id_expiry,
                cert: cert?.proof_url ? globalSignedUrlsMap[cert.proof_url] : null,
                certExpiry: cert?.expiry_date
            }
        };
    });

    const studios = (studiosRaw || []).map((s: any) => ({
        ...s,
        documents: {
            bir: s.bir_certificate_url ? globalSignedUrlsMap[s.bir_certificate_url] : null,
            birExpiry: s.bir_certificate_expiry,
            govId: s.gov_id_url ? globalSignedUrlsMap[s.gov_id_url] : null,
            mayorsPermit: s.mayors_permit_url ? globalSignedUrlsMap[s.mayors_permit_url] : null,
            mayorsPermitExpiry: s.mayors_permit_expiry,
            secretaryCert: s.secretary_certificate_url ? globalSignedUrlsMap[s.secretary_certificate_url] : null,
            insurance: s.insurance_url ? globalSignedUrlsMap[s.insurance_url] : null,
            insuranceExpiry: s.insurance_expiry,
            spacePhotos: s.space_photos_urls || []
        }
    }));

    return (
        <div className="min-h-screen bg-cream-50 p-4 sm:p-8">
            <div className="max-w-6xl mx-auto">
                <PartnersManagementContent
                    instructors={instructors}
                    studios={studios}
                />
            </div>
        </div>
    );
}
