'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { submitDemoRequest } from '@/lib/actions/contact'
import { Button } from '@/components/ui/Button'

interface DemoModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function DemoModal({ isOpen, onClose }: DemoModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const result = await submitDemoRequest(formData)

    if (result.success) {
      setIsSuccess(true)
      setTimeout(() => {
        onClose()
        // Reset state after closing
        setTimeout(() => setIsSuccess(false), 500)
      }, 3000)
    } else {
      setError(result.error || 'Something went wrong.')
    }
    setIsSubmitting(false)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-primary/60"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-cream-200"
          >
            <button
              onClick={onClose}
              className="absolute top-6 right-6 text-primary/40 hover:text-primary transition-colors z-10"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="px-8 pt-10 pb-12">
              {isSuccess ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center text-center py-12"
                >
                  <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle className="w-10 h-10 text-primary" />
                  </div>
                  <h3 className="text-2xl font-serif text-primary mb-2">Request Received!</h3>
                  <p className="text-primary/60 text-sm max-w-xs leading-relaxed">
                    Thank you for your interest. Our team will reach out to schedule your demo soon.
                  </p>
                </motion.div>
              ) : (
                <>
                  <div className="mb-8">
                    <h2 className="text-3xl font-serif text-primary mb-2">Book a Demo</h2>
                    <p className="text-primary/60 text-sm leading-relaxed">
                      Experience how Studio Vault can transform your Pilates business.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Honeypot */}
                    <input type="text" name="website_url" className="hidden" tabIndex={-1} autoComplete="off" />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <label className="label-atelier !text-[8px] mb-1 block">Full Name</label>
                        <input
                          required
                          name="name"
                          type="text"
                          placeholder="Jane Doe"
                          className="input-atelier !py-3 !text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="label-atelier !text-[8px] mb-1 block">Email Address</label>
                        <input
                          required
                          name="email"
                          type="email"
                          placeholder="jane@studio.com"
                          className="input-atelier !py-3 !text-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="label-atelier !text-[8px] mb-1 block">Studio Name (Optional)</label>
                      <input
                        name="studioName"
                        type="text"
                        placeholder="Pulse Pilates"
                        className="input-atelier !py-3 !text-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="label-atelier !text-[8px] mb-1 block">How can we help?</label>
                      <textarea
                        required
                        name="message"
                        rows={3}
                        placeholder="Tell us about your studio and what you're looking for..."
                        className="input-atelier !py-3 !text-sm resize-none"
                      />
                    </div>

                    {error && (
                      <p className="text-rose-600 text-xs text-center font-medium">{error}</p>
                    )}

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full !py-4 shadow-xl active:scale-95 transition-all"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Sending...</span>
                        </div>
                      ) : (
                        'Request Demo'
                      )}
                    </Button>
                  </form>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
