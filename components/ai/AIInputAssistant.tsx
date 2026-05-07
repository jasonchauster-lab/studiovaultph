'use client'

import { useState } from 'react'
import { Sparkles, Loader2, Check, RotateCcw, ChevronDown } from 'lucide-react'
import { clsx } from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'

interface AIInputAssistantProps {
  fieldName: string
  onApply: (text: string) => void
  getContext: () => Record<string, any>
}

export default function AIInputAssistant({ fieldName, onApply, getContext }: AIInputAssistantProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [tone, setTone] = useState<'Professional' | 'Casual' | 'Exciting'>('Professional')
  const [isGenerating, setIsGenerating] = useState(false)
  const [suggestion, setSuggestion] = useState<string | null>(null)

  const handleGenerate = async () => {
    setIsGenerating(true)
    setSuggestion(null)
    try {
      const response = await fetch('/api/ai/content-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fieldName,
          tone,
          context: getContext()
        })
      })
      const data = await response.json()
      if (data.suggestion) {
        setSuggestion(data.suggestion)
      }
    } catch (err) {
      console.error('AI Generation failed', err)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="relative inline-block ml-2">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "p-2 rounded-xl transition-all duration-300 border shadow-sm",
          isOpen ? "bg-[#2D3282] text-white border-[#2D3282]" : "bg-white text-zinc-400 hover:text-primary border-zinc-100 hover:border-primary/20"
        )}
        title="AI Content Assistant"
      >
        <Sparkles className={clsx("w-4 h-4", isGenerating && "animate-pulse")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="absolute right-0 top-full mt-3 w-80 bg-white rounded-3xl shadow-2xl border border-zinc-100 p-6 z-[100] space-y-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">AI Assistant</span>
              <div className="flex gap-1">
                {(['Professional', 'Casual', 'Exciting'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTone(t)}
                    className={clsx(
                      "px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all",
                      tone === t ? "bg-primary/10 text-primary border border-primary/20" : "bg-zinc-50 text-zinc-400 border border-transparent hover:bg-zinc-100"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {suggestion ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 text-xs font-medium leading-relaxed text-zinc-600 italic">
                  "{suggestion}"
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      onApply(suggestion)
                      setIsOpen(false)
                      setSuggestion(null)
                    }}
                    className="flex-1 py-2.5 bg-[#2D3282] text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:brightness-90 transition-all"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Apply Changes
                  </button>
                  <button
                    onClick={handleGenerate}
                    className="p-2.5 bg-zinc-100 text-zinc-400 rounded-xl hover:bg-zinc-200 transition-all"
                    title="Regenerate"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full py-4 bg-primary/5 text-primary border border-primary/10 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-primary/10 transition-all group"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Thinking...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    Suggest {fieldName}
                  </>
                )}
              </button>
            )}

            <p className="text-[8px] font-bold text-zinc-300 uppercase tracking-widest text-center">
              Uses GPT-4o-mini • Grounded in Page Context
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
