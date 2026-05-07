export interface Theme {
    id: string
    name: string
    colors: {
        primary: string
        secondary: string
        accent: string
        background: string
        surface: string
        text: string
    }
    fonts: {
        heading: string
        body: string
    }
    styles: {
        buttonRadius: string
        cardShadow: string
        sectionPadding: string
    }
}

export const themes: Record<string, Theme> = {
    'zen-minimalist': {
        id: 'zen-minimalist',
        name: 'Zen Minimalist',
        colors: {
            primary: '#4A5D4E',
            secondary: '#F9F7F2',
            accent: '#8A9A5B',
            background: '#F9F7F2',
            surface: '#FFFFFF',
            text: '#2D342E'
        },
        fonts: {
            heading: 'Playfair Display',
            body: 'Inter'
        },
        styles: {
            buttonRadius: '99px',
            cardShadow: '0 20px 40px -10px rgba(0,0,0,0.05)',
            sectionPadding: '8rem'
        }
    },
    'energetic-edge': {
        id: 'energetic-edge',
        name: 'Energetic Edge',
        colors: {
            primary: '#FF3B30',
            secondary: '#FFFFFF',
            accent: '#000000',
            background: '#FFFFFF',
            surface: '#FAFAFA',
            text: '#111111'
        },
        fonts: {
            heading: 'Outfit',
            body: 'Montserrat'
        },
        styles: {
            buttonRadius: '0px',
            cardShadow: '0 0 0 2px #000000',
            sectionPadding: '4rem'
        }
    },
    'midnight-luxe': {
        id: 'midnight-luxe',
        name: 'Midnight Luxe',
        colors: {
            primary: '#C5A358',
            secondary: '#1A1A1A',
            accent: '#C5A358',
            background: '#121212',
            surface: '#1A1A1A',
            text: '#F5F5F5'
        },
        fonts: {
            heading: 'Cinzel',
            body: 'Lora'
        },
        styles: {
            buttonRadius: '16px',
            cardShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            sectionPadding: '6rem'
        }
    }
}

