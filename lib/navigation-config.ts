import { 
    Home, Calendar, Star, Ticket, Users, Receipt, 
    ChartBar, Heart, Megaphone, Percent, Store, 
    ScanQrCode, LayoutGrid, Settings, DollarSign,
    History, Gift, Package, Globe, Wallet
} from 'lucide-react'

export interface NavItem {
    label: string
    href: string
    icon?: any
    badge?: string
}

export interface NavGroup {
    title: string
    items: NavItem[]
    isOpenByDefault?: boolean
}

export interface SecondaryMenu {
    title: string
    groups: NavGroup[]
}

/**
 * List of pages that require branch-specific context via ?outletId=...
 */
export const BRANCH_AWARE_PAGES = [
    'home', 
    'schedule', 
    'reports', 
    'loyalty-insights', 
    'equipments', 
    'website',
    'inventory',
    'analytics'
]

export const getPrimaryNav = (outletId?: string, isStudioPortal: boolean = false, role?: string) => {
    // Standard Global Base
    const base = '/studio'
    const query = outletId ? `?outletId=${outletId}` : ''
    
    // Simplifed Marketplace Branding Sidebar
    if (!isStudioPortal) {
        return [
            { id: 'home', label: 'Dashboard', href: `${base}${query}`, icon: Home },
            { id: 'schedule', label: 'Schedule', href: `${base}/schedule${query}`, icon: Calendar },
            { id: 'earnings', label: 'Earnings', href: `${base}/earnings`, icon: DollarSign },
            { id: 'history', label: 'History', href: `${base}/history`, icon: History },
            { id: 'settings', label: 'Settings', href: `${base}/settings/marketplace`, icon: Package },
            { id: 'referral', label: 'Referral', href: `/referral`, icon: Gift },
        ]
    }

    // Customer View on Studio Portal
    if (role === 'customer') {
        return [
            { id: 'overview', label: 'Overview', href: '/customer', icon: Home },
            { id: 'bookings', label: 'My Bookings', href: '/customer/bookings', icon: Calendar },
            { id: 'wallet', label: 'Wallet', href: '/customer/wallet', icon: Wallet },
            { id: 'settings', label: 'Settings', href: '/customer/profile', icon: Settings },
        ]
    }

    // Full Studio Portal Sidebar (CMS)
    // Most links point to Global routes now.
    return [
        { id: 'home', label: 'Home', href: `${base}${query}`, icon: Home },
        { id: 'schedule', label: 'Schedule', href: `${base}/schedule${query}`, icon: Calendar },
        { id: 'services', label: 'Classes & Sessions', href: `${base}/services`, icon: Star },
        { id: 'pricing', label: 'Passes & Memberships', href: `${base}/pricing`, icon: Ticket },
        { id: 'customers', label: 'Customers', href: `${base}/customers`, icon: Users },
        { id: 'sales', label: 'Sales', href: `${base}/sales`, icon: Receipt },
        { id: 'marketplace', label: 'Marketplace', href: `${base}/settings/marketplace`, icon: Globe },
        { id: 'reports', label: 'Reports', href: `${base}/reports${query}`, icon: ChartBar },
        { id: 'loyalty-insights', label: 'Loyalty & Insights', href: `${base}/loyalty-insights${query}`, icon: Heart },
        { id: 'marketing', label: 'Marketing', href: `${base}/marketing`, icon: Megaphone },
        { id: 'referrals', label: 'Referrals', href: `${base}/referrals`, icon: Gift },
        { id: 'promo', label: 'Promo Codes', href: `${base}/promo`, icon: Percent },
        { id: 'store', label: 'Online Store', href: `${base}/online-store`, icon: Store },
        { id: 'management', label: 'Management', href: `${base}/management/business`, icon: LayoutGrid },
        { id: 'settings', label: 'Settings', href: `${base}/settings`, icon: Settings },
    ]
}

export const getSecondaryMenus = (outletId?: string, isStudioPortal: boolean = false): Record<string, SecondaryMenu> => {
    const base = '/studio'
    const query = outletId ? `?outletId=${outletId}` : ''
    
    return {
        services: {
            title: 'Classes & Sessions',
            groups: [
                {
                    title: 'Classes',
                    isOpenByDefault: true,
                    items: [
                        { label: 'Bookings', href: `${base}/services/bookings` },
                        { label: 'Classes', href: `${base}/services` },
                        { label: 'Settings', href: `${base}/services/settings` },
                    ]
                },
                {
                    title: 'Appointment',
                    items: [
                        { label: 'Bookings', href: `${base}/services/appointments/bookings` },
                        { label: 'Settings', href: `${base}/services/appointments/settings` },
                    ]
                },
                {
                    title: 'Outlet Access',
                    items: [
                        { label: 'Overview', href: `${base}/services/outlet-access` }
                    ]
                },
                {
                    title: 'Courses',
                    items: [
                        { label: 'Manage Courses', href: `${base}/services/courses` }
                    ]
                }
            ]
        },
        management: {
            title: 'Management',
            groups: [
                {
                    title: 'Business',
                    isOpenByDefault: true,
                    items: [
                        { label: 'Business Information', href: `${base}/management/business` },
                        { label: 'Tax Settings', href: `${base}/management/tax-settings` },
                        { label: 'Branches', href: `${base}/management/outlets` },
                        { label: 'Equipments', href: `${base}/management/equipments${query}` },
                        { label: 'Notifications', href: `${base}/management/notifications` },
                    ]
                },
                {
                    title: 'Staff',
                    isOpenByDefault: true,
                    items: [
                        { label: 'Members', href: `${base}/management/staff/members` },
                        { label: 'Roles', href: `${base}/management/staff/roles` },
                        { label: 'Payroll', href: `${base}/reports/payroll` },
                    ]
                },
                {
                    title: 'Inventory',
                    isOpenByDefault: true,
                    items: [
                        { label: 'Stock Management', href: `${base}/inventory` },
                        { label: 'Equipment List', href: `${base}/management/equipments${query}` },
                    ]
                }
            ]
        },
        reports: {
            title: 'Reports',
            groups: [
                {
                    title: 'Financials',
                    isOpenByDefault: true,
                    items: [
                        { label: 'Sales Report', href: `${base}/reports` },
                        { label: 'Instructor Payroll', href: `${base}/reports/payroll` },
                    ]
                }
            ]
        },
        'loyalty-insights': {
            title: 'Loyalty & Insights',
            groups: [
                {
                    title: 'Analytics',
                    isOpenByDefault: true,
                    items: [
                        { label: 'Engagement Overview', href: `${base}/loyalty-insights${query}` },
                        { label: 'Advanced Analytics', href: `${base}/analytics${query}` },
                    ]
                }
            ]
        },
        customers: {
            title: 'Customers',
            groups: [
                {
                    title: 'Directory',
                    isOpenByDefault: true,
                    items: [
                        { label: 'Customer', href: `${base}/customers` },
                        { label: 'Pricing Groups', href: `${base}/customers/pricing-groups` },
                        { label: 'Tags', href: `${base}/customers/tags` },
                    ]
                }
            ]
        },
        sales: {
            title: 'Sales',
            groups: [
                {
                    title: 'Accounting',
                    isOpenByDefault: true,
                    items: [
                        { label: 'Sale Transactions', href: `${base}/sales` },
                        { label: 'Manual Approvals', href: `${base}/sales/approvals` },
                    ]
                }
            ]
        },
    }
}

export function getActivePrimaryId(pathname: string): string | null {
    const parts = pathname.split('/').filter(Boolean)
    if (parts.length === 0 || parts[0] !== 'studio') return null
    
    // Pattern 1: /studio
    if (parts.length === 1) return 'home'
    
    // Pattern 2: /studio/[navId]
    const navIds = ['schedule', 'services', 'pricing', 'customers', 'sales', 'reports', 'loyalty-insights', 'marketing', 'referrals', 'promo', 'online-store', 'management', 'website', 'earnings', 'history', 'staff', 'settings', 'marketplace']
    if (navIds.includes(parts[1])) {
        if (parts[1] === 'services') return 'services'
        if (parts[1] === 'pricing') return 'pricing'
        if (parts[1] === 'settings' && parts[2] === 'marketplace') return 'marketplace'
        return parts[1] === 'online-store' ? 'store' : parts[1]
    }

    return null
}

export function getOutletIdFromPath(pathname: string): string | undefined {
    // We no longer store outletId in the path for global routing.
    // This is Kept for backward compatibility during migration.
    const parts = pathname.split('/').filter(Boolean)
    const reserved = [
        'schedule', 'services', 'pricing', 'customers', 'sales', 
        'reports', 'loyalty-insights', 'marketing', 'referrals', 'promo', 'online-store', 
        'management', 'scan', 'settings', 'website', 'earnings', 
        'history', 'staff', 'inventory', 'analytics', 'automation'
    ]
    
    if (parts[0] === 'studio' && parts[1] && !reserved.includes(parts[1])) {
        return parts[1]
    }
    
    return undefined
}

export function getBranchHref(pathname: string, newOutletId: string): string {
    const parts = pathname.split('/').filter(Boolean)
    const activeId = getActivePrimaryId(pathname)
    
    // If we are on a branch-aware page, update/add the query param
    if (activeId && BRANCH_AWARE_PAGES.includes(activeId)) {
        // Remove existing /studio/[id] structure if present
        const cleanPath = parts[0] === 'studio' && !getActivePrimaryId('/' + parts[0] + '/' + parts[1]) 
            ? '/studio/' + parts.slice(2).join('/')
            : pathname.split('?')[0]
            
        return `${cleanPath}?outletId=${newOutletId}`
    }
    
    // For global pages, just return the current path (maybe with a refresh)
    return pathname.split('?')[0]
}
