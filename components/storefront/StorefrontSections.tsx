import StorefrontHero from './StorefrontHero'
import StorefrontAbout from './StorefrontAbout'
import StorefrontCTA from './StorefrontCTA'
import StorefrontAppointments from './StorefrontAppointments'
import StorefrontMemberships from './StorefrontMemberships'
import StorefrontPackages from './StorefrontPackages'
import StorefrontLocations from './StorefrontLocations'
import StorefrontContact from './StorefrontContact'
import StorefrontBlogs from './StorefrontBlogs'
import StorefrontFAQ from './StorefrontFAQ'
import StorefrontInstructors from './StorefrontInstructors'
import StorefrontTimetable from './StorefrontTimetable'
import StorefrontReviews from './StorefrontReviews'
import BookingSection from '../customer/BookingSection'

interface StorefrontSectionsProps {
    sections: any[]
    studio: any
    outlet: any
    theme: any
    data: {
        memberships?: any[]
        packages?: any[]
        slots?: any[]
        instructors?: any[]
        blogs?: any[]
        referralRewards?: any[]
        profile?: any
        reviews?: any[]
        enableXendit?: boolean
        enableManualPayments?: boolean
        manualPaymentInstructions?: string | null
    }
    isMobile?: boolean
}

export default function StorefrontSections({ 
    sections, 
    studio, 
    outlet, 
    theme, 
    data,
    isMobile 
}: StorefrontSectionsProps) {
    return (
        <>
            {sections.map((section: any) => {
                if (!section.enabled) return null

                switch (section.type) {
                    case 'hero':
                        return (
                            <StorefrontHero 
                                key={section.id}
                                studioName={studio.name}
                                logoUrl={studio.website_config?.header?.logoUrl || studio.logo_url}
                                bannerUrl={outlet.hero_image_url || studio.banner_url}
                                location={`${outlet.name} - ${outlet.address}`}
                                config={section}
                                theme={theme}
                                isMobile={isMobile}
                            />
                        )
                    case 'about':
                        return (
                            <StorefrontAbout 
                                key={section.id}
                                bio={studio.bio || ''}
                                studioName={studio.name}
                                config={section}
                                theme={theme}
                                isMobile={isMobile}
                            />
                        )
                    case 'cta':
                        return (
                            <StorefrontCTA 
                                key={section.id}
                                config={section}
                                theme={theme}
                                isMobile={isMobile}
                            />
                        )
                    case 'appointments':
                        return (
                            <StorefrontAppointments 
                                key={section.id}
                                config={section}
                                theme={theme}
                                isMobile={isMobile}
                            />
                        )
                    case 'memberships':
                        return (
                            <StorefrontMemberships 
                                key={section.id}
                                studioName={studio.name}
                                config={section}
                                memberships={data.memberships || []}
                                studioId={studio.id}
                                theme={theme}
                                isMobile={isMobile}
                                referralRewards={data.referralRewards || []}
                                enableXendit={data.enableXendit}
                                enableManualPayments={data.enableManualPayments}
                            />
                        )
                    case 'packages':
                        return (
                            <StorefrontPackages 
                                key={section.id}
                                studioName={studio.name}
                                config={section}
                                packages={data.packages || []}
                                studioId={studio.id}
                                theme={theme}
                                isMobile={isMobile}
                                referralRewards={data.referralRewards || []}
                                enableXendit={data.enableXendit}
                                enableManualPayments={data.enableManualPayments}
                            />
                        )
                    case 'locations':
                        return (
                            <StorefrontLocations 
                                key={section.id}
                                studioName={studio.name}
                                config={{...section, content: {...section.content, address: outlet.address}}}
                                theme={theme}
                                isMobile={isMobile}
                            />
                        )
                    case 'contact':
                        return (
                            <StorefrontContact 
                                key={section.id}
                                config={section}
                                theme={theme}
                                isMobile={isMobile}
                            />
                        )
                    case 'booking':
                        return (
                            <section id="booking" key={section.id} className="py-24 bg-white">
                                <div className="max-w-7xl mx-auto px-6">
                                    <div className="mb-12 text-center space-y-4">
                                        <h2 className="text-4xl md:text-5xl font-serif font-black text-charcoal tracking-tight">Reserve Your Spot</h2>
                                        <p className="text-[11px] font-black text-charcoal/40 uppercase tracking-[0.4em]">Select a time to experience {outlet.name}</p>
                                    </div>
                                    <BookingSection 
                                        studioId={studio.id}
                                        outletId={outlet.id}
                                        slots={data.slots || []}
                                        instructors={data.instructors || []}
                                        availabilityBlocks={[]}
                                        studioPricing={studio.service_rates || {}}
                                        studioHourlyRate={studio.hourly_rate || 0}
                                        studioLocation={outlet.address}
                                        isStorefront={true}
                                        legalConfig={studio.website_config?.legal}
                                        enableXendit={data.enableXendit}
                                        enableManualPayments={data.enableManualPayments}
                                        manualPaymentInstructions={data.manualPaymentInstructions}
                                    />
                                </div>
                            </section>
                        )
                    case 'blogs':
                        return (
                            <StorefrontBlogs 
                                key={section.id}
                                config={section}
                                theme={theme}
                                posts={data.blogs || []}
                                studioSlug={studio.slug}
                                branchSlug={outlet.slug}
                                isMobile={isMobile}
                            />
                        )
                    case 'faq':
                        return (
                            <StorefrontFAQ 
                                key={section.id}
                                config={section}
                                theme={theme}
                                isMobile={isMobile}
                            />
                        )
                    case 'instructors':
                        return (
                            <StorefrontInstructors 
                                key={section.id}
                                config={section}
                                theme={theme}
                                isMobile={isMobile}
                            />
                        )
                    case 'timetable':
                        return (
                            <div key={section.id} className="pt-32 pb-24">
                                <div className="max-w-7xl mx-auto px-6">
                                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                                        <div className="space-y-4">
                                            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-forest/10 rounded-full text-[10px] font-black uppercase tracking-widest text-forest">
                                                {outlet.name}
                                            </div>
                                            <h1 className="text-4xl md:text-6xl font-serif text-charcoal tracking-tightest leading-tight">
                                                {section.content.title || 'Class Schedule'}
                                            </h1>
                                            <p className="text-[11px] font-black text-charcoal/40 uppercase tracking-[0.4em]">
                                                {section.content.subtitle || `Explore sessions at our ${outlet.name} branch`}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <StorefrontTimetable 
                                    studioName={studio.name} 
                                    initialSlots={data.slots || []} 
                                    slug={studio.slug} 
                                    branchSlug={outlet.slug}
                                    theme={theme}
                                    isMobile={isMobile}
                                />
                            </div>
                        )
                    case 'reviews':
                        return (
                            <StorefrontReviews 
                                key={section.id}
                                reviews={data.reviews || []}
                                config={section}
                                theme={theme}
                                isMobile={isMobile}
                            />
                        )
                    default:
                        return null
                }
            })}
        </>
    )
}
