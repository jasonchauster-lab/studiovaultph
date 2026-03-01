import {
    Body,
    Container,
    Head,
    Heading,
    Hr,
    Html,
    Img,
    Preview,
    Section,
    Text,
    Button,
} from '@react-email/components';
import * as React from 'react';

interface AccountReactivatedEmailProps {
    studioName: string;
    dashboardUrl: string;
}

export const AccountReactivatedEmail = ({
    studioName,
    dashboardUrl,
}: AccountReactivatedEmailProps) => {
    return (
        <Html>
            <Head />
            <Preview>Your Studio Vault PH Listing is Now Active</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Section style={header}>
                        <Img src="https://studiovaultph.com/logo.png" width="48" height="48" alt="StudioVaultPH Logo" style={logoImage} />
                        <Text style={logoText}>StudioVaultPH</Text>
                    </Section>
                    <Heading style={heading}>Account Reactivated</Heading>
                    <Text style={text}>
                        Hi {studioName},
                    </Text>
                    <Text style={text}>
                        Following our review, your account has been successfully reinstated. Your studio is now visible on the marketplace, and you can resume creating slots.
                    </Text>

                    <Section style={probationSection}>
                        <Text style={probationText}>
                            <strong>Please Note:</strong> Your account is now on a 30-day probation period. Any further late cancellations during this time may lead to a permanent review of your partnership.
                        </Text>
                    </Section>

                    <Text style={text}>
                        We’re excited to have you back in the community!
                    </Text>

                    <Section style={buttonContainer}>
                        <Button style={button} href={dashboardUrl}>
                            Go to Dashboard
                        </Button>
                    </Section>

                    <Text style={text}>
                        Best regards,<br />
                        The Studio Vault PH Team
                    </Text>

                    <Hr style={hr} />
                    <Text style={footer}>
                        StudioVaultPH - Empowering your Pilates practice.
                    </Text>
                </Container>
            </Body>
        </Html>
    );
};

export default AccountReactivatedEmail;

const main = {
    backgroundColor: '#FAF9F6',
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
    margin: '0 auto',
    padding: '20px 0 48px',
    maxWidth: '580px',
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

const heading = {
    fontSize: '28px',
    letterSpacing: '-0.5px',
    lineHeight: '1.3',
    fontWeight: 'bold',
    color: '#1a1f2c',
    padding: '17px 0 0',
    textAlign: 'center' as const,
};

const text = {
    margin: '0',
    marginTop: '16px',
    color: '#4a5568',
    fontSize: '16px',
    lineHeight: '24px',
    textAlign: 'left' as const,
};

const probationSection = {
    marginTop: '24px',
    padding: '16px',
    backgroundColor: '#fffaf0',
    borderRadius: '8px',
    border: '1px solid #fbd38d',
};

const probationText = {
    margin: '0',
    color: '#744210',
    fontSize: '16px',
    lineHeight: '24px',
};

const buttonContainer = {
    textAlign: 'center' as const,
    marginTop: '32px',
    marginBottom: '32px',
};

const button = {
    backgroundColor: '#1a1f2c',
    borderRadius: '8px',
    color: '#FAF9F6',
    fontSize: '16px',
    fontWeight: '600',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline-block',
    padding: '14px 28px',
};

const hr = {
    borderColor: '#e2e8f0',
    margin: '40px 0 20px',
};

const footer = {
    color: '#718096',
    fontSize: '13px',
    lineHeight: '22px',
    textAlign: 'center' as const,
};
