'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCcw, Home, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { motion } from 'framer-motion'

interface Props {
  children?: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  errorId?: string
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorId = Math.random().toString(36).substring(2, 9).toUpperCase()
    this.setState({ errorId })

    console.error(`[ErrorBoundary] Ref ID: ${errorId}`, error, errorInfo)
    
    // Log to API (Async)
    fetch('/api/system/log-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            errorId,
            message: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
            path: typeof window !== 'undefined' ? window.location.pathname : 'server-side'
        })
    }).catch(err => console.warn('[ErrorBoundary] Failed to report error:', err))
  }

  private handleReset = () => {
    this.setState({ hasError: false, errorId: undefined, error: undefined })
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-[60vh] flex items-center justify-center p-8">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full bg-white border border-zinc-100 rounded-[3rem] p-12 text-center space-y-8 shadow-2xl relative overflow-hidden"
          >
            {/* Top Accent */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-primary/20" />
            
            <div className="relative mx-auto w-24 h-24">
                <div className="absolute inset-0 bg-primary/10 rounded-[2.5rem] blur-2xl animate-pulse" />
                <div className="relative bg-white rounded-[2.5rem] shadow-tight border border-zinc-100 w-full h-full flex items-center justify-center">
                    <AlertTriangle className="w-10 h-10 text-primary" />
                </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-2xl font-black text-zinc-900 tracking-tight uppercase tracking-[0.2em]">Interface Interrupted</h2>
              <p className="text-xs font-black text-zinc-400 uppercase tracking-widest leading-relaxed">
                The UI encountered an unexpected state. We've logged the incident and our engineers have been notified.
              </p>
              {this.state.errorId && (
                <div className="inline-block px-4 py-2 bg-zinc-900 text-white rounded-xl text-[10px] font-black tracking-widest uppercase mt-4">
                    Ref ID: {this.state.errorId}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <Button 
                onClick={this.handleReset}
                className="w-full h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-zinc-900/20"
              >
                <RefreshCcw className="w-4 h-4 mr-2.5 opacity-40" /> Reset Interface
              </Button>
              <div className="grid grid-cols-2 gap-3">
                <Button 
                    variant="outline"
                    onClick={() => window.location.href = '/welcome'}
                    className="h-12 rounded-2xl text-[9px] font-black uppercase tracking-widest"
                >
                    <Home className="w-3.5 h-3.5 mr-2 opacity-40" /> Dashboard
                </Button>
                <Button 
                    variant="outline"
                    onClick={() => window.open('mailto:support@studiovault.co')}
                    className="h-12 rounded-2xl text-[9px] font-black uppercase tracking-widest"
                >
                    <MessageSquare className="w-3.5 h-3.5 mr-2 opacity-40" /> Get Help
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )
    }

    return this.props.children
  }
}
