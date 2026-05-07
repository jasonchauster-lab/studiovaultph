import { NextResponse } from 'next/server'
import { ErrorService } from '@/lib/services/error-service'

export async function POST(req: Request) {
    try {
        const body = await req.json()
        
        await ErrorService.log({
            message: `Client Error: ${body.message}`,
            severity: 'CRITICAL',
            path: body.path,
            context: {
                errorId: body.errorId,
                componentStack: body.componentStack
            },
            stack: body.stack
        })

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[API Log Error] Failed:', err)
        return NextResponse.json({ success: false }, { status: 500 })
    }
}
