'use client'

/**
 * GLOBAL ERROR BOUNDARY
 * ---------------------
 * This is the LAST line of defense in the Next.js App Router.
 * It catches errors that escape from root layout.tsx, which
 * segment-level error.tsx files CANNOT catch.
 * 
 * This file MUST include its own <html> and <body> tags because
 * it replaces the root layout when triggered.
 */

import { useEffect } from 'react'

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error('[GLOBAL ERROR BOUNDARY]:', error)
    }, [error])

    return (
        <html>
            <body style={{
                margin: 0,
                padding: 0,
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                backgroundColor: '#faf9f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
            }}>
                <div style={{
                    maxWidth: '480px',
                    width: '100%',
                    padding: '48px 24px',
                    textAlign: 'center',
                }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        backgroundColor: '#fee2e2',
                        borderRadius: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 32px',
                        fontSize: '28px',
                    }}>
                        ⚠️
                    </div>

                    <h1 style={{
                        fontSize: '28px',
                        fontWeight: 900,
                        color: '#18181b',
                        marginBottom: '12px',
                        letterSpacing: '-0.02em',
                    }}>
                        Something went wrong
                    </h1>
                    
                    <p style={{
                        fontSize: '14px',
                        color: '#71717a',
                        lineHeight: 1.6,
                        marginBottom: '32px',
                    }}>
                        We encountered an unexpected error. Your data is safe — please try again or return to the login page.
                    </p>

                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                    }}>
                        <button
                            onClick={() => reset()}
                            style={{
                                padding: '14px 24px',
                                backgroundColor: '#2D3282',
                                color: 'white',
                                border: 'none',
                                borderRadius: '14px',
                                fontSize: '12px',
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                letterSpacing: '0.1em',
                                cursor: 'pointer',
                            }}
                        >
                            Try Again
                        </button>
                        
                        <a
                            href="/login"
                            style={{
                                padding: '14px 24px',
                                backgroundColor: 'white',
                                color: '#18181b',
                                border: '1px solid #e4e4e7',
                                borderRadius: '14px',
                                fontSize: '12px',
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                letterSpacing: '0.1em',
                                textDecoration: 'none',
                                cursor: 'pointer',
                            }}
                        >
                            Return to Login
                        </a>
                    </div>

                    {error.digest && (
                        <p style={{
                            marginTop: '32px',
                            fontSize: '10px',
                            color: '#d4d4d8',
                            fontFamily: 'monospace',
                        }}>
                            Error ID: {error.digest}
                        </p>
                    )}
                </div>
            </body>
        </html>
    )
}
