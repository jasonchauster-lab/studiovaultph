import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Rocket, ArrowLeft } from 'lucide-react'

export default async function SettingsPlaceholderPage(props: { params: Promise<{ slug: string[] }> }) {
    const { slug } = await props.params
    const sectionPath = slug.join('/')

    if (sectionPath === 'checkout') {
        redirect('/studio/online-store/payments')
    }

    if (sectionPath === 'widget') {
        redirect('/studio/online-store/widgets')
    }

    if (sectionPath === 'notifications') {
        redirect('/studio/management/notifications')
    }

    redirect('/studio/settings')
}
