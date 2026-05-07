import TaxSettingsView from '@/components/management/TaxSettingsView'
import { getCachedStudio, getCachedStudioTaxes } from '@/lib/studio/data'

export default async function TaxSettingsPage() { 
    const studio = await getCachedStudio()
    
    if (!studio) {
        return <div className="p-12 text-zinc-400 font-medium tracking-tight">Studio not found. Please contact support.</div>
    }

    const taxes = await getCachedStudioTaxes(studio.id)

    return <TaxSettingsView studio={studio} taxes={taxes} /> 
}
