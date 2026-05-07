import * as React from 'react';
import {
    Html,
    Body,
    Head,
    Heading,
    Hr,
    Container,
    Preview,
    Section,
    Text,
    Img,
    Link,
} from '@react-email/components';

interface StaffNotificationEmailProps {
    recipientName: string;
    title: string;
    description: string;
    actionLink: string;
    studioName?: string;
    studioLogo?: string;
    primaryColor?: string;
}

export default function StaffNotificationEmail({
    recipientName,
    title,
    description,
    actionLink,
    studioName,
    studioLogo,
    primaryColor,
}: StaffNotificationEmailProps) {
    const brandColor = primaryColor || '#1a1f2c';
    const logoUrl = studioLogo || "https://studiovaultph.com/logo4.png";

    return (
        <Html>
            <Head />
            <Preview>{title} - {studioName || 'Studio Vault PH'}</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Section style={header}>
                        <Img src={logoUrl} width="48" height="48" alt={`${studioName || 'Studio'} Logo`} style={logoImage} />
                        <Text style={{ ...logoText, color: brandColor }}>{studioName || 'Studio Vault PH'}</Text>
                    </Section>
                    
                    <Heading style={{ ...h1, color: brandColor }}>{title}</Heading>
                    
                    <Text style={text}>Hi {recipientName},</Text>
                    
                    <Text style={text}>
                        {description}
                    </Text>
    
                    <Section style={buttonContainer}>
                        <Link href={actionLink} style={{ ...button, backgroundColor: brandColor }}>
                            View in Dashboard
                        </Link>
                    </Section>
    
                    <Section style={box}>
                        <Text style={paragraph}>
                            <strong>Studio:</strong> {studioName || 'Studio Vault PH'}
                        </Text>
                        <Text style={paragraph}>
                            <strong>Notification Type:</strong> Staff Alert
                        </Text>
                    </Section>
    
                    <Hr style={hr} />
                    
                    <Text style={footer}>
                        This is an automated notification from {studioName || 'Studio Vault PH'} via StudioVaultPH. 
                        You can manage your notification preferences in the Studio Management dashboard.
                    </Text>
                </Container>
            </Body>
        </Html>
    );
}

const main = {
    backgroundColor: '#f6f9fc',
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
    backgroundColor: '#ffffff',
    margin: '0 auto',
    padding: '20px 0 48px',
    marginBottom: '64px',
};

const header = {
    padding: '24px 0',
};

const logoText = {
    fontSize: '24px',
    fontWeight: 'bold',
    fontFamily: 'serif',
    color: '#1a1f2c',
    textAlign: 'center' as const,
};

const logoImage = {
    margin: '0 auto',
    marginBottom: '16px',
};

const h1 = {
    color: '#1a1f2c',
    fontSize: '24px',
    fontWeight: '900',
    margin: '40px 0',
    padding: '0',
    textAlign: 'center' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '-0.025em',
};

const text = {
    color: '#334155',
    fontSize: '16px',
    lineHeight: '26px',
    padding: '0 40px',
};

const buttonContainer = {
    textAlign: 'center' as const,
    margin: '32px 0',
};

const button = {
    backgroundColor: '#1a1f2c',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 'bold',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline-block',
    padding: '16px 32px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
};

const box = {
    padding: '24px',
    backgroundColor: '#f8fafc',
    borderRadius: '16px',
    margin: '24px 40px',
    border: '1px solid #f1f5f9',
};

const paragraph = {
    fontSize: '14px',
    lineHeight: '24px',
    margin: '0',
    color: '#64748b',
};

const hr = {
    borderColor: '#e2e8f0',
    margin: '40px 0',
};

const footer = {
    color: '#94a3b8',
    fontSize: '12px',
    lineHeight: '16px',
    textAlign: 'center' as const,
    padding: '0 40px',
};
