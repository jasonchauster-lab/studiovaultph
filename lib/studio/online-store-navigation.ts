import {
    ClipboardSignature,
    CreditCard,
    FileText,
    Globe2,
    HelpCircle,
    LayoutDashboard,
    MessageSquare,
    Navigation,
    Palette,
    PenTool,
    ShieldCheck
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface OnlineStoreNavItem {
    name: string
    href: string
    icon: LucideIcon
    shortName?: string
}

export interface OnlineStoreNavGroup {
    title: string
    items: OnlineStoreNavItem[]
}

export const onlineStoreNavGroups: OnlineStoreNavGroup[] = [
    {
        title: 'Overview',
        items: [
            { name: 'Overview', href: '/studio/online-store', icon: LayoutDashboard, shortName: 'Overview' },
        ],
    },
    {
        title: 'Store Setup',
        items: [
            { name: 'Theme', href: '/studio/online-store/theme', icon: Palette, shortName: 'Theme' },
            { name: 'Navigation', href: '/studio/online-store/navigation', icon: Navigation, shortName: 'Nav' },
            { name: 'Domains', href: '/studio/online-store/domains', icon: Globe2, shortName: 'Domains' },
            { name: 'Widgets', href: '/studio/online-store/widgets', icon: MessageSquare, shortName: 'Widgets' },
            { name: 'Payments', href: '/studio/online-store/payments', icon: CreditCard, shortName: 'Payments' },
        ],
    },
    {
        title: 'Content',
        items: [
            { name: 'Blog', href: '/studio/online-store/blog', icon: PenTool, shortName: 'Blog' },
            { name: 'FAQ', href: '/studio/online-store/faq', icon: HelpCircle, shortName: 'FAQ' },
        ],
    },
    {
        title: 'Compliance',
        items: [
            { name: 'Waiver Form', href: '/studio/online-store/waiver-form', icon: ClipboardSignature, shortName: 'Waiver' },
            { name: 'Legal & Policies', href: '/studio/online-store/policies', icon: ShieldCheck, shortName: 'Legal' },
        ],
    },
]

export const onlineStoreNavItems = onlineStoreNavGroups.flatMap((group) => group.items)
