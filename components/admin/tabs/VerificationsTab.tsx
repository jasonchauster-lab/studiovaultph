import React from 'react'
import { createAdminClient } from '@/lib/supabase/server'
import { CheckCircle, Building2, Wallet } from 'lucide-react'
import VerifyButton from '@/components/admin/VerifyButton'

export default async function VerificationsTab() {
    const supabase = createAdminClient()
    
    // 1. Fetch only verification-related data
    const { data: queuesData, error: queuesError } = await supabase.rpc('get_admin_dashboard_queues')
    if (queuesError) console.error('[VerificationsTab] Queue RPC failed:', queuesError)
    
    const queues = queuesData || {}
    const pendingCerts = queues.certifications || []
    const pendingStudios = queues.studios_verify || []
    const pendingStudioPayouts = queues.studios_payout || []

    // 2. Generate Signed URLs
    let certUrlMap: Record<string, string> = {}
    let studioUrlMap: Record<string, string> = {}
    let payoutUrlMap: Record<string, string> = {}

    const isStoragePath = (url: string) => url && !url.startsWith('http')

    const certUrlPaths = pendingCerts.flatMap((cert: any) =>
        [cert.proof_url, cert.profiles?.gov_id_url, cert.profiles?.bir_url].filter(Boolean)
    )
    const studioUrlPaths = pendingStudios.flatMap((s: any) =>
        [s.bir_certificate_url, s.gov_id_url, s.insurance_url].filter(Boolean)
    )
    const payoutUrlPaths = pendingStudioPayouts.flatMap((s: any) =>
        [s.mayors_permit_url, s.secretary_certificate_url, s.insurance_url].filter(Boolean)
    )

    const [certSignedRes, studioSignedRes, payoutSignedRes] = await Promise.all([
        certUrlPaths.length > 0 ? supabase.storage.from('certifications').createSignedUrls(certUrlPaths, 3600) : Promise.resolve({ data: [] }),
        studioUrlPaths.length > 0 ? supabase.storage.from('certifications').createSignedUrls(studioUrlPaths, 3600) : Promise.resolve({ data: [] }),
        payoutUrlPaths.length > 0 ? supabase.storage.from('certifications').createSignedUrls(payoutUrlPaths, 3600) : Promise.resolve({ data: [] }),
    ])

    const mkMap = (res: any) => Object.fromEntries((res.data ?? []).filter((r: any) => r.signedUrl).map((r: any) => [r.path, r.signedUrl]))
    certUrlMap = mkMap(certSignedRes)
    studioUrlMap = mkMap(studioSignedRes)
    payoutUrlMap = mkMap(payoutSignedRes)

    const certsWithUrls = pendingCerts.map((cert: any) => ({
        ...cert,
        signedUrl: cert.proof_url ? (certUrlMap[cert.proof_url] ?? null) : null,
        govIdSignedUrl: cert.profiles?.gov_id_url ? (certUrlMap[cert.profiles.gov_id_url] ?? null) : null,
        birSignedUrl: cert.profiles?.bir_url ? (certUrlMap[cert.profiles.bir_url] ?? null) : null,
    }))

    const studiosWithUrls = pendingStudios.map((studio: any) => ({
        ...studio,
        birSignedUrl: studio.bir_certificate_url ? (studioUrlMap[studio.bir_certificate_url] ?? null) : null,
        govIdSignedUrl: studio.gov_id_url ? (studioUrlMap[studio.gov_id_url] ?? null) : null,
        insuranceSignedUrl: studio.insurance_url ? (studioUrlMap[studio.insurance_url] ?? null) : null,
    }))

    const payoutStudiosWithUrls = pendingStudioPayouts.map((studio: any) => ({
        ...studio,
        permitSignedUrl: studio.mayors_permit_url ? (payoutUrlMap[studio.mayors_permit_url] ?? null) : null,
        certSignedUrl: studio.secretary_certificate_url ? (payoutUrlMap[studio.secretary_certificate_url] ?? null) : null,
        birSignedUrl: studio.bir_certificate_url ? (payoutUrlMap[studio.bir_certificate_url] ?? null) : null,
        insuranceSignedUrl: studio.insurance_url ? (payoutUrlMap[studio.insurance_url] ?? null) : null,
    }))

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="atelier-card p-8 space-y-6">
                <h2 className="text-sm font-black tracking-[0.2em] text-burgundy flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-forest" />
                    INSTRUCTOR VERIFICATIONS
                    {certsWithUrls.length > 0 && <span className="flex items-center justify-center w-6 h-6 rounded-full bg-forest text-white text-[10px] font-black">{certsWithUrls.length}</span>}
                </h2>
                {certsWithUrls.length === 0 ? <p className="text-burgundy/40 text-xs italic">All instructor certifications are up to date.</p> : (
                    <div className="space-y-4">
                        {certsWithUrls.map((cert: any) => (
                            <div key={cert.id} className="group p-5 bg-stone-50 border border-stone-100 rounded-2xl hover:bg-white hover:shadow-xl transition-all duration-300">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="space-y-1">
                                        <p className="font-bold text-burgundy text-sm">{cert.profiles?.full_name}</p>
                                        <p className="text-[10px] text-burgundy/50 font-black uppercase tracking-wider">{cert.certification_name}</p>
                                        <div className="pt-2 flex gap-3">
                                            {cert.signedUrl && (
                                                <a href={cert.signedUrl} target="_blank" className="text-[10px] font-black text-forest hover:text-burgundy uppercase tracking-widest flex items-center gap-1.5 transition-colors">
                                                    <div className="w-1 h-1 rounded-full bg-forest" />
                                                    CERT PROOF
                                                </a>
                                            )}
                                            {cert.govIdSignedUrl && (
                                                <a href={cert.govIdSignedUrl} target="_blank" className="text-[10px] font-black text-forest hover:text-burgundy uppercase tracking-widest flex items-center gap-1.5 transition-colors">
                                                    <div className="w-1 h-1 rounded-full bg-forest" />
                                                    GOV ID
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <VerifyButton id={cert.id} action="rejectCert" label="REJECT" className="px-4 py-2 bg-red-50 text-red-600 text-[10px] font-black rounded-xl hover:bg-red-100 transition-colors tracking-widest" />
                                        <VerifyButton id={cert.id} action="approveCert" label="APPROVE" className="px-4 py-2 bg-forest text-white text-[10px] font-black rounded-xl hover:brightness-110 transition-all tracking-widest shadow-md" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="atelier-card p-8 space-y-6">
                <h2 className="text-sm font-black tracking-[0.2em] text-burgundy flex items-center gap-3">
                    <Building2 className="w-4 h-4 text-forest" />
                    STUDIO VERIFICATIONS
                    {studiosWithUrls.length > 0 && <span className="flex items-center justify-center w-6 h-6 rounded-full bg-forest text-white text-[10px] font-black">{studiosWithUrls.length}</span>}
                </h2>
                {studiosWithUrls.length === 0 ? <p className="text-burgundy/40 text-xs italic">No pending studio verifications.</p> : (
                    <div className="space-y-4">
                        {studiosWithUrls.map((s: any) => (
                            <div key={s.id} className="group p-5 bg-stone-50 border border-stone-100 rounded-2xl hover:bg-white hover:shadow-xl transition-all duration-300">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="space-y-1">
                                        <p className="font-bold text-burgundy text-sm">{s.name}</p>
                                        <p className="text-[10px] text-burgundy/50 font-black uppercase tracking-wider">Owner: {s.profiles?.full_name}</p>
                                        <div className="pt-2 flex gap-3">
                                            {s.birSignedUrl && <a href={s.birSignedUrl} target="_blank" className="text-[10px] font-black text-forest uppercase tracking-widest transition-colors hover:text-burgundy">BIR</a>}
                                            {s.govIdSignedUrl && <a href={s.govIdSignedUrl} target="_blank" className="text-[10px] font-black text-forest uppercase tracking-widest transition-colors hover:text-burgundy">GOV ID</a>}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <VerifyButton id={s.id} action="rejectStudio" label="REJECT" className="px-4 py-2 bg-red-50 text-red-600 text-[10px] font-black rounded-xl" />
                                        <VerifyButton id={s.id} action="verifyStudio" label="APPROVE" className="px-4 py-2 bg-forest text-white text-[10px] font-black rounded-xl" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="atelier-card p-8 space-y-6 lg:col-span-2">
                <h2 className="text-sm font-black tracking-[0.2em] text-burgundy flex items-center gap-3">
                    <Wallet className="w-4 h-4 text-forest" />
                    STUDIO PAYOUT SETUPS
                    {payoutStudiosWithUrls.length > 0 && <span className="flex items-center justify-center w-6 h-6 rounded-full bg-forest text-white text-[10px] font-black">{payoutStudiosWithUrls.length}</span>}
                </h2>
                {payoutStudiosWithUrls.length === 0 ? <p className="text-burgundy/40 text-xs italic">No pending payout setups.</p> : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {payoutStudiosWithUrls.map((s: any) => (
                            <div key={s.id} className="group p-5 bg-stone-50 border border-stone-100 rounded-2xl hover:bg-white hover:shadow-xl transition-all duration-300">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="space-y-1">
                                        <p className="font-bold text-burgundy text-sm">{s.name}</p>
                                        <p className="text-[10px] text-burgundy/50 font-black uppercase tracking-wider">{s.profiles?.full_name}</p>
                                         <div className="pt-2 flex flex-wrap gap-x-4 gap-y-1">
                                             {s.permitSignedUrl && (
                                                 <div className="flex items-center gap-1.5">
                                                     <a href={s.permitSignedUrl} target="_blank" className="text-[10px] font-black text-forest uppercase tracking-widest hover:text-burgundy transition-colors">PERMIT</a>
                                                     {s.mayors_permit_expiry && <span className="text-[8px] text-burgundy/40 font-bold uppercase tracking-[0.1em]">Exp: {s.mayors_permit_expiry}</span>}
                                                 </div>
                                             )}
                                             {s.certSignedUrl && <a href={s.certSignedUrl} target="_blank" className="text-[10px] font-black text-forest uppercase tracking-widest hover:text-burgundy transition-colors">SEC CERT</a>}
                                         </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <VerifyButton id={s.id} action="rejectStudioPayout" label="REJECT" className="px-3 py-1 bg-red-50 text-red-700 text-[10px] font-black rounded-lg" />
                                        <VerifyButton id={s.id} action="approveStudioPayout" label="APPROVE" className="px-3 py-1 bg-forest text-white text-[10px] font-black rounded-lg" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
