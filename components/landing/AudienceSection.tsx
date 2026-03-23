import Image from 'next/image'
import { Sparkles, User, DollarSign } from 'lucide-react'

const audiences = [
  {
    title: "For Clients",
    subtitle: "UNPARALLELED ACCESS",
    icon: Sparkles,
    items: ["Affordable Professional Classes", "Curated Instructor Network", "Seamless Booking Flow"],
    image: "/images/homepage/client.png",
  },
  {
    title: "For Instructors",
    subtitle: "PROFESSIONAL AUTONOMY",
    icon: User,
    items: ["Find Consistent Work", "Rent Professional Studio Equipment", "Manage Your Schedule on the Go"],
    image: "/images/homepage/instructor.png",
  },
  {
    title: "For Studios",
    subtitle: "EQUIPMENT OPTIMIZATION",
    icon: DollarSign,
    items: ["Monetize Idle Equipment", "Automated Revenue Recovery", "Absolute Schedule Control"],
    image: "/images/homepage/studio.png",
  },
]

export default function AudienceSection() {
  return (
    <section id="audience" className="px-6 md:px-12 py-32 md:py-48 bg-surface">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-16">
        {audiences.map((v, i) => (
          <div key={i} className="atelier-card !p-0 overflow-hidden group">
            {/* Gallery image */}
            <div className="aspect-[4/5] relative overflow-hidden">
              <Image
                src={v.image}
                alt={v.title}
                fill
                sizes="(max-width: 640px) 100vw, 400px"
                className="object-cover transition-transform duration-1000 group-hover:scale-105"
              />
              <div className="absolute top-8 left-8 w-14 h-14 rounded-xl flex items-center justify-center bg-white/90 backdrop-blur-md shadow-ambient">
                <v.icon className="w-6 h-6 text-primary" />
              </div>
            </div>

            {/* Text content with intentional breathing room */}
            <div className="p-10 flex flex-col gap-y-8">
              <div className="space-y-2">
                <h2 className="text-3xl font-serif text-primary tracking-tight">{v.title}</h2>
                <p className="label-atelier text-primary">{v.subtitle}</p>
              </div>
              <ul className="space-y-5">
                {v.items.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-4 text-muted-surface text-base leading-relaxed">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/30 mt-2.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
