import { createClient } from '@/lib/supabase/server'

export type ErrorSeverity = 'INFO' | 'WARNING' | 'CRITICAL'

export interface LogEntry {
    message: string
    severity: ErrorSeverity
    context?: any
    stack?: string
    path?: string
    userId?: string
    studioId?: string
}

export class ErrorService {
    /**
     * Logs an error or system event to the database.
     * In development, it also outputs to the console.
     */
    static async log(entry: LogEntry) {
        const isDev = process.env.NODE_ENV === 'development'
        
        if (isDev) {
            const color = entry.severity === 'CRITICAL' ? '\x1b[31m' : entry.severity === 'WARNING' ? '\x1b[33m' : '\x1b[36m'
            console.log(`${color}[${entry.severity}]\x1b[0m ${entry.message}`, entry.context || '')
        }

        try {
            const supabase = await createClient()
            
            // Note: Ensure 'system_logs' table exists in Supabase
            // CREATE TABLE system_logs (
            //   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            //   created_at TIMESTAMPTZ DEFAULT now(),
            //   message TEXT NOT NULL,
            //   severity TEXT NOT NULL,
            //   context JSONB,
            //   stack TEXT,
            //   path TEXT,
            //   user_id UUID,
            //   studio_id UUID
            // );

            const { error } = await supabase
                .from('system_logs')
                .insert({
                    message: entry.message,
                    severity: entry.severity,
                    context: entry.context,
                    stack: entry.stack,
                    path: entry.path,
                    user_id: entry.userId,
                    studio_id: entry.studioId
                })

            if (error && !isDev) {
                // If logging itself fails in production, we have a problem.
                // We'll fallback to console.error so it shows up in Vercel logs.
                console.error('[ErrorService] Failed to persist log:', error)
            }
        } catch (err) {
            console.error('[ErrorService] Critical logger failure:', err)
        }
    }

    /**
     * Specialized logger for Service Layer failures
     */
    static async logServiceError(serviceName: string, method: string, error: any, context?: any) {
        return this.log({
            message: `Service Error: ${serviceName}.${method}`,
            severity: 'CRITICAL',
            stack: error instanceof Error ? error.stack : undefined,
            context: {
                error: error instanceof Error ? error.message : error,
                ...context
            }
        })
    }

    /**
     * Specialized logger for Security events
     */
    static async logSecurityEvent(message: string, context?: any) {
        return this.log({
            message: `Security: ${message}`,
            severity: 'WARNING',
            context
        })
    }
}
