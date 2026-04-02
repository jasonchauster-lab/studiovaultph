'use client'

import { TrendingUp, ShieldCheck, Award } from 'lucide-react'
import { motion } from 'framer-motion'

const features = [
  {
    icon: TrendingUp,
    title: "Optimize Revenue",
    desc: "Monetize idle equipment and transform off-peak availability into guaranteed studio income.",
    animatePath: true
  },
  {
    icon: ShieldCheck,
    title: "Verified Network",
    desc: "Security is non-negotiable. Every session is managed through a secure, identity-validated ecosystem.",
    animatePath: false
  },
  {
    icon: Award,
    title: "Industry Standard",
    desc: "Join an exclusive collective of certified boutique studios and top-tier movement professionals.",
    animatePath: false
  },
]

export default function FeaturesSection() {
  return (
    <section id="features" className="px-6 md:px-12 py-32 md:py-48 surface-elevated overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16">
          {features.map((feature, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7, delay: i * 0.2 }}
              whileHover={{ 
                y: -10, 
                scale: 1.03,
                boxShadow: "0 30px 60px rgba(0,0,0,0.12)",
                transition: { duration: 0.3 }
              }}
              className="atelier-card flex flex-col items-start gap-y-8 group !transition-none"
            >
              <div className="w-16 h-16 rounded-xl bg-surface flex items-center justify-center shadow-ambient relative overflow-hidden">
                {feature.animatePath ? (
                  <svg 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className="w-8 h-8 text-primary"
                  >
                    <motion.path
                      d="M22 7l-8.5 8.5-5-5L2 17"
                      initial={{ pathLength: 0, opacity: 0 }}
                      whileInView={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 1.5, delay: 0.5, ease: "easeInOut" }}
                    />
                    <motion.path
                      d="M16 7h6v6"
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      transition={{ duration: 0.3, delay: 1.8 }}
                    />
                  </svg>
                ) : (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.5 + (i * 0.1) }}
                  >
                    <feature.icon className="w-8 h-8 text-primary" />
                  </motion.div>
                )}
              </div>
              <div className="space-y-4">
                <h2 className="text-3xl font-serif text-primary tracking-tight">{feature.title}</h2>
                <p className="text-muted-surface text-base leading-relaxed">{feature.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
