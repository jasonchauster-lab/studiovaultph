import { ClipboardList, CalendarDays, LineChart } from 'lucide-react'

const steps = [
  { step: "01", title: "LIST", icon: ClipboardList, desc: "Define your studio availability and set your preferred session rates." },
  { step: "02", title: "BOOK", icon: CalendarDays, desc: "Verified instructors discover and reserve your space via real-time schedules." },
  { step: "03", title: "THRIVE", icon: LineChart, desc: "Secure payouts and high-level management ensure complete peace of mind." },
]

export default function MethodologySection() {
  return (
    <section id="methodology" className="px-6 md:px-12 py-32 md:py-48 bg-surface">
      <div className="max-w-7xl mx-auto space-y-20 relative z-10 text-center">
        <div className="space-y-6">
          <p className="label-atelier">The Methodology</p>
          <h2 className="text-5xl md:text-7xl font-serif text-primary tracking-tight">Professional Workflow.</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-16 relative">
          {steps.map((step, i) => (
            <div key={i} className="flex flex-col items-center group">
              <div className="w-48 h-48 md:w-56 md:h-56 rounded-3xl bg-white flex flex-col items-center justify-center shadow-ambient relative transition-transform duration-500 hover:-translate-y-3 mb-10">
                <span className="vault-badge absolute top-0 -translate-y-1/2">{step.step}</span>
                <step.icon className="w-12 h-12 text-primary/40 mb-6" />
                <span className="text-4xl font-serif font-bold text-primary tracking-[0.2em]">{step.title}</span>
              </div>
              <p className="text-muted-surface text-lg leading-relaxed max-w-[280px]">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
