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
} from '@react-email/components';
import * as React from 'react';

interface PurchaseConfirmationEmailProps {
    recipientName: string;
    studioName: string;
    planName: string;
    amount: number;
    expiryDate?: string;
    studioLogo?: string;
    primaryColor?: string;
}

export const PurchaseConfirmationEmail = ({
    recipientName,
    studioName,
    planName,
    amount,
    expiryDate,
    studioLogo,
    primaryColor,
}: PurchaseConfirmationEmailProps) => {
    const brandColor = primaryColor || '#1a1f2c';
    const logoUrl = studioLogo || "https://studiovaultph.com/logo4.png";

    return (
        <Html>
            <Head />
            <Preview>Purchase Confirmed: {planName} at {studioName}</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Section style={header}>
                        <Img src={logoUrl} width="64" height="64" alt={`${studioName} Logo`} style={logoImage} />
                        <Text style={{ ...logoText, color: brandColor }}>{studioName}</Text>
                    </Section>
                    <Heading style={{ ...heading, color: brandColor }}>Purchase Confirmed!</Heading>
                    <Text style={text}>
                        Hi {recipientName}, your purchase of <strong>{planName}</strong> at {studioName} has been confirmed.
                    </Text>
                    
                    <Section style={detailsContainer}>
                        <Text style={detailsTitle}>Order Details</Text>
                        <Text style={detailsText}>Plan: {planName}</Text>
                        <Text style={detailsText}>Amount: ₱{amount.toLocaleString()}</Text>
                        {expiryDate && <Text style={detailsText}>Expires: {expiryDate}</Text>}
                    </Section>

                    <Text style={text}>
                        You can now start booking your sessions through our storefront.
                    </Text>

                    <Hr style={hr} />
                    <Text style={footer}>
                        Sent via StudioVaultPH for {studioName}.
                    </Text>
                </Container>
            </Body>
        </Html>
    );
};

export default PurchaseConfirmationEmail;

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

const detailsContainer = {
    backgroundColor: '#f4f7f9',
    borderRadius: '8px',
    margin: '24px 40px',
    padding: '24px',
};

const detailsTitle = {
    fontSize: '14px',
    fontWeight: 'bold',
    textTransform: 'uppercase' as const,
    color: '#8898aa',
    margin: '0 0 12px 0',
};

const detailsText = {
    fontSize: '16px',
    color: '#333',
    margin: '4px 0',
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
