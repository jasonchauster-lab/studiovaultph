export default function PhilosophySection() {
  return (
    <section id="philosophy" className="px-6 md:px-12 py-32 md:py-48 surface-elevated">
      <div className="max-w-5xl mx-auto text-center p-12 md:p-32 rounded-3xl surface-overlay relative overflow-hidden">
        <div className="relative z-10 flex flex-col gap-y-12 items-center">
          <p className="label-atelier">The Philosophy</p>
          <blockquote className="text-3xl md:text-5xl lg:text-6xl text-primary font-serif italic leading-[1.15] tracking-tight max-w-4xl">
            &ldquo;We built Studio Vault PH to help studios book their idle equipment, instructors find consistent work, and clients discover affordable professional classes.&rdquo;
          </blockquote>
          <div className="flex flex-col items-center gap-6">
            <p className="label-atelier text-primary tracking-[0.5em]">STUDIO VAULT PH FOUNDERS</p>
            <div className="w-20 h-0.5 bg-primary/20 rounded-full" />
          </div>
        </div>
      </div>
    </section>
  )
}
