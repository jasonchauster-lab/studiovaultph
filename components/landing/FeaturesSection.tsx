import { TrendingUp, ShieldCheck, Award } from 'lucide-react'

const features = [
  {
    icon: TrendingUp,
    title: "Optimize Revenue",
    desc: "Monetize idle equipment and transform off-peak availability into guaranteed studio income.",
  },
  {
    icon: ShieldCheck,
    title: "Verified Network",
    desc: "Security is non-negotiable. Every session is managed through a secure, identity-validated ecosystem.",
  },
  {
    icon: Award,
    title: "Industry Standard",
    desc: "Join an exclusive collective of certified boutique studios and top-tier movement professionals.",
  },
]

export default function FeaturesSection() {
  return (
    <section id="features" className="px-6 md:px-12 py-32 md:py-48 surface-elevated">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16">
          {features.map((prop, i) => (
            <div key={i} className="atelier-card flex flex-col items-start gap-y-8">
              <div className="w-16 h-16 rounded-xl bg-surface flex items-center justify-center shadow-ambient transition-transform duration-500 group-hover:-translate-y-2">
                <prop.icon className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-4">
                <h2 className="text-3xl font-serif text-primary tracking-tight">{prop.title}</h2>
                <p className="text-muted-surface text-base leading-relaxed">{prop.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
