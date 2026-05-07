import React, { useState, memo } from 'react'
import { X, ChevronRight, Check } from 'lucide-react'
import { clsx } from 'clsx'
import { Button } from '@/components/ui/Button'

interface Tab {
    id: string
    label: string
}

interface StudioFormModalProps {
    isOpen: boolean
    onClose: () => void
    title: string
    tabs: Tab[]
    children: (activeTab: string) => React.ReactNode
    onSave: () => void
    saveLabel?: string
    isSaving?: boolean
}

// Memoized Sidebar Component
const ModalSidebar = memo(({ title, tabs, activeTab, currentIndex, onTabClick }: {
    title: string
    tabs: Tab[]
    activeTab: string
    currentIndex: number
    onTabClick: (id: string) => void
}) => (
    <div className="w-[320px] bg-zinc-950 p-12 flex flex-col gap-10 shrink-0 relative overflow-hidden">
        {/* Decorative Gradient Overlay */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] -mr-32 -mt-32 pointer-events-none" />
        
        <div className="space-y-3 relative z-10">
            <h2 className="text-3xl font-serif font-black text-white tracking-tight leading-tight">{title}</h2>
            <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Configuration Engine</p>
            </div>
        </div>

        <nav className="flex flex-col gap-2 relative z-10">
            {tabs.map((tab, idx) => {
                const isActive = tab.id === activeTab
                const isCompleted = idx < currentIndex
                return (
                    <button
                        key={tab.id}
                        onClick={() => onTabClick(tab.id)}
                        className={clsx(
                            "flex items-center justify-between px-8 py-5 rounded-[2rem] transition-all duration-700 group text-left border",
                            isActive 
                                ? "bg-white/10 border-white/10 text-white shadow-2xl backdrop-blur-md" 
                                : "border-transparent text-zinc-500 hover:text-zinc-300"
                        )}
                    >
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black uppercase tracking-widest mb-1 opacity-40">Step 0{idx + 1}</span>
                            <span className="text-xs font-bold tracking-tight">{tab.label}</span>
                        </div>
                        {isCompleted ? (
                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                                <Check className="w-3 h-3 text-primary" />
                            </div>
                        ) : (
                            <ChevronRight className={clsx("w-4 h-4 transition-transform duration-500", isActive ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0 group-hover:opacity-40 group-hover:translate-x-0")} />
                        )}
                    </button>
                )
            })}
        </nav>

        <div className="mt-auto px-8 relative z-10 opacity-30">
            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em]">StudioVault PH · v2.4</p>
        </div>
    </div>
))
ModalSidebar.displayName = 'ModalSidebar'

// Memoized Header Component
const ModalHeader = memo(({ onClose }: { onClose: () => void }) => (
    <div className="p-12 flex justify-end shrink-0">
        <button 
            onClick={onClose}
            className="p-4 bg-zinc-50 rounded-2xl text-zinc-400 hover:text-zinc-900 transition-all hover:rotate-90 hover:bg-zinc-100"
        >
            <X className="w-6 h-6" />
        </button>
    </div>
))
ModalHeader.displayName = 'ModalHeader'

// Memoized Footer Component
const ModalFooter = memo(({ 
    onBack, 
    onClose, 
    onNext, 
    isFirstTab, 
    isLastTab, 
    isSaving, 
    saveLabel 
}: {
    onBack: () => void
    onClose: () => void
    onNext: () => void
    isFirstTab: boolean
    isLastTab: boolean
    isSaving: boolean
    saveLabel: string
}) => (
    <div className="absolute bottom-0 right-0 w-[calc(100%-320px)] p-12 bg-white/80 backdrop-blur-xl border-t border-zinc-100 flex justify-between items-center z-20">
        <Button 
            variant="ghost"
            onClick={onBack}
            disabled={isFirstTab}
            className={clsx(
                "px-8",
                isFirstTab && "opacity-0 pointer-events-none"
            )}
        >
            Previous
        </Button>

        <div className="flex items-center gap-6">
             <button 
                onClick={onClose}
                className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 hover:text-zinc-900 transition-all"
            >
                Cancel
            </button>
            <Button 
                onClick={onNext}
                isLoading={isSaving}
                className="px-12 py-7 rounded-[2.5rem]"
            >
                {isLastTab ? saveLabel : 'Continue'}
            </Button>
        </div>
    </div>
))
ModalFooter.displayName = 'ModalFooter'

export default function StudioFormModal({
    isOpen,
    onClose,
    title,
    tabs,
    children,
    onSave,
    saveLabel = 'Save changes',
    isSaving = false
}: StudioFormModalProps) {
    const [activeTab, setActiveTab] = useState(tabs[0].id)

    if (!isOpen) return null

    const currentIndex = tabs.findIndex(t => t.id === activeTab)
    const isLastTab = currentIndex === tabs.length - 1
    const isFirstTab = currentIndex === 0

    const handleNext = () => {
        if (!isLastTab) {
            setActiveTab(tabs[currentIndex + 1].id)
        } else {
            onSave()
        }
    }

    const handleBack = () => {
        if (!isFirstTab) {
            setActiveTab(tabs[currentIndex - 1].id)
        }
    }

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-zinc-900/80" 
                onClick={onClose} 
            />

            {/* Modal Container */}
            <div className="relative z-10 w-full max-w-5xl h-full max-h-[85vh] bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 duration-500 ease-out transform-gpu">
                {/* Main Layout */}
                <div className="flex-1 flex overflow-hidden">
                    <ModalSidebar 
                        title={title}
                        tabs={tabs}
                        activeTab={activeTab}
                        currentIndex={currentIndex}
                        onTabClick={setActiveTab}
                    />

                    {/* Right Content Area */}
                    <div className="flex-1 flex flex-col bg-white">
                        <ModalHeader onClose={onClose} />

                        {/* Scrolling Form Body */}
                        <div className="flex-1 overflow-y-auto px-10 md:px-20 pb-32 scrollbar-premium transform-gpu will-change-scroll">
                            <div className="max-w-xl mx-auto py-10 animate-in slide-in-from-right-4 duration-400">
                                {children(activeTab)}
                            </div>
                        </div>
                    </div>
                </div>

                <ModalFooter 
                    onBack={handleBack}
                    onNext={handleNext}
                    onClose={onClose}
                    isFirstTab={isFirstTab}
                    isLastTab={isLastTab}
                    isSaving={isSaving}
                    saveLabel={saveLabel}
                />
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                .scrollbar-premium::-webkit-scrollbar {
                    width: 4px;
                }
                .scrollbar-premium::-webkit-scrollbar-track {
                    background: transparent;
                }
                .scrollbar-premium::-webkit-scrollbar-thumb {
                    background: #f4f4f5;
                    border-radius: 10px;
                }
                .scrollbar-premium::-webkit-scrollbar-thumb:hover {
                    background: #e4e4e7;
                }
            ` }} />
        </div>
    )
}

