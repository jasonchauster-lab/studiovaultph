import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    // if "next" is in search params, use it as the redirect URL
    const next = searchParams.get('next') ?? '/verified'

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        // If there's an error (like PKCE verifier missing because they opened the link on their phone),
        // we still want to redirect them to the /verified page. Their email is already verified in the DB 
        // by the Supabase /verify endpoint, they just won't be auto-logged in.
        if (error) {
            console.error('Auth callback token exchange error:', error.message)
        }

        const forwardedHost = request.headers.get('x-forwarded-host') // i.e. demo.vercel.app
        const isLocalEnv = process.env.NODE_ENV === 'development'

        if (isLocalEnv) {
            // we can skip typical extra security checks in local dev
            return NextResponse.redirect(`${origin}${next}`)
        } else if (forwardedHost) {
            return NextResponse.redirect(`https://${forwardedHost}${next}`)
        } else {
            return NextResponse.redirect(`${origin}${next}`)
        }
    }

    // fallback if no code was found at all
    return NextResponse.redirect(`${origin}/login`)
}
