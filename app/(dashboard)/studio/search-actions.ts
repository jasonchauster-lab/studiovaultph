'use server'

import { SearchService } from '@/lib/services/search'
import { getCachedStudio } from '@/lib/studio/data'
import { ErrorService } from '@/lib/services/error-service'

export async function performGlobalSearch(query: string) {
    try {
        const studio = await getCachedStudio()
        if (!studio) return { error: 'No studio context' }

        const results = await SearchService.globalSearch(query, studio.id)
        return { success: true, results }
    } catch (err: any) {
        await ErrorService.logServiceError('SearchActions', 'performGlobalSearch', err, { query })
        return { error: err.message || 'Search failed' }
    }
}
