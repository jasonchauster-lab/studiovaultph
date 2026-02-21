'use client'

import { useState } from 'react'
import { Upload, CheckCircle, Loader2, AlertCircle, X, FileText, ShieldAlert, HeartPulse, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { submitPaymentProof } from '@/app/(dashboard)/customer/actions'

// ─── Health Waiver Text ───────────────────────────────────────────────────────
const HEALTH_WAIVER_TEXT = `HEALTH AND FITNESS PARTICIPATION WAIVER AND RELEASE OF LIABILITY

Effective Date: Upon Booking

This Health and Fitness Participation Waiver and Release of Liability ("Waiver") is entered into between the participant ("Participant") and Pilates Bridge, its affiliated instructors, studios, and personnel ("Service Providers").

1. VOLUNTARY PARTICIPATION
The Participant voluntarily chooses to participate in Pilates, fitness, and wellness sessions facilitated through the Pilates Bridge platform. The Participant acknowledges that these activities involve physical exertion that may be strenuous and could cause physical injury.

2. DECLARATION OF HEALTH
The Participant represents and warrants that:
a) They are in good physical health and have no known condition, disability, or illness that would prevent safe participation in Pilates or fitness activities;
b) They have disclosed any pre-existing medical conditions, injuries, or physical limitations to the instructor prior to class;
c) If pregnant, post-partum, or recovering from surgery or injury, they have obtained written clearance from a licensed physician before participating;
d) They are not under medical advice to avoid physical activity.

3. ASSUMPTION OF RISK
The Participant acknowledges and accepts that:
a) Physical activity, including Pilates, carries inherent risks of injury, including but not limited to muscle strains, sprains, fractures, and in extreme cases, cardiac events;
b) The use of Pilates equipment (Reformer, Cadillac, Chair, Barrel, etc.) involves additional risk of mechanical injury if not used properly;
c) Such risks exist even when sessions are conducted safely and professionally.

4. RELEASE OF LIABILITY
In consideration of being permitted to participate, the Participant, on behalf of themselves, their heirs, personal representatives, and assigns, hereby releases, waives, and forever discharges Pilates Bridge, its owners, operators, instructors, studios, employees, and agents from any and all claims, demands, or causes of action arising from or related to participation in any session booked through the platform, including claims arising from:
a) Negligence (ordinary) of the released parties;
b) Injury, illness, or death;
c) Damage to or loss of personal property.

This release does not apply to gross negligence, willful misconduct, or reckless disregard for participant safety.

4a. INSTRUCTOR LIABILITY
The assigned instructor is solely responsible for the safe delivery of the session, including appropriate exercise selection, proper equipment setup, and ongoing supervision of the client. The Platform's role is limited to facilitating the booking and payment transaction.

5. EMERGENCY MEDICAL TREATMENT
The Participant authorizes Service Providers to arrange emergency medical treatment at the Participant's expense if such treatment is deemed necessary during a session.

6. GOVERNING LAW
This Waiver shall be governed by and construed in accordance with the laws of the Republic of the Philippines, particularly the Civil Code of the Philippines, the Consumer Act of the Philippines (Republic Act No. 7394), and applicable regulations of the Department of Health and the Professional Regulation Commission.

7. SEVERABILITY
If any provision of this Waiver is found to be unenforceable, the remaining provisions shall remain in full force.

BY CHECKING THE BOX BELOW, THE PARTICIPANT ACKNOWLEDGES THAT THEY HAVE READ, UNDERSTOOD, AND VOLUNTARILY AGREED TO ALL TERMS OF THIS WAIVER.`

// ─── Terms and Conditions Text ────────────────────────────────────────────────
const TERMS_TEXT = `TERMS AND CONDITIONS — BOOKING & CANCELLATION POLICY

Effective Date: Upon Booking

These Terms and Conditions ("Terms") govern all bookings made through the Pilates Bridge platform between the client ("Client") and the instructor/studio ("Service Provider").

1. BOOKING CONFIRMATION
a) A booking is considered tentative until confirmed by the instructor and payment is verified.
b) The Client will receive notification once their booking is confirmed.
c) Pilates Bridge reserves the right to decline any booking at its discretion.

2. PAYMENT
a) Full payment is required prior to confirmation of any session.
b) Accepted payment methods are subject to change. Clients must submit proof of payment through the platform.
c) Sessions will not be confirmed until payment verification is complete.

3. CANCELLATION POLICY — STRICTLY NO CANCELLATION WITHOUT INSTRUCTOR APPROVAL
a) ALL CANCELLATIONS REQUIRE EXPLICIT WRITTEN APPROVAL FROM THE INSTRUCTOR.
b) The Client may NOT cancel a confirmed booking without first receiving written approval from the assigned instructor through the Pilates Bridge platform.
c) Requests to cancel must be submitted through the platform messaging system at least 24 hours before the scheduled session start time.
d) Approval of cancellation requests is at the SOLE DISCRETION of the instructor.
e) Instructors are not obligated to approve cancellation requests for any reason.
f) No-shows or unapproved cancellations forfeit 100% of the session fee. No refund will be issued.

4. REFUND POLICY
a) Refunds, if approved by the instructor, are processed within 7–14 business days through the original payment method.
b) Refunds will NOT be issued for:
   - Unapproved cancellations
   - No-shows
   - Late arrivals (sessions begin at scheduled time)
   - Client dissatisfaction due to personal preference unrelated to service quality

5. RESCHEDULING
a) Rescheduling requests are subject to instructor availability and approval.
b) Rescheduling is not guaranteed and must be arranged at least 24 hours in advance.

6. LATE ARRIVAL
a) Sessions will begin at the scheduled time regardless of the Client's arrival.
b) No time extensions or refunds will be provided for late arrivals.

7. CONDUCT
a) Clients are expected to treat instructors and studio staff with respect.
b) Pilates Bridge reserves the right to suspend or permanently ban accounts for inappropriate behavior.

8. HEALTH AND SAFETY
a) Clients are responsible for disclosing health conditions to their instructor before each session.
b) Service Providers are not responsible for injuries resulting from undisclosed health conditions.

9. LIABILITY LIMITATION
To the fullest extent permitted by Philippine law, Pilates Bridge's maximum liability to any Client shall not exceed the amount paid for the specific session in question.

10. GOVERNING LAW
These Terms are governed by the laws of the Republic of the Philippines. Any disputes shall be subject to the exclusive jurisdiction of the appropriate courts of the Philippines, in accordance with the Electronic Commerce Act (Republic Act No. 8792), the Civil Code, and the Consumer Act (Republic Act No. 7394).

BY CHECKING THE BOX BELOW, THE CLIENT CONFIRMS THEY HAVE READ, UNDERSTOOD, AND AGREE TO THESE TERMS AND CONDITIONS, INCLUDING THE STRICT NO-CANCELLATION-WITHOUT-INSTRUCTOR-APPROVAL POLICY.`

// ─── PAR-Q Questions ──────────────────────────────────────────────────────────
const PARQ_QUESTIONS = [
    { key: 'heart_condition', label: 'Has your doctor ever said that you have a heart condition and that you should only exercise under medical supervision?' },
    { key: 'chest_pain_activity', label: 'Do you feel pain in your chest when you do physical activity?' },
    { key: 'chest_pain_rest', label: 'In the past month, have you had chest pain when you were not doing physical activity?' },
    { key: 'dizziness', label: 'Do you lose your balance because of dizziness, or do you ever lose consciousness?' },
    { key: 'bone_joint', label: 'Do you have a bone, joint, or muscular problem (e.g., back injury, chronic back pain) that could be made worse by physical activity?' },
    { key: 'pregnant_postpartum', label: 'Are you currently pregnant or less than 6 months postpartum?' },
    { key: 'medical_advice', label: 'Are you currently under medical advice to avoid physical activity or exercise?' },
] as const

type ParqKey = typeof PARQ_QUESTIONS[number]['key']
type ParqAnswers = Partial<Record<ParqKey, boolean>>

// ─── Modal Component ──────────────────────────────────────────────────────────
function AgreementModal({ title, content, onClose }: { title: string; content: string; onClose: () => void }) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[85vh]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center px-6 py-4 border-b border-cream-200">
                    <h3 className="font-serif text-lg text-charcoal-900">{title}</h3>
                    <button onClick={onClose} className="text-charcoal-400 hover:text-charcoal-900 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="overflow-y-auto p-6">
                    <pre className="whitespace-pre-wrap font-sans text-sm text-charcoal-700 leading-relaxed">
                        {content}
                    </pre>
                </div>
                <div className="px-6 py-4 border-t border-cream-200">
                    <button
                        onClick={onClose}
                        className="w-full bg-charcoal-900 text-cream-50 py-2.5 rounded-lg font-medium hover:bg-charcoal-800 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Medical Clearance Modal ──────────────────────────────────────────────────
function MedicalClearanceModal({ onAcknowledge }: { onAcknowledge: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/70 backdrop-blur-sm">
            <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl">
                <div className="p-6 border-b border-red-100 flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                        <HeartPulse className="w-5 h-5 text-red-600" />
                    </div>
                    <h3 className="font-serif text-lg text-charcoal-900">Medical Clearance Required</h3>
                </div>
                <div className="p-6 space-y-4">
                    <p className="text-charcoal-700 text-sm leading-relaxed">
                        One or more of your answers indicates a health condition that may be relevant to Pilates and reformer use. As required by our duty of care and applicable health regulations:
                    </p>
                    <ul className="space-y-2 text-sm text-charcoal-700">
                        <li className="flex items-start gap-2">
                            <span className="text-red-500 mt-0.5 shrink-0">•</span>
                            <span>Please ensure you have <strong>written medical clearance from a licensed physician</strong> before attending your first session.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-red-500 mt-0.5 shrink-0">•</span>
                            <span>Inform your instructor of your condition before the session begins so they can modify exercises accordingly.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-red-500 mt-0.5 shrink-0">•</span>
                            <span>The assigned instructor bears responsibility for safe exercise selection and ongoing supervision during your session.</span>
                        </li>
                    </ul>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
                        By clicking "I Acknowledge", you confirm that you have read this notice and will obtain appropriate medical clearance before your session.
                    </div>
                </div>
                <div className="px-6 pb-6">
                    <button
                        onClick={onAcknowledge}
                        className="w-full bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700 transition-colors"
                    >
                        I Acknowledge — Continue to Booking
                    </button>
                </div>
            </div>
        </div>
    )
}

type ExistingParq = {
    parq_answers: Record<string, boolean>
    has_risk_flags: boolean
    agreed_at: string
} | null

// ─── Main PaymentForm Component ───────────────────────────────────────────────
export default function PaymentForm({ booking, existingParq }: { booking: any; existingParq: ExistingParq }) {
    const [file, setFile] = useState<File | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    // PAR-Q state — pre-seed from on-file answers if available
    const [parqAnswers, setParqAnswers] = useState<ParqAnswers>(
        existingParq ? (existingParq.parq_answers as ParqAnswers) : {}
    )
    const [parqOnFile] = useState<boolean>(!!existingParq)
    const [showParqForm, setShowParqForm] = useState<boolean>(!existingParq)
    const [showMedicalModal, setShowMedicalModal] = useState(false)
    const [medicalAcknowledged, setMedicalAcknowledged] = useState(
        existingParq ? existingParq.has_risk_flags : false // if was flagged before, assume acknowledged
    )

    // Agreement checkboxes
    const [waiverAgreed, setWaiverAgreed] = useState(false)
    const [termsAgreed, setTermsAgreed] = useState(false)
    const [showWaiver, setShowWaiver] = useState(false)
    const [showTerms, setShowTerms] = useState(false)

    const router = useRouter()
    const supabase = createClient()

    const parqComplete = parqOnFile && !showParqForm
        ? true
        : PARQ_QUESTIONS.every(q => parqAnswers[q.key] !== undefined)
    const hasRiskFlags = Object.values(parqAnswers).some(v => v === true)
    // Agreements unlock only when PAR-Q is done AND (no risk OR risk acknowledged)
    const agreementsUnlocked = parqComplete && (!hasRiskFlags || medicalAcknowledged)
    const canSubmit = file && waiverAgreed && termsAgreed && agreementsUnlocked && !isUploading

    const handleParqChange = (key: ParqKey, value: boolean) => {
        const updated = { ...parqAnswers, [key]: value }
        setParqAnswers(updated)
        // If all questions now answered and there's a risk flag, show modal
        const allAnswered = PARQ_QUESTIONS.every(q => updated[q.key] !== undefined)
        const anyRisk = Object.values(updated).some(v => v === true)
        if (allAnswered && anyRisk && !medicalAcknowledged) {
            setShowMedicalModal(true)
        }
    }

    const handleMedicalAcknowledge = () => {
        setMedicalAcknowledged(true)
        setShowMedicalModal(false)
    }

    const handleRedoParq = () => {
        setShowParqForm(true)
        setParqAnswers({})
        setMedicalAcknowledged(false)
        setWaiverAgreed(false)
        setTermsAgreed(false)
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0])
            setError(null)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!file) {
            setError('Please select a screenshot of your payment.')
            return
        }
        if (!waiverAgreed) {
            setError('You must agree to the Health Waiver before proceeding.')
            return
        }
        if (!termsAgreed) {
            setError('You must agree to the Terms and Conditions before proceeding.')
            return
        }

        setIsUploading(true)
        setError(null)

        try {
            // 1. Upload File
            const fileExt = file.name.split('.').pop()
            const fileName = `${booking.id}_${Date.now()}.${fileExt}`
            const filePath = `${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('payment-proofs')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('payment-proofs')
                .getPublicUrl(filePath)

            // 3. Submit with waiver flags, PAR-Q answers, and medical ack
            const result = await submitPaymentProof(
                booking.id,
                publicUrl,
                waiverAgreed,
                termsAgreed,
                parqAnswers as Record<string, boolean>,
                medicalAcknowledged
            )

            if (result.error) {
                throw new Error(result.error)
            }

            setSuccess(true)
            router.refresh()

        } catch (err: any) {
            console.error(err)
            setError(err.message || 'Failed to upload payment proof.')
        } finally {
            setIsUploading(false)
        }
    }

    if (success || booking.payment_status === 'submitted') {
        return (
            <div className="bg-green-50 p-6 rounded-xl border border-green-200 text-center">
                <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-green-900 mb-2">Payment Submitted!</h3>
                <p className="text-green-700">
                    Your payment proof has been sent. The studio or instructor will verify it shortly.
                    You will receive a notification once confirmed.
                </p>
            </div>
        )
    }

    return (
        <>
            {/* Modals */}
            {showMedicalModal && (
                <MedicalClearanceModal onAcknowledge={handleMedicalAcknowledge} />
            )}
            {showWaiver && (
                <AgreementModal
                    title="Health & Fitness Participation Waiver"
                    content={HEALTH_WAIVER_TEXT}
                    onClose={() => setShowWaiver(false)}
                />
            )}
            {showTerms && (
                <AgreementModal
                    title="Terms and Conditions & Cancellation Policy"
                    content={TERMS_TEXT}
                    onClose={() => setShowTerms(false)}
                />
            )}

            <form onSubmit={handleSubmit} className="border-t border-cream-200 pt-8 space-y-6">
                <h3 className="font-serif text-lg text-charcoal-900">Complete Your Booking</h3>

                {/* ── PAR-Q Section ── */}
                {parqOnFile && !showParqForm ? (
                    // On-file banner
                    <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <HeartPulse className="w-5 h-5 text-green-600 shrink-0" />
                                <span className="font-medium text-green-900 text-sm">PAR-Q On File</span>
                            </div>
                            <button
                                type="button"
                                onClick={handleRedoParq}
                                className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800 transition-colors shrink-0"
                            >
                                <RefreshCw className="w-3 h-3" />
                                Update
                            </button>
                        </div>
                        <p className="text-xs text-green-700 mt-2">
                            Completed on{' '}
                            <strong>{new Date(existingParq!.agreed_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>
                            {' '}· Valid until{' '}
                            <strong>
                                {new Date(new Date(existingParq!.agreed_at).setFullYear(
                                    new Date(existingParq!.agreed_at).getFullYear() + 1
                                )).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </strong>
                        </p>
                        {existingParq!.has_risk_flags && (
                            <p className="text-xs text-amber-700 mt-1">
                                ⚠️ Your previous submission flagged health conditions. Please ensure you have medical clearance before each session.
                            </p>
                        )}
                    </div>
                ) : (
                    // Full PAR-Q questionnaire
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                            <HeartPulse className="w-5 h-5 text-blue-600 shrink-0" />
                            <span className="font-medium text-blue-900 text-sm">Physical Activity Readiness Questionnaire (PAR-Q)</span>
                        </div>
                        <p className="text-xs text-blue-700">
                            Please answer all questions honestly. This helps your instructor keep you safe. Your answers are recorded as part of your booking.
                        </p>

                        <div className="space-y-3">
                            {PARQ_QUESTIONS.map((q) => (
                                <div key={q.key} className="bg-white rounded-lg border border-blue-100 p-4">
                                    <p className="text-sm text-charcoal-800 mb-3 leading-snug">{q.label}</p>
                                    <div className="flex gap-6">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name={q.key}
                                                value="yes"
                                                checked={parqAnswers[q.key] === true}
                                                onChange={() => handleParqChange(q.key, true)}
                                                className="accent-red-600 w-4 h-4"
                                            />
                                            <span className="text-sm font-medium text-charcoal-700">Yes</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name={q.key}
                                                value="no"
                                                checked={parqAnswers[q.key] === false}
                                                onChange={() => handleParqChange(q.key, false)}
                                                className="accent-charcoal-900 w-4 h-4"
                                            />
                                            <span className="text-sm font-medium text-charcoal-700">No</span>
                                        </label>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* PAR-Q completion status */}
                        {!parqComplete && (
                            <p className="text-xs text-blue-600 font-medium">
                                Please answer all {PARQ_QUESTIONS.length} questions above to continue.
                            </p>
                        )}
                        {parqComplete && hasRiskFlags && medicalAcknowledged && (
                            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                                <HeartPulse className="w-3.5 h-3.5 shrink-0" />
                                Medical clearance notice acknowledged.
                            </div>
                        )}
                        {parqComplete && !hasRiskFlags && (
                            <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                                <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                                PAR-Q complete. No risk flags identified.
                            </div>
                        )}
                    </div>
                )}

                {/* ── Agreements Section ── */}
                {!agreementsUnlocked ? (
                    <div className="bg-cream-50 border border-cream-200 rounded-xl p-5 text-center text-sm text-charcoal-400">
                        Complete the PAR-Q questionnaire above to unlock the agreement section.
                    </div>
                ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
                            <span className="font-medium text-amber-900 text-sm">Required Agreements</span>
                        </div>
                        <p className="text-xs text-amber-700">
                            You must read and agree to both documents before you can submit payment.
                        </p>

                        {/* Health Waiver */}
                        <div className="bg-white rounded-lg border border-amber-200 p-4">
                            <div className="flex items-start gap-3">
                                <input
                                    id="waiver"
                                    type="checkbox"
                                    checked={waiverAgreed}
                                    onChange={(e) => setWaiverAgreed(e.target.checked)}
                                    className="mt-0.5 w-4 h-4 rounded border-cream-300 accent-charcoal-900 cursor-pointer shrink-0"
                                />
                                <label htmlFor="waiver" className="text-sm text-charcoal-700 cursor-pointer">
                                    I have read and agree to the{' '}
                                    <button
                                        type="button"
                                        onClick={() => setShowWaiver(true)}
                                        className="text-charcoal-900 underline underline-offset-2 font-medium hover:text-charcoal-600 transition-colors"
                                    >
                                        Health & Fitness Participation Waiver
                                    </button>
                                    . I confirm I am in good physical health and voluntarily assume the risks associated with Pilates and fitness activities.
                                </label>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowWaiver(true)}
                                className="mt-3 ml-7 text-xs text-charcoal-500 hover:text-charcoal-900 flex items-center gap-1 transition-colors"
                            >
                                <FileText className="w-3 h-3" /> View full waiver
                            </button>
                        </div>

                        {/* Terms & Conditions */}
                        <div className="bg-white rounded-lg border border-amber-200 p-4">
                            <div className="flex items-start gap-3">
                                <input
                                    id="terms"
                                    type="checkbox"
                                    checked={termsAgreed}
                                    onChange={(e) => setTermsAgreed(e.target.checked)}
                                    className="mt-0.5 w-4 h-4 rounded border-cream-300 accent-charcoal-900 cursor-pointer shrink-0"
                                />
                                <label htmlFor="terms" className="text-sm text-charcoal-700 cursor-pointer">
                                    I have read and agree to the{' '}
                                    <button
                                        type="button"
                                        onClick={() => setShowTerms(true)}
                                        className="text-charcoal-900 underline underline-offset-2 font-medium hover:text-charcoal-600 transition-colors"
                                    >
                                        Terms and Conditions & Cancellation Policy
                                    </button>
                                    . I understand that{' '}
                                    <span className="font-semibold text-red-700">cancellations require explicit instructor approval</span>
                                    {' '}and that unapproved cancellations result in forfeiture of payment.
                                </label>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowTerms(true)}
                                className="mt-3 ml-7 text-xs text-charcoal-500 hover:text-charcoal-900 flex items-center gap-1 transition-colors"
                            >
                                <FileText className="w-3 h-3" /> View full terms
                            </button>
                        </div>
                    </div>
                )}

                {/* ── File Upload Section ── */}
                <div>
                    <h4 className="font-medium text-charcoal-900 mb-3 text-sm">Upload Payment Proof</h4>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-center gap-2 mb-4 text-sm">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    <label className={`block w-full border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${!waiverAgreed || !termsAgreed
                        ? 'border-cream-200 bg-cream-50/50 opacity-60 pointer-events-none'
                        : 'border-cream-300 hover:border-charcoal-400 bg-cream-50'
                        }`}>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                            disabled={!waiverAgreed || !termsAgreed}
                        />
                        {file ? (
                            <div className="text-charcoal-900 font-medium flex flex-col items-center">
                                <CheckCircle className="w-8 h-8 text-green-500 mb-2" />
                                {file.name}
                                <span className="text-xs text-charcoal-500 mt-1">Click to change</span>
                            </div>
                        ) : (
                            <div className="text-charcoal-500 flex flex-col items-center">
                                <Upload className="w-8 h-8 mb-2 opacity-50" />
                                <span className="font-medium">
                                    {!waiverAgreed || !termsAgreed
                                        ? 'Please agree to the documents above first'
                                        : 'Click to upload screenshot'}
                                </span>
                                <span className="text-xs mt-1">JPG, PNG supported</span>
                            </div>
                        )}
                    </label>
                </div>

                <button
                    type="submit"
                    disabled={!canSubmit}
                    className="w-full bg-charcoal-900 text-cream-50 py-3 rounded-lg font-medium hover:bg-charcoal-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                    {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit Payment'}
                </button>
                {!canSubmit && !isUploading && (
                    <p className="text-xs text-center text-charcoal-400">
                        {!parqComplete
                            ? 'Complete the PAR-Q questionnaire to continue.'
                            : hasRiskFlags && !medicalAcknowledged
                                ? 'Please acknowledge the medical clearance notice.'
                                : !waiverAgreed || !termsAgreed
                                    ? 'Please agree to the required documents above to continue.'
                                    : !file
                                        ? 'Please upload your payment screenshot.'
                                        : ''}
                    </p>
                )}
            </form>
        </>
    )
}
