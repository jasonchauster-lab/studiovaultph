import { 
    Layout, 
    Palette, 
    Smartphone, 
    RefreshCw, 
    Plus, 
    Eye, 
    MapPin, 
    Save, 
    MousePointer2,
    ShieldCheck,
    Navigation,
    Globe
} from 'lucide-react'

export interface BuilderTip {
    id: string
    title: string
    content: string
    category: 'Getting Started' | 'Layout' | 'Styling' | 'Branches' | 'Commerce'
    icon: any
    dependency?: string
}

export const BUILDER_TIPS: BuilderTip[] = [
    {
        id: 'welcome-builder',
        title: 'Welcome to the Builder',
        content: 'This is where you shape your online storefront. The left panel controls your content, the middle is your live preview, and the top bar has your tools.',
        category: 'Getting Started',
        icon: Layout
    },
    {
        id: 'reorder-sections',
        title: 'Rearrange Your Site',
        content: 'Drag the handles on each layer in the sidebar to change the order of your sections instantly.',
        category: 'Layout',
        icon: MousePointer2
    },
    {
        id: 'preview-modes',
        title: 'Check Your Mobile View',
        content: 'Over 80% of bookings happen on mobile. Toggle between desktop and mobile frequently to ensure your site looks great on every screen.',
        category: 'Getting Started',
        icon: Smartphone
    },
    {
        id: 'history-tools',
        title: 'Safety First!',
        content: 'You can now undo and redo any changes you make. Experiment freely without fear of breaking anything!',
        category: 'Getting Started',
        icon: RefreshCw
    },
    {
        id: 'theme-settings',
        title: 'Global Style Settings',
        content: 'Customize your colors, fonts, and branding here. These settings apply across your whole site to keep branding consistent.',
        category: 'Styling',
        icon: Palette
    },
    {
        id: 'add-section',
        title: 'Expand Your Pages',
        content: 'Click "Add Section" to see a library of pre-built segments like Hero Banners, Pricing tables, and FAQ sections.',
        category: 'Layout',
        icon: Plus
    },
    {
        id: 'visibility-toggle',
        title: 'Hide Without Deleting',
        content: 'Use the Eye icon to temporarily hide a section from your live site. This is great for seasonal offers or draft content.',
        category: 'Layout',
        icon: Eye
    },
    {
        id: 'branch-switcher',
        title: 'Branch Specific Content',
        content: 'You are currently editing a specific branch. Changes to text and sections will only apply to this location.',
        category: 'Branches',
        icon: MapPin
    },
    {
        id: 'save-changes',
        title: 'Save Your Content',
        content: 'Changes are automatically previewed but NOT live until you click "Save Changes". Look for the red dot to know when you have unsaved edits.',
        category: 'Getting Started',
        icon: Save
    },
    {
        id: 'global-branding',
        title: 'Global vs. Branch',
        content: 'Logos, Social Links, and Domains are SHARED across all branches. Section content and layouts are UNIQUE to each branch.',
        category: 'Branches',
        icon: ShieldCheck
    },
    {
        id: 'navigation-sync',
        title: 'Navigation Sync',
        content: 'Your header menu is synced with the "Navigation" settings in your Online Store dashboard. Change it there to update it here.',
        category: 'Layout',
        icon: Navigation
    },
    {
        id: 'custom-domains',
        title: 'Custom Domains',
        content: 'Link your own domain (e.g. www.yourstudio.com) in the Domains tab of the Online Store dashboard.',
        category: 'Commerce',
        icon: Globe
    }
]
