'use client'

import { ClipboardList, CalendarDays, LineChart } from 'lucide-react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'

const steps = [
  { step: "01", title: "LIST", icon: ClipboardList, desc: "Define your studio availability and set your preferred session rates." },
  { step: "02", title: "BOOK", icon: CalendarDays, desc: "Verified instructors discover and reserve your space via real-time schedules." },
  { step: "03", title: "THRIVE", icon: LineChart, desc: "Secure payouts and high-level management ensure complete peace of mind." },
]

export default function MethodologySection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  })

  const progressLine = useTransform(scrollYProgress, [0.3, 0.6], ["0%", "100%"])

  return (
    <section id="methodology" className="px-6 md:px-12 py-32 md:py-48 bg-surface overflow-hidden">
      <div ref={containerRef} className="max-w-7xl mx-auto space-y-20 relative z-10 text-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="space-y-6"
        >
          <p className="label-atelier">The Methodology</p>
          <h2 className="text-5xl md:text-7xl font-serif text-primary tracking-tight">Professional Workflow.</h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-16 relative">
          {/* Progress Line (Desktop only) */}
          <div className="hidden md:block absolute top-[112px] left-[15%] right-[15%] h-[2px] bg-primary/5 z-0">
            <motion.div 
              style={{ width: progressLine }}
              className="h-full bg-primary/20"
            />
          </div>

          {steps.map((step, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7, delay: i * 0.2 }}
              className="flex flex-col items-center group relative z-10"
            >
              <motion.div 
                whileHover={{ y: -8, transition: { duration: 0.3 } }}
                className="w-48 h-48 md:w-56 md:h-56 rounded-3xl bg-white flex flex-col items-center justify-center shadow-ambient relative mb-10"
              >
                <span className="vault-badge absolute top-0 -translate-y-1/2">{step.step}</span>
                <step.icon className="w-12 h-12 text-primary/40 mb-6 group-hover:text-primary/60 transition-colors duration-500" />
                <span className="text-4xl font-serif font-bold text-primary tracking-[0.2em]">{step.title}</span>
              </motion.div>
              <p className="text-muted-surface text-lg leading-relaxed max-w-[280px]">
                {step.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
