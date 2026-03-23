'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertCircle, RefreshCcw } from 'lucide-react'

interface Props {
    children: ReactNode
    fallbackTitle?: string
}

interface State {
    hasError: boolean
    error: Error | null
}

export default class DashboardErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    }

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Dashboard Widget Error:', error, errorInfo)
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="atelier-card !bg-red-50/10 !border-red-200/30 p-8 flex flex-col items-center justify-center text-center gap-4 min-h-[200px] animate-in fade-in duration-500">
                    <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 shadow-sm shadow-red-200/50">
                        <AlertCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-red-900 uppercase tracking-widest mb-1">
                            {this.props.fallbackTitle || 'Widget Synchronisation Failure'}
                        </h3>
                        <p className="text-[10px] text-red-700/60 font-medium uppercase tracking-tight max-w-[200px] mx-auto leading-relaxed">
                            Connectivity to this node was interrupted. The rest of your dashboard remains operational.
                        </p>
                    </div>
                    <button
                        onClick={() => this.setState({ hasError: false, error: null })}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-red-100 rounded-xl text-[9px] font-black text-red-600 uppercase tracking-widest hover:bg-red-50 transition-all active:scale-95 shadow-tight"
                    >
                        <RefreshCcw className="w-3 h-3" />
                        Reconnect Node
                    </button>
                </div>
            )
        }

        return this.props.children
    }
}
