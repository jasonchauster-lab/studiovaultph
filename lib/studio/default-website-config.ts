interface DefaultWebsiteConfigInput {
    name?: string
    bio?: string
    address?: string
}

export function buildDefaultWebsiteConfig(input: DefaultWebsiteConfigInput = {}) {
    const studioName = input.name || 'Your Studio'
    const studioBio = input.bio || ''
    const studioAddress = input.address || ''

    return {
        theme: {
            primaryColor: '#4A5D4E',
            secondaryColor: '#FFFFFF',
            accentColor: '#D7BFA8',
            headingFont: 'playfair',
            bodyFont: 'inter',
            buttonRadius: '9999px',
            backgroundColor: '#ffffff',
            textColor: '#1b1c19',
            buttonColor: '#4A5D4E'
        },
        pages: {
            home: {
                sections: [
                    {
                        id: 'hero',
                        type: 'hero',
                        enabled: true,
                        content: {
                            title: studioName,
                            subtitle: 'A welcoming space for mindful movement, expert guidance, and a stronger daily practice.',
                            images: [],
                            primaryBtnText: 'Book Now',
                            primaryBtnLink: '#booking',
                            secondaryBtnText: 'Explore Pricing',
                            secondaryBtnLink: '/pricing'
                        }
                    },
                    {
                        id: 'about',
                        type: 'about',
                        enabled: true,
                        content: {
                            title: `About ${studioName}`,
                            text: studioBio || 'Share what makes your studio special, the kind of experience clients can expect, and why they should practice with you.',
                            primaryBtnText: 'Learn More',
                            primaryBtnLink: '#locations'
                        }
                    },
                    {
                        id: 'appointments',
                        type: 'appointments',
                        enabled: true,
                        content: {
                            title: 'Book a Session',
                            subtitle: 'Make it easy for new and returning clients to reserve a class or private appointment.',
                            btnText: 'Book Now',
                            btnLink: '#booking'
                        }
                    },
                    {
                        id: 'faq',
                        type: 'faq',
                        enabled: true,
                        content: {
                            title: 'Frequently Asked Questions',
                            subtitle: 'Answer the most common questions before a client even has to ask.',
                            supportTitle: 'Still have questions?',
                            supportSubtitle: 'Use this space to direct clients to the best next step.',
                            supportBtnText: 'Contact Us',
                            supportBtnLink: '#contact',
                            faqs: [
                                {
                                    question: 'Do I need prior Pilates experience?',
                                    answer: 'Not at all. We welcome beginners and can recommend the best starting point for your goals.'
                                },
                                {
                                    question: 'What should I bring to class?',
                                    answer: 'Bring comfortable movement clothes, water, and anything else your studio would like clients to know before arriving.'
                                }
                            ]
                        }
                    },
                    {
                        id: 'cta',
                        type: 'cta',
                        enabled: true,
                        content: {
                            title: 'Ready to start your practice?',
                            subtitle: 'Use this section to drive clients toward your most important booking or sales action.',
                            primaryBtnText: 'View Pricing',
                            primaryBtnLink: '/pricing',
                            secondaryBtnText: 'Book a Session',
                            secondaryBtnLink: '#booking'
                        }
                    },
                    {
                        id: 'locations',
                        type: 'locations',
                        enabled: true,
                        content: {
                            title: 'Visit Our Studio',
                            subtitle: 'Help clients find your space, understand where you are, and feel confident arriving for class.',
                            address: studioAddress,
                            mapUrl: '',
                            btnText: 'Open in Maps',
                            btnLink: ''
                        }
                    }
                ]
            },
            memberships: {
                sections: [
                    { id: 'memberships', type: 'memberships', enabled: true, content: { title: 'Memberships', subtitle: 'Recurring plans for committed clients.' } },
                    { id: 'packages', type: 'packages', enabled: true, content: { title: 'Packages', subtitle: 'Flexible session bundles for every schedule.' } },
                    { id: 'cta', type: 'cta', enabled: true, content: { title: 'Need help choosing?', primaryBtnText: 'Contact Us', primaryBtnLink: '#contact' } }
                ]
            },
            schedule: {
                sections: [
                    { id: 'timetable', type: 'timetable', enabled: true, content: { title: 'Class Schedule', subtitle: 'Browse upcoming sessions and availability.' } },
                    { id: 'appointments', type: 'appointments', enabled: true, content: { title: 'Prefer private sessions?', subtitle: 'Offer a direct path into one-on-one bookings.', btnText: 'Book Private Session', btnLink: '#booking' } }
                ]
            },
            locations: {
                sections: [
                    { id: 'locations', type: 'locations', enabled: true, content: { title: 'Find Us', subtitle: 'Make getting to your studio feel simple.', address: studioAddress, mapUrl: '', btnText: 'Open in Maps', btnLink: '' } }
                ]
            }
        },
        header: {
            logoPosition: 'left',
            sticky: true,
            backgroundColor: '#ffffff',
            textColor: '#000000',
            useStoreNav: true
        },
        footer: {
            socialLinks: [],
            tagline: 'Move stronger. Feel better. Stay consistent.'
        },
        navigation: {
            header: [
                { id: 'h1', label: 'Home', href: '/', itemType: 'link' },
                {
                    id: 'h2',
                    label: 'Pricing',
                    href: '',
                    itemType: 'group',
                    children: [
                        { id: 'h2-1', label: 'Packages', href: '/packages', itemType: 'link' },
                        { id: 'h2-2', label: 'Memberships', href: '/memberships', itemType: 'link' }
                    ]
                },
                { id: 'h3', label: 'Schedule', href: '/schedule', itemType: 'link' },
                { id: 'h4', label: 'Locations', href: '#locations', itemType: 'link' }
            ],
            footer: [
                { id: 'f1', label: 'About Us', href: '#about', itemType: 'link' },
                { id: 'f2', label: 'Pricing', href: '/pricing', itemType: 'link' },
                { id: 'f3', label: 'FAQ', href: '#faq', itemType: 'link' },
                { id: 'f4', label: 'Contact', href: '#contact', itemType: 'link' }
            ]
        },
        floatingWidgets: {
            aiChat: { enabled: false }
        }
    }
}
