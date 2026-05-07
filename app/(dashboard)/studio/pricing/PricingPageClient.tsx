'use client'

import React from 'react'
import StudioDashboardShell from '@/components/dashboard/StudioDashboardShell'
import { Plus, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'
import MembershipForm from '@/components/studio/forms/MembershipForm'
import PackageForm from '@/components/studio/forms/PackageForm'
import { SYSTEM_CATEGORIES } from '@/lib/constants'
import { Membership, Package, Service, ServiceCategory, Outlet } from '@/types/agency'

// Modular Components & Hooks
import PricingFilterToolbar from '@/components/studio/pricing/PricingFilterToolbar'
import PricingAccordion from '@/components/studio/pricing/PricingAccordion'
import { usePricingLogic } from './usePricingLogic'
import PricingTabSwitcher from './components/PricingTabSwitcher'
import AddCategorySection from './components/AddCategorySection'
import { TooltipProvider } from '@/components/ui/Tooltip'
import { Button } from '@/components/ui/Button'
import PricingEmptyState from './components/PricingEmptyState'

interface PricingPageClientProps {
    memberships: Membership[]
    packages: Package[]
    services: Service[]
    categories: ServiceCategory[]
    outlets: Outlet[]
    studioId: string
}

export default function PricingPageClient({ 
    memberships: initialMemberships, 
    packages: initialPackages, 
    services, 
    categories: initialCategories, 
    outlets, 
    studioId 
}: PricingPageClientProps) {
    const {
        activeTab,
        setActiveTab,
        searchQuery,
        handleSearchChange,
        statusFilter,
        setStatusFilter,
        categoryFilter,
        setCategoryFilter,
        expandedCategories,
        toggleAccordion,
        isMembershipModalOpen,
        setIsMembershipModalOpen,
        isPackageModalOpen,
        setIsPackageModalOpen,
        isAddingCategory,
        setIsAddingCategory,
        newCategoryName,
        setNewCategoryName,
        editingItem,
        setEditingItem,
        isProcessing,
        deletingItemId,
        handleAddCategory,
        handleDeleteCategory,
        handleRenameCategory,
        handleDeleteItem,
        handleEditItem,
        filteredItems,
        categories,
        filteredCategories,
        itemsByCategory
    } = usePricingLogic({
        initialMemberships,
        initialPackages,
        initialCategories,
        studioId,
        activeTab: 'memberships'
    })

    const pricingActions = (
        <div className="flex items-center gap-3">
            <Button 
                isLoading={isProcessing}
                onClick={() => activeTab === 'memberships' ? setIsMembershipModalOpen(true) : setIsPackageModalOpen(true)}
                className="px-6"
            >
                {!isProcessing && <Plus className="w-4 h-4 mr-2" />}
                {activeTab === 'memberships' ? 'Add Membership' : 'Add Package'}
            </Button>
        </div>
    )

    const [isPending, startTransition] = React.useTransition()

    const handleTabChange = (tab: 'memberships' | 'packages') => {
        startTransition(() => {
            setActiveTab(tab)
        })
    }

    return (
        <TooltipProvider>
            <StudioDashboardShell 
                title={activeTab === 'memberships' ? 'Memberships' : 'Packages'}
                breadcrumbs={[{ label: 'Passes & Memberships' }]}
                actions={pricingActions}
            >
                <div className={clsx("space-y-6 transition-opacity duration-300", isPending && "opacity-50 pointer-events-none")}>
                    <PricingTabSwitcher 
                        activeTab={activeTab}
                        setActiveTab={handleTabChange}
                    />

                    <PricingFilterToolbar 
                        searchQuery={searchQuery}
                        onSearchChange={handleSearchChange}
                        statusFilter={statusFilter}
                        onStatusChange={setStatusFilter}
                        categoryFilter={categoryFilter}
                        onCategoryChange={setCategoryFilter}
                        categories={filteredCategories}
                    />

                    {/* Content List */}
                    <div className="space-y-4">
                        {filteredItems.length === 0 ? (
                            <PricingEmptyState 
                                type={searchQuery ? 'search' : 'empty'}
                                activeTab={activeTab}
                                onClearFilters={() => {
                                    handleSearchChange('')
                                    setCategoryFilter('all')
                                    setStatusFilter('all')
                                }}
                            />
                        ) : (
                            <>
                                {/* Uncategorized Block */}
                                {itemsByCategory.general.length > 0 && (
                                    <PricingAccordion 
                                        category={{ id: 'general', name: SYSTEM_CATEGORIES.GENERAL } as any}
                                        items={itemsByCategory.general}
                                        activeTab={activeTab}
                                        isExpanded={expandedCategories.has('general')}
                                        onToggle={toggleAccordion}
                                        onRename={handleRenameCategory}
                                        onDelete={handleDeleteCategory}
                                        onEditItem={handleEditItem}
                                        onDeleteItem={handleDeleteItem}
                                        deletingItemId={deletingItemId}
                                    />
                                )}

                                {/* Categorized Blocks */}
                                {filteredCategories.map((cat) => (
                                    <PricingAccordion 
                                        key={cat.id}
                                        category={cat}
                                        items={itemsByCategory[cat.id] || []}
                                        activeTab={activeTab}
                                        isExpanded={expandedCategories.has(cat.id)}
                                        onToggle={toggleAccordion}
                                        onRename={handleRenameCategory}
                                        onDelete={handleDeleteCategory}
                                        onEditItem={handleEditItem}
                                        onDeleteItem={handleDeleteItem}
                                        deletingItemId={deletingItemId}
                                    />
                                ))}
                            </>
                        )}

                        <AddCategorySection 
                            isAdding={isAddingCategory}
                            setIsAdding={setIsAddingCategory}
                            name={newCategoryName}
                            setName={setNewCategoryName}
                            onAdd={handleAddCategory}
                            isProcessing={isProcessing}
                            activeTab={activeTab}
                        />
                    </div>
                </div>
            </StudioDashboardShell>

            <MembershipForm 
                isOpen={isMembershipModalOpen} 
                onClose={() => { setIsMembershipModalOpen(false); setEditingItem(null) }} 
                services={services}
                categories={categories}
                outlets={outlets}
                initialData={editingItem}
                studioId={studioId}
            />
            <PackageForm 
                isOpen={isPackageModalOpen} 
                onClose={() => { setIsPackageModalOpen(false); setEditingItem(null) }} 
                services={services}
                categories={categories}
                outlets={outlets}
                initialData={editingItem}
                studioId={studioId}
            />
        </TooltipProvider>
    )
}
