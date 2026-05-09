'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'

interface Props {
    children: ReactNode
    fallback?: ReactNode
}

interface State {
    hasError: boolean
}

export class StatsErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    }

    public static getDerivedStateFromError(_: Error): State {
        return { hasError: true }
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('[StatsErrorBoundary] Uncaught error:', error, errorInfo)
    }

    public render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div className="bg-zinc-50 border border-zinc-100 rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center gap-4 min-h-[200px]">
                    <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400">
                        <AlertCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="text-sm font-black text-zinc-900 uppercase tracking-widest">Component Error</h4>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1 italic">
                            Unable to render this widget.
                        </p>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}
