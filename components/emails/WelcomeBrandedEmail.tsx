import {
    Body,
    Container,
    Head,
    Heading,
    Hr,
    Html,
    Preview,
    Section,
    Text,
    Img,
    Button,
} from '@react-email/components';
import * as React from 'react';

interface WelcomeBrandedEmailProps {
    recipientName: string;
    studioName: string;
    studioLogo?: string;
    primaryColor?: string;
    loginUrl: string;
}

export const WelcomeBrandedEmail = ({
    recipientName,
    studioName,
    studioLogo,
    primaryColor,
    loginUrl,
}: WelcomeBrandedEmailProps) => {
    const brandColor = primaryColor || '#1a1f2c';
    const logoUrl = studioLogo || "https://studiovaultph.com/logo4.png";

    return (
        <Html>
            <Head />
            <Preview>Welcome to {studioName}!</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Section style={header}>
                        <Img src={logoUrl} width="64" height="64" alt={`${studioName} Logo`} style={logoImage} />
                        <Text style={{ ...logoText, color: brandColor }}>{studioName}</Text>
                    </Section>
                    <Heading style={{ ...heading, color: brandColor }}>Welcome, {recipientName}!</Heading>
                    <Text style={text}>
                        We&apos;re thrilled to have you join us at <strong>{studioName}</strong>. 
                        Your account has been successfully created through StudioVaultPH.
                    </Text>
                    <Text style={text}>
                        You can now manage your bookings, view your schedule, and access your studio wallet directly from our storefront.
                    </Text>

                    <Section style={buttonContainer}>
                        <Button style={{ ...button, backgroundColor: brandColor }} href={loginUrl}>
                            Go to Storefront
                        </Button>
                    </Section>

                    <Hr style={hr} />
                    <Text style={footer}>
                        This email was sent by {studioName} via StudioVaultPH.
                    </Text>
                </Container>
            </Body>
        </Html>
    );
};

export default WelcomeBrandedEmail;

const main = {
    backgroundColor: '#f6f9fc',
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
    backgroundColor: '#ffffff',
    margin: '0 auto',
    padding: '20px 0 48px',
    marginBottom: '64px',
    maxWidth: '580px',
};

const header = {
    padding: '32px 0',
    textAlign: 'center' as const,
};

const logoText = {
    fontSize: '28px',
    fontWeight: 'bold',
    fontFamily: 'serif',
    textAlign: 'center' as const,
    margin: '0',
};

const logoImage = {
    margin: '0 auto',
    marginBottom: '16px',
};

const heading = {
    fontSize: '24px',
    fontWeight: 'bold',
    textAlign: 'center' as const,
    margin: '30px 0',
};

const text = {
    color: '#333',
    fontSize: '16px',
    lineHeight: '26px',
    padding: '0 40px',
    textAlign: 'center' as const,
};

const buttonContainer = {
    textAlign: 'center' as const,
    marginTop: '32px',
    marginBottom: '32px',
};

const button = {
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '600',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline-block',
    padding: '14px 28px',
};

const hr = {
    borderColor: '#e6ebf1',
    margin: '40px 0 20px',
};

const footer = {
    color: '#8898aa',
    fontSize: '12px',
    lineHeight: '16px',
    textAlign: 'center' as const,
};
