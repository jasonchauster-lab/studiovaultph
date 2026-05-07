import ContactUsClient from '@/components/landing/ContactUsClient'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact Us | Studio Vault PH',
  description: 'Connect with Studio Vault PH for demos, pricing, and support. We are here to help your Pilates business grow.',
}

export default function ContactUsPage() {
  return <ContactUsClient />
}
