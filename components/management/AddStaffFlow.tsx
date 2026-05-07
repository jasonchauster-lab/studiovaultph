'use client'

import { useState } from 'react'
import { Check, User, Mail, Smartphone, Briefcase, Globe, ChevronRight, ChevronLeft, Loader2, Save } from 'lucide-react'
import { clsx } from 'clsx'
import { useRouter } from 'next/navigation'
import { addStaffAction } from '@/app/(dashboard)/studio/studio-actions'
import Step1_Account from './steps/Step1_Account'
import Step2_Contact from './steps/Step2_Contact'
import Step3_Personal from './steps/Step3_Personal'
import Step4_Employment from './steps/Step4_Employment'
import Step5_Website from './steps/Step5_Website'

const STEPS = [
    { id: 'account', title: 'Account details', icon: User },
    { id: 'contact', title: 'Contact details', icon: Smartphone },
    { id: 'personal', title: 'Personal details', icon: User },
    { id: 'employment', title: 'Employment details', icon: Briefcase },
    { id: 'website', title: 'Display staff on website', icon: Globe },
]

interface AddStaffFlowProps {
    studioId: string
    roles: any[]
    outlets: any[]
}

export default function AddStaffFlow({ studioId, roles, outlets }: AddStaffFlowProps) {
    const router = useRouter()
    const [currentStep, setCurrentStep] = useState(0)
    const [formData, setFormData] = useState<any>({
        account: { 
            is_bookable: true,
            email: ''
        },
        contact: {},
        personal: {},
        employment: { is_current: true },
        website: { show_on_website: true }
    })
    const [isLoading, setIsLoading] = useState(false)

    const updateStepData = (stepId: string, data: any) => {
        setFormData((prev: any) => {
            const updatedStep = { ...prev[stepId], ...data }
            const newFormData = { ...prev, [stepId]: updatedStep }

            // Always sync personal_email in contact step if account email is set
            if (stepId === 'account' && data.email) {
                newFormData.contact = { ...prev.contact, personal_email: data.email }
            }

            return newFormData
        })
    }

    const nextStep = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(currentStep + 1)
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1)
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }

    const handleSubmit = async () => {
        setIsLoading(true)
        try {
            const payload = {
                studioId,
                ...formData
            }
            const res = await addStaffAction(payload)
            if (res.success) {
                router.push('/studio/management/staff/members')
                router.refresh()
            } else {
                alert(res.error)
            }
        } catch (error: any) {
            alert('An unexpected error occurred: ' + error.message)
        } finally {
            setIsLoading(false)
        }
    }

    const progress = ((currentStep + 1) / STEPS.length) * 100

    return (
        <div className="flex flex-col lg:flex-row gap-12 min-h-[80vh]">
            {/* Sidebar Progress */}
            <div className="lg:w-80 space-y-8">
                <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Step {currentStep + 1} of 5</p>
                    <h1 className="text-3xl font-black text-zinc-900 tracking-tightest font-atelier">Add staff</h1>
                    
                    <div className="pt-4 space-y-2">
                        <div className="h-1 w-full bg-zinc-100 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-forest transition-all duration-500 ease-out" 
                                style={{ width: `${progress}%` }} 
                            />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{Math.round(progress)}% completed</p>
                    </div>
                </div>

                <div className="bg-white rounded-[2.5rem] border border-zinc-100 shadow-sm p-4 space-y-1">
                    {STEPS.map((step, index) => {
                        const Icon = step.icon
                        const isCompleted = index < currentStep
                        const isActive = index === currentStep
                        
                        return (
                            <button
                                key={step.id}
                                onClick={() => index <= currentStep && setCurrentStep(index)}
                                disabled={index > currentStep}
                                className={clsx(
                                    "w-full flex items-center gap-4 px-6 py-5 rounded-2xl transition-all text-left group",
                                    isActive ? "bg-zinc-50 border border-zinc-100" : "hover:bg-zinc-50/50",
                                    index > currentStep && "opacity-40 cursor-not-allowed"
                                )}
                            >
                                <div className={clsx(
                                    "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                                    isCompleted ? "bg-forest/10 text-forest" : 
                                    isActive ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-400 group-hover:bg-zinc-200"
                                )}>
                                    {isCompleted ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                                </div>
                                <span className={clsx(
                                    "text-[11px] font-black uppercase tracking-widest",
                                    isActive ? "text-zinc-900" : "text-zinc-400 group-hover:text-zinc-600"
                                )}>
                                    {step.title}
                                </span>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Form Content */}
            <div className="flex-1 max-w-3xl">
                <div className="bg-white rounded-[2.5rem] border border-zinc-100 shadow-tight p-10 md:p-16 min-h-[600px] flex flex-col justify-between">
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {currentStep === 0 && (
                            <Step1_Account 
                                data={formData.account} 
                                roles={roles} 
                                updateData={(d: any) => updateStepData('account', d)} 
                            />
                        )}
                        {currentStep === 1 && (
                            <Step2_Contact 
                                data={formData.contact} 
                                updateData={(d: any) => updateStepData('contact', d)} 
                            />
                        )}
                        {currentStep === 2 && (
                            <Step3_Personal 
                                data={formData.personal} 
                                updateData={(d: any) => updateStepData('personal', d)} 
                            />
                        )}
                        {currentStep === 3 && (
                            <Step4_Employment 
                                data={formData.employment} 
                                outlets={outlets}
                                updateData={(d: any) => updateStepData('employment', d)} 
                            />
                        )}
                        {currentStep === 4 && (
                            <Step5_Website 
                                data={formData.website} 
                                accountImage={formData.account.image}
                                updateData={(d: any) => updateStepData('website', d)} 
                            />
                        )}
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex items-center justify-between gap-6 pt-16 mt-16 border-t border-zinc-50">
                        <button
                            onClick={prevStep}
                            disabled={currentStep === 0}
                            className={clsx(
                                "flex items-center gap-3 px-8 py-4 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all",
                                currentStep === 0 ? "opacity-0 pointer-events-none" : "text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50"
                            )}
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Back
                        </button>
                        
                        {currentStep === STEPS.length - 1 ? (
                            <button
                                onClick={handleSubmit}
                                disabled={isLoading}
                                className="flex items-center gap-3 px-10 py-4 bg-zinc-900 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-zinc-200"
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Complete Registration
                            </button>
                        ) : (
                            <button
                                onClick={nextStep}
                                className="flex items-center gap-3 px-10 py-4 bg-zinc-900 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-zinc-200"
                            >
                                Next Step
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
