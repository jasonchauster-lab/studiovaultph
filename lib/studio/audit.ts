import { createAdminClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

export async function logAuditAction({
    studioId,
    actorId,
    action,
    entityType,
    entityId,
    metadata = {}
}: {
    studioId: string
    actorId: string
    action: string
    entityType: string
    entityId?: string
    metadata?: any
}) {
    const supabase = createAdminClient()
    const headersList = await headers()
    const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown'

    try {
        const { error } = await supabase.from('audit_logs').insert({
            studio_id: studioId,
            actor_id: actorId,
            action,
            entity_type: entityType,
            entity_id: entityId,
            metadata: {
                ...metadata,
                timestamp: new Date().toISOString()
            },
            ip_address: ip
        })

        if (error) {
            console.error('[Audit Log] Failed to insert:', error)
        }
    } catch (err) {
        console.error('[Audit Log] Exception:', err)
    }
}
